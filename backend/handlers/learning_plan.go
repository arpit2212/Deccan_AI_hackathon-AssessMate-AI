package handlers

import (
	"assessmate-backend/agents"
	"assessmate-backend/db"
	"assessmate-backend/models"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type LearningPlan struct {
	ID             string      `json:"id,omitempty"`
	JourneyID      string      `json:"journey_id"`
	PlanData       interface{} `json:"plan_data"`
	TimeConstraint string      `json:"time_constraint"`
	CreatedAt      time.Time   `json:"created_at"`
}

type UpdateLearningProgressRequest struct {
	CompletedTaskIndexes []int `json:"completed_task_indexes"`
}

type LearningChatRequest struct {
	Message string `json:"message"`
}

type YouTubeSuggestionResponse struct {
	YouTubeResources []models.LearningResource `json:"youtube_resources"`
}

func toMap(v interface{}) map[string]interface{} {
	out := map[string]interface{}{}
	b, err := json.Marshal(v)
	if err != nil {
		return out
	}
	_ = json.Unmarshal(b, &out)
	return out
}

type LearningPlanListItem struct {
	ID             string    `json:"id"`
	JourneyID      string    `json:"journey_id"`
	RoleName       string    `json:"role_name"`
	CompanyName    string    `json:"company_name"`
	TimeConstraint string    `json:"time_constraint"`
	CreatedAt      time.Time `json:"created_at"`
}

func ListLearningPlans(c *gin.Context) {
	userId, _ := c.Get("userId")
	uid, _ := userId.(string)
	if uid == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var journeys []models.Journey
	_, err := db.Client.From("journeys").Select("*", "exact", false).Eq("user_id", uid).ExecuteTo(&journeys)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch journeys"})
		return
	}

	items := []LearningPlanListItem{}
	for _, j := range journeys {
		var lp LearningPlan
		_, lpErr := db.Client.From("learning_plans").Select("*", "exact", false).Eq("journey_id", j.ID).Single().ExecuteTo(&lp)
		if lpErr != nil {
			continue
		}
		items = append(items, LearningPlanListItem{
			ID:             lp.ID,
			JourneyID:      j.ID,
			RoleName:       j.RoleName,
			CompanyName:    j.CompanyName,
			TimeConstraint: lp.TimeConstraint,
			CreatedAt:      lp.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, items)
}

func GetOrCreateLearningPlan(c *gin.Context) {
	journeyId := c.Param("journeyId")
	timeConstraint := c.Query("time") // e.g., "2 weeks, 10 hours/week"

	// Gate: user must complete assignment before learning plan
	var assignment struct {
		Status string `json:"status"`
	}
	_, aErr := db.Client.From("assignments").Select("status", "exact", false).Eq("journey_id", journeyId).Single().ExecuteTo(&assignment)
	if aErr != nil || assignment.Status != "completed" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Complete the assignment to unlock your learning plan."})
		return
	}

	// 1. Check if plan already exists
	var existingPlan LearningPlan
	_, err := db.Client.From("learning_plans").Select("*", "exact", false).Eq("journey_id", journeyId).Single().ExecuteTo(&existingPlan)
	if err == nil {
		c.JSON(http.StatusOK, existingPlan)
		return
	}

	// 2. Fetch journey data (including assignment score/results if needed)
	var journey models.Journey
	_, err = db.Client.From("journeys").Select("*", "exact", false).Eq("id", journeyId).Single().ExecuteTo(&journey)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Journey not found"})
		return
	}

	// 3. Generate Learning Plan via Gemini
	ctx := context.Background()
	planOutput, err := agents.GenerateLearningPlan(ctx, journey.AnalysisResult, timeConstraint)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate learning plan: " + err.Error()})
		return
	}

	// 4. Save to DB
	newPlan := LearningPlan{
		JourneyID:      journeyId,
		PlanData:       planOutput,
		TimeConstraint: timeConstraint,
	}

	var savedPlan LearningPlan
	_, err = db.Client.From("learning_plans").Insert(newPlan, false, "", "", "").Single().ExecuteTo(&savedPlan)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save learning plan: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, savedPlan)
}

