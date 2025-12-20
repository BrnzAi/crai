import { useEffect, useState } from 'react';
import { Search, FileText, Clock, CheckCircle, XCircle, Loader2, Plus } from 'lucide-react';
import { megabrainApi } from '@/lib/api';

interface ResearchProject {
  id: string;
  topic: string;
  type: string;
  depth: string;
  status: string;
  findings: Array<{
    id: string;
    title: string;
    content: string;
    confidence: number;
  }>;
  citations: Array<{
    id: string;
    title: string;
    url?: string;
  }>;
  startedAt: string;
  completedAt?: string;
}

const researchTypes = [
  { value: 'market_analysis', label: 'Market Analysis' },
  { value: 'competitor_analysis', label: 'Competitor Analysis' },
  { value: 'technology_research', label: 'Technology Research' },
  { value: 'user_research', label: 'User Research' },
  { value: 'regulatory_research', label: 'Regulatory Research' },
  { value: 'financial_research', label: 'Financial Research' },
  { value: 'trend_analysis', label: 'Trend Analysis' },
  { value: 'academic_research', label: 'Academic Research' },
];

const depthOptions = [
  { value: 'quick', label: 'Quick (1-2 min)' },
  { value: 'standard', label: 'Standard (3-5 min)' },
  { value: 'deep', label: 'Deep (5-10 min)' },
  { value: 'exhaustive', label: 'Exhaustive (10+ min)' },
];

export default function Research() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewResearch, setShowNewResearch] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ResearchProject | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await megabrainApi.getResearchProjects();
      setProjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch research projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-megabrain-accent animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Search className="w-16 h-16 text-megabrain-accent animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading Research...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Search className="w-8 h-8 text-megabrain-accent" />
            Deep Research
          </h1>
          <p className="text-gray-400">8 research types with variable depth</p>
        </div>
        <button
          onClick={() => setShowNewResearch(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Research
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Research Projects</h3>
            <div className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No research projects yet. Start a new research project.
                </p>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`w-full text-left p-4 rounded-lg transition-colors ${
                      selectedProject?.id === project.id
                        ? 'bg-megabrain-accent/10 border border-megabrain-accent/30'
                        : 'bg-gray-800/50 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-white font-medium line-clamp-1">
                        {project.topic}
                      </span>
                      {getStatusIcon(project.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="badge badge-info">{project.type.replace('_', ' ')}</span>
                      <span className="text-gray-500">{project.depth}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="lg:col-span-2">
          {selectedProject ? (
            <div className="glass-card p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedProject.topic}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="badge badge-info uppercase">
                      {selectedProject.type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-400">{selectedProject.depth} depth</span>
                    <span className="text-sm text-gray-400">
                      {selectedProject.findings.length} findings
                    </span>
                  </div>
                </div>
                {getStatusIcon(selectedProject.status)}
              </div>

              {/* Findings */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-megabrain-accent" />
                  Findings
                </h3>
                <div className="space-y-4">
                  {selectedProject.findings.map((finding) => (
                    <div key={finding.id} className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{finding.title}</h4>
                        <span className="text-sm text-megabrain-accent">
                          {Math.round(finding.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">
                        {finding.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Citations */}
              {selectedProject.citations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Citations</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.citations.map((citation) => (
                      <a
                        key={citation.id}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-megabrain-accent"
                      >
                        {citation.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-6 flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400">Select a research project to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Research Modal */}
      {showNewResearch && (
        <NewResearchModal
          onClose={() => setShowNewResearch(false)}
          onComplete={(project) => {
            setProjects([project, ...projects]);
            setSelectedProject(project);
            setShowNewResearch(false);
          }}
        />
      )}
    </div>
  );
}

function NewResearchModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (project: ResearchProject) => void;
}) {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('market_analysis');
  const [depth, setDepth] = useState('standard');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await megabrainApi.startResearch(topic, type, depth);
      onComplete(response.data.data);
    } catch (error) {
      console.error('Failed to start research:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass-card p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Start New Research</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Research Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input-dark"
              placeholder="e.g., AI market trends in 2024"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Research Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input-dark"
            >
              {researchTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Depth</label>
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="input-dark"
            >
              {depthOptions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Researching...
                </>
              ) : (
                'Start Research'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
