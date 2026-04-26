package agents

import (
	"assessmate-backend/models"
	"assessmate-backend/services"
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func GenerateLearningPlan(ctx context.Context, analysisResult interface{}, timeConstraint string) (*models.LearningPlanOutput, error) {
	model, client, err := services.GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
		As a Senior Learning Strategist, generate a task-based, personalized learning roadmap.
		
		INPUT DATA:
		1. Analysis Result (Skills, Gaps, Fit Score): %v
		2. Time Constraint: %s

		CRITICAL CHANGE:
		- DO NOT generate generic plans (e.g., "Learn React").
		- TARGET specific weak areas and critical gaps identified in the analysis.
		- MUST be task-based and actionable.
		  Example: Instead of "Learn React Memoization", use "Optimize a slow React dashboard by implementing React.memo and useMemo for heavy computations".
		- ALIGN with the time constraint provided.
		
		Return ONLY a JSON object in this format:
		{
			"nodes": [
				{"id": "node-1", "type": "input", "position": {"x": 250, "y": 5}, "data": {"label": "Actionable Task 1"}}
			],
			"edges": [
				{"id": "edge-1", "source": "node-1", "target": "node-2"}
			],
			"tasks": [
				"Detailed, specific task description 1",
				"Detailed, specific task description 2"
			]
		}
	`, analysisResult, timeConstraint)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no response from Gemini")
	}

	var output models.LearningPlanOutput
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &output); err != nil {
		return nil, err
	}

	return &output, nil
}
