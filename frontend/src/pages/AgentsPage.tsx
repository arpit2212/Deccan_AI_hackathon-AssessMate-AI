import React from 'react'
import { 
  Search, 
  FileText, 
  Building2, 
  BrainCircuit, 
  Map,
  ShieldCheck,
  Cpu,
  Sparkles
} from 'lucide-react'

const agents = [
  {
    id: 'jd-agent',
    name: 'JD Intelligence Agent',
    description: 'Specializes in extracting and weighing technical and soft skills from job descriptions.',
    icon: <Search className="h-6 w-6" />,
    capabilities: [
      'Critical Skill Extraction',
      'Importance Weighing (1-10)',
      'Sub-domain Analysis',
      'Role Level Identification'
    ],
    color: 'blue'
  },
  {
    id: 'resume-agent',
    name: 'Resume Intelligence Agent',
    description: 'Analyzes resumes to identify skill levels, evidence of expertise, and conceptual depth.',
    icon: <FileText className="h-6 w-6" />,
    capabilities: [
      'Skill Proficiency Estimation',
      'Evidence Extraction',
      'Conceptual vs Application Depth',
      'Mastery Gap Detection'
    ],
    color: 'emerald'
  },
  {
    id: 'company-agent',
    name: 'Company Research Agent',
    description: 'Provides deep insights into company culture, interview processes, and role expectations.',
    icon: <Building2 className="h-6 w-6" />,
    capabilities: [
      'Interview Process Mapping',
      'Company Context Analysis',
      'Role Expectation Summary',
      'Cultural Alignment Tips'
    ],
    color: 'purple'
  },
  {
    id: 'assessment-agent',
    name: 'Assessment Agent',
    description: 'Generates dynamic, challenging questions tailored to bridge specific skill gaps.',
    icon: <BrainCircuit className="h-6 w-6" />,
    capabilities: [
      'Dynamic MCQ Generation',
      'Scenario-based Problem Solving',
      'Skill-specific Targeting',
      'Detailed Explanation Builder'
    ],
    color: 'orange'
  },
  {
    id: 'learning-agent',
    name: 'Learning Plan Agent',
    description: 'Constructs personalized roadmaps and actionable tasks to master missing skills.',
    icon: <Map className="h-6 w-6" />,
    capabilities: [
      'Graph-based Roadmap Generation',
      'Task Prioritization',
      'Time-constrained Planning',
      'Resource Recommendation'
    ],
    color: 'rose'
  }
]

export const AgentsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Cpu className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Intelligence Agents</h1>
        </div>
        <p className="text-text-secondary max-w-2xl text-lg">
          Meet the specialized AI agents that power your career preparation. Each agent is expertly 
          trained for a specific part of your journey.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {agents.map((agent) => (
          <div 
            key={agent.id}
            className="group relative bg-bg-secondary border border-border-subtle rounded-2xl p-8 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-${agent.color}-500/10 text-${agent.color}-500 group-hover:scale-110 transition-transform duration-300`}>
              {agent.icon}
            </div>
            
            <h3 className="text-xl font-bold text-text-primary mb-3 flex items-center gap-2">
              {agent.name}
              <Sparkles className="h-4 w-4 text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            
            <p className="text-text-secondary mb-6 line-clamp-2">
              {agent.description}
            </p>
            
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-2">
                <ShieldCheck className="h-3 w-3" />
                Capabilities
              </h4>
              <ul className="grid grid-cols-1 gap-2">
                {agent.capabilities.map((cap, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1 h-1 rounded-full bg-primary/40" />
                    {cap}
                  </li>
                ))}
              </ul>
            </div>

            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <div className="text-8xl font-black select-none pointer-events-none">
                {agent.id.split('-')[0][0].toUpperCase()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-bg-secondary to-bg-secondary border border-primary/20">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text-primary mb-4">The Intelligence Hub</h2>
            <p className="text-text-secondary mb-6">
              Our agents work in orchestration to provide a seamless experience. When you upload a 
              job description, the JD and Company agents start the research, while the Resume agent 
              evaluates your profile against the findings. Finally, the Assessment and Learning agents 
              take over to prepare you for success.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium text-text-secondary">
                Model: Gemini 2.5 Flash
              </div>
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium text-text-secondary">
                Latency: ~2.5s
              </div>
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium text-text-secondary">
                Accuracy: High Precision
              </div>
            </div>
          </div>
          <div className="w-full md:w-64 h-64 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
            <BrainCircuit className="h-32 w-32 text-primary relative z-10 animate-bounce-slow" />
          </div>
        </div>
      </div>
    </div>
  )
}
