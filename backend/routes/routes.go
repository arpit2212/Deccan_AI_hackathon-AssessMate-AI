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
		}
	}
}
