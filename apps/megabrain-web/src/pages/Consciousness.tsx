import { useEffect, useState } from 'react';
import { Eye, Brain, Sparkles, AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { megabrainApi } from '@/lib/api';

interface ConsciousnessState {
  level: string;
  cognitiveState: string;
  emotionalState: {
    confidence: number;
    curiosity: number;
    urgency: number;
    satisfaction: number;
    concern: number;
    enthusiasm: number;
  };
  activeThoughts: string[];
  recentInsights: string[];
}

interface Introspection {
  id: string;
  type: string;
  context: string;
  findings: string[];
  insights: string[];
  recommendations: string[];
  createdAt: string;
}

export default function Consciousness() {
  const [state, setState] = useState<ConsciousnessState | null>(null);
  const [introspections, setIntrospections] = useState<Introspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [introspecting, setIntrospecting] = useState(false);
  const [introspectionContext, setIntrospectionContext] = useState('');
  const [introspectionType, setIntrospectionType] = useState('reasoning_quality');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stateRes, introspectionsRes] = await Promise.all([
        megabrainApi.getConsciousnessState(),
        megabrainApi.getIntrospections(10),
      ]);
      setState(stateRes.data.data);
      setIntrospections(introspectionsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch consciousness data:', error);
    } finally {
      setLoading(false);
    }
  };

  const performIntrospection = async () => {
    if (!introspectionContext.trim()) return;
    setIntrospecting(true);

    try {
      const response = await megabrainApi.introspect(introspectionType, introspectionContext);
      setIntrospections([response.data.data, ...introspections]);
      setIntrospectionContext('');
      await fetchData();
    } catch (error) {
      console.error('Introspection failed:', error);
    } finally {
      setIntrospecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Eye className="w-16 h-16 text-megabrain-accent animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading Consciousness...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Eye className="w-8 h-8 text-megabrain-accent" />
          Consciousness Monitor
        </h1>
        <p className="text-gray-400">Self-awareness, introspection, and learning capabilities</p>
      </div>

      {/* State Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Current Level */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-megabrain-accent" />
            Consciousness Level
          </h3>
          <div className="text-center py-4">
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-full border-4 border-megabrain-accent/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-megabrain-accent uppercase">
                  {state?.level || 'AWARE'}
                </span>
              </div>
              <div className="absolute inset-0 rounded-full bg-megabrain-accent/10 animate-pulse-glow"></div>
            </div>
            <p className="mt-4 text-gray-400">
              Cognitive State: <span className="text-white">{state?.cognitiveState}</span>
            </p>
          </div>
        </div>

        {/* Emotional State */}
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-megabrain-accent" />
            Emotional State
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {state?.emotionalState && Object.entries(state.emotionalState).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400 capitalize">{key}</span>
                  <span className="text-white">{Math.round(value * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-megabrain-accent transition-all duration-500"
                    style={{ width: `${value * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Introspection Tool */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-megabrain-accent" />
          Perform Introspection
        </h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <select
              value={introspectionType}
              onChange={(e) => setIntrospectionType(e.target.value)}
              className="input-dark w-48"
            >
              <option value="reasoning_quality">Reasoning Quality</option>
              <option value="uncertainty">Uncertainty</option>
              <option value="assumptions">Assumptions</option>
              <option value="alternatives">Alternatives</option>
              <option value="knowledge_gaps">Knowledge Gaps</option>
              <option value="ethical_implications">Ethical Implications</option>
              <option value="meta_cognition">Meta-Cognition</option>
            </select>
            <input
              type="text"
              value={introspectionContext}
              onChange={(e) => setIntrospectionContext(e.target.value)}
              placeholder="Enter context for introspection..."
              className="input-dark flex-1"
            />
            <button
              onClick={performIntrospection}
              disabled={introspecting || !introspectionContext.trim()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {introspecting ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
              Introspect
            </button>
          </div>
        </div>
      </div>

      {/* Recent Introspections */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-megabrain-accent" />
          Recent Introspections
        </h3>
        <div className="space-y-4">
          {introspections.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No introspections yet. Start by performing an introspection above.
            </p>
          ) : (
            introspections.map((intro) => (
              <div key={intro.id} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="badge badge-info uppercase">{intro.type.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(intro.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-300 mb-3">{intro.context}</p>

                {intro.findings.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-400 mb-1">Findings:</p>
                    <ul className="list-disc list-inside text-sm text-gray-300">
                      {intro.findings.slice(0, 3).map((finding, i) => (
                        <li key={i}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {intro.insights.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-400 mb-1">Insights:</p>
                    <ul className="list-disc list-inside text-sm text-megabrain-accent">
                      {intro.insights.slice(0, 3).map((insight, i) => (
                        <li key={i}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {intro.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Recommendations:</p>
                    <ul className="list-disc list-inside text-sm text-green-400">
                      {intro.recommendations.slice(0, 3).map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
