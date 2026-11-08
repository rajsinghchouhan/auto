import React, { useState } from 'react';
import { Campaign, TargetUrl, RedirectEventLog } from '../types/campaign.js';
import {
  Zap,
  Play,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';

interface FailoverSimulatorProps {
  campaign: Campaign;
  onToggleTargetSimulate: (campaignId: string, targetId: string, statusCode?: number) => Promise<void>;
  onSendTestClick: (count: number) => Promise<RedirectEventLog | null>;
  isHindi: boolean;
  onSelectCampaign: (campaign: Campaign) => void;
  allCampaigns: Campaign[];
}

export const FailoverSimulator: React.FC<FailoverSimulatorProps> = ({
  campaign,
  onToggleTargetSimulate,
  onSendTestClick,
  isHindi,
  onSelectCampaign,
  allCampaigns,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<RedirectEventLog | null>(null);
  const [activeRouteAnimation, setActiveRouteAnimation] = useState<string | null>(null);

  const targets = [...campaign.targets].sort((a, b) => a.priority - b.priority);

  const handleTestClick = async (count: number) => {
    setIsSimulating(true);
    try {
      const res = await onSendTestClick(count);
      if (res) {
        setLastResult(res);
        setActiveRouteAnimation(res.finalRedirectUrl);
        setTimeout(() => setActiveRouteAnimation(null), 2500);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  // Find currently active target
  const activeTarget = targets.find(t => {
    if (t.status === 'paused') return false;
    if (t.isSimulatedDead) return false;
    if (t.httpStatusCode === 404 || t.httpStatusCode >= 500) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Selector & Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                {isHindi ? 'लाइव सिमुलेशन और स्ट्रेस टेस्ट' : 'Interactive Failover Sandbox'}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-xs text-slate-400">
                {isHindi ? '404 एरर आने पर ऑटोमैटिक शिफ्ट की जांच करें' : 'Simulate 404 outages & verify instant cascade'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              {campaign.name}
            </h2>
            <div className="flex items-center gap-2 mt-2 text-xs font-mono">
              <span className="text-slate-400">{isHindi ? 'आपका Ad Routing Link:' : 'Your Ad Link:'}</span>
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold">
                {window.location.origin}/r/{campaign.slug}
              </span>
              <a
                href={`/r/${campaign.slug}?preview=1`}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline underline-offset-2 ml-1"
                title="Inspect real redirect with visual trace"
              >
                <span>{isHindi ? 'ब्राउज़र में टेस्ट करें' : 'Test in Browser'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Campaign Selector if multiple exist */}
          {allCampaigns.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="campaign-select" className="text-xs text-slate-400">{isHindi ? 'अभियान चुनें:' : 'Select Campaign:'}</label>
              <select
                id="campaign-select"
                aria-label={isHindi ? 'अभियान चुनें' : 'Select Campaign'}
                value={campaign.id}
                onChange={(e) => {
                  const found = allCampaigns.find(c => c.id === e.target.value);
                  if (found) onSelectCampaign(found);
                }}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {allCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (/r/{c.slug})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Visual Interactive Cascade Chain */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span>{isHindi ? 'ऑटोमैटिक फॉलबैक कैस्केड चेन' : 'Target Cascade Flow Chain'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHindi
                ? 'नीचे दिए गए बटन्स पर क्लिक करके 404 एरर ट्रिगर करें और देखें कि ट्रैफिक कैसे अगले लिंक पर जाता है'
                : 'Click "Simulate 404" on any link below to test zero-loss auto-shift in real-time'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTestClick(1)}
              disabled={isSimulating}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isHindi ? '1 टेस्ट क्लिक भेजें' : 'Send 1 Test Click'}</span>
            </button>
            <button
              onClick={() => handleTestClick(20)}
              disabled={isSimulating}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isHindi ? '20 बैच क्लिक्स भेजें' : 'Batch 20 Clicks'}</span>
            </button>
          </div>
        </div>

        {/* Chain Flow Visualization Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          {targets.map((target, idx) => {
            const isDead = target.isSimulatedDead || target.httpStatusCode === 404 || target.status === 'dead';
            const isCurrentlyActive = activeTarget?.id === target.id;

            return (
              <div
                key={target.id}
                className={`relative rounded-xl p-4 transition-all duration-300 border ${
                  isCurrentlyActive
                    ? 'bg-emerald-950/20 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                    : isDead
                    ? 'bg-rose-950/20 border-rose-800/80 opacity-90'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                {/* Priority Label */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    idx === 0 ? 'text-cyan-400' : 'text-slate-400'
                  }`}>
                    {idx === 0
                      ? (isHindi ? 'प्राइमरी URL (Priority 1)' : 'Priority 1 (Primary)')
                      : (isHindi ? `बैकअप ${idx} (Priority ${idx + 1})` : `Priority ${idx + 1} (Backup ${idx})`)}
                  </span>
                  
                  {isCurrentlyActive ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{isHindi ? 'सक्रिय रूट' : 'Active Route'}</span>
                    </span>
                  ) : isDead ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
                      <XCircle className="w-3 h-3 text-rose-400" />
                      <span>{isHindi ? '404 डाउन' : 'Dead 404'}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {isHindi ? 'स्टैंडबाय तैयार' : 'Standby'}
                    </span>
                  )}
                </div>

                {/* Target Domain Name */}
                <div className="text-sm font-bold text-white font-mono break-all mb-1">
                  {target.url}
                </div>
                <div className="text-xs text-slate-400 mb-3 truncate">
                  {target.label}
                </div>

                {/* Status Indicator & Response Time */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4 bg-slate-900/60 p-2 rounded border border-slate-800/50">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      isDead ? 'bg-rose-500' : 'bg-emerald-500'
                    }`} />
                    <span className={`font-mono font-medium ${
                      isDead ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {isDead ? 'HTTP 404' : 'HTTP 200 OK'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {target.responseTimeMs || 65}ms
                  </span>
                </div>

                {/* Interactive Simulation Switch */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => onToggleTargetSimulate(campaign.id, target.id, isDead ? 200 : 404)}
                    className={`w-full py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      isDead
                        ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-900/40'
                        : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-900/60'
                    }`}
                  >
                    {isDead ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isHindi ? '200 OK पर बहाल करें (Revive)' : 'Revive (200 OK)'}</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        <span>{isHindi ? '404 एरर बनाएं (Kill URL)' : 'Simulate 404 (Kill)'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Simulation Audit Banner */}
        {lastResult && (
          <div className={`mt-6 p-4 rounded-xl border transition-all ${
            lastResult.wasFailover
              ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
              : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {lastResult.wasFailover ? (
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {lastResult.wasFailover
                      ? (isHindi ? '⚡ 404 डिटेक्ट हुआ! तुरंत बैकअप लिंक पर शिफ्ट किया गया' : '⚡ Automatic Failover Activated in Real-Time!')
                      : (isHindi ? '✅ प्राइमरी लिंक स्वस्थ है (डायरेक्ट रिडायरेक्ट)' : '✅ Primary Target Healthy (Direct Redirect)')}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {lastResult.failoverReason || (isHindi ? 'प्राइमरी लिंक पर कोई एरर नहीं है।' : 'Routing directly to primary target.')}
                  </p>
                  
                  {/* Detailed Step Cascade */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 font-mono text-[11px]">
                    <span className="text-slate-400">{isHindi ? 'रूटीन पाथ:' : 'Routing Path:'}</span>
                    {lastResult.cascadePath.map((step, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded border ${
                          step.skipped
                            ? 'bg-rose-950/80 border-rose-800 text-rose-300 line-through'
                            : 'bg-emerald-950/80 border-emerald-800 text-emerald-300 font-bold'
                        }`}>
                          {step.url} ({step.skipped ? '404 Dead' : '200 OK'})
                        </span>
                        {idx < lastResult.cascadePath.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                        )}
                      </span>
                    ))}
                    <span className="text-slate-400">·</span>
                    <span className="text-cyan-400 font-bold">{lastResult.latencyMs}ms delay</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 hidden sm:block">
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(lastResult.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Hindi Guidance Card */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <div className="p-2 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 shrink-0">
          💡
        </div>
        <div className="leading-relaxed">
          <strong className="text-white">
            {isHindi ? 'यह कैसे काम करता है (How It Works):' : 'How this protects your ad spend:'}
          </strong>{' '}
          {isHindi ? (
            <span>
              Google Ads, Facebook Ads, ya kisi bhi platform par aapko <strong>TrafficShield ka master link (/r/{campaign.slug})</strong> lagana hota hai.
              Jab koi user click karta hai, system 8ms ke andar sabse pehle <strong>abc.com</strong> ko probe karta hai.
              Agar uspe <strong>404 error</strong> aaye ya domain ud jaye, toh user ko pata bhi nahi chalta aur wo seedha <strong>bca.com</strong> par land ho jata hai.
              Agar bca.com bhi 404 ho, toh seedha <strong>pac.com</strong> par chala jata hai!
            </span>
          ) : (
            <span>
              You use <strong>TrafficShield&#39;s master link (/r/{campaign.slug})</strong> in your ad campaigns.
              When a prospect clicks, our edge router verifies <strong>abc.com</strong> in ~8ms.
              If it detects a <strong>404 Not Found</strong> or server outage, incoming visitors are seamlessly routed to <strong>bca.com</strong>, or cascaded to <strong>pac.com</strong> without losing a single cent of your ad spend or lead traffic.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
