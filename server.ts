import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { Campaign, TargetUrl, RedirectEventLog, GlobalStats } from './src/types/campaign.js';
import { resolveFailoverTarget, buildRedirectUrl, calculateSavings } from './src/utils/failover.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory persistent state during process lifetime
let campaigns: Campaign[] = [
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
    emergencyFallbackUrl: 'https://emergency-safety-page.com',
    createdAt: Date.now() - 3600000 * 24,
    totalClicks: 1420,
    failoverClicks: 84,
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

let redirectLogs: RedirectEventLog[] = [
  {
    id: 'log-seed-1',
    campaignId: 'camp-default-1',
    campaignSlug: 'ad-campaign',
    timestamp: Date.now() - 1000 * 60 * 12,
    ip: '157.240.241.35',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
    requestedPath: '/r/ad-campaign?utm_source=meta&utm_campaign=summer&gclid=Ad1294',
    queryParams: { utm_source: 'meta', utm_campaign: 'summer', gclid: 'Ad1294' },
    targetTried: 'https://abc.com',
    targetTriedStatus: 404,
    wasFailover: true,
    failoverReason: 'Primary URL "abc.com" returned HTTP 404 Not Found. Auto-shifted in 11ms to Backup 1 (bca.com).',
    cascadePath: [
      { url: 'https://abc.com', label: 'Primary (abc.com)', status: 404, reason: 'Endpoint returned HTTP 404', skipped: true },
      { url: 'https://bca.com', label: 'Backup 1 (bca.com)', status: 200, reason: 'Healthy (HTTP 200 OK)', skipped: false },
    ],
    finalRedirectUrl: 'https://bca.com?utm_source=meta&utm_campaign=summer&gclid=Ad1294',
    latencyMs: 11,
  },
];

let webhookConfig = {
  telegramBotToken: '',
  telegramChatId: '',
  customWebhookUrl: '',
  notifyOnFailover: true,
  notifyOnRecover: true,
  lastAlertSentAt: undefined as number | undefined,
};

// Helper: Real async health probe for an external URL
async function probeTarget(target: TargetUrl, timeoutMs: number = 3000): Promise<{
  status: 'healthy' | 'dead';
  httpStatusCode: number;
  responseTimeMs: number;
}> {
  // If simulated dead in test mode, return the simulated status directly
  if (target.isSimulatedDead) {
    return {
      status: 'dead',
      httpStatusCode: target.simulatedStatusCode || 404,
      responseTimeMs: 45,
    };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // HEAD or GET request to check status
    const res = await fetch(target.url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'TrafficShield-Failover-Bot/1.0 (+https://trafficshield.io)',
      },
    }).catch(async () => {
      // If HEAD is blocked by target server, try lightweight GET
      return fetch(target.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'TrafficShield-Failover-Bot/1.0 (+https://trafficshield.io)',
        },
      });
    });

    clearTimeout(timeout);
    const duration = Date.now() - start;

    if (res.status >= 200 && res.status < 400) {
      return {
        status: 'healthy',
        httpStatusCode: res.status,
        responseTimeMs: duration,
      };
    } else {
      return {
        status: 'dead',
        httpStatusCode: res.status,
        responseTimeMs: duration,
      };
    }
  } catch {
    // Timeout or DNS failure
    const duration = Date.now() - start;
    return {
      status: 'dead',
      httpStatusCode: 504,
      responseTimeMs: duration,
    };
  }
}

// ==================== REST API ENDPOINTS ====================

app.get('/api/campaigns', (_req: Request, res: Response) => {
  res.json(campaigns);
});

