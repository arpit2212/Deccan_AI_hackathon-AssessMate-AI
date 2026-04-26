package agents

import (
	"assessmate-backend/models"
	"assessmate-backend/services"
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/generative-ai-go/genai"
)

func extractFirstJSONObject(raw string) (string, error) {
	// Try decoding from each '{' until we can decode a full JSON object.
	for i := strings.Index(raw, "{"); i >= 0; {
		sub := strings.TrimSpace(raw[i:])
		var v any
		dec := json.NewDecoder(strings.NewReader(sub))
		dec.UseNumber()
		if err := dec.Decode(&v); err == nil {
			b, marshalErr := json.Marshal(v)
			if marshalErr != nil {
				return "", fmt.Errorf("failed to re-marshal json: %w", marshalErr)
			}
			return string(b), nil
		}
		next := strings.Index(raw[i+1:], "{")
		if next < 0 {
			break
		}
		i = i + 1 + next
	}
	return "", fmt.Errorf("no JSON object found in model output")
}

func GenerateAssignmentQuestions(ctx context.Context, skillGaps []models.SkillMatch, companyCtx string) (*models.AssessmentAgentOutput, error) {
	model, client, err := services.GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	skillGapsJSON, _ := json.Marshal(skillGaps)
	companyCtx = strings.TrimSpace(companyCtx)

	prompt := fmt.Sprintf(`
You are a senior technical interviewer designing a REAL skill assessment.
		
---

# INPUT:

1. Skill Gaps (with depth info): %s
2. Company Context: %s

---

# GOAL:

Design an assessment that reveals TRUE skill depth.

NOT theoretical knowledge.

---

# STRUCTURE:

Create 20 questions in this order:

1–5 → Easy (baseline understanding)
6–12 → Medium (application)
13–17 → Hard (real-world problems)
18–20 → Expert (edge cases / system thinking)

---

# QUESTION TYPES:

* mcq (concept clarity)
* debugging (REAL broken code)
* scenario (real-world problems)
* performance (performance optimization)
* design (system design)

---

# CRITICAL RULES:

1. Each question MUST target:
   * a specific skill (use one of the skill_name values from the input)
   * a specific area (performance/debugging/etc)

2. Debugging questions MUST:
   * include real buggy code
   * not trivial syntax errors
   * reflect real-world issues

3. Difficulty MUST adapt to the user's current estimated_level from the input:
   * lower estimated_level => easier questions earlier for that skill
   * higher estimated_level => more hard/expert for that skill

4. DO NOT generate generic questions.

---

# OUTPUT FORMAT (STRICT JSON):

{
  "questions": [
    {
      "id": "q1",
      "question_text": "...",
      "type": "mcq/debugging/scenario/performance/design",
      "difficulty": "easy/medium/hard/expert",
      "skill_name": "React",
      "area": "performance",
      "options": [],
      "correct_answer": "...",
      "explanation": "...",
      "evaluation_weight": 1
    }
  ]
}
	`, string(skillGapsJSON), companyCtx)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no response from Gemini")
	}

	raw := fmt.Sprint(resp.Candidates[0].Content.Parts[0])
	raw = strings.TrimSpace(raw)
	jsonOnly, err := extractFirstJSONObject(raw)
	if err != nil {
		return nil, fmt.Errorf("failed to extract JSON from model output: %w", err)
	}

	var output models.AssessmentAgentOutput
	if err := json.Unmarshal([]byte(jsonOnly), &output); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini JSON: %w", err)
	}

	return &output, nil
}
