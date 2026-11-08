import React from 'react';
import { GlobalStats } from '../types/campaign.js';
import { ShieldCheck, ArrowRightLeft, DollarSign, Clock, Layers } from 'lucide-react';

interface StatsCardsProps {
  stats: GlobalStats;
  isHindi: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, isHindi }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>{isHindi ? 'कुल एड क्लिक्स' : 'Total Ad Clicks'}</span>
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
          {stats.totalClicks.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          {isHindi ? 'सुरक्षित रूटेड ट्रैफिक' : 'Routed through engine'}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>{isHindi ? 'बचाए गए क्लिक्स (404 Failover)' : 'Rescued from 404'}</span>
          <ArrowRightLeft className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-amber-400 tabular-nums">
          {stats.totalFailovers.toLocaleString()}
        </div>
        <div className="text-[11px] text-emerald-400 font-medium mt-1">
          {isHindi ? '0% ट्रैफिक ड्रॉप' : 'Zero dropped visitors'}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>{isHindi ? 'बचाया गया एड बजट' : 'Ad Budget Saved'}</span>
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400 tabular-nums">
          ${stats.savedAdSpend.toFixed(2)}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          {isHindi ? 'CPC के आधार पर बचत' : 'Based on configured CPC'}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>{isHindi ? 'औसत शिफ्ट समय' : 'Failover Switch Time'}</span>
          <Clock className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-cyan-300 tabular-nums">
          ~8ms
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          {isHindi ? 'बिजली की गति से रिडायरेक्ट' : 'Sub-millisecond resolution'}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 col-span-2 md:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>{isHindi ? 'निगरानी में डोमेन' : 'Monitored URLs'}</span>
          <Layers className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
          {stats.monitoredUrls}
        </div>
        <div className="text-[11px] text-purple-400 mt-1">
          {stats.activeCampaigns} {isHindi ? 'सक्रिय अभियान' : 'Active cascades'}
        </div>
      </div>
    </div>
  );
};
