package handlers

import (
	"assessmate-backend/agents"
	"assessmate-backend/db"
	"assessmate-backend/models"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type Assignment struct {
	ID        string              `json:"id,omitempty"`
	JourneyID string              `json:"journey_id"`
	Questions interface{}         `json:"questions"`
	Attempts  []AssignmentAttempt `json:"attempts,omitempty"`
	Score     int                 `json:"score"`
	Status    string              `json:"status"`
	CreatedAt time.Time           `json:"created_at"`
}

type AssignmentAttempt struct {
	AttemptNumber int               `json:"attempt_number"`
	Score         int               `json:"score"`
	Skills        []map[string]any  `json:"skills,omitempty"`
	Answers       map[string]string `json:"answers,omitempty"`
	SubmittedAt   time.Time         `json:"submitted_at"`
}

// We store assignment metadata inside the existing jsonb column `assignments.questions`
// to avoid requiring a DB migration.
type AssignmentPayload struct {
	Questions   []models.AssessmentQuestion `json:"questions"`
	Attempts    []AssignmentAttempt         `json:"attempts,omitempty"`
	FocusSkill  string                      `json:"focus_skill,omitempty"`
	GeneratedAt time.Time                   `json:"generated_at,omitempty"`
}

type SubmitAssignmentRequest struct {
	JourneyID string `json:"journey_id" binding:"required"`
	Score     int    `json:"score" binding:"required"`
	Skills    []struct {
		Name  string `json:"name"`
		Level int    `json:"level"`
	} `json:"skills"`
	Answers map[string]string `json:"answers,omitempty"`
}

type AssignmentListItem struct {
	JourneyID   string    `json:"journey_id"`
	RoleName    string    `json:"role_name"`
	CompanyName string    `json:"company_name"`
	Status      string    `json:"status"`
	Attempts    int       `json:"attempts"`
	Score       int       `json:"score"`
	CreatedAt   time.Time `json:"created_at"`
}

func parseAssignmentPayload(v interface{}) (*AssignmentPayload, error) {
	// Handles both:
	// 1) old format: []questions
	// 2) new format: { questions: [...], attempts: [...] }
	b, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	// Try new format first
	var p AssignmentPayload
	if err := json.Unmarshal(b, &p); err == nil && len(p.Questions) > 0 {
		return &p, nil
	}
	// Try legacy array format
	var qs []models.AssessmentQuestion
	if err := json.Unmarshal(b, &qs); err != nil {
		return nil, err
	}
	return &AssignmentPayload{Questions: qs, Attempts: []AssignmentAttempt{}}, nil
}

func parseFinalAnalysis(v interface{}) (*models.FinalAnalysis, error) {
	if v == nil {
		return nil, io.EOF
	}
	// Some rows can store jsonb as string; try direct parse first.
	if s, ok := v.(string); ok {
		var out models.FinalAnalysis
		if err := json.Unmarshal([]byte(s), &out); err == nil {
			return &out, nil
		}
	}
	// Supabase returns jsonb as map[string]any; marshal/unmarshal is the safest way
	b, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	var out models.FinalAnalysis
	if err := json.Unmarshal(b, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func asInt(v interface{}) int {
	switch t := v.(type) {
	case int:
		return t
	case int32:
		return int(t)
	case int64:
		return int(t)
	case float32:
		return int(t)
	case float64:
		return int(t)
	case json.Number:
		i, _ := t.Int64()
		return int(i)
	default:
		return 0
	}
}

func normalizeAnalysisMap(v interface{}) map[string]interface{} {
	if v == nil {
		return map[string]interface{}{}
	}
	if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
		var out map[string]interface{}
		if err := json.Unmarshal([]byte(s), &out); err == nil {
			return out
		}
	}
	b, err := json.Marshal(v)
	if err != nil {
		return map[string]interface{}{}
	}
	out := map[string]interface{}{}
	_ = json.Unmarshal(b, &out)
	return out
}

func extractSkillGapsFlexible(raw interface{}, focusSkill string) []models.SkillMatch {
	out := []models.SkillMatch{}
	analysisMap := normalizeAnalysisMap(raw)
	seen := map[string]bool{}

	if sa, ok := analysisMap["skill_analysis"].([]interface{}); ok {
		for _, item := range sa {
			m, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			name, _ := m["name"].(string)
			if strings.TrimSpace(name) == "" {
				name, _ = m["skill"].(string)
			}
			name = strings.TrimSpace(name)
			if name == "" {
				continue
			}
			if focusSkill != "" && !strings.EqualFold(name, strings.TrimSpace(focusSkill)) {
				continue
			}

			required := asInt(m["required_level"])
			if required == 0 {
				required = asInt(m["requiredLevel"])
			}
			estimated := asInt(m["estimated_level"])
			if estimated == 0 {
				estimated = asInt(m["estimatedLevel"])
			}
			if estimated == 0 {
				estimated = asInt(m["current_level"])
			}
			if estimated == 0 {
				estimated = asInt(m["currentLevel"])
			}
			gap := asInt(m["gap"])
			if gap <= 0 {
				gap = required - estimated
			}
			if gap <= 0 && focusSkill == "" {
				continue
			}
			if gap <= 0 {
				gap = 1
			}

			key := strings.ToLower(name)
			if seen[key] {
				continue
			}
			seen[key] = true
			out = append(out, models.SkillMatch{
				Name:           name,
				RequiredLevel:  maxInt(required, 1),
				EstimatedLevel: estimated,
				Gap:            gap,
				Importance:     "critical",
			})
		}
	}

	// Fallback from critical_gaps when skill_analysis is incomplete
	if len(out) == 0 {
		if cg, ok := analysisMap["critical_gaps"].([]interface{}); ok {
			for _, c := range cg {
				name, _ := c.(string)
				name = strings.TrimSpace(name)
				if name == "" {
					continue
				}
				if focusSkill != "" && !strings.EqualFold(name, strings.TrimSpace(focusSkill)) {
					continue
				}
				key := strings.ToLower(name)
				if seen[key] {
					continue
				}
				seen[key] = true
				out = append(out, models.SkillMatch{
					Name:           name,
					RequiredLevel:  7,
					EstimatedLevel: 3,
					Gap:            4,
					Importance:     "critical",
					Evidence:       "Derived from critical_gaps",
				})
			}
		}
	}

	return out
}

func computeGapAndCritical(a *models.FinalAnalysis) {
	a.CriticalGaps = []string{}
	total := 0.0
	max := 0.0
	for i := range a.SkillAnalysis {
		s := &a.SkillAnalysis[i]
		gap := s.RequiredLevel - s.EstimatedLevel
		if gap < 0 {
			gap = 0
		}
		s.Gap = gap
		weight := 1.0
		if strings.ToLower(s.Importance) == "critical" {
			weight = 2.0
			if gap > 0 {
				a.CriticalGaps = append(a.CriticalGaps, s.Name)
			}
		}
		ratio := float64(s.EstimatedLevel) / float64(maxInt(1, s.RequiredLevel))
		if ratio > 1 {
			ratio = 1
		}
		total += ratio * weight
		max += weight
	}
	if max > 0 {
		a.FitScore = int((total/max)*100 + 0.5)
	}
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func GetOrCreateAssignment(c *gin.Context) {
	journeyId := c.Param("journeyId")
	if journeyId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Journey ID is required"})
		return
	}

	// 1. Check if assignment already exists
	var existingAssignment Assignment
	_, err := db.Client.From("assignments").Select("*", "exact", false).Eq("journey_id", journeyId).Single().ExecuteTo(&existingAssignment)
	if err == nil {
		// Normalize response shape for UI
		if p, pErr := parseAssignmentPayload(existingAssignment.Questions); pErr == nil {
			existingAssignment.Questions = p.Questions
			existingAssignment.Attempts = p.Attempts
		}
		c.JSON(http.StatusOK, existingAssignment)
		return
	}

	// 2. Fetch journey data to generate questions
	var journey models.Journey
	_, err = db.Client.From("journeys").Select("*", "exact", false).Eq("id", journeyId).Single().ExecuteTo(&journey)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Journey not found"})
		return
	}

	// 3. Extract skill gaps from analysis result (robustly)
	skillGaps := extractSkillGapsFlexible(journey.AnalysisResult, "")
	if len(skillGaps) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No skill gaps found in analysis_result"})
		return
	}

	companyCtx := ""
	if journey.CompanyContext != nil {
		if comp, err := json.Marshal(journey.CompanyContext); err == nil {
			var cctx models.CompanyOutput
			if json.Unmarshal(comp, &cctx) == nil {
				companyCtx = cctx.CompanyContext
			}
		}
	}

	// 4. Generate 20 questions
	ctx := context.Background()
	questions, err := agents.GenerateAssignmentQuestions(ctx, skillGaps, companyCtx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate questions: " + err.Error()})
		return
	}

	// 5. Save assignment
	payload := AssignmentPayload{
		Questions:   questions.Questions,
		Attempts:    []AssignmentAttempt{},
		GeneratedAt: time.Now(),
	}
	newAssignment := Assignment{
		JourneyID: journeyId,
		Questions: payload,
		Status:    "pending",
	}

	var savedAssignment Assignment
	_, err = db.Client.From("assignments").Insert(newAssignment, false, "", "", "").Single().ExecuteTo(&savedAssignment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save assignment: " + err.Error()})
		return
	}

	savedAssignment.Questions = payload.Questions
	savedAssignment.Attempts = payload.Attempts
	c.JSON(http.StatusOK, savedAssignment)
}

