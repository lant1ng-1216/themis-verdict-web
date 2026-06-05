import { NextRequest } from "next/server";
import { ProxyAgent, fetch as undiciFetch } from "undici";

const CMC_BASE = "https://pro-api.coinmarketcap.com";
const CMC_KEY = process.env.CMC_API_KEY!;
const DS_KEY = process.env.DEEPSEEK_API_KEY!;
const FINNHUB_KEY = process.env.FINNHUB_API_KEY!;
const PROXY = process.env.PROXY;

const CMC_HEADERS = { "X-CMC_PRO_API_KEY": CMC_KEY };

function getDispatcher() {
  if (PROXY) return new ProxyAgent(PROXY);
  return undefined;
}

async function fetchWithProxy(url: string, options: RequestInit = {}) {
  const dispatcher = getDispatcher();
  if (dispatcher) {
    return undiciFetch(url, { ...options, dispatcher } as Parameters<typeof undiciFetch>[1]);
  }
  return fetch(url, options);
}

async function fetchCMC(endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${CMC_BASE}${endpoint}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetchWithProxy(url.toString(), { headers: CMC_HEADERS });
  return res.json();
}

async function resolveCoinId(symbol: string): Promise<string> {
  const KNOWN: Record<string, string> = { BTC: "1", ETH: "1027", BNB: "1839", SOL: "5426", DOGE: "74", XRP: "52", ADA: "2010", DOT: "6636", AVAX: "5805", MATIC: "3890" };
  if (KNOWN[symbol]) return KNOWN[symbol];
  try {
    const data = await fetchCMC("/v1/cryptocurrency/map", { symbol, limit: "10" });
    const active = (data.data || []).filter((x: { is_active: number; rank?: number }) => x.is_active === 1 && x.rank);
    if (active.length > 0) {
      active.sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank);
      return String(active[0].id);
    }
  } catch {}
  return "1";
}

