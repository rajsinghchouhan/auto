import React from 'react';
import { Shield, Bell, Plus, RefreshCw, Zap } from 'lucide-react';

interface HeaderProps {
  activeTab: 'simulator' | 'campaigns' | 'logs' | 'guide';
  setActiveTab: (tab: 'simulator' | 'campaigns' | 'logs' | 'guide') => void;
  onOpenCreateModal: () => void;
  onOpenWebhookModal: () => void;
  isHindi: boolean;
  setIsHindi: (val: boolean) => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  onOpenWebhookModal,
  isHindi,
  setIsHindi,
  onRefreshAll,
  isRefreshing,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">TrafficShield</span>
              <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                404 Auto-Failover
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {isHindi ? 'Ad Links Disaster Recovery & Traffic Protector' : 'Ad Traffic Guard & Instant Link Rotator'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{isHindi ? 'लाइव सिमुलेटर' : 'Live Simulator'}</span>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              activeTab === 'campaigns'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{isHindi ? 'लिंक्स और कैस्केड' : 'Campaign Links'}</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              activeTab === 'logs'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{isHindi ? 'ट्रैफिक लॉग्स' : 'Redirect Logs'}</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              activeTab === 'guide'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{isHindi ? 'गाइड' : 'How It Works'}</span>
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language Toggle */}
          <button
            onClick={() => setIsHindi(!isHindi)}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-slate-700 transition-colors"
            title="Toggle Hindi / English"
          >
            {isHindi ? '🇮🇳 हिंदी' : '🌐 EN'}
          </button>

          {/* Refresh data */}
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded hover:border-slate-700 transition-colors"
            title="Refresh Health Statuses"
            aria-label="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Webhook Alert Setup */}
          <button
            onClick={onOpenWebhookModal}
            className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-900 border border-slate-800 rounded hover:border-slate-700 transition-colors"
            title="Webhook & Disaster Alert Settings"
            aria-label="Disaster Alerts"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Add Campaign Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md shadow-cyan-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isHindi ? 'नया लिंक बनाएं' : 'New Failover Link'}</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>
    </header>
  );
};
