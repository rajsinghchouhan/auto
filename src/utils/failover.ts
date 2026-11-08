import { Campaign, TargetUrl, TargetStatus } from '../types/campaign.js';

export interface CascadeStep {
  url: string;
  label: string;
  status: number;
  reason: string;
  skipped: boolean;
}

export interface FailoverResolution {
  target: TargetUrl | null;
  wasFailover: boolean;
  failoverReason?: string;
  cascadePath: CascadeStep[];
  isEmergencyFallback: boolean;
  finalUrl: string;
}

/**
 * Checks whether an HTTP status code or simulated state should be treated as down/dead.
 * 404 Not Found, 410 Gone, 500, 502, 503, 504 are treated as dead.
 */
export function isStatusDead(statusCode: number): boolean {
  return statusCode === 404 || statusCode === 410 || (statusCode >= 500 && statusCode <= 599);
}

/**
 * Evaluates the effective status of a target (accounting for user simulations or HTTP response)
 */
export function getEffectiveTargetStatus(target: TargetUrl): {
  isHealthy: boolean;
  statusCode: number;
  reason: string;
} {
  if (target.status === 'paused') {
    return {
      isHealthy: false,
      statusCode: 0,
      reason: 'Manually paused by operator',
    };
  }

  if (target.isSimulatedDead) {
    const code = target.simulatedStatusCode || 404;
    return {
      isHealthy: false,
      statusCode: code,
      reason: `Simulated error HTTP ${code} (${code === 404 ? 'Not Found' : 'Server Down'})`,
    };
  }

  if (isStatusDead(target.httpStatusCode)) {
    return {
      isHealthy: false,
      statusCode: target.httpStatusCode,
      reason: `Endpoint returned HTTP ${target.httpStatusCode}`,
    };
  }

  if (target.status === 'dead') {
    return {
      isHealthy: false,
      statusCode: target.httpStatusCode || 500,
      reason: `Target marked dead (HTTP ${target.httpStatusCode || 500})`,
    };
  }

  return {
    isHealthy: true,
    statusCode: target.httpStatusCode || 200,
    reason: 'Healthy (HTTP 200 OK)',
  };
}

/**
 * Resolves the active redirection target from the prioritized chain.
 * Cascades down Priority 1 -> Priority 2 -> Priority 3 -> Emergency Fallback.
 */
export function resolveFailoverTarget(
  campaign: Pick<Campaign, 'targets' | 'emergencyFallbackUrl'>
): FailoverResolution {
  // Sort targets by priority ascending (1 = Primary, 2 = Backup 1, etc.)
  const sortedTargets = [...campaign.targets].sort((a, b) => a.priority - b.priority);

  const cascadePath: CascadeStep[] = [];
  let chosenTarget: TargetUrl | null = null;
  let wasFailover = false;
  let failoverReason = '';

  for (let i = 0; i < sortedTargets.length; i++) {
    const target = sortedTargets[i];
    const evaluation = getEffectiveTargetStatus(target);

    if (evaluation.isHealthy) {
      // First healthy target found!
      cascadePath.push({
        url: target.url,
        label: target.label,
        status: evaluation.statusCode,
        reason: evaluation.reason,
        skipped: false,
      });

      chosenTarget = target;
      if (i > 0) {
        wasFailover = true;
        const primary = sortedTargets[0];
        failoverReason = `Primary URL "${primary.label || primary.url}" failed (${cascadePath[0].reason}). Shifted to #${target.priority} "${target.label}".`;
      }
      break;
    } else {
      // Target is down (404 / 5xx) - record in cascade and continue to next backup!
      cascadePath.push({
        url: target.url,
        label: target.label,
        status: evaluation.statusCode,
        reason: evaluation.reason,
        skipped: true,
      });
    }
  }

  if (chosenTarget) {
    return {
      target: chosenTarget,
      wasFailover,
      failoverReason: wasFailover ? failoverReason : undefined,
      cascadePath,
      isEmergencyFallback: false,
      finalUrl: chosenTarget.url,
    };
  }

  // All targets in the cascade failed! Resort to Emergency Fallback URL
  const emergencyUrl = campaign.emergencyFallbackUrl || 'https://google.com';
  return {
    target: null,
    wasFailover: true,
    failoverReason: `ALL ${sortedTargets.length} campaign links down! Emergency fallback triggered.`,
    cascadePath,
    isEmergencyFallback: true,
    finalUrl: emergencyUrl,
  };
}

/**
 * Preserves query parameters like UTM tags (utm_source, utm_medium, utm_campaign, gclid, fbclid, etc.)
 */
export function buildRedirectUrl(
  baseUrl: string,
  queryParams: Record<string, any> = {},
  forwardParams: boolean = true
): string {
  if (!forwardParams || Object.keys(queryParams).length === 0) {
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    for (const [key, val] of Object.entries(queryParams)) {
      if (val !== undefined && val !== null && val !== '') {
        // Do not overwrite if destination already specifically defined it differently
        if (!url.searchParams.has(key)) {
          url.searchParams.set(key, String(val));
        }
      }
    }
    return url.toString();
  } catch {
    // If not a full URL with protocol, handle as string append
    const queryString = new URLSearchParams(queryParams).toString();
    if (!queryString) return baseUrl;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${queryString}`;
  }
}

/**
 * Calculates financial value saved from prevented 404 bounces
 */
export function calculateSavings(failoverClicks: number, cpc: number = 1.5): number {
  return Number((failoverClicks * cpc).toFixed(2));
}

/**
 * Generates an intuitive status description with UI color hints
 */
export function getStatusBadgeInfo(status: TargetStatus, httpCode: number) {
  if (status === 'paused') {
    return { label: 'Paused', color: 'slate', isHealthy: false };
  }
  if (status === 'probing') {
    return { label: 'Probing...', color: 'cyan', isHealthy: false };
  }
  if (httpCode === 200) {
    return { label: '200 OK (Healthy)', color: 'emerald', isHealthy: true };
  }
  if (httpCode === 404) {
    return { label: '404 Not Found (Dead)', color: 'rose', isHealthy: false };
  }
  if (httpCode >= 500) {
    return { label: `${httpCode} Server Error`, color: 'amber', isHealthy: false };
  }
  if (status === 'dead') {
    return { label: `Dead (${httpCode || 'Down'})`, color: 'rose', isHealthy: false };
  }
  return { label: `${httpCode || 'Active'}`, color: 'emerald', isHealthy: true };
}
