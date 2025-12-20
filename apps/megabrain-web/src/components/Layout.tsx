import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, MessageSquare, Building2, Eye, Search, Activity } from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: Activity },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/empire', label: 'Empire', icon: Building2 },
  { path: '/consciousness', label: 'Consciousness', icon: Eye },
  { path: '/research', label: 'Research', icon: Search },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-megabrain-darker flex">
      {/* Sidebar */}
      <aside className="w-64 bg-megabrain-dark border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative">
              <Brain className="w-10 h-10 text-megabrain-accent animate-pulse-glow" />
              <div className="absolute inset-0 bg-megabrain-accent/20 rounded-full blur-xl"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MEGABRAIN</h1>
              <p className="text-xs text-gray-500">AI CEO</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <Link
                  to={path}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    location.pathname === path
                      ? 'bg-megabrain-accent/10 text-megabrain-accent border border-megabrain-accent/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Status */}
        <div className="p-4 border-t border-gray-800">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400">System Status</span>
            </div>
            <p className="text-xs text-gray-500">All systems operational</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
