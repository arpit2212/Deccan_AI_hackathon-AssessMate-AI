package handlers

import (
	"net/http"

	"assessmate-backend/db"
	"assessmate-backend/services"
	"time"

	"github.com/gin-gonic/gin"
)

type Journey struct {
	ID             string      `json:"id,omitempty"`
	UserID         string      `json:"user_id"`
	RoleName       string      `json:"role_name"`
	CompanyName    string      `json:"company_name"`
	JDText         string      `json:"jd_text"`
	ResumeText     string      `json:"resume_text"`
	AnalysisResult interface{} `json:"analysis_result"`
	CompanyContext interface{} `json:"company_context"`
	Status         string      `json:"status"`
	CreatedAt      time.Time   `json:"created_at"`
}

type AnalyzeRequest struct {
	JDText      string `json:"jd_text" binding:"required"`
	ResumeText  string `json:"resume_text" binding:"required"`
	CompanyName string `json:"company_name" binding:"required"`
	RoleName    string `json:"role_name" binding:"required"`
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
	compOutput, err := services.AnalyzeComprehensive(ctx, req.JDText, req.ResumeText, req.CompanyName, req.RoleName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Analysis failed: " + err.Error()})
		return
	}

	// 2. Intelligence Layer (Backend Logic)
	intelligenceResult := services.PerformIntelligenceAnalysis(&compOutput.JD, &compOutput.Resume)

	// 3. Store in DB
	journey := Journey{
		UserID:         userId,
		RoleName:       req.RoleName,
		CompanyName:    req.CompanyName,
		JDText:         req.JDText,
		ResumeText:     req.ResumeText,
		AnalysisResult: intelligenceResult,
		CompanyContext: compOutput.Company,
		Status:         "analyzed",
	}

	var savedJourney Journey
	_, err = db.Client.From("journeys").Insert(journey, false, "", "", "").Single().ExecuteTo(&savedJourney)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save journey: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Analysis complete! Complete your assignment through the assignment tab.",
		"journey_id": savedJourney.ID,
		"analysis":   intelligenceResult,
		"company":    compOutput.Company,
	})
}
