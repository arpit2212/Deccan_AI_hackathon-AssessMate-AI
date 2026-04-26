package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetMe(c *gin.Context) {
	userId, _ := c.Get("userId")
	email, _ := c.Get("email")

	// In a real app, you might fetch more details from a database here
	c.JSON(http.StatusOK, gin.H{
		"id":    userId,
		"email": email,
		"full_name": "User Name", // This could be extracted from claims or DB
	})
}