func ListAssignments(c *gin.Context) {
	userId, _ := c.Get("userId")
	uid, _ := userId.(string)
	if strings.TrimSpace(uid) == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	// Fetch journeys for this user
	var journeys []models.Journey
	_, err := db.Client.From("journeys").Select("*", "exact", false).Eq("user_id", uid).Order("created_at", nil).ExecuteTo(&journeys)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch journeys"})
		return
	}

	completed := []AssignmentListItem{}
	pending := []AssignmentListItem{}

	for _, j := range journeys {
		var a Assignment
		_, aErr := db.Client.From("assignments").Select("*", "exact", false).Eq("journey_id", j.ID).Single().ExecuteTo(&a)
		if aErr != nil {
			// No assignment yet => pending
			pending = append(pending, AssignmentListItem{
				JourneyID:   j.ID,
				RoleName:    j.RoleName,
				CompanyName: j.CompanyName,
				Status:      "not_started",
				Attempts:    0,
				Score:       0,
				CreatedAt:   j.CreatedAt,
			})
			continue
		}
		attempts := 0
		if p, pErr := parseAssignmentPayload(a.Questions); pErr == nil {
			attempts = len(p.Attempts)
		}
		item := AssignmentListItem{
			JourneyID:   j.ID,
			RoleName:    j.RoleName,
			CompanyName: j.CompanyName,
			Status:      a.Status,
			Attempts:    attempts,
			Score:       a.Score,
			CreatedAt:   a.CreatedAt,
		}
		if strings.ToLower(a.Status) == "completed" {
			completed = append(completed, item)
		} else {
			pending = append(pending, item)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"completed": completed,
		"pending":   pending,
	})
}