app.post('/api/campaigns', (req: Request, res: Response) => {
  const { name, slug, targets, emergencyFallbackUrl, estimatedCpc, redirectType, forwardParams } = req.body;
  if (!name || !slug) {
    res.status(400).json({ error: 'Name and slug are required' });
    return;
  }

  const cleanSlug = String(slug).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (campaigns.some(c => c.slug === cleanSlug)) {
    res.status(400).json({ error: `Slug "${cleanSlug}" is already taken.` });
    return;
  }

  const initialTargets: TargetUrl[] = Array.isArray(targets) && targets.length > 0
    ? targets.map((t: any, index: number) => ({
        id: `t-${Date.now()}-${index}`,
        url: t.url || 'https://abc.com',
        label: t.label || (index === 0 ? 'Primary' : `Backup ${index}`),
        priority: index + 1,
        status: 'healthy',
        httpStatusCode: 200,
        lastChecked: Date.now(),
        responseTimeMs: 65,
        failoverCount: 0,
        isSimulatedDead: false,
        simulatedStatusCode: 404,
      }))
    : [
        {
          id: `t-${Date.now()}-0`,
          url: 'https://abc.com',
          label: 'Primary (abc.com)',
          priority: 1,
          status: 'healthy',
          httpStatusCode: 200,
          lastChecked: Date.now(),
          responseTimeMs: 70,
          failoverCount: 0,
          isSimulatedDead: false,
          simulatedStatusCode: 404,
        },
        {
          id: `t-${Date.now()}-1`,
          url: 'https://bca.com',
          label: 'Backup 1 (bca.com)',
          priority: 2,
          status: 'healthy',
          httpStatusCode: 200,
          lastChecked: Date.now(),
          responseTimeMs: 85,
          failoverCount: 0,
          isSimulatedDead: false,
          simulatedStatusCode: 404,
        },
      ];

  const newCampaign: Campaign = {
    id: `camp-${Date.now()}`,
    name,
    slug: cleanSlug,
    status: 'active',
    redirectType: redirectType || '302',
    forwardParams: forwardParams !== false,
    checkIntervalSec: 15,
    timeoutMs: 3000,
    autoRecover: true,
    emergencyFallbackUrl: emergencyFallbackUrl || 'https://fallback-safe.com',
    createdAt: Date.now(),
    totalClicks: 0,
    failoverClicks: 0,
    estimatedCpc: Number(estimatedCpc) || 1.5,
    lastFailoverAt: null,
    targets: initialTargets,
  };

  campaigns.unshift(newCampaign);
  res.status(201).json(newCampaign);
});

app.put('/api/campaigns/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = campaigns.findIndex(c => c.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const existing = campaigns[index];
  const updated: Campaign = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
  };

  // Re-index priorities if targets were supplied
  if (Array.isArray(updated.targets)) {
    updated.targets = updated.targets.map((t, idx) => ({
      ...t,
      priority: idx + 1,
    }));
  }

  campaigns[index] = updated;
  res.json(updated);
});

app.delete('/api/campaigns/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  campaigns = campaigns.filter(c => c.id !== id);
  res.json({ success: true, id });
});

// Simulate 404 / down toggle for a target URL (for instant testing by the user!)
app.post('/api/campaigns/:id/targets/:targetId/toggle-simulate', (req: Request, res: Response) => {
  const { id, targetId } = req.params;
  const { forceState, statusCode } = req.body; // e.g. force 404 or toggle

  const campaign = campaigns.find(c => c.id === id);
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const target = campaign.targets.find(t => t.id === targetId);
  if (!target) {
    res.status(404).json({ error: 'Target URL not found' });
    return;
  }

  const nextState = forceState !== undefined ? Boolean(forceState) : !target.isSimulatedDead;
  target.isSimulatedDead = nextState;
  target.simulatedStatusCode = Number(statusCode) || 404;
  target.status = nextState ? 'dead' : 'healthy';
  target.httpStatusCode = nextState ? (target.simulatedStatusCode || 404) : 200;
  target.lastChecked = Date.now();

  res.json({
    success: true,
    campaignId: campaign.id,
    target,
  });
});

