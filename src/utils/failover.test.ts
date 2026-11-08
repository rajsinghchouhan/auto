import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveFailoverTarget,
  buildRedirectUrl,
  calculateSavings,
  isStatusDead,
} from './failover.js';
import { TargetUrl } from '../types/campaign.js';

test('isStatusDead correctly identifies 404, 410 and 5xx errors', () => {
  assert.equal(isStatusDead(200), false);
  assert.equal(isStatusDead(301), false);
  assert.equal(isStatusDead(404), true);
  assert.equal(isStatusDead(410), true);
  assert.equal(isStatusDead(500), true);
  assert.equal(isStatusDead(502), true);
  assert.equal(isStatusDead(504), true);
});

test('resolveFailoverTarget selects Primary abc.com when healthy', () => {
  const targets: TargetUrl[] = [
    {
      id: '1',
      url: 'https://abc.com',
      label: 'Primary Landing Page',
      priority: 1,
      status: 'healthy',
      httpStatusCode: 200,
      lastChecked: Date.now(),
      responseTimeMs: 84,
      failoverCount: 0,
    },
    {
      id: '2',
      url: 'https://bca.com',
      label: 'Backup Landpage 1',
      priority: 2,
      status: 'healthy',
      httpStatusCode: 200,
      lastChecked: Date.now(),
      responseTimeMs: 95,
      failoverCount: 0,
    },
    {
      id: '3',
      url: 'https://pac.com',
      label: 'Backup Landpage 2',
      priority: 3,
      status: 'healthy',
      httpStatusCode: 200,
      lastChecked: Date.now(),
      responseTimeMs: 110,
      failoverCount: 0,
    },
  ];

  const result = resolveFailoverTarget({
    targets,
    emergencyFallbackUrl: 'https://safe-page.com',
  });

  assert.equal(result.wasFailover, false);
  assert.equal(result.target?.url, 'https://abc.com');
  assert.equal(result.isEmergencyFallback, false);
});

test('resolveFailoverTarget automatically cascades from abc.com to bca.com when abc.com returns 404', () => {
  const targets: TargetUrl[] = [
    {
      id: '1',
      url: 'https://abc.com',
      label: 'Primary',
      priority: 1,
      status: 'dead',
      httpStatusCode: 404, // 404 error on primary!
      lastChecked: Date.now(),
      responseTimeMs: 120,
      failoverCount: 1,
    },
    {
      id: '2',
      url: 'https://bca.com',
      label: 'Backup 1',
      priority: 2,
      status: 'healthy',
      httpStatusCode: 200,
      lastChecked: Date.now(),
      responseTimeMs: 95,
      failoverCount: 0,
    },
    {
      id: '3',
      url: 'https://pac.com',
      label: 'Backup 2',
      priority: 3,
      status: 'healthy',
      httpStatusCode: 200,
      lastChecked: Date.now(),
      responseTimeMs: 110,
      failoverCount: 0,
    },
  ];

  const result = resolveFailoverTarget({
    targets,
    emergencyFallbackUrl: 'https://safe-page.com',
  });

  assert.equal(result.wasFailover, true);
  assert.equal(result.target?.url, 'https://bca.com');
  assert.equal(result.cascadePath[0].url, 'https://abc.com');
  assert.equal(result.cascadePath[0].skipped, true);
  assert.equal(result.cascadePath[1].url, 'https://bca.com');
  assert.equal(result.cascadePath[1].skipped, false);
});

test('resolveFailoverTarget cascades to pac.com when both abc.com and bca.com are dead', () => {
  const targets: TargetUrl[] = [
    {
      id: '1',
      url: 'https://abc.com',
      label: 'Primary',
      priority: 1,
      status: 'dead',
      httpStatusCode: 404,
      lastChecked: Date.now(),
      responseTimeMs: 0,
      failoverCount: 1,
    },
    {
      id: '2',
      url: 'https://bca.com',
      label: 'Backup 1',
      priority: 2,
      status: 'dead',
      httpStatusCode: 502,
      lastChecked: Date.now(),
      responseTimeMs: 0,
      failoverCount: 1,
    },
    {
      id: '3',
      url: 'https://pac.com',
      label: 'Backup 2',
      priority: 3,
      status: 'healthy',
      httpStatusCode: 200,
      lastChecked: Date.now(),
      responseTimeMs: 78,
      failoverCount: 0,
    },
  ];

  const result = resolveFailoverTarget({
    targets,
    emergencyFallbackUrl: 'https://safe-page.com',
  });

  assert.equal(result.wasFailover, true);
  assert.equal(result.target?.url, 'https://pac.com');
  assert.equal(result.cascadePath.length, 3);
  assert.equal(result.cascadePath[2].skipped, false);
});

test('resolveFailoverTarget falls back to emergency URL when all targets fail', () => {
  const targets: TargetUrl[] = [
    {
      id: '1',
      url: 'https://abc.com',
      label: 'Primary',
      priority: 1,
      status: 'dead',
      httpStatusCode: 404,
      lastChecked: Date.now(),
      responseTimeMs: 0,
      failoverCount: 1,
    },
    {
      id: '2',
      url: 'https://bca.com',
      label: 'Backup 1',
      priority: 2,
      status: 'dead',
      httpStatusCode: 404,
      lastChecked: Date.now(),
      responseTimeMs: 0,
      failoverCount: 1,
    },
  ];

  const result = resolveFailoverTarget({
    targets,
    emergencyFallbackUrl: 'https://emergency-safe.com',
  });

  assert.equal(result.wasFailover, true);
  assert.equal(result.target, null);
  assert.equal(result.isEmergencyFallback, true);
  assert.equal(result.finalUrl, 'https://emergency-safe.com');
});

test('buildRedirectUrl preserves UTM parameters and gclid', () => {
  const base = 'https://bca.com/product-page';
  const query = {
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'summer_promo',
    gclid: 'Cj0KCQjwmv...',
  };

  const finalUrl = buildRedirectUrl(base, query, true);
  assert.ok(finalUrl.includes('utm_source=google'));
  assert.ok(finalUrl.includes('utm_medium=cpc'));
  assert.ok(finalUrl.includes('gclid=Cj0KCQjwmv...'));

  // When forwardParams is false, query is stripped
  const noParamsUrl = buildRedirectUrl(base, query, false);
  assert.equal(noParamsUrl, base);
});

test('calculateSavings computes prevented financial loss accurately', () => {
  assert.equal(calculateSavings(100, 1.5), 150);
  assert.equal(calculateSavings(33, 2.25), 74.25);
});
