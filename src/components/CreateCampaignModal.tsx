import React, { useState } from 'react';
import { X, Plus, ShieldPlus, Trash2 } from 'lucide-react';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
  isHindi: boolean;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isHindi,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [estimatedCpc, setEstimatedCpc] = useState(1.5);
  const [targets, setTargets] = useState<{ url: string; label: string }[]>([
    { url: 'https://abc.com', label: 'Primary (abc.com)' },
    { url: 'https://bca.com', label: 'Backup 1 (bca.com)' },
    { url: 'https://pac.com', label: 'Backup 2 (pac.com)' },
  ]);
  const [emergencyFallbackUrl, setEmergencyFallbackUrl] = useState('https://emergency-landing.com');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddTarget = () => {
    setTargets([...targets, { url: 'https://backup-domain.com', label: `Backup ${targets.length}` }]);
  };

  const handleRemoveTarget = (index: number) => {
    if (targets.length <= 1) return;
    setTargets(targets.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isHindi ? 'कृपया अभियान का नाम भरें' : 'Campaign name is required');
      return;
    }
    if (!slug.trim()) {
      setError(isHindi ? 'कृपया URL स्लग भरें' : 'URL slug is required');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onCreate({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        estimatedCpc: Number(estimatedCpc) || 1.5,
        targets,
        emergencyFallbackUrl,
        redirectType: '302',
        forwardParams: true,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <ShieldPlus className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              {isHindi ? 'नया 404 Failover लिंक बनाएं' : 'Create New Ad Failover SmartLink'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isHindi ? 'अभियान का नाम:' : 'Campaign Name:'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) {
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, ''));
                  }
                }}
                placeholder="Google Ads Promo"
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isHindi ? 'शॉर्ट URL स्लग:' : 'Short Routing Slug:'}
              </label>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs">
                <span className="text-slate-500 font-mono">/r/</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-offer"
                  className="w-full bg-transparent py-2 px-1 text-cyan-300 font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Cascade Targets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isHindi ? 'प्राथमिकता क्रम (Cascade Order):' : 'Fallback Target Sequence:'}
              </label>
              <button
                type="button"
                onClick={handleAddTarget}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isHindi ? 'बैकअप जोड़ें' : 'Add Target'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {targets.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                    idx === 0 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    #{idx + 1}
                  </span>
                  <input
                    type="url"
                    required
                    value={t.url}
                    onChange={(e) => {
                      const copy = [...targets];
                      copy[idx].url = e.target.value;
                      setTargets(copy);
                    }}
                    placeholder={`https://${idx === 0 ? 'abc.com' : idx === 1 ? 'bca.com' : 'pac.com'}`}
                    className="flex-1 bg-transparent text-xs font-mono text-white focus:outline-none placeholder-slate-600"
                  />
                  {targets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTarget(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Fallback URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isHindi ? 'आपातकालीन बैकअप URL:' : 'Emergency Safe URL:'}
            </label>
            <input
              type="url"
              value={emergencyFallbackUrl}
              onChange={(e) => setEmergencyFallbackUrl(e.target.value)}
              placeholder="https://safe-fallback.com"
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* CPC */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isHindi ? 'अनुमानित CPC ($):' : 'Estimated CPC (USD):'}
            </label>
            <input
              type="number"
              step="0.10"
              value={estimatedCpc}
              onChange={(e) => setEstimatedCpc(Number(e.target.value))}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              {isHindi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md shadow-cyan-600/20 disabled:opacity-50"
            >
              {isSubmitting
                ? (isHindi ? 'बनाया जा रहा है...' : 'Creating...')
                : (isHindi ? 'लिंक तैयार करें' : 'Deploy Failover Link')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
