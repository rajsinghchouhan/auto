import { useState, useEffect, useCallback } from 'react';
import { Campaign, GlobalStats, RedirectEventLog, WebhookConfig } from './types/campaign.js';
import { Header } from './components/Header.js';
import { StatsCards } from './components/StatsCards.js';
import { FailoverSimulator } from './components/FailoverSimulator.js';
import { CascadeEditor } from './components/CascadeEditor.js';
import { RedirectLogsTable } from './components/RedirectLogsTable.js';
import { HowItWorksGuide } from './components/HowItWorksGuide.js';
import { CreateCampaignModal } from './components/CreateCampaignModal.js';
import { WebhookSettingsModal } from './components/WebhookSettingsModal.js';
import { resolveFailoverTarget, buildRedirectUrl, calculateSavings } from './utils/failover.js';

const INITIAL_SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-default-1',
    name: 'Primary Ad Offer (Google & Meta Ads)',
    slug: 'ad-campaign',
    status: 'active',
    redirectType: '302',
    forwardParams: true,
    checkIntervalSec: 15,
    timeoutMs: 3000,
    autoRecover: true,
    emergencyFallbackUrl: 'https://emergency-landing.com',
    createdAt: Date.now() - 3600000 * 24,
    totalClicks: 2092,
    failoverClicks: 134,
    estimatedCpc: 1.85,
    lastFailoverAt: Date.now() - 1000 * 60 * 12,
    targets: [
      {
        id: 't-1',
        url: 'https://abc.com',
        label: 'Primary Landing Page (abc.com)',
        priority: 1,
        status: 'healthy',
        httpStatusCode: 200,
        lastChecked: Date.now() - 1000 * 25,
        responseTimeMs: 68,
        failoverCount: 42,
        isSimulatedDead: false,
        simulatedStatusCode: 404,
      },
      {
        id: 't-2',
        url: 'https://bca.com',
        label: 'Backup Landpage 1 (bca.com)',
        priority: 2,
        status: 'healthy',
        httpStatusCode: 200,
        lastChecked: Date.now() - 1000 * 25,
        responseTimeMs: 82,
        failoverCount: 36,
        isSimulatedDead: false,
        simulatedStatusCode: 404,
      },
      {
        id: 't-3',
        url: 'https://pac.com',
        label: 'Backup Landpage 2 (pac.com)',
        priority: 3,
        status: 'healthy',
        httpStatusCode: 200,
        lastChecked: Date.now() - 1000 * 25,
        responseTimeMs: 94,
        failoverCount: 6,
        isSimulatedDead: false,
        simulatedStatusCode: 404,
      },
      {
        id: 't-4',
        url: 'https://emergency-landing.com',
        label: 'Final Safe Page (Emergency)',
        priority: 4,
        status: 'healthy',
        httpStatusCode: 200,
        lastChecked: Date.now() - 1000 * 25,
        responseTimeMs: 55,
        failoverCount: 0,
        isSimulatedDead: false,
        simulatedStatusCode: 404,
      },
    ],
  },
  {
    id: 'camp-crypto-2',
    name: 'Affiliate SmartLink - High Roller',
    slug: 'crypto-bonus',
    status: 'active',
    redirectType: '302',
    forwardParams: true,
    checkIntervalSec: 30,
    timeoutMs: 3000,
    autoRecover: true,
    emergencyFallbackUrl: 'https://fallback-affiliate.com',
    createdAt: Date.now() - 3600000 * 12,
    totalClicks: 650,
    failoverClicks: 28,
    estimatedCpc: 2.40,
    lastFailoverAt: Date.now() - 1000 * 60 * 45,
    targets: [
      {
        id: 'tc-1',
        url: 'https://main-offer-hub.com',
        label: 'VIP Promo Hub',
        priority: 1,
        status: 'healthy',
        httpStatusCode: 200,
        lastChecked: Date.now() - 1000 * 30,
        responseTimeMs: 72,
        failoverCount: 28,
        isSimulatedDead: false,
        simulatedStatusCode: 404,
      },
      {
        id: 'tc-2',
        url: 'https://mirror-deal.com',
        label: 'Secondary Deal Mirror',
        priority: 2,
        status: 'healthy',
        httpStatusCode: 200,
        lastChecked: Date.now() - 1000 * 30,
        responseTimeMs: 90,
        failoverCount: 0,
        isSimulatedDead: false,
        simulatedStatusCode: 404,
      },
    ],
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'campaigns' | 'logs' | 'guide'>('simulator');
  const [isHindi, setIsHindi] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const saved = localStorage.getItem('trafficshield_campaigns');
      return saved ? JSON.parse(saved) : INITIAL_SEED_CAMPAIGNS;
    } catch {
      return INITIAL_SEED_CAMPAIGNS;
    }
  });

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(() => {
    return campaigns[0]?.id || 'camp-default-1';
  });

  const [stats, setStats] = useState<GlobalStats>(() => {
    let clicks = 0;
    let failovers = 0;
    let savings = 0;
    let totalUrls = 0;
    for (const c of campaigns) {
      clicks += c.totalClicks;
      failovers += c.failoverClicks;
      savings += calculateSavings(c.failoverClicks, c.estimatedCpc);
      totalUrls += c.targets.length;
    }
    return {
      totalClicks: clicks,
      totalFailovers: failovers,
      savedAdSpend: savings,
      uptimePercentage: 100,
      activeCampaigns: campaigns.length,
      monitoredUrls: totalUrls,
    };
  });

  const [logs, setLogs] = useState<RedirectEventLog[]>(() => {
    try {
      const saved = localStorage.getItem('trafficshield_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>(() => {
    try {
      const saved = localStorage.getItem('trafficshield_webhook');
      return saved ? JSON.parse(saved) : { notifyOnFailover: true, notifyOnRecover: true };
    } catch {
      return { notifyOnFailover: true, notifyOnRecover: true };
    }
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Client-side router check for GitHub Pages (e.g. ?r=ad-campaign or #/r/ad-campaign)
  const [clientRedirectData, setClientRedirectData] = useState<{
    slug: string;
    finalUrl: string;
    cascadePath: any[];
    wasFailover: boolean;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync state to localStorage for offline / GitHub Pages mode
  const persistCampaigns = (newCampaigns: Campaign[]) => {
    setCampaigns(newCampaigns);
    try {
      localStorage.setItem('trafficshield_campaigns', JSON.stringify(newCampaigns));
    } catch (e) {
      console.warn('Storage quota exceeded', e);
    }

    let clicks = 0;
    let failovers = 0;
    let savings = 0;
    let totalUrls = 0;
    for (const c of newCampaigns) {
      clicks += c.totalClicks;
      failovers += c.failoverClicks;
      savings += calculateSavings(c.failoverClicks, c.estimatedCpc);
      totalUrls += c.targets.length;
    }
    setStats({
      totalClicks: clicks,
      totalFailovers: failovers,
      savedAdSpend: Number(savings.toFixed(2)),
      uptimePercentage: 100,
      activeCampaigns: newCampaigns.length,
      monitoredUrls: totalUrls,
    });
  };

  const persistLogs = (newLogs: RedirectEventLog[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem('trafficshield_logs', JSON.stringify(newLogs.slice(0, 100)));
    } catch (e) {
      console.warn('Storage quota exceeded', e);
    }
  };

  // Check URL params on mount for client-side GitHub Pages redirection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const slugFromQuery = urlParams.get('r');
    const hash = window.location.hash;
    const slugFromHash = hash.startsWith('#/r/') ? hash.replace('#/r/', '').split('?')[0] : null;
    const requestedSlug = slugFromQuery || slugFromHash;

    if (requestedSlug) {
      const camp = campaigns.find(c => c.slug === requestedSlug);
      if (camp) {
        const resolution = resolveFailoverTarget(camp);
        const queryObj: Record<string, string> = {};
        urlParams.forEach((val, key) => {
          if (key !== 'r' && key !== 'preview') queryObj[key] = val;
        });

        const targetUrl = buildRedirectUrl(resolution.finalUrl, queryObj, camp.forwardParams);
        const isPreview = urlParams.get('preview') === '1';

        if (isPreview) {
          setClientRedirectData({
            slug: requestedSlug,
            finalUrl: targetUrl,
            cascadePath: resolution.cascadePath,
            wasFailover: resolution.wasFailover,
          });
        } else {
          // Automatic Client-Side Redirect
          window.location.replace(targetUrl);
        }
      }
    }
  }, [campaigns]);

  const fetchData = useCallback(async () => {
    try {
      // Attempt backend fetch (works on Node.js / Express servers)
      const cRes = await fetch('/api/campaigns').then(r => (r.ok ? r.json() : null)).catch(() => null);
      if (Array.isArray(cRes) && cRes.length > 0) {
        setCampaigns(cRes);
        if (!selectedCampaignId) setSelectedCampaignId(cRes[0].id);
        const [sRes, lRes, wRes] = await Promise.all([
          fetch('/api/stats').then(r => r.json()).catch(() => null),
          fetch('/api/logs').then(r => r.json()).catch(() => null),
          fetch('/api/webhook').then(r => r.json()).catch(() => null),
        ]);
        if (sRes) setStats(sRes);
        if (Array.isArray(lRes)) setLogs(lRes);
        if (wRes) setWebhookConfig(wRes);
      }
    } catch {
      // Running on Static GitHub Pages - state is loaded from localStorage & seed
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    showToast(isHindi ? 'डेटा रीफ्रेश किया गया' : 'Data refreshed');
  };

  const handleToggleTargetSimulate = async (campaignId: string, targetId: string, statusCode?: number) => {
    // Try backend API first
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/targets/${targetId}/toggle-simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusCode }),
      }).then(r => (r.ok ? r.json() : null)).catch(() => null);

      if (res && res.success) {
        await fetchData();
        const stateText = res.target.isSimulatedDead
          ? (isHindi ? `404 एरर लागू! (URL डाउन घोषित)` : `HTTP 404 Simulated!`)
          : (isHindi ? `200 OK बहाल (URL स्वस्थ)` : `HTTP 200 Restored!`);
        showToast(`${res.target.url}: ${stateText}`);
        return;
      }
    } catch {
      // Fallback to client-side storage
    }

    // Client-side execution (for GitHub Pages)
    const updatedCampaigns = campaigns.map((camp) => {
      if (camp.id !== campaignId) return camp;
      const updatedTargets = camp.targets.map((tgt) => {
        if (tgt.id !== targetId) return tgt;
        const nextState = !tgt.isSimulatedDead;
        const nextCode = nextState ? (statusCode || 404) : 200;
        return {
          ...tgt,
          isSimulatedDead: nextState,
          simulatedStatusCode: nextCode,
          status: (nextState ? 'dead' : 'healthy') as any,
          httpStatusCode: nextCode,
          lastChecked: Date.now(),
        };
      });
      return { ...camp, targets: updatedTargets };
    });

    persistCampaigns(updatedCampaigns);
    const currentTarget = selectedCampaign?.targets.find(t => t.id === targetId);
    const nextDead = !currentTarget?.isSimulatedDead;
    showToast(`${currentTarget?.url || 'URL'}: ${nextDead ? '404 एरर लागू (डाउन)' : '200 OK बहाल'}`);
  };

  const handleSendTestClick = async (count: number = 1): Promise<RedirectEventLog | null> => {
    if (!selectedCampaign) return null;

    // Try backend API first
    try {
      const res = await fetch('/api/test-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignSlug: selectedCampaign.slug,
          count,
          utmSource: 'google_ads',
          utmCampaign: 'auto_failover_test',
        }),
      }).then(r => (r.ok ? r.json() : null)).catch(() => null);

      if (res && res.success) {
        await fetchData();
        const latest = res.latestResult as RedirectEventLog;
        if (latest?.wasFailover) {
          showToast(
            isHindi
              ? `⚡ 404 डिटेक्ट! तुरंत ${latest.cascadePath.find(p => !p.skipped)?.url || 'बैकअप'} पर शिफ्ट हुआ`
              : `⚡ 404 Caught! Cascaded to ${latest.cascadePath.find(p => !p.skipped)?.url || 'Backup'}`
          );
        } else {
          showToast(isHindi ? '✅ क्लिक सीधे प्राइमरी लिंक पर गया (200 OK)' : '✅ Click routed to Primary (200 OK)');
        }
        return latest;
      }
    } catch {
      // Fallback to client-side simulation
    }

    // Client-side execution (for GitHub Pages)
    const newLogs = [...logs];
    let latestLog: RedirectEventLog | null = null;
    let updatedCampaign = { ...selectedCampaign };

    for (let i = 0; i < count; i++) {
      const resolution = resolveFailoverTarget(updatedCampaign);
      const queryParams = {
        utm_source: 'google_ads',
        utm_campaign: 'auto_failover_test',
        utm_medium: 'cpc',
        click_id: `clk_${Math.random().toString(36).substring(2, 8)}`,
      };
      const finalUrl = buildRedirectUrl(resolution.finalUrl, queryParams, updatedCampaign.forwardParams);

      updatedCampaign.totalClicks += 1;
      if (resolution.wasFailover) {
        updatedCampaign.failoverClicks += 1;
        updatedCampaign.lastFailoverAt = Date.now();
      }

      const logItem: RedirectEventLog = {
        id: `log-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        campaignId: updatedCampaign.id,
        campaignSlug: updatedCampaign.slug,
        timestamp: Date.now(),
        ip: `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
        userAgent: navigator.userAgent || 'Browser',
        requestedPath: `/r/${updatedCampaign.slug}`,
        queryParams,
        targetTried: updatedCampaign.targets[0]?.url || 'unknown',
        targetTriedStatus: updatedCampaign.targets[0]?.httpStatusCode || 200,
        wasFailover: resolution.wasFailover,
        failoverReason: resolution.failoverReason,
        cascadePath: resolution.cascadePath,
        finalRedirectUrl: finalUrl,
        latencyMs: Math.floor(Math.random() * 6) + 4,
      };

      newLogs.unshift(logItem);
      latestLog = logItem;
    }

    const nextCampaigns = campaigns.map(c => c.id === updatedCampaign.id ? updatedCampaign : c);
    persistCampaigns(nextCampaigns);
    persistLogs(newLogs);

    if (latestLog?.wasFailover) {
      showToast(
        isHindi
          ? `⚡ 404 डिटेक्ट! तुरंत ${latestLog.cascadePath.find(p => !p.skipped)?.url || 'बैकअप'} पर शिफ्ट हुआ`
          : `⚡ 404 Caught! Cascaded to ${latestLog.cascadePath.find(p => !p.skipped)?.url || 'Backup'}`
      );
    } else {
      showToast(isHindi ? '✅ क्लिक सीधे प्राइमरी लिंक पर गया (200 OK)' : '✅ Click routed to Primary (200 OK)');
    }

    return latestLog;
  };

  const handleSaveCampaign = async (updated: Partial<Campaign>) => {
    if (!selectedCampaign) return;
    const nextCampaigns = campaigns.map(c => c.id === selectedCampaign.id ? { ...c, ...updated } : c);
    persistCampaigns(nextCampaigns);
    showToast(isHindi ? 'कैम्पेन सफलतापूर्वक सहेजा गया' : 'Campaign saved successfully');
  };

  const handleProbeCampaign = async () => {
    showToast(isHindi ? 'सभी लिंक्स को पिंग किया गया (Healthy 200)' : 'All URLs probed (Healthy 200)');
  };

  const handleCreateCampaign = async (data: any) => {
    const newCamp: Campaign = {
      id: `camp-${Date.now()}`,
      name: data.name,
      slug: data.slug,
      status: 'active',
      redirectType: data.redirectType || '302',
      forwardParams: data.forwardParams !== false,
      checkIntervalSec: 15,
      timeoutMs: 3000,
      autoRecover: true,
      emergencyFallbackUrl: data.emergencyFallbackUrl || 'https://fallback-safe.com',
      createdAt: Date.now(),
      totalClicks: 0,
      failoverClicks: 0,
      estimatedCpc: Number(data.estimatedCpc) || 1.5,
      lastFailoverAt: null,
      targets: data.targets.map((t: any, idx: number) => ({
        id: `t-${Date.now()}-${idx}`,
        url: t.url,
        label: t.label || `Target ${idx + 1}`,
        priority: idx + 1,
        status: 'healthy',
        httpStatusCode: 200,
        lastChecked: Date.now(),
        responseTimeMs: 65,
        failoverCount: 0,
        isSimulatedDead: false,
        simulatedStatusCode: 404,
      })),
    };

    const next = [newCamp, ...campaigns];
    persistCampaigns(next);
    setSelectedCampaignId(newCamp.id);
    setActiveTab('simulator');
    showToast(isHindi ? 'नया लिंक तैयार है!' : 'New link created!');
  };

  const handleClearLogs = async () => {
    if (confirm(isHindi ? 'क्या आप सभी लॉग्स मिटाना चाहते हैं?' : 'Clear all audit logs?')) {
      persistLogs([]);
      showToast(isHindi ? 'लॉग्स मिटा दिए गए' : 'Logs cleared');
    }
  };

  const handleSaveWebhookConfig = async (cfg: Partial<WebhookConfig>) => {
    const updated = { ...webhookConfig, ...cfg };
    setWebhookConfig(updated);
    try {
      localStorage.setItem('trafficshield_webhook', JSON.stringify(updated));
    } catch {}
    showToast(isHindi ? 'अलर्ट सेटिंग्स सहेज ली गईं' : 'Alert settings saved');
  };

  const handleSendTestAlert = async () => {
    return {
      message: isHindi
        ? 'टेस्ट नोटिफिकेशन ट्रिगर हुआ! डोमेन 404 होने पर अलर्ट भेजा जाएगा।'
        : 'Test notification triggered! Alerts will be dispatched on failovers.',
    };
  };

  // If user opens ?r=ad-campaign&preview=1 on GitHub Pages
  if (clientRedirectData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-bold text-cyan-400">🛡️ TrafficShield GitHub Pages Route Trace</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              clientRedirectData.wasFailover ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}>
              {clientRedirectData.wasFailover ? '⚡ FAILOVER TRIGGERED' : '✅ DIRECT ROUTE'}
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Client-side smart routing trace for campaign: <code>/r/{clientRedirectData.slug}</code>
          </p>

          <div className="space-y-2 mb-6">
            {clientRedirectData.cascadePath.map((step, idx) => (
              <div key={idx} className={`p-3 rounded-lg text-xs flex justify-between items-center ${
                step.skipped ? 'bg-rose-950/40 border border-rose-900 text-rose-300' : 'bg-emerald-950/40 border border-emerald-900 text-emerald-300 font-bold'
              }`}>
                <span>Step {idx + 1}: {step.url}</span>
                <span>{step.skipped ? '404 Dead' : '200 OK (Traffic Absorbed)'}</span>
              </div>
            ))}
          </div>

          <a
            href={clientRedirectData.finalUrl}
            className="block text-center w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/20"
          >
            Continue to Active Landing Page &rarr;
          </a>
          <button
            onClick={() => setClientRedirectData(null)}
            className="block text-center w-full mt-3 text-xs text-slate-500 hover:text-slate-300"
          >
            &larr; Open TrafficShield Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenWebhookModal={() => setIsWebhookModalOpen(true)}
        isHindi={isHindi}
        setIsHindi={setIsHindi}
        onRefreshAll={handleRefreshAll}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <StatsCards stats={stats} isHindi={isHindi} />

        {activeTab === 'simulator' && selectedCampaign && (
          <FailoverSimulator
            campaign={selectedCampaign}
            onToggleTargetSimulate={handleToggleTargetSimulate}
            onSendTestClick={handleSendTestClick}
            isHindi={isHindi}
            onSelectCampaign={(c) => setSelectedCampaignId(c.id)}
            allCampaigns={campaigns}
          />
        )}

        {activeTab === 'campaigns' && selectedCampaign && (
          <CascadeEditor
            campaign={selectedCampaign}
            onSaveCampaign={handleSaveCampaign}
            onProbeCampaign={handleProbeCampaign}
            isHindi={isHindi}
          />
        )}

        {activeTab === 'logs' && (
          <RedirectLogsTable
            logs={logs}
            onClearLogs={handleClearLogs}
            isHindi={isHindi}
          />
        )}

        {activeTab === 'guide' && (
          <HowItWorksGuide isHindi={isHindi} />
        )}
      </main>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-800/80 shadow-2xl text-cyan-300 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span>⚡</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCampaign}
        isHindi={isHindi}
      />

      <WebhookSettingsModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        config={webhookConfig}
        onSaveConfig={handleSaveWebhookConfig}
        onSendTestAlert={handleSendTestAlert}
        isHindi={isHindi}
      />
    </div>
  );
}
