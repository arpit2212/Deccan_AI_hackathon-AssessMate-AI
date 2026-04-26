package routes

import (
	"github.com/gin-gonic/gin"
	"assessmate-backend/handlers"
	"assessmate-backend/middleware"
)

func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/me", handlers.GetMe)
			protected.POST("/analyze", handlers.Analyze)
			protected.GET("/assignment/:journeyId", handlers.GetOrCreateAssignment)
			protected.POST("/assignment/submit", handlers.SubmitAssignment)
			protected.GET("/learning-plan/:journeyId", handlers.GetOrCreateLearningPlan)
		}
	}
}
