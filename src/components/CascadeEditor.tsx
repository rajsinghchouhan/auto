import React, { useState } from 'react';
import { Campaign, TargetUrl, RedirectType } from '../types/campaign.js';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Globe,
  Settings2,
  Save,
  Check,
} from 'lucide-react';

interface CascadeEditorProps {
  campaign: Campaign;
  onSaveCampaign: (updated: Partial<Campaign>) => Promise<void>;
  onProbeCampaign: (campaignId: string) => Promise<void>;
  isHindi: boolean;
}

export const CascadeEditor: React.FC<CascadeEditorProps> = ({
  campaign,
  onSaveCampaign,
  onProbeCampaign,
  isHindi,
}) => {
  const [targets, setTargets] = useState<TargetUrl[]>(campaign.targets);
  const [name, setName] = useState(campaign.name);
  const [redirectType, setRedirectType] = useState<RedirectType>(campaign.redirectType);
  const [forwardParams, setForwardParams] = useState(campaign.forwardParams);
  const [autoRecover, setAutoRecover] = useState(campaign.autoRecover);
  const [emergencyFallbackUrl, setEmergencyFallbackUrl] = useState(campaign.emergencyFallbackUrl);
  const [estimatedCpc, setEstimatedCpc] = useState(campaign.estimatedCpc);
  const [isSaving, setIsSaving] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if campaign prop changes
  React.useEffect(() => {
    setTargets(campaign.targets);
    setName(campaign.name);
    setRedirectType(campaign.redirectType);
    setForwardParams(campaign.forwardParams);
    setAutoRecover(campaign.autoRecover);
    setEmergencyFallbackUrl(campaign.emergencyFallbackUrl);
    setEstimatedCpc(campaign.estimatedCpc);
  }, [campaign]);

  const handleMovePriority = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= targets.length) return;

    const reordered = [...targets];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    // Update priorities
    const updated = reordered.map((t, idx) => ({
      ...t,
      priority: idx + 1,
    }));
    setTargets(updated);
  };

  const handleUpdateTargetField = (index: number, field: keyof TargetUrl, value: any) => {
    const copy = [...targets];
    copy[index] = { ...copy[index], [field]: value };
    setTargets(copy);
  };

  const handleAddTarget = () => {
    const newTarget: TargetUrl = {
      id: `t-${Date.now()}`,
      url: 'https://new-landing-page.com',
      label: `Backup ${targets.length}`,
      priority: targets.length + 1,
      status: 'healthy',
      httpStatusCode: 200,
      lastChecked: Date.now(),
      responseTimeMs: 75,
      failoverCount: 0,
      isSimulatedDead: false,
      simulatedStatusCode: 404,
    };
    setTargets([...targets, newTarget]);
  };

  const handleRemoveTarget = (index: number) => {
    if (targets.length <= 1) {
      alert(isHindi ? 'कम से कम एक टारगेट URL आवश्यक है!' : 'At least one target URL is required!');
      return;
    }
    const filtered = targets.filter((_, idx) => idx !== index).map((t, idx) => ({
      ...t,
      priority: idx + 1,
    }));
    setTargets(filtered);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveCampaign({
        name,
        redirectType,
        forwardParams,
        autoRecover,
        emergencyFallbackUrl,
        estimatedCpc: Number(estimatedCpc) || 1.5,
        targets,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProbe = async () => {
    setIsProbing(true);
    try {
      await onProbeCampaign(campaign.id);
    } finally {
      setIsProbing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <span>{isHindi ? 'फॉलबैक कैस्केड कॉन्फ़िगरेशन' : 'Failover Cascade Chain Manager'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isHindi
              ? 'यहाँ आप Primary और Backup URLs की प्राथमिकता तय कर सकते हैं (Priority 1 = abc.com, Priority 2 = bca.com, Priority 3 = pac.com)'
              : 'Configure the prioritized fallback order for incoming ad traffic when outages occur'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleProbe}
            disabled={isProbing}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isHindi ? 'सभी लिंक्स को अभी पिंग करें' : 'Probe All Targets'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>{isHindi ? 'सहेजा गया!' : 'Saved!'}</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? (isHindi ? 'सहेजा जा रहा है...' : 'Saving...') : (isHindi ? 'बदलाव सेव करें' : 'Save Cascade')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Target URLs Table / Priority List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {isHindi ? 'प्राथमिकता क्रम (Cascade Order):' : 'Prioritized Cascade Order:'}
          </div>
          <button
            onClick={handleAddTarget}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isHindi ? '+ नया बैकअप URL जोड़ें' : '+ Add Backup Target'}</span>
          </button>
        </div>

        <div className="space-y-3">
          {targets.map((target, idx) => {
            const isPrimary = idx === 0;
            return (
              <div
                key={target.id}
                className={`p-4 rounded-xl border transition-all ${
                  isPrimary
                    ? 'bg-slate-950/80 border-cyan-800/60 shadow-md shadow-cyan-950/20'
                    : 'bg-slate-950/50 border-slate-800/80'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Priority & Reorder Controls */}
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                      isPrimary ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}>
                      #{idx + 1}
                    </span>

                    <div className="flex flex-col">
                      <button
                        onClick={() => handleMovePriority(idx, 'up')}
                        disabled={idx === 0}
                        aria-label={`Move target ${idx + 1} priority up`}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                        title="Move Up in Priority"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMovePriority(idx, 'down')}
                        disabled={idx === targets.length - 1}
                        aria-label={`Move target ${idx + 1} priority down`}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                        title="Move Down in Priority"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="min-w-[120px]">
                      <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-400">
                        {isPrimary ? (isHindi ? 'प्राइमरी URL' : 'Primary Target') : (isHindi ? `बैकअप #${idx}` : `Backup #${idx}`)}
                      </span>
                      <input
                        type="text"
                        value={target.label}
                        onChange={(e) => handleUpdateTargetField(idx, 'label', e.target.value)}
                        placeholder="Label"
                        className="text-xs bg-transparent border-b border-slate-700 focus:border-cyan-400 text-slate-200 py-0.5 focus:outline-none w-full"
                      />
                    </div>
                  </div>

                  {/* URL Input */}
                  <div className="flex-1">
                    <input
                      type="url"
                      value={target.url}
                      onChange={(e) => handleUpdateTargetField(idx, 'url', e.target.value)}
                      placeholder="https://abc.com/landing-page"
                      className="w-full text-xs font-mono bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Status & Delete */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        target.httpStatusCode === 200
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                      }`}>
                        HTTP {target.httpStatusCode || 200}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {target.responseTimeMs || 65}ms
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveTarget(idx)}
                      disabled={targets.length <= 1}
                      aria-label={`Delete target ${idx + 1}`}
                      className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-20 transition-colors"
                      title="Remove Target"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advanced Campaign Settings */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-cyan-400" />
          <span>{isHindi ? 'रीडायरेक्शन और एड सेटिंग्स' : 'Routing & Ad Protection Settings'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Campaign Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isHindi ? 'अभियान का नाम:' : 'Campaign Name:'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Redirection Method */}
          <div>
            <label htmlFor="redirect-method-select" className="block text-xs font-semibold text-slate-300 mb-1">
              {isHindi ? 'रीडायरेक्शन प्रकार (Redirect Method):' : 'Redirection Method:'}
            </label>
            <select
              id="redirect-method-select"
              aria-label={isHindi ? 'रीडायरेक्शन प्रकार' : 'Redirection Method'}
              value={redirectType}
              onChange={(e) => setRedirectType(e.target.value as RedirectType)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="302">HTTP 302 Found (Recommended for Google & Meta Ads)</option>
              <option value="307">HTTP 307 Temporary Redirect</option>
              <option value="meta_refresh">Meta Refresh (HTML Header)</option>
              <option value="js_bridge">JavaScript Window.Location Bridge</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              {isHindi
                ? '302 रिडायरेक्ट एड नेटवर्क्स के लिए सबसे सुरक्षित और तेज़ माना जाता है।'
                : '302 Temporary is optimal for preserving ad quality score and bypassing caching.'}
            </p>
          </div>

          {/* Emergency Safety Fallback URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isHindi ? 'आपातकालीन फॉलबैक URL (Emergency Fallback):' : 'Emergency Fallback Safe URL:'}
            </label>
            <input
              type="url"
              value={emergencyFallbackUrl}
              onChange={(e) => setEmergencyFallbackUrl(e.target.value)}
              placeholder="https://safe-backup.com"
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {isHindi ? 'यदि सभी बैकअप्स डाउन हो जाएं तो इस पेज पर भेजा जाएगा।' : 'Triggered only if all cascade targets return 404.'}
            </p>
          </div>

          {/* CPC Estimate */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isHindi ? 'अनुमानित CPC ($ प्रति क्लिक):' : 'Estimated Cost Per Click (USD):'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-500">$</span>
              <input
                type="number"
                step="0.10"
                min="0.10"
                value={estimatedCpc}
                onChange={(e) => setEstimatedCpc(Number(e.target.value))}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isHindi ? '404 की वजह से बर्बाद होने से बचाए गए बजट की गणना के लिए।' : 'Used to compute ad budget saved from prevented 404 bounces.'}
            </p>
          </div>
        </div>

        {/* Toggles */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={forwardParams}
              onChange={(e) => setForwardParams(e.target.checked)}
              className="mt-1 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <div>
              <span className="text-xs font-semibold text-white block">
                {isHindi ? 'UTM और Ad Click ID (gclid, fbclid) फॉरवर्ड करें' : 'Forward UTM & Tracking Parameters'}
              </span>
              <span className="text-[11px] text-slate-400">
                {isHindi
                  ? 'utm_source, utm_campaign, gclid आदि को बैकअप URL में अपने आप जोड़ देगा ताकि एनालिटिक्स ट्रैकिंग कभी न टूटे।'
                  : 'Preserves gclid, fbclid, utm_source, and query tags onto backup landing pages.'}
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRecover}
              onChange={(e) => setAutoRecover(e.target.checked)}
              className="mt-1 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <div>
              <span className="text-xs font-semibold text-white block">
                {isHindi ? 'ऑटोमैटिक री-स्टोर (Auto-Recover to Primary)' : 'Auto-Recover to Primary'}
              </span>
              <span className="text-[11px] text-slate-400">
                {isHindi
                  ? 'जैसे ही abc.com दोबारा 200 OK होगा, ट्रैफिक अपने आप मुख्य पेज पर वापस ट्रांसफर हो जाएगा।'
                  : 'Automatically routes back to Primary URL as soon as its HTTP 200 health is restored.'}
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
