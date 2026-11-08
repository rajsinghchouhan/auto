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

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'campaigns' | 'logs' | 'guide'>('simulator');
  const [isHindi, setIsHindi] = useState(true); // Default to Hindi as user requested in Hindi!
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [stats, setStats] = useState<GlobalStats>({
    totalClicks: 0,
    totalFailovers: 0,
    savedAdSpend: 0,
    uptimePercentage: 100,
    activeCampaigns: 0,
    monitoredUrls: 0,
  });
  const [logs, setLogs] = useState<RedirectEventLog[]>([]);
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    notifyOnFailover: true,
    notifyOnRecover: true,
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [cRes, sRes, lRes, wRes] = await Promise.all([
        fetch('/api/campaigns').then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/logs').then(r => r.json()),
        fetch('/api/webhook').then(r => r.json()),
      ]);

      setCampaigns(cRes);
      if (cRes.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(cRes[0].id);
      }
      setStats(sRes);
      setLogs(lRes);
      setWebhookConfig(wRes);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling every 10s for live health
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    showToast(isHindi ? 'डेटा रीफ्रेश किया गया' : 'Data refreshed');
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];

  const handleToggleTargetSimulate = async (campaignId: string, targetId: string, statusCode?: number) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/targets/${targetId}/toggle-simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusCode }),
      }).then(r => r.json());

      if (res.success) {
        await fetchData();
        const stateText = res.target.isSimulatedDead
          ? (isHindi ? `404 एरर लागू! (URL डाउन घोषित)` : `HTTP 404 Simulated!`)
          : (isHindi ? `200 OK बहाल (URL स्वस्थ)` : `HTTP 200 Restored!`);
        showToast(`${res.target.url}: ${stateText}`);
      }
    } catch (err) {
      console.error('Failed to toggle simulate:', err);
    }
  };

  const handleSendTestClick = async (count: number = 1): Promise<RedirectEventLog | null> => {
    if (!selectedCampaign) return null;
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
      }).then(r => r.json());

      if (res.success) {
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
      return null;
    } catch (err) {
      console.error('Failed to send test click:', err);
      return null;
    }
  };

  const handleSaveCampaign = async (updated: Partial<Campaign>) => {
    if (!selectedCampaign) return;
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).then(r => r.json());

      if (res.id) {
        await fetchData();
        showToast(isHindi ? 'कैम्पेन सफलतापूर्वक सहेजा गया' : 'Campaign saved successfully');
      }
    } catch (err) {
      console.error('Failed to update campaign:', err);
    }
  };

  const handleProbeCampaign = async (campaignId: string) => {
    try {
      await fetch(`/api/campaigns/${campaignId}/probe`, { method: 'POST' });
      await fetchData();
      showToast(isHindi ? 'सभी लिंक्स को पिंग किया गया' : 'All URLs probed');
    } catch (err) {
      console.error('Failed to probe campaign:', err);
    }
  };

  const handleCreateCampaign = async (data: any) => {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json());

    if (res.error) {
      throw new Error(res.error);
    }

    await fetchData();
    setSelectedCampaignId(res.id);
    setActiveTab('simulator');
    showToast(isHindi ? 'नया लिंक तैयार है!' : 'New link created!');
  };

  const handleClearLogs = async () => {
    if (confirm(isHindi ? 'क्या आप सभी लॉग्स मिटाना चाहते हैं?' : 'Clear all audit logs?')) {
      await fetch('/api/logs', { method: 'DELETE' });
      await fetchData();
      showToast(isHindi ? 'लॉग्स मिटा दिए गए' : 'Logs cleared');
    }
  };

  const handleSaveWebhookConfig = async (cfg: Partial<WebhookConfig>) => {
    await fetch('/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    await fetchData();
    showToast(isHindi ? 'अलर्ट सेटिंग्स सहेज ली गईं' : 'Alert settings saved');
  };

  const handleSendTestAlert = async () => {
    const res = await fetch('/api/webhook/test', { method: 'POST' }).then(r => r.json());
    return res;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
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

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* Real-time KPI Stats Banner */}
        <StatsCards stats={stats} isHindi={isHindi} />

        {/* Tab Content */}
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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-800/80 shadow-2xl text-cyan-300 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span>⚡</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
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
