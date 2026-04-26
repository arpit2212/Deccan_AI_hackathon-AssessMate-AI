You are a senior backend engineer and AI systems architect.

Your task is to build a clean, production-ready system for:

"AI-Powered Skill Assessment & Personalized Learning Platform"

---

# 🎯 CORE OBJECTIVE

Build a system that determines:

"How well does a candidate actually know each required skill?"

NOT:

"Does the candidate have this skill?"

---

# ⚠️ CRITICAL PRINCIPLE

DO NOT implement keyword matching like:

missing_skills = JD - Resume

Instead implement:

gap = required_depth - actual_depth

---

# 🧠 SYSTEM ARCHITECTURE (MANDATORY)

You must build ONLY 3 layers:

---

# 🟣 1. JD INTELLIGENCE AGENT (LLM - Gemini Flash)

### Input:

* Job Description text

### Responsibilities:

* Extract skills
* Assign importance (critical / secondary)
* Estimate required depth (1–10)
* Identify key areas per skill

### Output (STRICT JSON):

{
"skills": [
{
"name": "React",
"importance": "critical",
"required_level": 8,
"areas": ["performance", "state management", "debugging"]
}
]
}

---

# 🟢 2. RESUME INTELLIGENCE AGENT (LLM - Gemini Flash)

### Input:

* Resume text

### Responsibilities:

* Extract skills with EXACT names (IMPORTANT)
* Estimate skill level (1–10)
* Provide evidence (projects, experience)
* Identify depth breakdown

### Output (STRICT JSON):

{
"skills": [
{
"name": "React",
"estimated_level": 6,
"evidence": "used in 2 projects with API integration",
"depth": {
"concepts": "strong",
"debugging": "weak",
"performance": "weak"
}
}
]
}

---

# 🔴 3. INTELLIGENCE LAYER (BACKEND LOGIC — NOT LLM)

This is the MOST IMPORTANT part.

---

## Responsibilities:

### 1. Match skills (JD ↔ Resume)

* Normalize names:

  * "React.js" == "React"
  * "JavaScript (ES6+)" == "JavaScript"

---

### 2. Compute skill gap

For each JD skill:

required = JD.required_level
actual = Resume.estimated_level (default = 0 if missing)

gap = required - actual

---

### 3. Determine status

IF actual == 0 → "missing"
IF actual < required → "partial"
IF actual >= required → "strong"

---

### 4. Identify weak areas

Take from:

* JD required areas
* Resume depth weaknesses

---

### 5. Compute fit_score

fit_score = average(actual / required)

Clamp between 0 and 1

---

### 6. Detect overestimated skills

If:

* Resume shows skill
* BUT depth breakdown is weak

Mark as overestimated

---

### 7. Generate TEST STRATEGY

Based on gaps:

Example:

[
"React debugging task",
"performance optimization scenario",
"async state handling problem"
]

---

### RULES:

* Must test:

  * concepts
  * application
  * debugging
* DO NOT generate generic MCQs

---

### 8. Generate LEARNING STRATEGY

Must be TASK-BASED:

Example:

[
"Optimize a React component using memoization",
"Fix real-world UI bugs",
"Implement advanced state management system"
]

---

### RULES:

* No generic "learn React"
* Must target weak areas

---

# 📦 FINAL OUTPUT FORMAT

{
"fit_score": number,
"skill_analysis": [
{
"skill": "React",
"required_level": 8,
"current_level": 6,
"gap": 2,
"status": "partial",
"weak_areas": []
}
],
"critical_gaps": [],
"overestimated_skills": [],
"test_strategy": [],
"learning_strategy": []
}

---

# ⚠️ IMPORTANT RULES

* DO NOT treat resume as truth
* Resume = low confidence signal
* LLM is ONLY for extraction
* All reasoning MUST be in backend logic
* ALWAYS return valid JSON
* Skill names must NEVER be empty

---

# 🚀 IMPLEMENTATION REQUIREMENTS

* Use Gemini 1.5 Flash (free tier)
* Use structured prompts
* Backend in Go or Node
* Store results in PostgreSQL (JSONB supported)

---

# 🏁 FINAL GOAL

Transform:

Resume + JD

→ into

Skill Intelligence + Gap Analysis + Personalized Strategy

---

Start by:

1. Writing Gemini prompts for JD and Resume agents
2. Implementing backend intelligence logic
3. Building API endpoint: /analyze

Think like a senior engineer building a real product.