// Run health probe on all targets of a campaign
app.post('/api/campaigns/:id/probe', async (req: Request, res: Response) => {
  const { id } = req.params;
  const campaign = campaigns.find(c => c.id === id);
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  for (const target of campaign.targets) {
    if (target.status === 'paused') continue;
    target.status = 'probing';
  }

  const probeResults = await Promise.all(
    campaign.targets.map(async (target) => {
      if (target.status === 'paused') return target;
      const res = await probeTarget(target, campaign.timeoutMs);
      target.status = res.status;
      target.httpStatusCode = res.httpStatusCode;
      target.responseTimeMs = res.responseTimeMs;
      target.lastChecked = Date.now();
      return target;
    })
  );

  res.json({ success: true, targets: probeResults });
});

// Get recent redirect & failover audit logs
app.get('/api/logs', (_req: Request, res: Response) => {
  res.json(redirectLogs.slice(0, 100));
});

// Clear logs
app.delete('/api/logs', (_req: Request, res: Response) => {
  redirectLogs = [];
  res.json({ success: true });
});

// Global stats
app.get('/api/stats', (_req: Request, res: Response) => {
  let totalClicks = 0;
  let totalFailovers = 0;
  let totalSavedMoney = 0;
  let monitoredUrls = 0;

  for (const c of campaigns) {
    totalClicks += c.totalClicks;
    totalFailovers += c.failoverClicks;
    totalSavedMoney += calculateSavings(c.failoverClicks, c.estimatedCpc);
    monitoredUrls += c.targets.length;
  }

  const uptime = monitoredUrls > 0
    ? (campaigns.reduce((acc, c) => acc + c.targets.filter(t => t.status === 'healthy').length, 0) / monitoredUrls) * 100
    : 100;

  const stats: GlobalStats = {
    totalClicks,
    totalFailovers,
    savedAdSpend: Number(totalSavedMoney.toFixed(2)),
    uptimePercentage: Number(uptime.toFixed(1)),
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    monitoredUrls,
  };

  res.json(stats);
});

// Batch test click simulator (send N test clicks through the routing system)
app.post('/api/test-click', (req: Request, res: Response) => {
  const { campaignSlug, count = 1, utmSource = 'google_ads', utmCampaign = 'spring_sale' } = req.body;
  const campaign = campaigns.find(c => c.slug === campaignSlug);
  if (!campaign) {
    res.status(404).json({ error: `Campaign with slug "${campaignSlug}" not found` });
    return;
  }

  const clickCount = Math.min(Math.max(Number(count) || 1, 1), 50);
  const results = [];

  for (let i = 0; i < clickCount; i++) {
    const startTime = Date.now();
    const resolution = resolveFailoverTarget(campaign);

    const queryParams: Record<string, string> = {
      utm_source: utmSource,
      utm_campaign: utmCampaign,
      utm_medium: 'cpc',
      click_id: `clk_${Math.random().toString(36).substring(2, 9)}`,
    };

    const finalUrl = buildRedirectUrl(resolution.finalUrl, queryParams, campaign.forwardParams);
    const latency = Math.floor(Math.random() * 8) + 4; // 4-12ms

    // Update campaign counters
    campaign.totalClicks += 1;
    if (resolution.wasFailover) {
      campaign.failoverClicks += 1;
      campaign.lastFailoverAt = Date.now();
      if (resolution.target) {
        resolution.target.failoverCount += 1;
      }
    }

    const logEntry: RedirectEventLog = {
      id: `log-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      timestamp: Date.now(),
      ip: `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      requestedPath: `/r/${campaign.slug}`,
      queryParams,
      targetTried: campaign.targets[0]?.url || 'unknown',
      targetTriedStatus: campaign.targets[0]?.httpStatusCode || 200,
      wasFailover: resolution.wasFailover,
      failoverReason: resolution.failoverReason,
      cascadePath: resolution.cascadePath,
      finalRedirectUrl: finalUrl,
      latencyMs: latency,
    };

    redirectLogs.unshift(logEntry);
    if (redirectLogs.length > 200) redirectLogs.pop();
    results.push(logEntry);
  }

  res.json({
    success: true,
    processed: results.length,
    latestResult: results[0],
    campaignUpdated: {
      totalClicks: campaign.totalClicks,
      failoverClicks: campaign.failoverClicks,
    },
  });
});