func ReattemptAssignment(c *gin.Context) {
	journeyId := c.Param("journeyId")
	focusSkill := strings.TrimSpace(c.Query("skill"))

	// Fetch journey
	var journey models.Journey
	_, err := db.Client.From("journeys").Select("*", "exact", false).Eq("id", journeyId).Single().ExecuteTo(&journey)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Journey not found"})
		return
	}

	// Use skill gaps from current analysis_result
	skillGaps := extractSkillGapsFlexible(journey.AnalysisResult, focusSkill)
	// Fallback: if analysis_result is malformed or doesn't have gaps, still allow selected-skill upskill.
	if len(skillGaps) == 0 && focusSkill != "" {
		skillGaps = append(skillGaps, models.SkillMatch{
			Name:           focusSkill,
			RequiredLevel:  7,
			EstimatedLevel: 3,
			Gap:            4,
			Importance:     "critical",
			Evidence:       "Selected by user for upskill reattempt",
		})
	}
	if len(skillGaps) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No matching skill gaps found for reattempt"})
		return
	}

	companyCtx := ""
	if journey.CompanyContext != nil {
		if comp, err := json.Marshal(journey.CompanyContext); err == nil {
			var cctx models.CompanyOutput
			if json.Unmarshal(comp, &cctx) == nil {
				companyCtx = cctx.CompanyContext
			}
		}
	}

	ctx := context.Background()
	questions, err := agents.GenerateAssignmentQuestions(ctx, skillGaps, companyCtx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate questions: " + err.Error()})
		return
	}

	// Fetch existing assignment to preserve attempt history
	var existing Assignment
	_, aErr := db.Client.From("assignments").Select("*", "exact", false).Eq("journey_id", journeyId).Single().ExecuteTo(&existing)
	var payload AssignmentPayload
	if aErr == nil {
		if p, pErr := parseAssignmentPayload(existing.Questions); pErr == nil {
			payload.Attempts = p.Attempts
		}
	}
	payload.Questions = questions.Questions
	payload.FocusSkill = focusSkill
	payload.GeneratedAt = time.Now()

	// Upsert style: update if exists else insert
	if aErr == nil {
		_, _, err = db.Client.From("assignments").Update(map[string]any{
			"questions": payload,
			"status":    "pending",
			"score":     0,
		}, "", "").Eq("journey_id", journeyId).Execute()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset assignment: " + err.Error()})
			return
		}
		var updated Assignment
		_, err = db.Client.From("assignments").Select("*", "exact", false).Eq("journey_id", journeyId).Single().ExecuteTo(&updated)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Reattempt created but failed to fetch updated assignment: " + err.Error()})
			return
		}
		updated.Questions = questions.Questions
		updated.Attempts = payload.Attempts
		c.JSON(http.StatusOK, updated)
		return
	}

	newAssignment := Assignment{
		JourneyID: journeyId,
		Questions: payload,
		Status:    "pending",
	}
	var saved Assignment
	_, err = db.Client.From("assignments").Insert(newAssignment, false, "", "", "").Single().ExecuteTo(&saved)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create assignment: " + err.Error()})
		return
	}
	saved.Questions = questions.Questions
	saved.Attempts = payload.Attempts
	c.JSON(http.StatusOK, saved)
}