async function collectEvidence(symbol: string) {
  const coinId = await resolveCoinId(symbol);
  const [globalData, sentimentData, quoteData, listingsData, categoriesData] = await Promise.all([
    fetchCMC("/v1/global-metrics/quotes/latest"),
    fetchCMC("/v3/fear-and-greed/latest"),
    fetchCMC("/v2/cryptocurrency/quotes/latest", { id: coinId, convert: "USD" }),
    fetchCMC("/v1/cryptocurrency/listings/latest", { limit: "10", convert: "USD" }),
    fetchCMC("/v1/cryptocurrency/categories", { limit: "30" }),
  ]);

  const gq = globalData.data?.quote?.USD || {};
  const gd = globalData.data || {};
  const fg = sentimentData.data || {};
  const coin = quoteData.data?.[coinId] || {};
  const cq = coin.quote?.USD || {};

  const top10 = (listingsData.data || []).map((c: { cmc_rank: number; symbol: string; quote: { USD: { price: number; percent_change_24h: number; percent_change_7d: number } } }) => ({
    rank: c.cmc_rank,
    symbol: c.symbol,
    change_24h: Math.round(c.quote?.USD?.percent_change_24h * 100) / 100,
    change_7d: Math.round(c.quote?.USD?.percent_change_7d * 100) / 100,
  }));
  const declining = top10.filter((c: { change_24h: number }) => c.change_24h < 0).length;
  const avgChange = Math.round(top10.reduce((s: number, c: { change_24h: number }) => s + c.change_24h, 0) / top10.length * 100) / 100;

  const sectors = (categoriesData.data || [])
    .filter((c: { market_cap?: number }) => (c.market_cap || 0) > 5e8)
    .map((c: { name: string; avg_price_change?: number; market_cap_change?: number }) => ({
      name: c.name,
      avg_price_change: Math.round((c.avg_price_change || 0) * 100) / 100,
      market_cap_change: Math.round((c.market_cap_change || 0) * 100) / 100,
    }))
    .sort((a: { avg_price_change: number }, b: { avg_price_change: number }) => b.avg_price_change - a.avg_price_change);

  const fgVal = fg.value || 50;
  let fgZone = "Neutral";
  if (fgVal <= 20) fgZone = "Extreme Fear — historically near stage bottoms";
  else if (fgVal <= 40) fgZone = "Fear — pessimistic sentiment";
  else if (fgVal <= 60) fgZone = "Neutral — no directional bias";
  else if (fgVal <= 80) fgZone = "Greed — watch for overheating";
  else fgZone = "Extreme Greed — historically near stage tops";

  let macroEvents: unknown[] = [];
  try {
    const mRes = await fetchWithProxy(`https://finnhub.io/api/v1/calendar/economic?token=${FINNHUB_KEY}`);
    const mData = await mRes.json() as { economicCalendar?: Array<{ impact: string; country: string; time: string; event: string; estimate?: number; prev?: number }> };
    const now = new Date();
    const end = new Date(now.getTime() + 48 * 3600 * 1000);
    macroEvents = (mData.economicCalendar || [])
      .filter(e => e.impact === "high" && e.country === "US" && new Date(e.time) >= now && new Date(e.time) <= end)
      .slice(0, 3)
      .map(e => ({ event: e.event, time: e.time, estimate: e.estimate, prev: e.prev }));
  } catch {}

  return {
    snapshot_time: new Date().toISOString(),
    global: {
      total_market_cap_usd: Math.round(gq.total_market_cap || 0),
      market_cap_24h_change_pct: Math.round((gq.total_market_cap_yesterday_percentage_change || 0) * 10000) / 10000,
      btc_dominance_pct: Math.round((gd.btc_dominance || 0) * 10000) / 10000,
      btc_dominance_24h_change: Math.round((gd.btc_dominance_24h_percentage_change || 0) * 10000) / 10000,
      eth_dominance_pct: Math.round((gd.eth_dominance || 0) * 10000) / 10000,
      derivatives_volume_24h_usd: Math.round(gq.derivatives_volume_24h || 0),
      derivatives_volume_24h_change_pct: Math.round((gq.derivatives_24h_percentage_change || 0) * 10000) / 10000,
      stablecoin_market_cap_usd: Math.round(gq.stablecoin_market_cap || 0),
      stablecoin_volume_24h_usd: Math.round(gq.stablecoin_volume_24h || 0),
      stablecoin_volume_24h_change_pct: Math.round((gq.stablecoin_24h_percentage_change || 0) * 10000) / 10000,
      defi_volume_24h_usd: Math.round(gq.defi_volume_24h || 0),
    },
    sentiment: {
      fear_greed_value: fgVal,
      fear_greed_label: fg.value_classification || "",
      interpretation: fgZone,
      updated_at: fg.update_time || "",
    },
    target_coin: {
      symbol: coin.symbol || symbol,
      name: coin.name || symbol,
      price_usd: Math.round((cq.price || 0) * 10000) / 10000,
      change_1h_pct: Math.round((cq.percent_change_1h || 0) * 10000) / 10000,
      change_24h_pct: Math.round((cq.percent_change_24h || 0) * 10000) / 10000,
      change_7d_pct: Math.round((cq.percent_change_7d || 0) * 10000) / 10000,
      change_30d_pct: Math.round((cq.percent_change_30d || 0) * 10000) / 10000,
      volume_24h_usd: Math.round(cq.volume_24h || 0),
      volume_change_24h_pct: Math.round((cq.volume_change_24h || 0) * 10000) / 10000,
      market_cap_usd: Math.round(cq.market_cap || 0),
    },
    market_breadth: {
      top10_declining_count: declining,
      top10_advancing_count: 10 - declining,
      top10_avg_24h_change_pct: avgChange,
      market_consensus: declining >= 9 ? "Broad Decline" : declining >= 7 ? "Mostly Declining" : declining >= 4 ? "Mixed" : declining >= 2 ? "Mostly Rising" : "Broad Rally",
    },
    sectors: {
      top3_gaining: sectors.slice(0, 3),
      top3_losing: sectors.slice(-3),
      total_tracked: sectors.length,
    },
    macro_events: macroEvents,
  };
}

