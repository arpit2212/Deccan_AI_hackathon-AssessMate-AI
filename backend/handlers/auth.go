package handlers

import (
	"assessmate-backend/db"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func GetMe(c *gin.Context) {
	userId, _ := c.Get("userId")
	var profile struct {
		ID        string    `json:"id"`
		FullName  string    `json:"full_name"`
		AvatarURL string    `json:"avatar_url"`
		Email     string    `json:"email"`
		CreatedAt time.Time `json:"created_at"`
	}

	_, err := db.Client.From("profiles").Select("*", "exact", false).Eq("id", userId.(string)).Single().ExecuteTo(&profile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch profile: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, profile)
}
