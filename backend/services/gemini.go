package services

import (
	"assessmate-backend/config"
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type CompanyOutput struct {
	RoleAnalysis     string   `json:"role_analysis"`
	CompanyContext   string   `json:"company_context"`
	InterviewProcess []string `json:"interview_process"`
	RoleExpectations []string `json:"role_expectations"`
	RecommendedFocus []string `json:"recommended_focus"`
}

type JDOutput struct {
	Skills []JDSkill `json:"skills"`
}

type JDSkill struct {
	Name          string   `json:"name"`
	Importance    string   `json:"importance"`
	RequiredLevel int      `json:"required_level"`
	Areas         []string `json:"areas"`
}

type ResumeOutput struct {
	Skills []ResumeSkill `json:"skills"`
}

type ResumeSkill struct {
	Name           string            `json:"name"`
	EstimatedLevel int               `json:"estimated_level"`
	Evidence       string            `json:"evidence"`
	Depth          map[string]string `json:"depth"`
}

type AssessmentQuestion struct {
	QuestionText  string   `json:"question_text"`
	Type          string   `json:"type"`
	Difficulty    string   `json:"difficulty"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correct_answer"`
	Explanation   string   `json:"explanation"`
	SkillName     string   `json:"skill_name"`
}

type AssessmentAgentOutput struct {
	Questions []AssessmentQuestion `json:"questions"`
}

type LearningPlanOutput struct {
	Nodes []RFNode `json:"nodes"`
	Edges []RFEdge `json:"edges"`
	Tasks []string `json:"tasks"`
}

type RFNode struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Position struct {
		X float64 `json:"x"`
		Y float64 `json:"y"`
	} `json:"position"`
	Data struct {
		Label string `json:"label"`
	} `json:"data"`
}

type RFEdge struct {
	ID     string `json:"id"`
	Source string `json:"source"`
	Target string `json:"target"`
}

type ComprehensiveOutput struct {
	JD      JDOutput      `json:"jd"`
	Resume  ResumeOutput  `json:"resume"`
	Company CompanyOutput `json:"company"`
}

func AnalyzeComprehensive(ctx context.Context, jdText, resumeText, companyName, roleName string) (*ComprehensiveOutput, error) {
	model, client, err := GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
		As an expert Career Intelligence System, perform a comprehensive analysis for a job application.
		
		INPUT DATA:
		1. Job Description: %s
		2. Resume: %s
		3. Company Name: %s
		4. Role Name: %s

		TASK:
		1. Analyze JD: Extract critical and secondary skills, required levels (1-10), and key areas.
		2. Analyze Resume: Extract skills, estimate mastery levels (1-10), provide evidence, and analyze depth (concepts/application).
		3. Research Company & Role: Provide a summary, detailed context, typical interview process steps, role expectations, and recommended focus areas.

		Return ONLY a JSON object in this exact format:
		{
			"jd": {
				"skills": [
					{"name": "Skill Name", "importance": "critical/secondary", "required_level": 1-10, "areas": ["area1"]}
				]
			},
			"resume": {
				"skills": [
					{"name": "Skill Name", "estimated_level": 1-10, "evidence": "...", "depth": {"concepts": "strong/weak", "application": "strong/weak"}}
				]
			},
			"company": {
				"role_analysis": "...",
				"company_context": "...",
				"interview_process": ["Step 1", "Step 2"],
				"role_expectations": ["Expectation 1"],
				"recommended_focus": ["Focus 1"]
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

	var output ComprehensiveOutput
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &output); err != nil {
		return nil, err
	}

	return &output, nil
}

func GetGeminiModel(ctx context.Context) (*genai.GenerativeModel, *genai.Client, error) {
	client, err := genai.NewClient(ctx, option.WithAPIKey(config.AppConfig.GeminiAPIKey))
	if err != nil {
		return nil, nil, err
	}
	model := client.GenerativeModel("gemini-2.5-flash-lite")
	model.ResponseMIMEType = "application/json"
	return model, client, nil
}

func AnalyzeJD(ctx context.Context, jdText string) (*JDOutput, error) {
	model, client, err := GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
		As a JD Intelligence Agent, extract skills from this Job Description.
		JD: %s
		
		Return ONLY a JSON object in this format:
		{
			"skills": [
				{
					"name": "Skill Name",
					"importance": "critical/secondary",
					"required_level": 1-10,
					"areas": ["area1", "area2"]
				}
			]
		}
	`, jdText)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no response from Gemini")
	}

	var output JDOutput
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &output); err != nil {
		return nil, err
	}

	return &output, nil
}

func AnalyzeResume(ctx context.Context, resumeText string) (*ResumeOutput, error) {
	model, client, err := GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
		As a Resume Intelligence Agent, extract skills from this Resume.
		Resume: %s
		
		Return ONLY a JSON object in this format:
		{
			"skills": [
				{
					"name": "Skill Name",
					"estimated_level": 1-10,
					"evidence": "brief evidence from resume",
					"depth": {
						"concepts": "strong/weak",
						"application": "strong/weak"
					}
				}
			]
		}
	`, resumeText)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no response from Gemini")
	}

	var output ResumeOutput
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &output); err != nil {
		return nil, err
	}

	return &output, nil
}