function classifyRegime(evidence: Awaited<ReturnType<typeof collectEvidence>>) {
  const fg = evidence.sentiment.fear_greed_value;
  const mc = evidence.global.market_cap_24h_change_pct;
  const dc = evidence.global.derivatives_volume_24h_change_pct;
  const bc = evidence.global.btc_dominance_24h_change;
  const sc = evidence.global.stablecoin_volume_24h_change_pct;
  const breadth = evidence.market_breadth.top10_declining_count;
  const c7 = evidence.target_coin.change_7d_pct;
  const c30 = evidence.target_coin.change_30d_pct;

  const scores = { PANIC_SELLOFF: 0, BEAR_TREND: 0, ACCUMULATION: 0, RECOVERY: 0, BULL_TREND: 0 };

  if (fg < 20) { scores.PANIC_SELLOFF += 3; scores.ACCUMULATION += 1; }
  else if (fg < 35) scores.BEAR_TREND += 2;
  else if (fg > 75) scores.BULL_TREND += 2;
  else if (fg > 60) scores.RECOVERY += 1;

  if (mc < -3) scores.PANIC_SELLOFF += 2;
  else if (mc < -1) scores.BEAR_TREND += 2;
  else if (mc > 2) scores.BULL_TREND += 2;
  else if (mc > 0) scores.RECOVERY += 1;

  if (dc > 20) scores.PANIC_SELLOFF += 2;
  else if (dc > 10) scores.BEAR_TREND += 1;
  else if (dc < -10) scores.ACCUMULATION += 1;

  if (sc > 15) scores.PANIC_SELLOFF += 2;
  else if (sc > 5) scores.BEAR_TREND += 1;

  if (bc > 0.3) { scores.PANIC_SELLOFF += 1; scores.BEAR_TREND += 1; }
  else if (bc < -0.3) { scores.BULL_TREND += 1; scores.RECOVERY += 1; }

  if (breadth >= 9) scores.PANIC_SELLOFF += 2;
  else if (breadth >= 7) scores.BEAR_TREND += 2;
  else if (breadth <= 2) scores.BULL_TREND += 2;
  else if (breadth <= 4) scores.RECOVERY += 1;

  if (c7 < -15) { scores.PANIC_SELLOFF += 1; scores.ACCUMULATION += 1; }
  else if (c7 < -8) scores.BEAR_TREND += 2;
  else if (c7 > 10) scores.BULL_TREND += 2;

  if (c30 < -25) scores.ACCUMULATION += 2;
  else if (c30 < -15) scores.BEAR_TREND += 1;

  const regime = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const confidence = total > 0 ? Math.round(scores[regime as keyof typeof scores] / total * 1000) / 10 : 0;

  let intensity = 50;
  intensity += (fg - 50) * 0.3;
  if (dc > 20) intensity -= 15; else if (dc > 10) intensity -= 8; else if (dc < -10) intensity += 8;
  if (sc > 15) intensity -= 12; else if (sc > 5) intensity -= 5; else if (sc < -5) intensity += 8;
  intensity -= bc * 10;
  intensity -= (breadth - 5) * 3;
  intensity += evidence.target_coin.change_24h_pct * 2;
  intensity = Math.max(0, Math.min(100, Math.round(intensity)));

  const meta: Record<string, { label: string; desc: string; bias: string; color: string; icon: string }> = {
    PANIC_SELLOFF: { label: "PANIC SELLOFF", desc: "Extreme fear — collective mistakes occurring, contrarian opportunity building", bias: "Watch for reversal signals while protecting against continuation", color: "red", icon: "🔴" },
    BEAR_TREND: { label: "BEAR TREND", desc: "Trending lower — bears dominant, bounces are sell opportunities", bias: "Trend-following short, wait for reversal confirmation", color: "red", icon: "🔻" },
    ACCUMULATION: { label: "ACCUMULATION", desc: "Depressed prices, declining momentum — smart money may be accumulating", bias: "Light long positions with strict risk control", color: "yellow", icon: "🟡" },
    RECOVERY: { label: "RECOVERY", desc: "Recovering from lows, risk appetite returning", bias: "Trend-following long, set take-profit and stop-loss", color: "green", icon: "🟢" },
    BULL_TREND: { label: "BULL TREND", desc: "Trending higher — bulls dominant, dips are buy opportunities", bias: "Trend-following long, add on dips", color: "green", icon: "🚀" },
  };

  return { regime, label: meta[regime].label, confidence_pct: confidence, description: meta[regime].desc, signal_bias: meta[regime].bias, color: meta[regime].color, icon: meta[regime].icon, bull_bear_intensity: intensity, all_scores: scores };
}

async function callDeepSeek(prompt: string): Promise<string> {
  const res = await fetchWithProxy("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DS_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a strict market verdict officer. Output ONLY valid JSON. No markdown. No extra text. Use only the provided real-time data." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
    }),
  });
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || "{}";
}

