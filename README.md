# Themis-Verdict

> *Themis — the Greek goddess of justice, law, and order. She holds the scales of balance and the sword of truth.*

**Themis-Verdict** is a judicial-framework AI system for market intelligence. This repository is the official web presence of the Themis project — not just a frontend demo, but the product hub for everything Themis builds, ships, and plans.

Live: [themisverdict.vercel.app](https://themisverdict.vercel.app)  
Skill Repo: [github.com/lant1ng-1216/themis-StrategySkills](https://github.com/lant1ng-1216/themis-StrategySkills)

---

## What is Themis?

Most strategy tools ask: *"What will the market do next?"*

Themis asks: *"Who is making a collective mistake right now — and what is the evidence?"*

Markets transfer wealth from wrong judgments to correct ones. Themis is built on the belief that the edge isn't in predicting the future — it's in detecting when the crowd is collectively wrong in the present. Every output from Themis is a **verdict**: a structured, falsifiable judgment with explicit invalidation conditions, a confidence score, and a 24-hour appeal mechanism.

Themis operates as a **Chief Market Verdict Officer** — not a chatbot, not a dashboard, but a judicial officer of the market.

---

## Product Architecture

Themis is designed as a four-layer verdict economy. Each layer is independently valuable and collectively forms a closed-loop ecosystem.

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: On-Chain Settlement                               │
│  Verdicts recorded on-chain · Challenge mechanism ·         │
│  Auto-verification · Reputation scoring system              │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Agent Consumption (API Subscription)              │
│  Real-time verdict signals · Agent-to-Agent network ·       │
│  Freemium subscription · Reputation-weighted pricing        │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Verdict Broadcast (Public Feed)                   │
│  Real-time public broadcast · Accuracy leaderboard ·        │
│  Full archive · Community verification                      │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Verdict Production                                │
│  Terminal system · Web interface · 7-dimension evidence ·   │
│  Three-Court process · Live CMC data                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1 — Verdict Production

**Status: Live ✅**

The core engine. Themis collects real-time market data across 7 dimensions, classifies market regimes, and runs a Three-Court verdict process to deliver structured, falsifiable strategy specifications.

### Three-Court Verdict Process

```
Court I — Claim Court
  State a falsifiable hypothesis BEFORE reviewing all evidence.
  Define a specific price target and 3 falsification conditions.
  The claim is a hypothesis — the verdict may differ if evidence contradicts it.

Court II — Evidence Court
  Review all 7 dimensions with both supporting and opposing evidence.
  Assign HIGH / MEDIUM / LOW weight per dimension.
  Required: at least 1 bullish or neutral signal even in bearish environments.
  7/7 bearish alignment → reduce confidence 10-15% (crowded trade risk).

Court III — Verdict Court
  Output BEARISH / BULLISH / NEUTRAL with confidence score (0-100%).
  Provide entry, target1, target2, stop loss, valid window (max 48H).
  Minimum 4 invalidation conditions + mandatory 24H appeal mechanism.
```

### 7-Dimension Evidence System

All data sourced exclusively from CoinMarketCap AI Agent Hub in real time.

| # | Dimension | CMC Endpoint | Weight |
|---|-----------|-------------|--------|
| 1 | Price Momentum | `get_crypto_quotes_latest` | HIGH |
| 2 | Market Sentiment | `get_global_metrics_latest` (Fear & Greed) | MEDIUM |
| 3 | Market Breadth | `get_crypto_listings_latest` (Top 10) | HIGH |
| 4 | Derivatives Activity | `get_global_metrics_latest` (volume change) | MEDIUM |
| 5 | BTC Dominance Flow | `get_global_metrics_latest` (btc_dominance_24h_change) | MEDIUM |
| 6 | Sector Rotation | `get_crypto_categories` (20+ sectors) | LOW |
| 7 | Stablecoin Flow | `get_global_metrics_latest` (stablecoin volume change) | HIGH |

### 5 Market Regimes

Scored using weighted signals. Confidence = regime score / total score × 100%.

| Regime | Signal | Strategic Bias |
|--------|--------|---------------|
| PANIC SELLOFF | F&G < 20, 9+ of Top10 declining, derivatives surge | Contrarian watch |
| BEAR TREND | F&G 21-35, market cap -1% to -3%, 7-8 declining | Trend short |
| ACCUMULATION | F&G < 20 + decelerating decline, 30D < -25% | Light long, strict stop |
| RECOVERY | F&G 61-80, market cap > 0%, BTC dominance falling | Trend long |
| BULL TREND | F&G > 75, market cap > +2%, 2 or fewer declining | Add on dips |

### Bull/Bear Intensity Score (0-100)

A real-time composite score derived from 6 CMC data fields:

```
Base: 50
+ (Fear&Greed - 50) × 0.3
- 15 if derivatives_volume_change > 20%
- 12 if stablecoin_volume_change > 15%
- (btc_dominance_change × 10)
- (declining_top10 - 5) × 3
+ target_24h_change × 2
→ Clamped to [0, 100]
```

### Self-Calibrating Signal Weights

Bayesian accuracy updates run after every verdict verification:
- Correct verdict (price moved >2% in predicted direction): weight +0.05
- Incorrect verdict (price moved >2% against prediction): weight -0.05
- Weights bounded between 0.1 and 2.0

### Interfaces

**Terminal System** (`themis-StrategySkills/demo/main.py`)
- Full Python terminal with animated UI (Rich library)
- Single-asset verdict + multi-asset comparison (BTC/ETH/BNB/SOL)
- Historical accuracy tracker with heatmap
- Macro event detection via Finnhub economic calendar
- Verdict archive + 24H verification loop
- Bilingual EN/ZH support

**Web Interface** (this repo, live at themisverdict.vercel.app)
- Next.js 16 + TypeScript + Tailwind CSS
- Real-time SSE streaming verdict output
- Live Verdict Relation Graph (D3.js force-directed)
- Full documentation site with bilingual support
- Placeholder pages for upcoming layers

---

## Layer 2 — Verdict Broadcast (Public Feed)

**Status: Coming in v0.3 🚧**

Every verdict Themis delivers will be broadcast publicly in real time — visible, verifiable, and permanently archived.

### Design

- Every verdict gets a unique ID (e.g. `VP-20260605091511-BTC`)
- Published to a public feed the moment it is issued
- 24H auto-verification: outcome recorded as CORRECT / INCORRECT / INCONCLUSIVE
- Full archive accessible via web and API
- Accuracy leaderboard updated in real time

### Why Public Accountability Matters

Themis's credibility is its product. Publishing every verdict publicly — including wrong ones — creates a transparent track record that no traditional strategy tool provides. This accountability loop is what makes Themis's signal valuable: the accuracy history is verifiable, not claimed.

### Infrastructure Plan

- Hourly cron job running verdicts on BTC/ETH/BNB/SOL
- Results stored in Redis (Upstash) with full data snapshots
- Next.js API routes serving live feed and archive
- WebSocket/SSE push for real-time updates
- Relation graph updated with each new verdict node

---

## Layer 3 — Agent Consumption (API Subscription)

**Status: Coming in v0.4 🚧**

Themis operates as a professional verdict data provider. Other AI agents can subscribe to real-time verdict signals and use them as strategy inputs — forming an Agent-to-Agent verdict network.

### API Endpoint Design

```
GET /api/v1/verdict/latest?symbol=BTC
    Returns the most recent verdict for any asset

GET /api/v1/verdict/stream
    SSE real-time stream of all new verdicts as they are issued

GET /api/v1/verdict/history?symbol=BTC&limit=24
    Historical verdicts with verified accuracy records

GET /api/v1/regime/current
    Current market regime snapshot across all tracked assets

GET /api/v1/graph/edges?date=today
    Verdict relation graph data for today's session
```

### Response Format

```json
{
  "verdict_id": "VP-20260605091511-BTC",
  "symbol": "BTC",
  "conclusion": "bearish",
  "confidence": 75,
  "regime": "PANIC_SELLOFF",
  "intensity": 28,
  "entry_price": "63400",
  "target1": "60500",
  "target2": "58500",
  "stoploss": "65800",
  "valid_until": "2026-06-07T01:15:00Z",
  "macro_warning": "US Non-Farm Payrolls in 4h",
  "timestamp": "2026-06-05T01:15:00Z"
}
```

### Subscription Model

| Tier | Access | Price |
|------|--------|-------|
| Free | Latest verdict per asset, 1 req/hour | $0 |
| Standard | Full history + stream, 60 req/hour | TBD |
| Pro | All endpoints, webhook push, priority | TBD |
| Agent | Dedicated endpoint, SLA, reputation score feed | TBD |

### The Agent-to-Agent Vision

Themis is not just a tool for human traders. It is designed to be consumed by other AI agents as a **signal layer** — the verdict equivalent of a data feed. A trading agent that subscribes to Themis gets:

1. A structured, machine-readable market judgment
2. Explicit invalidation conditions (when to stop trusting the signal)
3. A confidence score backed by a public accuracy record
4. Regime context for strategy-switching logic

This creates a network effect: the more agents that consume and verify Themis verdicts, the richer the accuracy dataset becomes, which in turn improves weight calibration and signal quality.

---

## Layer 4 — On-Chain Verdict Protocol

**Status: Coming in v1.0 🚧**

Every Themis verdict is recorded on-chain as an immutable judgment. Anyone can challenge a verdict by staking tokens. After 48 hours, the outcome is auto-verified on-chain, and the reputation system updates accordingly.

### How This Differs from Traditional Betting Protocols

| Dimension | Traditional Bet | Themis On-Chain |
|-----------|----------------|-----------------|
| Initiation | User A vs User B | Single-party (AI officer) |
| Counterparty | Required | Not required |
| Verification | Oracle or manual | On-chain price data, automatic |
| Purpose | Speculation | Accountability + signal credibility |
| Outcome | Winner takes pot | Reputation system updates |
| Cold start | Hard | Any verdict can be challenged |

### Protocol Flow

```
Verdict Issued → On-Chain Record → 48H Challenge Window
→ Price Verification → Outcome Confirmed → Reputation Updated
```

### Reputation System

- Each verdict officer (initially only Themis) accumulates an on-chain reputation score
- Score is based on verifiable historical accuracy, not claims
- Higher reputation → higher signal weight in the Agent API pricing
- Future: any entity can deploy a verdict officer node and compete on accuracy

### Connection to Verdict Protocol

The on-chain layer is the convergence point of Themis and Verdict Protocol. Where Verdict Protocol originally built a peer-to-peer betting mechanism, the Themis on-chain layer reframes it: the bet is not user A vs user B, but the AI verdict officer vs the market. This is a fundamentally different and more sustainable design — it does not require a counterparty to function.

---

## Verdict Relation Graph

**Status: Live ✅ (mock data) / Real data in v0.3**

The Verdict Relation Graph is a live, growing map of how verdicts connect over time.

### How It Works

1. Each new verdict becomes a node on the canvas (colored by asset, sized by confidence)
2. When a new node appears, AI analyzes its relationship with all existing nodes
3. Edges are drawn immediately based on relation type
4. The graph resets every 24 hours and grows again from zero

### Edge Types

| Color | Relation | Meaning |
|-------|----------|---------|
| Green | Co-directional bullish | Both nodes agree on upward movement |
| Red | Co-directional bearish / Reversal | Sustained bearish or signal flip |
| Blue | Cross-asset co-movement | Different assets moving together |
| Purple (dashed) | Divergence | Assets moving in opposite directions |

### Visual Design

- D3.js force-directed layout with 2.5D perspective tilt on mouse move
- Token icons loaded from CoinMarketCap CDN
- Node depth layering for visual 3D feel
- Drag to pin nodes, Reset Layout button
- Bilingual EN/ZH via localStorage language state

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS + inline CSS-in-JS
- **Data Visualization**: D3.js (force-directed graph)
- **Fonts**: JetBrains Mono + Inter (Google Fonts)
- **Deployment**: Vercel

### Backend / API
- **Streaming**: Next.js API Routes with Server-Sent Events (SSE)
- **LLM**: Any OpenAI-compatible provider (DeepSeek, OpenAI, Groq, etc.)
- **Market Data**: CoinMarketCap AI Agent Hub (5 endpoints)
- **Macro Data**: Finnhub Economic Calendar API
- **Storage (planned)**: Upstash Redis for verdict persistence

### Terminal System
- **Runtime**: Python 3.10+
- **UI**: Rich (terminal rendering, animations, progress bars)
- **HTTP**: requests + httpx
- **LLM Client**: openai-compatible SDK
- **Persistence**: Local JSON (weights.json, verdicts/)

### On-Chain (planned)
- **Network**: BNB Chain + Mantle
- **Contract Language**: Solidity 0.8.x
- **Client**: wagmi + viem
- **Wallet**: RainbowKit

---

## Repository Structure

```
themis-verdict-web/
├── app/
│   ├── page.tsx              # Homepage with navigation
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Design tokens, animations
│   ├── components/
│   │   ├── VerdictApp.tsx    # Main court interface
│   │   └── VerdictGraph.tsx  # D3 relation graph
│   ├── api/
│   │   └── verdict/
│   │       └── route.ts      # SSE streaming verdict API
│   ├── graph/                # Live relation graph page
│   ├── feed/                 # Public Feed (v0.3)
│   ├── agent-api/            # Agent API info (v0.4)
│   ├── docs/                 # Full documentation
│   └── onchain/              # On-Chain Protocol (v1.0)
├── public/
└── package.json
```

---

## Roadmap

| Version | Focus | Status |
|---------|-------|--------|
| v0.1 | Terminal demo system | ✅ Complete |
| v0.2 | Web interface + Relation Graph | ✅ Complete |
| v0.3 | Live data layer (cron + Redis + real graph) | 🚧 Upcoming |
| v0.4 | Agent API subscription layer | 🚧 Upcoming |
| v1.0 | On-chain verdict protocol | 🚧 Upcoming |

---

## Business Model & Ecosystem

Themis is designed as a **verdict infrastructure** business, not a SaaS tool. The distinction matters: infrastructure can charge rent at every layer.

### Revenue Layers

**Layer 2 — Data Licensing**
The public feed creates a unique dataset: structured market verdicts with verified accuracy records. This dataset has value for:
- Quantitative research firms
- Backtesting platforms
- LLM fine-tuning (verdict-structured financial reasoning)

**Layer 3 — API Subscriptions**
Tiered subscription model for AI agents and human consumers. Pricing is reputation-weighted: higher Themis accuracy scores justify higher API pricing over time.

**Layer 4 — Protocol Fees**
On-chain verdict challenges require a stake. A small protocol fee is taken from each settled challenge. As verdict volume grows, this becomes a passive revenue stream independent of any single subscriber.

### Network Effects

The ecosystem is designed with compounding network effects:

```
More verdicts issued
  → Richer accuracy dataset
    → Better weight calibration
      → Higher signal quality
        → More agents subscribe
          → More verdicts challenged on-chain
            → More protocol fee revenue
              → Fund better infrastructure
                → More verdicts issued
```

Every layer feeds the next. The on-chain reputation system is the flywheel: it converts usage into credibility, and credibility into pricing power.

### Competitive Moat

Themis's defensible advantage is not the algorithm — the Three-Court framework is openly documented in the Skill file. The moat is the **accuracy record**: a growing, verifiable, on-chain history of every verdict ever issued. This cannot be copied or faked. It takes time to build, and the longer Themis operates, the more valuable the historical dataset becomes.

---

## Getting Started

```bash
git clone https://github.com/lant1ng-1216/themis-verdict-web
cd themis-verdict-web
npm install
cp .env.local.example .env.local
# Add your API keys to .env.local
npm run dev
```

### Environment Variables

```
CMC_API_KEY=          # CoinMarketCap API key (free Basic plan)
DEEPSEEK_API_KEY=     # Any OpenAI-compatible LLM key
FINNHUB_API_KEY=      # Finnhub API key (free plan)
```

---

## Related Repositories

| Repo | Description |
|------|-------------|
| [themis-StrategySkills](https://github.com/lant1ng-1216/themis-StrategySkills) | Core Skill file + terminal demo system |

---

## Built By

[@lant1ng-1216](https://github.com/lant1ng-1216) · Telegram: [@lant1ng](https://t.me/lant1ng)

Powered by [CoinMarketCap AI Agent Hub](https://coinmarketcap.com/api/agent)

*Themis-Verdict is a Track 2 submission for BNB Hack: AI Trading Agent Edition.*
