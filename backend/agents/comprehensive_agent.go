package agents

import (
	"assessmate-backend/models"
	"assessmate-backend/services"
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func AnalyzeComprehensive(ctx context.Context, jdText, resumeText, companyName, roleName string) (*models.ComprehensiveOutput, error) {
	model, client, err := services.GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
		You are an AI system combining multiple intelligence sources. 

		--- 

		# INPUT: 

		JD: %s 
		Resume: %s 
		Company: %s 
		Role: %s 

		--- 

		# TASK: 

		1. Use JD to extract required skills and depth 
		2. Use Resume to estimate actual skill levels 
		3. Use Company + Role to understand expectations 

		--- 

		# CRITICAL RULE: 

		DO NOT compute final skill gaps or fit score. 

		DO NOT assign level 0 unless skill is completely absent. 

		ONLY structure the intelligence. 

		--- 

		# OUTPUT (STRICT JSON): 

		{ 
			"jd": {
				"skills": [
					{"name": "Skill Name", "importance": "critical/secondary", "required_level": 1-10, "areas": ["area1"]}
				],
				"hidden_expectations": ["..."]
			}, 
			"resume": {
				"skills": [
					{"name": "Skill Name", "estimated_level": 1-10, "evidence": "...", "depth": {"concepts": "strong/medium/weak", "application": "strong/medium/weak", "debugging": "strong/medium/weak", "performance": "strong/medium/weak"}}
				],
				"confidence_score": 0.0
			}, 
			"company": {
				"difficulty": "medium/hard", 
				"interview_focus": ["..."], 
				"role_expectations": ["..."]
			} 
		}
	`, jdText, resumeText, companyName, roleName)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no response from Gemini")
	}

	var output models.ComprehensiveOutput
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &output); err != nil {
		return nil, err
	}

	return &output, nil
}