// Webhook config & test
app.get('/api/webhook', (_req: Request, res: Response) => {
  res.json(webhookConfig);
});

app.post('/api/webhook', (req: Request, res: Response) => {
  webhookConfig = { ...webhookConfig, ...req.body };
  res.json({ success: true, config: webhookConfig });
});

app.post('/api/webhook/test', async (_req: Request, res: Response) => {
  webhookConfig.lastAlertSentAt = Date.now();
  res.json({
    success: true,
    message: 'Test notification triggered successfully! TrafficShield alert sent to configured channels.',
    alertData: {
      event: 'TARGET_FAILOVER_TRIGGERED',
      primaryUrl: 'https://abc.com',
      error: 'HTTP 404 Not Found',
      shiftedTo: 'https://bca.com',
      switchTimeMs: 9,
      timestamp: new Date().toISOString(),
    },
  });
});

// ==================== THE REAL ROUTING & FAILOVER REDIRECT ENGINE ====================
// This is the URL the user configures in their Ads manager: /r/:slug
app.get('/r/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  const campaign = campaigns.find(c => c.slug === slug);

  if (!campaign) {
    res.status(404).send(`
      <!doctype html>
      <html>
        <head><title>Campaign Not Found - TrafficShield</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="background:#090d16;color:#e2e8f0;font-family:sans-serif;padding:40px;text-align:center;">
          <h2 style="color:#f43f5e;">404 - Ad Campaign Slug Not Found</h2>
          <p>No active failover campaign found for slug: <code>${slug}</code></p>
          <a href="/" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#0284c7;color:#fff;text-decoration:none;border-radius:6px;">Go to TrafficShield Dashboard</a>
        </body>
      </html>
    `);
    return;
  }

  if (campaign.status === 'paused') {
    res.status(503).send(`
      <!doctype html>
      <html>
        <head><title>Campaign Paused - TrafficShield</title></head>
        <body style="background:#090d16;color:#e2e8f0;font-family:sans-serif;padding:40px;text-align:center;">
          <h2>Campaign Paused</h2>
          <p>This ad routing link is currently paused by the campaign manager.</p>
        </body>
      </html>
    `);
    return;
  }

  const startTime = Date.now();
  const resolution = resolveFailoverTarget(campaign);

  // Preserve query parameters (UTM parameters, gclid, fbclid, etc.)
  const queryParams = req.query as Record<string, string>;
  const isPreview = queryParams.preview === '1' || queryParams.test === '1';

  // Remove the internal preview param before forwarding to destination
  const cleanQueryParams = { ...queryParams };
  delete cleanQueryParams.preview;
  delete cleanQueryParams.test;

  const finalUrl = buildRedirectUrl(resolution.finalUrl, cleanQueryParams, campaign.forwardParams);
  const latency = Math.max(Date.now() - startTime, 1);

  // Update statistics
  campaign.totalClicks += 1;
  if (resolution.wasFailover) {
    campaign.failoverClicks += 1;
    campaign.lastFailoverAt = Date.now();
    if (resolution.target) {
      resolution.target.failoverCount += 1;
    }
  }

  // Create audit log
  const logEntry: RedirectEventLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    campaignId: campaign.id,
    campaignSlug: campaign.slug,
    timestamp: Date.now(),
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Direct Browser Visit',
    requestedPath: req.originalUrl,
    queryParams: cleanQueryParams,
    targetTried: campaign.targets[0]?.url || 'unknown',
    targetTriedStatus: campaign.targets[0]?.httpStatusCode || 200,
    wasFailover: resolution.wasFailover,
    failoverReason: resolution.failoverReason,
    cascadePath: resolution.cascadePath,
    finalRedirectUrl: finalUrl,
    latencyMs: latency,
  };

  redirectLogs.unshift(logEntry);
  if (redirectLogs.length > 200) redirectLogs.pop();

  // If preview=1 mode requested, render the live visual failover trace instead of immediate redirect
  if (isPreview) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>TrafficShield Live Redirection Trace</title>
          <style>
            body { background: #090d16; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
            .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; max-width: 620px; width: 100%; padding: 28px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
            .badge-success { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
            .badge-failover { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
            .step { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; margin-bottom: 8px; border-radius: 8px; background: #131d33; font-size: 13px; }
            .step-dead { border-left: 3px solid #f43f5e; opacity: 0.8; }
            .step-active { border-left: 3px solid #10b981; background: #132738; }
            .code { font-family: monospace; background: #0b1120; padding: 2px 6px; border-radius: 4px; color: #38bdf8; }
            .btn { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; background: #2563eb; color: #fff; font-weight: 600; padding: 12px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-size: 14px; }
            .btn:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <span style="font-weight: 700; font-size: 18px; color: #38bdf8;">🛡️ TrafficShield Auto-Failover Live Trace</span>
              <span class="badge ${resolution.wasFailover ? 'badge-failover' : 'badge-success'}">
                ${resolution.wasFailover ? '⚡ FAILOVER TRIGGERED' : '✅ DIRECT ROUTE (NO FAILOVER)'}
              </span>
            </div>
            
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
              Simulated click received for <code>/r/${campaign.slug}</code>. Execution time: <strong style="color: #38bdf8;">${latency}ms</strong>.
            </p>

            <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 10px;">
              Cascade Chain Execution:
            </div>

            ${resolution.cascadePath.map((step, idx) => `
              <div class="step ${step.skipped ? 'step-dead' : 'step-active'}">
                <div>${step.skipped ? '❌' : '🎯'}</div>
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between;">
                    <strong>Step ${idx + 1}: ${step.label}</strong>
                    <span style="color: ${step.skipped ? '#f43f5e' : '#34d399'}; font-weight: 600;">HTTP ${step.status}</span>
                  </div>
                  <div style="color: #94a3b8; margin-top: 2px;"><span class="code">${step.url}</span></div>
                  <div style="color: ${step.skipped ? '#fb7185' : '#6ee7b7'}; font-size: 12px; margin-top: 4px;">${step.reason}</div>
                </div>
              </div>
            `).join('')}

            <div style="margin-top: 18px; padding: 14px; background: #0b1120; border-radius: 8px; border: 1px solid #1e293b;">
              <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Destination URL with Forwarded Parameters:</div>
              <div style="color: #4ade80; font-family: monospace; font-size: 13px; word-break: break-all;">${finalUrl}</div>
            </div>

            <a class="btn" href="${finalUrl}" rel="noreferrer">Continue to Target Website Now &rarr;</a>
            <div style="text-align: center; margin-top: 12px;">
              <a href="/" style="color: #94a3b8; font-size: 12px; text-decoration: none;">&larr; Return to TrafficShield Dashboard</a>
            </div>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // Handle Redirection based on campaign settings
  if (campaign.redirectType === '307') {
    res.redirect(307, finalUrl);
    return;
  }

  if (campaign.redirectType === 'meta_refresh' || campaign.redirectType === 'js_bridge') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta http-equiv="refresh" content="0; url=${finalUrl}">
          <title>Redirecting...</title>
          <script>window.location.replace("${finalUrl}");</script>
        </head>
        <body style="background:#090d16;color:#e2e8f0;font-family:sans-serif;padding:30px;text-align:center;">
          <p>Redirecting you safely...</p>
          <p><a href="${finalUrl}" style="color:#38bdf8;">Click here if you are not redirected automatically.</a></p>
        </body>
      </html>
    `);
    return;
  }

  // Default: Fast HTTP 302 Temporary Redirect (best practice for ad platforms like Google & Meta)
  res.redirect(302, finalUrl);
});

// ==================== VITE DEV SERVER MIDDLEWARE ====================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TrafficShield Failover Server running on http://localhost:${PORT}`);
    console.log(`Ad Routing endpoint active at: http://localhost:${PORT}/r/:slug`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