func UpdateLearningProgress(c *gin.Context) {
	journeyId := c.Param("journeyId")
	var req UpdateLearningProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var plan LearningPlan
	_, err := db.Client.From("learning_plans").Select("*", "exact", false).Eq("journey_id", journeyId).Single().ExecuteTo(&plan)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning plan not found"})
		return
	}

	planMap := toMap(plan.PlanData)
	tasksRaw, _ := planMap["tasks"].([]interface{})
	max := len(tasksRaw)

	safe := []int{}
	seen := map[int]bool{}
	for _, idx := range req.CompletedTaskIndexes {
		if idx >= 0 && idx < max && !seen[idx] {
			safe = append(safe, idx)
			seen[idx] = true
		}
	}

	completionPercent := 0.0
	if max > 0 {
		completionPercent = float64(len(safe)) / float64(max) * 100
	}
	planMap["learning_progress"] = map[string]interface{}{
		"completed_task_indexes": safe,
		"completion_percent":     completionPercent,
		"updated_at":             time.Now().Format(time.RFC3339),
	}

	_, _, err = db.Client.From("learning_plans").Update(map[string]interface{}{
		"plan_data": planMap,
	}, "", "").Eq("journey_id", journeyId).Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update progress: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":            "Progress updated",
		"completion_percent": completionPercent,
		"completed_count":    len(safe),
		"total_tasks":        max,
	})
}

func LearningPlanChat(c *gin.Context) {
	journeyId := c.Param("journeyId")
	var req LearningChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message is required"})
		return
	}

	var plan LearningPlan
	_, err := db.Client.From("learning_plans").Select("*", "exact", false).Eq("journey_id", journeyId).Single().ExecuteTo(&plan)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning plan not found"})
		return
	}

	planMap := toMap(plan.PlanData)
	history := []map[string]interface{}{}
	if raw, ok := planMap["chat_history"].([]interface{}); ok {
		for _, m := range raw {
			if mm, ok := m.(map[string]interface{}); ok {
				history = append(history, mm)
			}
		}
	}

	reply, chatErr := agents.ChatOnLearningPlan(c.Request.Context(), planMap, history, req.Message)
	if chatErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate mentor reply: " + chatErr.Error()})
		return
	}

	history = append(history,
		map[string]interface{}{"role": "user", "message": req.Message, "at": time.Now().Format(time.RFC3339)},
		map[string]interface{}{"role": "assistant", "message": reply, "at": time.Now().Format(time.RFC3339)},
	)
	planMap["chat_history"] = history

	_, _, err = db.Client.From("learning_plans").Update(map[string]interface{}{
		"plan_data": planMap,
	}, "", "").Eq("journey_id", journeyId).Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save chat history: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reply":        reply,
		"chat_history": history,
	})
}

func extractSkillNamesFromAnalysis(raw interface{}) []string {
	names := []string{}
	seen := map[string]bool{}

	m, ok := raw.(map[string]interface{})
	if !ok {
		return names
	}
	items, ok := m["skill_analysis"].([]interface{})
	if !ok {
		return names
	}
	for _, item := range items {
		skillMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		name, _ := skillMap["name"].(string)
		if strings.TrimSpace(name) == "" {
			name, _ = skillMap["skill"].(string)
		}
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		names = append(names, name)
	}
	return names
}

func normalizeToMap(raw interface{}) map[string]interface{} {
	if raw == nil {
		return map[string]interface{}{}
	}
	if m, ok := raw.(map[string]interface{}); ok {
		return m
	}
	if s, ok := raw.(string); ok && strings.TrimSpace(s) != "" {
		var parsed map[string]interface{}
		if err := json.Unmarshal([]byte(s), &parsed); err == nil && len(parsed) > 0 {
			return parsed
		}
	}
	return toMap(raw)
}

func appendUniqueSkills(dst []string, seen map[string]bool, values ...string) []string {
	for _, v := range values {
		normalized := strings.TrimSpace(v)
		if normalized == "" {
			continue
		}
		key := strings.ToLower(normalized)
		if seen[key] {
			continue
		}
		seen[key] = true
		dst = append(dst, normalized)
	}
	return dst
}

func deriveSkillsFromText(text string) []string {
	low := strings.ToLower(text)
	skills := []string{}
	seen := map[string]bool{}
	add := func(skill string) {
		key := strings.ToLower(strings.TrimSpace(skill))
		if key == "" || seen[key] {
			return
		}
		seen[key] = true
		skills = append(skills, skill)
	}

	if strings.Contains(low, "react") {
		add("React")
	}
	if strings.Contains(low, "typescript") {
		add("TypeScript")
	}
	if strings.Contains(low, "javascript") || strings.Contains(low, "es6") {
		add("JavaScript")
	}
	if strings.Contains(low, "next.js") || strings.Contains(low, "nextjs") {
		add("Next.js")
	}
	if strings.Contains(low, "state management") || strings.Contains(low, "redux") || strings.Contains(low, "zustand") || strings.Contains(low, "context api") {
		add("State Management")
	}
	if strings.Contains(low, "test") || strings.Contains(low, "jest") || strings.Contains(low, "cypress") || strings.Contains(low, "testing library") {
		add("Testing")
	}
	if strings.Contains(low, "performance") || strings.Contains(low, "optimiz") {
		add("Performance Optimization")
	}
	if strings.Contains(low, "system design") || strings.Contains(low, "architecture") {
		add("System Design")
	}
	if strings.Contains(low, "debug") || strings.Contains(low, "problem") {
		add("Problem Solving")
	}
	if strings.Contains(low, "ci/cd") || strings.Contains(low, "deployment") || strings.Contains(low, "devops") {
		add("CI/CD")
	}
	if strings.Contains(low, "api") {
		add("APIs")
	}
	return skills
}

