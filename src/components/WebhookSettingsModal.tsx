import React, { useState } from 'react';
import { X, Bell, Send, Check } from 'lucide-react';
import { WebhookConfig } from '../types/campaign.js';

interface WebhookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WebhookConfig;
  onSaveConfig: (cfg: Partial<WebhookConfig>) => Promise<void>;
  onSendTestAlert: () => Promise<any>;
  isHindi: boolean;
}

export const WebhookSettingsModal: React.FC<WebhookSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onSendTestAlert,
  isHindi,
}) => {
  const [telegramBotToken, setTelegramBotToken] = useState(config.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(config.telegramChatId || '');
  const [customWebhookUrl, setCustomWebhookUrl] = useState(config.customWebhookUrl || '');
  const [notifyOnFailover, setNotifyOnFailover] = useState(config.notifyOnFailover);
  const [notifyOnRecover, setNotifyOnRecover] = useState(config.notifyOnRecover);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveConfig({
        telegramBotToken,
        telegramChatId,
        customWebhookUrl,
        notifyOnFailover,
        notifyOnRecover,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onSendTestAlert();
      setTestResult(res?.message || 'Test alert triggered successfully!');
    } catch {
      setTestResult('Failed to trigger alert');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              {isHindi ? 'डोमेन क्रैश और 404 अलर्ट सेटिंग्स' : 'Disaster Recovery Alerts & Webhooks'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          {isHindi
            ? 'जब भी abc.com या कोई बैकअप लिंक 404 एरर देगा और ट्रैफिक शिफ्ट होगा, आपको तुरंत Telegram या Webhook पर सूचना मिल जाएगी।'
            : 'Get instant notifications on Telegram, Slack, or Discord whenever an ad landing page triggers an automatic failover.'}
        </p>

        <div className="space-y-4 text-xs">
          {/* Telegram Settings */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-cyan-400 block">
              {isHindi ? '1. Telegram बॉट अलर्ट (Instant):' : '1. Telegram Bot Integration:'}
            </span>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Bot Token:</label>
              <input
                type="text"
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Chat ID:</label>
              <input
                type="text"
                placeholder="@my_channel or -10012345678"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Webhook URL */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-amber-400 block">
              {isHindi ? '2. Custom Webhook (Slack / Discord / Zapier):' : '2. Custom Webhook URL:'}
            </span>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={customWebhookUrl}
              onChange={(e) => setCustomWebhookUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnFailover}
                onChange={(e) => setNotifyOnFailover(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500"
              />
              <span className="text-slate-300">
                {isHindi ? '404 एरर व ट्रैफिक शिफ्ट होने पर अलर्ट भेजें' : 'Notify immediately when failover is triggered'}
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnRecover}
                onChange={(e) => setNotifyOnRecover(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500"
              />
              <span className="text-slate-300">
                {isHindi ? 'प्राइमरी लिंक वापस 200 OK होने पर सूचित करें' : 'Notify when Primary URL recovers to 200 OK'}
              </span>
            </label>
          </div>

          {testResult && (
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{testResult}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1.5 font-semibold transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isHindi ? 'टेस्ट अलर्ट भेजें' : 'Send Test Alert'}</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                {isHindi ? 'रद्द' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all shadow-md shadow-cyan-600/20"
              >
                {isHindi ? 'सेव करें' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
