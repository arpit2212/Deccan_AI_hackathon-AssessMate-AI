package agents

import (
	"assessmate-backend/models"
	"assessmate-backend/services"
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func AnalyzeResume(ctx context.Context, resumeText string) (*models.ResumeOutput, error) {
	model, client, err := services.GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
		You are an expert technical interviewer. 

		Your task is to analyze a resume and estimate REAL skill depth. 

		--- 

		# INPUT: 

		Resume: 
		%s 

		--- 

		# THINK STEP BY STEP (internally): 

		1. Identify skills mentioned 
		2. Find evidence: 
		   * projects 
		   * experience 
		   * real usage 
		3. Estimate depth: 

		RULES: 
		* Mention only -> max level 4 
		* Used in 1 project -> max level 6 
		* Used in multiple real projects -> level 6–8 
		* NEVER assign 9–10 unless extremely strong proof 

		4. Analyze depth breakdown: 
		   * concepts 
		   * application 
		   * debugging 
		   * performance 

		--- 

		# CRITICAL RULES: 

		* NEVER return empty skill names 
		* ALWAYS normalize names (React.js -> React) 
		* If no strong evidence -> reduce level 
		* Resume is NOT truth -> be skeptical 

		--- 

		# OUTPUT (STRICT JSON ONLY): 

		{ 
			"skills": [ 
				{ 
					"name": "React", 
					"estimated_level": 6, 
					"evidence": "used in 2 projects with API integration", 
					"depth": { 
						"concepts": "strong", 
						"application": "medium", 
						"debugging": "weak", 
						"performance": "weak" 
					} 
				} 
			], 
			"confidence_score": 0.0 
		} 
	`, resumeText)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no response from Gemini")
	}

	var output models.ResumeOutput
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &output); err != nil {
		return nil, err
	}

	return &output, nil
}