func GetLearningYouTubeSuggestions(c *gin.Context) {
	journeyId := c.Param("journeyId")
	refresh := c.Query("refresh") == "1"

	var plan LearningPlan
	_, err := db.Client.From("learning_plans").Select("*", "exact", false).Eq("journey_id", journeyId).Single().ExecuteTo(&plan)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning plan not found"})
		return
	}

	planMap := toMap(plan.PlanData)
	if !refresh {
		if existingRaw, ok := planMap["youtube_suggestions"]; ok {
			b, marshalErr := json.Marshal(existingRaw)
			if marshalErr == nil {
				var existing []models.LearningResource
				if unmarshalErr := json.Unmarshal(b, &existing); unmarshalErr == nil && len(existing) > 0 {
					c.JSON(http.StatusOK, YouTubeSuggestionResponse{YouTubeResources: existing})
					return
				}
			}
		}
	}

	skills := []string{}
	seenSkills := map[string]bool{}

	if rawFocus, ok := planMap["focus_skills"].([]interface{}); ok {
		for _, s := range rawFocus {
			if skill, ok := s.(string); ok && skill != "" {
				skills = appendUniqueSkills(skills, seenSkills, skill)
			}
		}
	}

	// Fallback: infer from nodes[].data.skill
	if rawNodes, ok := planMap["nodes"].([]interface{}); ok {
		for _, n := range rawNodes {
			nodeMap, ok := n.(map[string]interface{})
			if !ok {
				continue
			}
			dataMap, _ := nodeMap["data"].(map[string]interface{})
			if skill, ok := dataMap["skill"].(string); ok {
				skills = appendUniqueSkills(skills, seenSkills, skill)
			}
		}
	}

	// Fallback: infer from existing youtube_resources skill tag
	if rawResources, ok := planMap["youtube_resources"].([]interface{}); ok {
		for _, r := range rawResources {
			resourceMap, ok := r.(map[string]interface{})
			if !ok {
				continue
			}
			if skill, ok := resourceMap["skill"].(string); ok {
				skills = appendUniqueSkills(skills, seenSkills, skill)
			}
		}
	}

	if len(skills) == 0 {
		var journey models.Journey
		_, jErr := db.Client.From("journeys").Select("analysis_result, role_name", "exact", false).Eq("id", journeyId).Single().ExecuteTo(&journey)
		if jErr == nil {
			if analysisMap := normalizeToMap(journey.AnalysisResult); len(analysisMap) > 0 {
				for _, s := range extractSkillNamesFromAnalysis(analysisMap) {
					skills = appendUniqueSkills(skills, seenSkills, s)
				}
			}
			for _, s := range deriveSkillsFromText(journey.RoleName) {
				skills = appendUniqueSkills(skills, seenSkills, s)
			}
		}
	}

	if len(skills) == 0 {
		if rawTasks, ok := planMap["tasks"].([]interface{}); ok {
			for _, t := range rawTasks {
				if text, ok := t.(string); ok {
					for _, s := range deriveSkillsFromText(text) {
						skills = appendUniqueSkills(skills, seenSkills, s)
					}
				}
			}
		}
		if rawNodes, ok := planMap["nodes"].([]interface{}); ok {
			for _, n := range rawNodes {
				nodeMap, ok := n.(map[string]interface{})
				if !ok {
					continue
				}
				dataMap, _ := nodeMap["data"].(map[string]interface{})
				if label, ok := dataMap["label"].(string); ok {
					for _, s := range deriveSkillsFromText(label) {
						skills = appendUniqueSkills(skills, seenSkills, s)
					}
				}
			}
		}
	}

	if len(skills) == 0 {
		skills = append(skills, "Problem Solving", "System Design", "Interview Preparation")
	}

	youtubeResources, recErr := agents.RecommendYouTubeCourses(c.Request.Context(), skills, planMap, 8)
	if recErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate YouTube suggestions: " + recErr.Error()})
		return
	}

	planMap["youtube_suggestions"] = youtubeResources

	_, _, err = db.Client.From("learning_plans").Update(map[string]interface{}{
		"plan_data": planMap,
	}, "", "").Eq("journey_id", journeyId).Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save YouTube suggestions: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, YouTubeSuggestionResponse{YouTubeResources: youtubeResources})
}
