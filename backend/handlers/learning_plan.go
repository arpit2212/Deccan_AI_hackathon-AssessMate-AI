package handlers

import (
	"assessmate-backend/agents"
	"assessmate-backend/db"
	"assessmate-backend/models"
	"context"
	"net/http"
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

func GetOrCreateLearningPlan(c *gin.Context) {
	journeyId := c.Param("journeyId")
	timeConstraint := c.Query("time") // e.g., "2 weeks, 10 hours/week"

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
