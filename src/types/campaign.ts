export type TargetStatus = 'healthy' | 'dead' | 'probing' | 'paused';

export interface TargetUrl {
  id: string;
  url: string;
  label: string;
  priority: number; // 1 = Primary, 2 = Backup 1, 3 = Backup 2, etc.
  status: TargetStatus;
  httpStatusCode: number;
  lastChecked: number | null;
  responseTimeMs: number;
  failoverCount: number;
  isSimulatedDead?: boolean;
  simulatedStatusCode?: number; // e.g. 404, 502, 504
}

export type RedirectType = '302' | '307' | 'meta_refresh' | 'js_bridge';

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'paused';
  targets: TargetUrl[];
  redirectType: RedirectType;
  forwardParams: boolean;
  checkIntervalSec: number;
  timeoutMs: number;
  autoRecover: boolean;
  emergencyFallbackUrl: string;
  createdAt: number;
  totalClicks: number;
  failoverClicks: number;
  estimatedCpc: number; // in USD for calculating saved revenue
  lastFailoverAt: number | null;
}

export interface RedirectEventLog {
  id: string;
  campaignId: string;
  campaignSlug: string;
  timestamp: number;
  ip: string;
  userAgent: string;
  requestedPath: string;
  queryParams: Record<string, string>;
  targetTried: string;
  targetTriedStatus: number;
  wasFailover: boolean;
  failoverReason?: string;
  cascadePath: {
    url: string;
    label: string;
    status: number;
    reason: string;
    skipped: boolean;
  }[];
  finalRedirectUrl: string;
  latencyMs: number;
}

export interface WebhookConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  customWebhookUrl?: string;
  notifyOnFailover: boolean;
  notifyOnRecover: boolean;
  lastAlertSentAt?: number;
}

export interface GlobalStats {
  totalClicks: number;
  totalFailovers: number;
  savedAdSpend: number;
  uptimePercentage: number;
  activeCampaigns: number;
  monitoredUrls: number;
}
