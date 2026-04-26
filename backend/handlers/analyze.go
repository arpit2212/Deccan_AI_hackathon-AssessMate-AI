package handlers

import (
	"net/http"

	"assessmate-backend/agents"
	"assessmate-backend/db"
	"assessmate-backend/models"
	"assessmate-backend/services"

	"github.com/gin-gonic/gin"
)

type AnalyzeRequest struct {
	JDText      string `json:"jd_text"`
	ResumeText  string `json:"resume_text"`
	CompanyName string `json:"company_name"`
	RoleName    string `json:"role_name"`
}

func Analyze(c *gin.Context) {
	var req AnalyzeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
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

	// 1. Run Comprehensive Analysis (Combined Agent to save quota)
	compOutput, err := agents.AnalyzeComprehensive(ctx, req.JDText, req.ResumeText, req.CompanyName, req.RoleName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Analysis failed: " + err.Error()})
		return
	}

	// 2. Intelligence Layer (Backend Logic)
	intelligenceResult := services.PerformIntelligenceAnalysis(&compOutput.JD, &compOutput.Resume)

	// 3. Store in DB
	journey := models.Journey{
		UserID:         userId,
		RoleName:       req.RoleName,
		CompanyName:    req.CompanyName,
		JDText:         req.JDText,
		ResumeText:     req.ResumeText,
		AnalysisResult: intelligenceResult,
		CompanyContext: compOutput.Company,
		Status:         "analyzed",
	}

	var savedJourney models.Journey
	_, err = db.Client.From("journeys").Insert(journey, false, "", "", "").Single().ExecuteTo(&savedJourney)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save journey: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Analysis complete! Complete your assessment through the assignment tab.",
		"journey_id": savedJourney.ID,
		"analysis":   intelligenceResult,
		"company":    compOutput.Company,
	})
}

func GetJourneys(c *gin.Context) {
	userId, _ := c.Get("userId")

	var journeys []models.Journey
	_, err := db.Client.From("journeys").
		Select("*", "exact", false).
		Eq("user_id", userId.(string)).
		Order("created_at", nil).
		ExecuteTo(&journeys)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch journeys"})
		return
	}

	c.JSON(http.StatusOK, journeys)
}

func GetJourney(c *gin.Context) {
	id := c.Param("id")
	userId, _ := c.Get("userId")

	var journey models.Journey
	_, err := db.Client.From("journeys").
		Select("*", "exact", false).
		Eq("id", id).
		Eq("user_id", userId.(string)).
		Single().
		ExecuteTo(&journey)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Journey not found"})
		return
	}

	c.JSON(http.StatusOK, journey)
}