function send(controller: ReadableStreamDefaultController, event: object) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export async function POST(req: NextRequest) {
  const { symbol, lang = "en" } = await req.json();
  const isMulti = symbol === "MULTI";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const symbols = isMulti ? ["BTC", "ETH", "BNB", "SOL"] : [symbol];
        const outputLang = lang === "zh" ? "Chinese" : "English";

        for (const sym of symbols) {
          send(controller, { type: "status", data: { text: `Resolving ${sym}...` } });
          send(controller, { type: "status", data: { text: `Connected to CoinMarketCap`, done: true } });

          send(controller, { type: "status", data: { text: `Fetching global metrics...` } });
          const evidence = await collectEvidence(sym);
          send(controller, { type: "status", data: { text: `Evidence collected — 7 dimensions`, done: true } });

          send(controller, { type: "status", data: { text: `Classifying market regime...` } });
          const regime = classifyRegime(evidence);
          send(controller, { type: "regime", data: regime });
          send(controller, { type: "status", data: { text: `Regime: ${regime.label} (${regime.confidence_pct}%)`, done: true } });

          send(controller, { type: "status", data: { text: `Court deliberating...` } });
          const now = new Date().toISOString();
          const price = evidence.target_coin.price_usd;

          const prompt = `You are the Chief Market Verdict Officer of Verdict Protocol.
Current time: ${now}
${sym} current price: $${price} (ONLY valid price — do NOT use any other)
All numbers MUST come from the evidence below.

MARKET REGIME: ${regime.label} (confidence ${regime.confidence_pct}%)
${regime.description}

REAL-TIME EVIDENCE:
${JSON.stringify(evidence, null, 2)}

Output ONLY this JSON (no markdown, no extra text):
{
  "headline": "one punchy telegraph-style summary under 20 words",
  "claim": "one sentence directional claim with price target based on $${price}",
  "claim_basis": "2-3 sentences citing specific numbers from evidence",
  "falsification": ["condition 1", "condition 2", "condition 3"],
  "evidence_summary": [
    {"dim": "Price Momentum", "signal": "bearish|bullish|neutral", "weight": "HIGH|MED|LOW", "detail": "specific data"},
    {"dim": "Market Sentiment", "signal": "bearish|bullish|neutral", "weight": "HIGH|MED|LOW", "detail": "specific data"},
    {"dim": "Market Breadth", "signal": "bearish|bullish|neutral", "weight": "HIGH|MED|LOW", "detail": "specific data"},
    {"dim": "Derivatives Volume", "signal": "bearish|bullish|neutral", "weight": "HIGH|MED|LOW", "detail": "specific data"},
    {"dim": "BTC Dominance", "signal": "bearish|bullish|neutral", "weight": "HIGH|MED|LOW", "detail": "specific data"},
    {"dim": "Sector Rotation", "signal": "bearish|bullish|neutral", "weight": "HIGH|MED|LOW", "detail": "specific data"},
    {"dim": "Stablecoin Flow", "signal": "bearish|bullish|neutral", "weight": "HIGH|MED|LOW", "detail": "specific data"}
  ],
  "conclusion": "bearish|bullish|neutral",
  "confidence": 75,
  "market_context": "1-2 sentences macro background with specific data",
  "verdict_reasons": ["reason 1 with data", "reason 2 with data", "reason 3 with data"],
  "risk_level": "HIGH|MEDIUM|LOW",
  "risk_reason": "one sentence",
  "entry_price": "$${price}",
  "target1": "price string e.g. $60000",
  "target2": "price string e.g. $58000",
  "stoploss": "price string e.g. $65000",
  "valid_until": "datetime string 48h from ${now}",
  "invalidation": ["condition 1 with value", "condition 2", "condition 3", "condition 4"],
  "appeal_points": ["point 1", "point 2", "point 3"],
  "macro_warning": "null or one sentence warning",
  "price_levels": {
    "current": "$${price}",
    "target1": "price",
    "target2": "price",
    "stoploss": "price",
    "key_support": "price",
    "key_resistance": "price"
  }
}
Output all text fields in ${outputLang}. Plain text only, no markdown.`;

          const raw = await callDeepSeek(prompt);
          const cleaned = raw.replace(/```json|```/g, "").trim();

          let verdictData;
          try {
            verdictData = JSON.parse(cleaned);
          } catch {
            verdictData = { conclusion: "neutral", confidence: 50, claim: "Parse error", evidence_summary: [] };
          }

          send(controller, { type: "evidence_start", data: {} });
          for (const ev of verdictData.evidence_summary || []) {
            send(controller, { type: "evidence_item", data: ev });
            await new Promise(r => setTimeout(r, 80));
          }

          send(controller, { type: "verdict", data: verdictData });
          send(controller, { type: "status", data: { text: `Verdict complete`, done: true } });
        }

        send(controller, { type: "complete", data: {} });
      } catch (e) {
        send(controller, { type: "error", data: { message: String(e) } });
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
