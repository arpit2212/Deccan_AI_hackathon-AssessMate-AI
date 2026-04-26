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

func GenerateLearningPlan(ctx context.Context, analysisResult interface{}, timeConstraint string) (*models.LearningPlanOutput, error) {
	model, client, err := services.GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
You are a principal learning architect for software interview preparation.

INPUT:
1) Analysis Result: %v
2) Time Constraint: %s

GOAL:
- Create a deep, structured learning plan to close skill gaps.
- Include practical tasks, milestones, and measurable outcomes.
- Include high-quality YouTube resources for each major weak skill.

RULES:
- No generic advice (avoid "learn X").
- Every task must be concrete and project-like.
- Plan should be phased (foundation -> applied -> advanced -> interview simulation).
- Include clear analytics to track progress.
- Keep YouTube links real and in full URL form.

OUTPUT STRICT JSON:
{
  "title": "4-Week Backend Security + System Design Plan",
  "summary": "One-paragraph strategy",
  "estimated_weeks": 4,
  "focus_skills": ["Web Security", "System Design"],
  "nodes": [
    {
      "id": "n1",
      "type": "input/default/output",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Implement JWT auth hardening checklist",
        "skill": "Web Security",
        "phase": "foundation/applied/advanced/simulation",
        "difficulty": "easy/medium/hard",
        "duration_hrs": 6,
        "outcome": "Measurable expected outcome"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2" }
  ],
  "tasks": [
    "Task 1 with deliverable",
    "Task 2 with deliverable"
  ],
  "analytics": {
    "total_hours": 48,
    "difficulty_mix": { "easy": 20, "medium": 50, "hard": 30 },
    "skill_coverage": [
      { "skill": "Web Security", "hours": 20, "target_level": 7 }
    ],
    "weekly_milestones": [
      "Week 1: secure auth and validation baseline complete"
    ]
  },
  "youtube_resources": [
    {
      "title": "OWASP Top 10 Explained",
      "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
      "skill": "Web Security",
      "duration": "35m"
    }
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

func ChatOnLearningPlan(ctx context.Context, planData interface{}, chatHistory interface{}, message string) (string, error) {
	model, client, err := services.GetGeminiModel(ctx)
	if err != nil {
		return "", err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
You are a friendly technical mentor helping a learner follow their learning roadmap.

PLAN DATA:
%v

CHAT HISTORY:
%v

USER MESSAGE:
%s

RULES:
- Keep answer practical and action-oriented.
- Reference specific tasks/skills from the roadmap when possible.
- If user is stuck, give a step-by-step unblock plan.
- Keep response concise (max ~180 words).

RETURN STRICT JSON ONLY:
{
  "reply": "your response"
}
`, planData, chatHistory, message)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", err
	}
	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return "", fmt.Errorf("no response from Gemini")
	}

	var out struct {
		Reply string `json:"reply"`
	}
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &out); err != nil {
		return "", err
	}
	if out.Reply == "" {
		return "", fmt.Errorf("empty mentor reply")
	}
	return out.Reply, nil
}

func extractFirstJSONObjectLP(raw string) (string, error) {
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

func RecommendYouTubeCourses(ctx context.Context, skills []string, planData interface{}, maxItems int) ([]models.LearningResource, error) {
	model, client, err := services.GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	if maxItems <= 0 {
		maxItems = 8
	}

	prompt := fmt.Sprintf(`
You are a technical learning curator for interview preparation.

INPUT:
1) Skills needed: %v
2) Learning plan data: %v
3) Maximum items: %d

GOAL:
- Suggest high-quality YouTube learning resources that directly help close the listed skill gaps.
- Prefer practical courses/playlists and strong tutorial videos over generic motivation content.

RULES:
- Return between 4 and %d items.
- Each item must map to a specific skill.
- URL must be a full YouTube URL.
- Include title, skill, and rough duration.
- Avoid duplicates.
- Output JSON only (no markdown, no explanation).

RETURN STRICT JSON:
{
  "youtube_resources": [
    {
      "title": "System Design Interview Course",
      "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
      "skill": "System Design",
      "duration": "2h 10m"
    }
  ]
}
`, skills, planData, maxItems, maxItems)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}
	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from Gemini")
	}

	raw := fmt.Sprint(resp.Candidates[0].Content.Parts[0])
	jsonOnly, err := extractFirstJSONObjectLP(raw)
	if err != nil {
		return nil, fmt.Errorf("failed to extract JSON from model output: %w", err)
	}

	var out struct {
		YouTubeResources []models.LearningResource `json:"youtube_resources"`
	}
	if err := json.Unmarshal([]byte(jsonOnly), &out); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini JSON: %w", err)
	}
	if len(out.YouTubeResources) == 0 {
		return nil, fmt.Errorf("empty youtube resource recommendations")
	}
	if len(out.YouTubeResources) > maxItems {
		out.YouTubeResources = out.YouTubeResources[:maxItems]
	}

	return out.YouTubeResources, nil
}
