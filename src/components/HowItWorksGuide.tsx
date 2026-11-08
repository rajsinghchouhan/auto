import React from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2, Zap, AlertTriangle, Layers } from 'lucide-react';

interface HowItWorksGuideProps {
  isHindi: boolean;
}

export const HowItWorksGuide: React.FC<HowItWorksGuideProps> = ({ isHindi }) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>{isHindi ? 'प्लेटफॉर्म गाइड और कार्यप्रणाली' : 'Architecture & Operational Guide'}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {isHindi
            ? 'आपका 404 ऑटो-फॉलबैक सिस्टम कैसे काम करता है?'
            : 'How Automatic Ad Link Failover Protects 100% of Your Traffic'}
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          {isHindi
            ? 'जब भी कोई लैंडिंग पेज क्रैश या 404 होता है, सिस्टम तुरंत बैकअप पेज पर ट्रैफिक मोड़ देता है।'
            : 'Prevent wasted ad spend from broken domains, 404 errors, or hosting downtime with zero-latency cascading redirects.'}
        </p>
      </div>

      {/* Visual Step-by-Step Scenario */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>{isHindi ? 'आपकी समस्या और समाधान (The exact scenario):' : 'The Problem & TrafficShield Solution:'}</span>
        </h3>

        {/* 3 Step Cascade Illustrated */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                {isHindi ? 'स्टेप 1: सामान्य स्थिति' : 'Step 1: Normal State'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-bold font-mono text-white">abc.com (Primary)</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isHindi
                ? 'आपने एड्स में TrafficShield का लिंक लगाया। जब तक abc.com 200 OK दे रहा है, 100% ट्रैफिक abc.com पर ही जाएगा।'
                : 'Your ad links point to TrafficShield. As long as abc.com responds 200 OK, traffic routes straight to abc.com.'}
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                {isHindi ? 'स्टेप 2: abc.com 404 हुआ' : 'Step 2: abc.com returns 404'}
              </span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <div className="text-sm font-bold font-mono text-amber-300">Shift to bca.com (Backup 1)</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isHindi
                ? 'यदि abc.com किसी कारणवश उड़ जाता है या 404 आता है, सिस्टम उसी मिलीसेकंड में bca.com पर ट्रैफिक शिफ्ट कर देता है। आपका एड बजट वेस्ट नहीं होता।'
                : 'If abc.com goes down or returns 404, the router catches it in ~8ms and silently cascades visitors to bca.com.'}
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                {isHindi ? 'स्टेप 3: bca.com भी उड़ गया' : 'Step 3: bca.com also fails'}
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="text-sm font-bold font-mono text-cyan-300">Shift to pac.com (Backup 2)</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isHindi
                ? 'यदि bca.com भी डाउन हो जाता है, तो ट्रैफिक तुरंत pac.com पर चला जाता है। यह पूरी प्रक्रिया 100% ऑटोमैटिक है।'
                : 'If bca.com also encounters an outage, the system immediately cascades to pac.com with all UTM tracking tags intact.'}
            </p>
          </div>
        </div>
      </div>

      {/* Setup Guide for Ad Platforms */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span>{isHindi ? 'Google Ads और Facebook Ads में कैसे उपयोग करें?' : 'How to deploy in Google Ads & Meta Ads:'}</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              1
            </div>
            <div>
              <strong className="text-white">
                {isHindi ? 'कैम्पेन लिंक बनाएं:' : 'Create your smart failover link:'}
              </strong>{' '}
              {isHindi
                ? 'TrafficShield में नया लिंक बनाएं (उदा. /r/summer-sale) और अपने तीन डोमेन (abc.com, bca.com, pac.com) को प्राथमिकताओं (Priority 1, 2, 3) के अनुसार सेट करें।'
                : 'Generate a slug in TrafficShield (e.g., /r/summer-sale) and list your target URLs in priority order.'}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              2
            </div>
            <div>
              <strong className="text-white">
                {isHindi ? 'Ads Manager में Final URL सेट करें:' : 'Paste into your Ads Manager:'}
              </strong>{' '}
              {isHindi
                ? 'Google Ads, Meta Ads या TikTok Ads के "Final URL" या "Tracking Template" में TrafficShield का लिंक डालें।'
                : 'Set your TrafficShield link as the ad destination. Any click will pass through the edge failover router.'}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              3
            </div>
            <div>
              <strong className="text-white">
                {isHindi ? 'UTM और ट्रैकिंग कभी नहीं छूटती:' : 'UTMs and Tracking IDs are preserved:'}
              </strong>{' '}
              {isHindi
                ? 'जब यूजर एड पर क्लिक करता है, तो gclid, fbclid, utm_source, utm_campaign जैसे सभी पैरामीटर्स सुरक्षित रहते हैं और बैकअप पेज पर ऑटोमैटिक ट्रांसफर हो जाते हैं।'
                : 'All tracking tags (utm_source, utm_campaign, gclid, fbclid) automatically carry over to whichever backup page is chosen.'}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              4
            </div>
            <div>
              <strong className="text-white">
                {isHindi ? 'ऑटोमैटिक रिकवरी (Auto-Recovery):' : 'Automatic Recovery:'}
              </strong>{' '}
              {isHindi
                ? 'जैसे ही abc.com वापस ठीक (HTTP 200 OK) हो जाता है, सिस्टम अपने आप ट्रैफिक को दोबारा abc.com पर भेजना शुरू कर देता है।'
                : 'When abc.com comes back online (HTTP 200 OK), TrafficShield automatically switches traffic back to the primary.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