func AnalyzeCompanyAndRole(ctx context.Context, companyName, roleName string) (*CompanyOutput, error) {
	model, client, err := GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
		As a Company Research Agent, analyze the role and the company.
		Role: %s
		Company: %s (If empty, focus on general industry standards for the role)
		
		Return ONLY a JSON object in this format:
		{
			"role_analysis": "summary of what this role typically does",
			"company_context": "brief context about the company or industry standards"
		}
	`, roleName, companyName)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no response from Gemini")
	}

	var output CompanyOutput
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &output); err != nil {
		return nil, err
	}

	return &output, nil
}

func GenerateAssignmentQuestions(ctx context.Context, skillGaps []string, companyContext string) (*AssessmentAgentOutput, error) {
	model, client, err := GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
		As an Assessment Agent, generate exactly 20 dynamic and challenging questions to assess a candidate's skills.
		The assessment should focus on these skill gaps: %v.
		Consider the company context: %s.
		
		Requirements:
		1. Generate exactly 20 questions.
		2. Include a mix of multiple-choice (MCQ) and scenario-based questions.
		3. For each question, provide:
		   - question_text
		   - type (MCQ/Scenario)
		   - difficulty (Easy/Medium/Hard)
		   - options (array of strings, for MCQ only)
		   - correct_answer
		   - explanation
		   - skill_name
		
		Return ONLY a JSON object in this format:
		{
			"questions": [
				{
					"question_text": "...",
					"type": "...",
					"difficulty": "...",
					"options": ["...", "..."],
					"correct_answer": "...",
					"explanation": "...",
					"skill_name": "..."
				}
			]
		}
	`, skillGaps, companyContext)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no response from Gemini")
	}

	var output AssessmentAgentOutput
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &output); err != nil {
		return nil, err
	}

	return &output, nil
}

func GenerateLearningPlan(ctx context.Context, analysisResult interface{}, timeConstraint string) (*LearningPlanOutput, error) {
	model, client, err := GetGeminiModel(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := fmt.Sprintf(`
		As a Learning Plan Agent, create a personalized learning plan based on the skill analysis and time constraint.
		Analysis: %v
		Time Constraint: %s
		
		Requirements:
		1. Create a logical sequence of learning steps (Nodes).
		2. Connect them with Edges to form a graph (ReactFlow format).
		3. Provide a list of actionable tasks.
		
		Return ONLY a JSON object in this format:
		{
			"nodes": [
				{
					"id": "1",
					"type": "default",
					"position": { "x": 0, "y": 0 },
					"data": { "label": "Step Name" }
				}
			],
			"edges": [
				{ "id": "e1-2", "source": "1", "target": "2" }
			],
			"tasks": ["Task 1", "Task 2"]
		}
	`, analysisResult, timeConstraint)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no response from Gemini")
	}

	var output LearningPlanOutput
	if err := json.Unmarshal([]byte(fmt.Sprint(resp.Candidates[0].Content.Parts[0])), &output); err != nil {
		return nil, err
	}

	return &output, nil
}
