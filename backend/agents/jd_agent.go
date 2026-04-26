package agents

import (
	"assessmate-backend/models"
	"assessmate-backend/services"
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func AnalyzeJD(ctx context.Context, jdText string) (*models.JDOutput, error) {
	model, client, err := services.GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
		You are a senior software engineer and hiring manager. 

		Your task is to deeply analyze a Job Description and extract REAL skill requirements. 

		--- 

		# INPUT: 

		Job Description: 
		%s 

		--- 

		# THINK STEP BY STEP (internally, do NOT output this): 

		1. Identify all technical skills mentioned 

		2. Classify: 
		   * critical (must-have) 
		   * secondary (nice-to-have) 

		3. Estimate REAL required depth (1–10): 
		   * 3–4 -> beginner 
		   * 5–6 -> working knowledge 
		   * 7–8 -> strong production experience 
		   * 9–10 -> expert level 

		4. Identify hidden expectations: 
		   * debugging 
		   * performance 
		   * scalability 
		   * ownership 

		--- 

		# IMPORTANT RULES: 

		* Do NOT assume beginner level unless explicitly stated 
		* For roles like "Frontend Engineer", React is usually 7–9 
		* Infer real-world expectations, not just text 

		--- 

		# OUTPUT (STRICT JSON ONLY): 

		{ 
			"skills": [ 
				{ 
					"name": "React", 
					"importance": "critical", 
					"required_level": 8, 
					"areas": ["performance", "debugging", "state management"] 
				} 
			], 
			"hidden_expectations": ["debugging", "performance", "ownership"] 
		} 
	`, jdText)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no response from Gemini")
	}

	var output models.JDOutput
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &output); err != nil {
		return nil, err
	}

	return &output, nil
}
