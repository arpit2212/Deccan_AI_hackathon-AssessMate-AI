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
	ID        string      `json:"id,omitempty"`
	JourneyID string      `json:"journey_id"`
	Questions interface{} `json:"questions"`
	Score     int         `json:"score"`
	Status    string      `json:"status"`
	CreatedAt time.Time   `json:"created_at"`
}

type SubmitAssignmentRequest struct {
	JourneyID string `json:"journey_id" binding:"required"`
	Score     int    `json:"score" binding:"required"`
	Skills    []struct {
		Name  string `json:"name"`
		Level int    `json:"level"`
	} `json:"skills"`
}

func parseFinalAnalysis(v interface{}) (*models.FinalAnalysis, error) {
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
	finalAnalysis, err := parseFinalAnalysis(journey.AnalysisResult)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid analysis_result format"})
		return
	}
	var skillGaps []models.SkillMatch
	for _, s := range finalAnalysis.SkillAnalysis {
		if s.Gap > 0 {
			skillGaps = append(skillGaps, s)
		}
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
	newAssignment := Assignment{
		JourneyID: journeyId,
		Questions: questions.Questions,
		Status:    "pending",
	}

	var savedAssignment Assignment
	_, err = db.Client.From("assignments").Insert(newAssignment, false, "", "", "").Single().ExecuteTo(&savedAssignment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save assignment: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, savedAssignment)
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
	_, _, err := db.Client.From("assignments").Update(map[string]interface{}{
		"score":  req.Score,
		"status": "completed",
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
