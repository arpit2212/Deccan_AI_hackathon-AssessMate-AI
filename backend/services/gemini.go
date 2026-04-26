package services

import (
	"assessmate-backend/config"
	"context"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

func GetGeminiModel(ctx context.Context) (*genai.GenerativeModel, *genai.Client, error) {
	client, err := genai.NewClient(ctx, option.WithAPIKey(config.AppConfig.GeminiAPIKey))
	if err != nil {
		return nil, nil, err
	}
	model := client.GenerativeModel("gemini-2.5-flash-lite")
	model.ResponseMIMEType = "application/json"
	return model, client, nil
}
