package handlers

import (
	"assessmate-backend/db"
	"assessmate-backend/services"
	"context"
	"log"
	"net/http"
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
	var journey Journey
	_, err = db.Client.From("journeys").Select("*", "exact", false).Eq("id", journeyId).Single().ExecuteTo(&journey)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Journey not found"})
		return
	}

	// 3. Extract skill gaps from analysis result
	// Note: We need to parse analysis_result which is interface{}
	// For simplicity, we'll just use a helper or type assertion if we know the structure
	analysis := journey.AnalysisResult.(map[string]interface{})
	skillAnalysis := analysis["skill_analysis"].([]interface{})
	var skillGaps []string
	for _, s := range skillAnalysis {
		skillMap := s.(map[string]interface{})
		if gap, ok := skillMap["gap"].(float64); ok && gap > 0 {
			skillGaps = append(skillGaps, skillMap["skill"].(string))
		}
	}

	companyCtx := ""
	if journey.CompanyContext != nil {
		compMap := journey.CompanyContext.(map[string]interface{})
		companyCtx = compMap["company_context"].(string)
	}

	// 4. Generate 20 questions
	ctx := context.Background()
	questions, err := services.GenerateAssignmentQuestions(ctx, skillGaps, companyCtx)
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
	var req SubmitAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	userId, ok := userIdValue.(string)
	if !ok || userId == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid User ID format"})
		return
	}

	// 1. Update assignment status and score
	updateData := map[string]interface{}{
		"score":  req.Score,
		"status": "completed",
	}
	_, _, err := db.Client.From("assignments").Update(updateData, "", "").Eq("journey_id", req.JourneyID).Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update assignment: " + err.Error()})
		return
	}

	// 2. Update user skills
	for _, skill := range req.Skills {
		skillData := map[string]interface{}{
			"user_id":       userId,
			"skill_name":    skill.Name,
			"mastery_level": skill.Level,
			"updated_at":    time.Now(),
		}
		// Upsert skill
		_, _, err = db.Client.From("user_skills").Upsert(skillData, "", "", "").Execute()
		if err != nil {
			log.Printf("Failed to update skill %s: %v", skill.Name, err)
		}
	}

	// 3. Update journey status
	_, _, _ = db.Client.From("journeys").Update(map[string]interface{}{"status": "completed"}, "", "").Eq("id", req.JourneyID).Execute()

	c.JSON(http.StatusOK, gin.H{"message": "Assignment submitted successfully"})
}
