package services

import (
	"fmt"
	"math"
	"strings"
)

type SkillAnalysis struct {
	Skill         string   `json:"skill"`
	RequiredLevel int      `json:"required_level"`
	CurrentLevel  int      `json:"current_level"`
	Gap           int      `json:"gap"`
	Status        string   `json:"status"`
	WeakAreas     []string `json:"weak_areas"`
}

type AnalysisResult struct {
	FitScore            float64         `json:"fit_score"`
	SkillAnalysis       []SkillAnalysis `json:"skill_analysis"`
	CriticalGaps        []string        `json:"critical_gaps"`
	OverestimatedSkills []string        `json:"overestimated_skills"`
	TestStrategy        []string        `json:"test_strategy"`
	LearningStrategy    []string        `json:"learning_strategy"`
}

func NormalizeSkillName(name string) string {
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, ".js", "")
	name = strings.ReplaceAll(name, " (es6+)", "")
	name = strings.TrimSpace(name)
	return name
}

func PerformIntelligenceAnalysis(jdOutput *JDOutput, resumeOutput *ResumeOutput) *AnalysisResult {
	result := &AnalysisResult{
		SkillAnalysis:       []SkillAnalysis{},
		CriticalGaps:        []string{},
		OverestimatedSkills: []string{},
		TestStrategy:        []string{},
		LearningStrategy:    []string{},
	}

	var totalRatio float64
	var count int

	resumeSkillsMap := make(map[string]ResumeSkill)
	for _, s := range resumeOutput.Skills {
		resumeSkillsMap[NormalizeSkillName(s.Name)] = s
	}

	for _, jdSkill := range jdOutput.Skills {
		normalizedJDName := NormalizeSkillName(jdSkill.Name)
		actualLevel := 0
		status := "missing"
		weakAreas := jdSkill.Areas

		resumeSkill, found := resumeSkillsMap[normalizedJDName]
		if found {
			actualLevel = resumeSkill.EstimatedLevel
			if actualLevel >= jdSkill.RequiredLevel {
				status = "strong"
				weakAreas = []string{} // Reset weak areas if strong
			} else {
				status = "partial"
				// Add depth weaknesses to weak areas
				for area, level := range resumeSkill.Depth {
					if level == "weak" {
						weakAreas = append(weakAreas, area)
					}
				}
			}

			// Detect overestimated skills
			isWeakInDepth := false
			for _, level := range resumeSkill.Depth {
				if level == "weak" {
					isWeakInDepth = true
					break
				}
			}
			if isWeakInDepth && actualLevel > 5 {
				result.OverestimatedSkills = append(result.OverestimatedSkills, jdSkill.Name)
			}
		}

		gap := jdSkill.RequiredLevel - actualLevel
		if gap < 0 {
			gap = 0
		}

		analysis := SkillAnalysis{
			Skill:         jdSkill.Name,
			RequiredLevel: jdSkill.RequiredLevel,
			CurrentLevel:  actualLevel,
			Gap:           gap,
			Status:        status,
			WeakAreas:     weakAreas,
		}
		result.SkillAnalysis = append(result.SkillAnalysis, analysis)

		if jdSkill.Importance == "critical" && (status == "missing" || status == "partial") {
			result.CriticalGaps = append(result.CriticalGaps, jdSkill.Name)
		}

		// Compute ratio for fit score
		ratio := float64(actualLevel) / float64(jdSkill.RequiredLevel)
		if ratio > 1.0 {
			ratio = 1.0
		}
		totalRatio += ratio
		count++

		// Generate strategies based on gaps
		if gap > 0 {
			area := "general"
			if len(weakAreas) > 0 {
				area = weakAreas[0]
			}
			result.TestStrategy = append(result.TestStrategy, fmt.Sprintf("%s %s task", jdSkill.Name, area))
			result.LearningStrategy = append(result.LearningStrategy, fmt.Sprintf("Implement %s in a %s scenario", area, jdSkill.Name))
		}
	}

	if count > 0 {
		result.FitScore = math.Round((totalRatio/float64(count))*100) / 100
	}

	return result
}
