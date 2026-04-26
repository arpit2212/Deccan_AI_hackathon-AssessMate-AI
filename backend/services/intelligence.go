package services

import (
	"assessmate-backend/models"
	"math"
	"strings"
)

func NormalizeSkillName(name string) string {
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, ".js", "")
	name = strings.ReplaceAll(name, " (es6+)", "")
	name = strings.TrimSpace(name)
	return name
}

func PerformIntelligenceAnalysis(jdOutput *models.JDOutput, resumeOutput *models.ResumeOutput) *models.FinalAnalysis {
	result := &models.FinalAnalysis{
		SkillAnalysis: []models.SkillMatch{},
		CriticalGaps:  []string{},
		FitScore:      0,
	}

	resumeSkillsMap := make(map[string]models.ResumeSkill)
	for _, s := range resumeOutput.Skills {
		resumeSkillsMap[NormalizeSkillName(s.Name)] = s
	}

	var totalScore float64
	var maxScore float64

	for _, jdSkill := range jdOutput.Skills {
		normalizedJDName := NormalizeSkillName(jdSkill.Name)
		estimatedLevel := 0
		evidence := "No evidence found in resume"
		var depth map[string]string

		resumeSkill, found := resumeSkillsMap[normalizedJDName]
		if found {
			estimatedLevel = resumeSkill.EstimatedLevel
			evidence = resumeSkill.Evidence
			depth = resumeSkill.Depth
		}

		gap := jdSkill.RequiredLevel - estimatedLevel
		if gap < 0 {
			gap = 0
		}

		// Backend Logic: Calculate gap
		match := models.SkillMatch{
			Name:           jdSkill.Name,
			RequiredLevel:  jdSkill.RequiredLevel,
			EstimatedLevel: estimatedLevel,
			Gap:            gap,
			Importance:     jdSkill.Importance,
			Evidence:       evidence,
			Depth:          depth,
		}
		result.SkillAnalysis = append(result.SkillAnalysis, match)

		// Backend Logic: Detect critical gaps
		// Critical gap if importance is critical AND gap > 0 (or some threshold)
		if jdSkill.Importance == "critical" && gap > 0 {
			result.CriticalGaps = append(result.CriticalGaps, jdSkill.Name)
		}

		// Weighting for Fit Score
		weight := 1.0
		if jdSkill.Importance == "critical" {
			weight = 2.0
		}

		// Fit calculation: how much of the required level is met?
		meetingRatio := float64(estimatedLevel) / float64(jdSkill.RequiredLevel)
		if meetingRatio > 1.0 {
			meetingRatio = 1.0
		}

		totalScore += meetingRatio * weight
		maxScore += weight
	}

	if maxScore > 0 {
		result.FitScore = int(math.Round((totalScore / maxScore) * 100))
	}

	return result
}
