# TrafficShield - Smart Ad URL Failover & 404 Auto-Redirect Engine

An automated traffic protection and link failover system designed for digital marketers and media buyers running ads on Google Ads, Meta (Facebook/Instagram), TikTok Ads, and Native ad networks.

When you run ad campaigns, landing pages can go down due to domain expiration, hosting crashes, DDoS, or unexpected HTTP 404 errors. **TrafficShield** catches broken links in microseconds and automatically cascades incoming traffic to healthy backup landing pages so that **zero ad spend or lead traffic is lost**.

---

## 🎯 How It Works

```
                        [ User Clicks Your Ad ]
                                  │
                                  ▼
                     [ TrafficShield Master URL ]
                        /r/your-campaign-slug
                                  │
                   ┌──────────────┴──────────────┐
                   │                             │
          Is Primary (abc.com)          Is Primary (abc.com)
             Healthy (200 OK)?             Dead (404/5xx)?
                   │                             │
                   ▼                             ▼
        [ Redirects to abc.com ]       [ Instant Failover to bca.com ]
                                                 │
                                        Is bca.com also Dead?
                                                 │
                                                 ▼
                                       [ Cascades to pac.com ]
```

1. **You deploy a Smart Routing Link:** Instead of putting `abc.com` directly in your ads manager, you insert TrafficShield's master link: `https://your-domain.com/r/my-campaign`.
2. **Instant Cascade Execution:**
   - **Step 1:** Traffic reaches the edge resolver which checks the prioritized target list.
   - **Step 2:** If Priority 1 (`abc.com`) is healthy (HTTP 200), traffic is instantly forwarded.
   - **Step 3:** If Priority 1 returns HTTP 404 (Not Found) or 5xx, the router instantly switches in ~8ms to Priority 2 (`bca.com`).
   - **Step 4:** If Priority 2 is also down, traffic cascades to Priority 3 (`pac.com`), and ultimately to an emergency safety page.
3. **UTM & Tracking Preservation:** All query parameters (`utm_source`, `utm_campaign`, `utm_medium`, Google Click ID `gclid`, Facebook `fbclid`) are automatically forwarded to the active destination.
4. **Auto-Recovery:** When the primary domain comes back online, traffic automatically shifts back to the primary URL.

---

## 🚀 Features

- **⚡ Sub-15ms Edge Redirection:** Built on Express with HTTP 302 / 307 temporary redirects (standard for ad platforms).
- **🧪 Interactive Failover Sandbox:** Live simulator to test 404 outages on `abc.com`, `bca.com`, and `pac.com` in real time with single or batch test clicks.
- **📊 Real-time Audit Logs:** Full audit trail with IP address, route taken, HTTP response codes, and latency in milliseconds.
- **💰 Saved Ad Spend Tracker:** Calculates dollar savings based on your configured Cost-Per-Click (CPC).
- **🔔 Telegram & Webhook Disaster Alerts:** Real-time notifications when a domain goes down or recovers.
- **🌐 Dual Language Support:** Instant switch between Hindi (हिंदी / Hinglish) and English.

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Run Unit Tests
```bash
npm run test # or npx tsx --test src/utils/failover.test.ts
```

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 📄 License
MIT License
