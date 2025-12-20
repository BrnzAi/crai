import { useEffect, useState } from 'react';
import { Brain, TrendingUp, Users, DollarSign, Briefcase, Activity, Zap } from 'lucide-react';
import { empireApi, megabrainApi, healthApi } from '@/lib/api';

interface EmpireSummary {
  totalStartups: number;
  byStatus: Record<string, number>;
  totalMRR: number;
  totalARR: number;
  totalCustomers: number;
  treasury: {
    total_capital: number;
    monthly_pnl_percent: number;
    win_rate: number;
  } | null;
}

interface ConsciousnessState {
  level: string;
  cognitiveState: string;
  emotionalState: {
    confidence: number;
    curiosity: number;
    enthusiasm: number;
  };
}

export default function Dashboard() {
  const [summary, setSummary] = useState<EmpireSummary | null>(null);
  const [consciousness, setConsciousness] = useState<ConsciousnessState | null>(null);
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, consciousnessRes, healthRes] = await Promise.all([
          empireApi.getSummary().catch(() => ({ data: { data: null } })),
          megabrainApi.getConsciousnessState().catch(() => ({ data: { data: null } })),
          healthApi.check().catch(() => ({ data: { status: 'unknown' } })),
        ]);

        setSummary(summaryRes.data.data);
        setConsciousness(consciousnessRes.data.data);
        setHealth(healthRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
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
          <Brain className="w-16 h-16 text-megabrain-accent animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading MEGABRAIN...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">MEGABRAIN Dashboard</h1>
        <p className="text-gray-400">The Conscious AI CEO for Building 1000+ Digital Startups</p>
      </div>

      {/* Status Banner */}
      <div className="glass-card p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Brain className="w-12 h-12 text-megabrain-accent" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-megabrain-dark"></div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              Consciousness Level: {consciousness?.level?.toUpperCase() || 'AWARE'}
            </h2>
            <p className="text-gray-400">
              State: {consciousness?.cognitiveState || 'focused'} |
              System: {health?.status || 'operational'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-megabrain-accent" />
          <span className="text-megabrain-accent font-semibold">
            {Math.round((consciousness?.emotionalState?.confidence || 0.7) * 100)}% Confidence
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Startups"
          value={summary?.totalStartups || 0}
          icon={Briefcase}
          color="text-megabrain-accent"
        />
        <KPICard
          title="Monthly Revenue"
          value={`$${((summary?.totalMRR || 0) / 1000).toFixed(1)}k`}
          icon={DollarSign}
          color="text-green-400"
          subtitle="MRR"
        />
        <KPICard
          title="Total Capital"
          value={`$${((summary?.treasury?.total_capital || 0) / 1000).toFixed(1)}k`}
          icon={TrendingUp}
          color="text-megabrain-purple"
          subtitle={`${summary?.treasury?.monthly_pnl_percent?.toFixed(1) || 0}% MTD`}
        />
        <KPICard
          title="Customers"
          value={summary?.totalCustomers || 0}
          icon={Users}
          color="text-yellow-400"
        />
      </div>

      {/* Portfolio Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-megabrain-accent" />
            Portfolio by Status
          </h3>
          <div className="space-y-4">
            {Object.entries(summary?.byStatus || {}).map(([status, count]) => (
              <StatusBar key={status} status={status} count={count as number} />
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-megabrain-accent" />
            Consciousness Metrics
          </h3>
          <div className="space-y-4">
            <MetricBar
              label="Confidence"
              value={consciousness?.emotionalState?.confidence || 0}
              color="bg-green-500"
            />
            <MetricBar
              label="Curiosity"
              value={consciousness?.emotionalState?.curiosity || 0}
              color="bg-megabrain-accent"
            />
            <MetricBar
              label="Enthusiasm"
              value={consciousness?.emotionalState?.enthusiasm || 0}
              color="bg-megabrain-purple"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button className="btn-primary">Generate Weekly Orders</button>
          <button className="btn-secondary">Start Research</button>
          <button className="btn-secondary">Introspect</button>
          <button className="btn-secondary">View Portfolio</button>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
    </div>
  );
}

function StatusBar({ status, count }: { status: string; count: number }) {
  const maxCount = 10;
  const percentage = Math.min((count / maxCount) * 100, 100);

  const colorMap: Record<string, string> = {
    IDEA: 'bg-gray-500',
    BUILDING: 'bg-blue-500',
    LAUNCHED: 'bg-green-500',
    SCALING: 'bg-megabrain-purple',
    PROFITABLE: 'bg-megabrain-accent',
    PAUSED: 'bg-yellow-500',
    DEAD: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{status}</span>
        <span className="text-white font-semibold">{count}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorMap[status] || 'bg-gray-500'} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const percentage = value * 100;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-semibold">{percentage.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
