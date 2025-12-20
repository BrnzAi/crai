import { useEffect, useState } from 'react';
import { Building2, Plus, TrendingUp, Users, DollarSign, ExternalLink } from 'lucide-react';
import { empireApi } from '@/lib/api';

interface Startup {
  id: string;
  name: string;
  description?: string;
  status: string;
  founder_status: string;
  founder_name?: string;
  funding_source: string;
  github_repo?: string;
  website?: string;
}

interface TreasuryStatus {
  total_capital: number;
  monthly_pnl: number;
  monthly_pnl_percent: number;
  win_rate: number;
  available_for_deployment: number;
  deployed_to_startups: number;
}

const statusColors: Record<string, string> = {
  IDEA: 'badge-info',
  CONCEPT: 'badge-info',
  BUILDING: 'badge-warning',
  'PRE-LAUNCH': 'badge-warning',
  LAUNCHED: 'badge-success',
  SCALING: 'badge-success',
  PROFITABLE: 'badge-success',
  PAUSED: 'badge-warning',
  DEAD: 'badge-danger',
};

export default function Empire() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [treasury, setTreasury] = useState<TreasuryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [portfolioRes, treasuryRes] = await Promise.all([
          empireApi.getPortfolio(),
          empireApi.getTreasuryStatus(),
        ]);
        setStartups(portfolioRes.data.data || []);
        setTreasury(treasuryRes.data.data);
      } catch (error) {
        console.error('Failed to fetch empire data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-megabrain-accent animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading Empire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Empire Portfolio</h1>
          <p className="text-gray-400">Managing {startups.length} digital startups</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Startup
        </button>
      </div>

      {/* Treasury Overview */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-megabrain-accent" />
          TRDR Treasury
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-gray-400 text-sm">Total Capital</p>
            <p className="text-2xl font-bold text-white">
              ${((treasury?.total_capital || 0) / 1000).toFixed(1)}k
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Monthly P&L</p>
            <p className={`text-2xl font-bold ${(treasury?.monthly_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(treasury?.monthly_pnl_percent || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Win Rate</p>
            <p className="text-2xl font-bold text-megabrain-accent">
              {(treasury?.win_rate || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Available for Deployment</p>
            <p className="text-2xl font-bold text-white">
              ${((treasury?.available_for_deployment || 0) / 1000).toFixed(1)}k
            </p>
          </div>
        </div>
      </div>

      {/* Startups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {startups.map((startup) => (
          <StartupCard key={startup.id} startup={startup} />
        ))}
      </div>

      {startups.length === 0 && (
        <div className="text-center py-12 glass-card">
          <Building2 className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No startups yet</h3>
          <p className="text-gray-500 mb-4">Start building your empire by adding your first startup</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            Add Your First Startup
          </button>
        </div>
      )}

      {/* Add Startup Modal */}
      {showAddModal && (
        <AddStartupModal onClose={() => setShowAddModal(false)} onAdd={(startup) => {
          setStartups([...startups, startup]);
          setShowAddModal(false);
        }} />
      )}
    </div>
  );
}

function StartupCard({ startup }: { startup: Startup }) {
  return (
    <div className="glass-card p-6 hover:border-megabrain-accent/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{startup.name}</h3>
          <span className={`badge ${statusColors[startup.status] || 'badge-info'}`}>
            {startup.status}
          </span>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-400">{startup.founder_status}</span>
          {startup.founder_name && (
            <p className="text-xs text-gray-500">{startup.founder_name}</p>
          )}
        </div>
      </div>

      {startup.description && (
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{startup.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <DollarSign className="w-4 h-4" />
          {startup.funding_source}
        </span>
        {startup.github_repo && (
          <a
            href={startup.github_repo}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-megabrain-accent"
          >
            <ExternalLink className="w-4 h-4" />
            GitHub
          </a>
        )}
        {startup.website && (
          <a
            href={startup.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-megabrain-accent"
          >
            <ExternalLink className="w-4 h-4" />
            Website
          </a>
        )}
      </div>
    </div>
  );
}

function AddStartupModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (startup: Startup) => void;
}) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    status: 'IDEA',
    founder_status: 'NONE',
    funding_source: 'SELF',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await empireApi.createStartup(formData);
      onAdd(response.data.data);
    } catch (error) {
      console.error('Failed to create startup:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass-card p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Add New Startup</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">ID (slug)</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase() })}
              className="input-dark"
              placeholder="my-startup"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark"
              placeholder="My Startup"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-dark"
              rows={3}
              placeholder="What does this startup do?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-dark"
              >
                <option value="IDEA">Idea</option>
                <option value="CONCEPT">Concept</option>
                <option value="BUILDING">Building</option>
                <option value="LAUNCHED">Launched</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Funding</label>
              <select
                value={formData.funding_source}
                onChange={(e) => setFormData({ ...formData, funding_source: e.target.value })}
                className="input-dark"
              >
                <option value="SELF">Self</option>
                <option value="TRDR">TRDR</option>
                <option value="EXTERNAL">External</option>
                <option value="REVENUE">Revenue</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating...' : 'Create Startup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