func SubmitAssignment(c *gin.Context) {
	// Bind manually so we can return precise errors (and avoid Gin binding edge-cases).
	body, _ := io.ReadAll(c.Request.Body)
	var req SubmitAssignmentRequest
	if err := json.Unmarshal(body, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON body: " + err.Error()})
		return
	}
	req.JourneyID = strings.TrimSpace(req.JourneyID)
	if req.JourneyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "journey_id is required"})
		return
	}

	// 1. Update assignment status
	var current Assignment
	_, cErr := db.Client.From("assignments").Select("*", "exact", false).Eq("journey_id", req.JourneyID).Single().ExecuteTo(&current)
	if cErr != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	payload, _ := parseAssignmentPayload(current.Questions)
	attemptNum := len(payload.Attempts) + 1
	attempt := AssignmentAttempt{
		AttemptNumber: attemptNum,
		Score:         req.Score,
		SubmittedAt:   time.Now(),
		Answers:       req.Answers,
	}
	// store skills as generic map so we don't lock schema
	if len(req.Skills) > 0 {
		var skillMaps []map[string]any
		for _, s := range req.Skills {
			skillMaps = append(skillMaps, map[string]any{"name": s.Name, "level": s.Level})
		}
		attempt.Skills = skillMaps
	}
	payload.Attempts = append(payload.Attempts, attempt)

	_, _, err := db.Client.From("assignments").Update(map[string]interface{}{
		"score":     req.Score,
		"status":    "completed",
		"questions": payload,
	}, "", "").Eq("journey_id", req.JourneyID).Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update assignment status: " + err.Error()})
		return
	}

	// 2. Fetch journey + update analysis_result skill levels (so learning plan is based on post-assessment reality)
	var journey models.Journey
	_, err = db.Client.From("journeys").Select("*", "exact", false).Eq("id", req.JourneyID).Single().ExecuteTo(&journey)
	if err == nil && journey.AnalysisResult != nil && len(req.Skills) > 0 {
		finalAnalysis, parseErr := parseFinalAnalysis(journey.AnalysisResult)
		if parseErr == nil {
			// Apply per-skill updated levels (0-10 from frontend; clamp)
			levelByName := map[string]int{}
			for _, s := range req.Skills {
				name := strings.TrimSpace(s.Name)
				if name == "" {
					continue
				}
				lvl := s.Level
				if lvl < 0 {
					lvl = 0
				}
				if lvl > 10 {
					lvl = 10
				}
				levelByName[strings.ToLower(name)] = lvl
			}
			for i := range finalAnalysis.SkillAnalysis {
				key := strings.ToLower(strings.TrimSpace(finalAnalysis.SkillAnalysis[i].Name))
				if lvl, ok := levelByName[key]; ok {
					finalAnalysis.SkillAnalysis[i].EstimatedLevel = lvl
				}
			}
			computeGapAndCritical(finalAnalysis)
			// Save back to journeys.analysis_result for learning plan generator
			_, _, jErr := db.Client.From("journeys").Update(map[string]interface{}{
				"analysis_result": finalAnalysis,
				"status":          "completed",
			}, "", "").Eq("id", req.JourneyID).Execute()
			if jErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update journey analysis_result: " + jErr.Error()})
				return
			}
		}
	} else {
		// Fallback: just mark completed
		_, _, jErr := db.Client.From("journeys").Update(map[string]interface{}{
			"status": "completed",
		}, "", "").Eq("id", req.JourneyID).Execute()
		if jErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update journey status: " + jErr.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Assignment submitted successfully"})
}
