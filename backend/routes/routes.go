package routes

import (
	"assessmate-backend/handlers"
	"assessmate-backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/me", handlers.GetMe)
			protected.GET("/journeys", handlers.GetJourneys)
			protected.GET("/journeys/:journeyId", handlers.GetJourney)
			protected.POST("/analyze", handlers.Analyze)
			protected.GET("/assignment/:journeyId", handlers.GetOrCreateAssignment)
			protected.POST("/assignment/submit", handlers.SubmitAssignment)
			protected.GET("/learning-plan/:journeyId", handlers.GetOrCreateLearningPlan)
		}
	}
}
