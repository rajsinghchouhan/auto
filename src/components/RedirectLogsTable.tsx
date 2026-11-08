import React, { useState } from 'react';
import { RedirectEventLog } from '../types/campaign.js';
import { Filter, Trash2, Download, ArrowRight, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';

interface RedirectLogsTableProps {
  logs: RedirectEventLog[];
  onClearLogs: () => Promise<void>;
  isHindi: boolean;
}

export const RedirectLogsTable: React.FC<RedirectLogsTableProps> = ({
  logs,
  onClearLogs,
  isHindi,
}) => {
  const [filterFailoversOnly, setFilterFailoversOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (filterFailoversOnly && !log.wasFailover) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.requestedPath.toLowerCase().includes(term) ||
        log.finalRedirectUrl.toLowerCase().includes(term) ||
        log.campaignSlug.toLowerCase().includes(term) ||
        (log.failoverReason && log.failoverReason.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Campaign', 'WasFailover', 'LatencyMs', 'InitialTarget', 'InitialStatus', 'FinalRedirectUrl', 'Reason'];
    const rows = filteredLogs.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.campaignSlug,
      l.wasFailover ? 'YES' : 'NO',
      l.latencyMs,
      l.targetTried,
      l.targetTriedStatus,
      `"${l.finalRedirectUrl}"`,
      `"${l.failoverReason || 'Direct'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trafficshield-logs-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Table Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>{isHindi ? 'ट्रैफिक रिडायरेक्शन और फॉलबैक लॉग्स' : 'Real-Time Redirection & Failover Audit Logs'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isHindi
              ? 'हर क्लिक का वास्तविक समय का ऑडिट ट्रेल: कौन सा यूआरएल फेल हुआ और ट्रैफिक कहाँ शिफ्ट हुआ'
              : 'Detailed sub-millisecond trace of every incoming ad click and automated failover event'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Failovers toggle */}
          <button
            onClick={() => setFilterFailoversOnly(!filterFailoversOnly)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border ${
              filterFailoversOnly
                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isHindi ? 'केवल 404 Failovers' : 'Failovers Only'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {/* Clear logs */}
          <button
            onClick={onClearLogs}
            className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            title="Clear Logs"
            aria-label="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={isHindi ? 'URL, Campaign, या UTM पैरामीटर्स खोजें...' : 'Search by URL, campaign, or parameters...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold">{isHindi ? 'कोई लॉग मौजूद नहीं है' : 'No redirect logs recorded yet'}</p>
            <p className="text-xs text-slate-500 mt-1">
              {isHindi
                ? 'सिमुलेटर टैब में जाकर "1 टेस्ट क्लिक भेजें" बटन दबाएं।'
                : 'Send test traffic from the Simulator tab or visit your /r/:slug link.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">{isHindi ? 'समय / IP' : 'Time / IP'}</th>
                  <th className="py-3 px-4">{isHindi ? 'अभियान' : 'Campaign'}</th>
                  <th className="py-3 px-4">{isHindi ? 'रूटिंग पाथ' : 'Routing Path (Cascade)'}</th>
                  <th className="py-3 px-4">{isHindi ? 'अंतिम रिडायरेक्ट URL' : 'Final Redirect Destination'}</th>
                  <th className="py-3 px-4 text-right">{isHindi ? 'लेटेंसी' : 'Latency'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      log.wasFailover ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    {/* Timestamp & IP */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-slate-200">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {log.ip}
                      </div>
                    </td>

                    {/* Campaign slug */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-cyan-300 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        /r/{log.campaignSlug}
                      </span>
                    </td>

                    {/* Routing Path */}
                    <td className="py-3 px-4">
                      {log.wasFailover ? (
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-rose-400 font-mono line-through font-semibold bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-900/40">
                              {log.targetTried} (404)
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-emerald-400 font-mono font-semibold bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/40 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-400" />
                              <span>Shifted to active</span>
                            </span>
                          </div>
                          <div className="text-[11px] text-amber-300/80 mt-1 max-w-md truncate">
                            {log.failoverReason}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Direct Primary (200 OK)</span>
                        </div>
                      )}
                    </td>

                    {/* Final Redirect URL */}
                    <td className="py-3 px-4 max-w-xs truncate font-mono text-slate-300">
                      <span title={log.finalRedirectUrl} className="truncate block">
                        {log.finalRedirectUrl}
                      </span>
                    </td>

                    {/* Latency */}
                    <td className="py-3 px-4 text-right font-mono text-cyan-400 tabular-nums whitespace-nowrap">
                      {log.latencyMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
