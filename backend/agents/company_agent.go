package agents

import (
	"assessmate-backend/models"
	"assessmate-backend/services"
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func AnalyzeCompanyAndRole(ctx context.Context, companyName, roleName string) (*models.CompanyOutput, error) {
	model, client, err := services.GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
		You are a career intelligence analyst. 

		Your task is to analyze the company and role expectations. 

		--- 

		# INPUT: 

		Role: %s 
		Company: %s 

		--- 

		# THINK STEP BY STEP: 

		1. Identify: 
		   * type of company (startup / product / enterprise) 
		2. Infer: 
		   * interview style 
		   * difficulty level 
		   * evaluation focus 
		3. Identify role expectations: 
		   * what skills are tested deeply 

		--- 

		# RULES: 

		* If company is unknown -> use industry standards 
		* Focus on REAL hiring behavior 

		--- 

		# OUTPUT (STRICT JSON): 

		{ 
			"difficulty": "medium/hard", 
			"interview_focus": ["DSA", "debugging", "system design"], 
			"role_expectations": ["performance", "scalability", "problem-solving"] 
		} 
	`, roleName, companyName)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no response from Gemini")
	}

	var output models.CompanyOutput
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &output); err != nil {
		return nil, err
	}

	return &output, nil
}
