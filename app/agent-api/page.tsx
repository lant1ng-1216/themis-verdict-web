"use client";
import { useState } from "react";
import Link from "next/link";
import { SiteNav } from "../page";

const M = "JetBrains Mono, monospace";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/verdict/latest",
    query: "?symbol=BTC",
    plan: "standard",
    en: "Latest verdict for any asset",
    zh: "获取任意资产最新裁决",
    desc_en: "Returns the most recent 7-dimension AI verdict, confidence score, and trade recommendation for a given symbol.",
    desc_zh: "返回指定资产的最新 7 维度 AI 裁决、置信度评分和交易建议。",
    fields: ["symbol", "verdict", "confidence", "action", "entry_price", "stoploss", "target1", "target2", "regime", "created_at"],
    curl: `curl -H "X-API-Key: YOUR_KEY" \\
  "https://api.themisverdict.xyz/api/v1/verdict/latest?symbol=BTC"`,
    py: `import requests

resp = requests.get(
    "https://api.themisverdict.xyz/api/v1/verdict/latest",
    params={"symbol": "BTCUSDT"},
    headers={"X-API-Key": "YOUR_KEY"}
)
print(resp.json())`,
    js: `const res = await fetch(
  "https://api.themisverdict.xyz/api/v1/verdict/latest?symbol=BTC",
  { headers: { "X-API-Key": "YOUR_KEY" } }
);
const data = await res.json();`,
  },
  {
    method: "GET",
    path: "/api/v1/verdict/stream",
    query: "",
    plan: "pro",
    en: "Real-time SSE verdict stream",
    zh: "SSE 实时裁决数据流",
    desc_en: "Server-Sent Events stream. Emits a new verdict event whenever Themis publishes a fresh signal. Keep the connection open for continuous updates.",
    desc_zh: "Server-Sent Events 流。每当 Themis 发布新信号时推送裁决事件，保持连接以持续接收更新。",
    fields: ["event: verdict", "data.symbol", "data.verdict", "data.confidence", "data.regime", "data.timestamp"],
    curl: `curl -N -H "X-API-Key: YOUR_KEY" \\
  "https://api.themisverdict.xyz/api/v1/verdict/stream"`,
    py: `import sseclient, requests

resp = requests.get(
    "https://api.themisverdict.xyz/api/v1/verdict/stream",
    headers={"X-API-Key": "YOUR_KEY"},
    stream=True
)
for event in sseclient.SSEClient(resp):
    print(event.data)`,
    js: `const es = new EventSource(
  "https://api.themisverdict.xyz/api/v1/verdict/stream?key=YOUR_KEY"
);
es.addEventListener("verdict", e => {
  const data = JSON.parse(e.data);
  console.log(data);
});`,
  },
  {
    method: "GET",
    path: "/api/v1/verdict/history",
    query: "?symbol=BTC&limit=24",
    plan: "standard",
    en: "Historical verdicts with accuracy",
    zh: "历史裁决记录及准确率",
    desc_en: "Returns paginated historical verdicts with actual outcome labels, useful for backtesting and evaluating signal quality.",
    desc_zh: "返回分页历史裁决记录，含实际结果标注，适用于回测和信号质量评估。",
    fields: ["verdicts[]", "verdict.symbol", "verdict.action", "verdict.confidence", "verdict.outcome", "verdict.pnl_pct", "verdict.created_at"],
    curl: `curl -H "X-API-Key: YOUR_KEY" \\
  "https://api.themisverdict.xyz/api/v1/verdict/history?symbol=BTC&limit=24"`,
    py: `resp = requests.get(
    "https://api.themisverdict.xyz/api/v1/verdict/history",
    params={"symbol": "BTCUSDT", "limit": 24},
    headers={"X-API-Key": "YOUR_KEY"}
)`,
    js: `const res = await fetch(
  "https://api.themisverdict.xyz/api/v1/verdict/history?symbol=BTC&limit=24",
  { headers: { "X-API-Key": "YOUR_KEY" } }
);`,
  },
  {
    method: "GET",
    path: "/api/v1/regime/current",
    query: "",
    plan: "free",
    en: "Current market regime snapshot",
    zh: "当前市场状态快照",
    desc_en: "Returns the current macro market regime classification: BULL_TREND, BEAR_TREND, PANIC_SELLOFF, ACCUMULATION, or SIDEWAYS.",
    desc_zh: "返回当前宏观市场状态分类：BULL_TREND、BEAR_TREND、PANIC_SELLOFF、ACCUMULATION 或 SIDEWAYS。",
    fields: ["regime", "confidence", "btc_dominance", "fear_greed", "updated_at"],
    curl: `curl -H "X-API-Key: YOUR_KEY" \\
  "https://api.themisverdict.xyz/api/v1/regime/current"`,
    py: `resp = requests.get(
    "https://api.themisverdict.xyz/api/v1/regime/current",
    headers={"X-API-Key": "YOUR_KEY"}
)`,
    js: `const res = await fetch(
  "https://api.themisverdict.xyz/api/v1/regime/current",
  { headers: { "X-API-Key": "YOUR_KEY" } }
);`,
  },
  {
    method: "GET",
    path: "/api/v1/accuracy/stats",
    query: "?window=7d",
    plan: "free",
    en: "Signal accuracy statistics",
    zh: "信号准确率统计",
    desc_en: "Returns win rate, average confidence, and PnL statistics for Themis verdicts over a specified time window.",
    desc_zh: "返回指定时间窗口内 Themis 裁决的胜率、平均置信度和盈亏统计。",
    fields: ["win_rate", "total_verdicts", "avg_confidence", "avg_pnl_pct", "window"],
    curl: `curl -H "X-API-Key: YOUR_KEY" \\
  "https://api.themisverdict.xyz/api/v1/accuracy/stats?symbol=BTC"`,
    py: `resp = requests.get(
    "https://api.themisverdict.xyz/api/v1/accuracy/stats",
    params={"window": "7d"},
    headers={"X-API-Key": "YOUR_KEY"}
)`,
    js: `const res = await fetch(
  "https://api.themisverdict.xyz/api/v1/accuracy/stats?symbol=BTC",
  { headers: { "X-API-Key": "YOUR_KEY" } }
);`,
  },
  {
    method: "GET",
    path: "/api/v1/graph/edges",
    query: "?symbol=BTC",
    plan: "pro",
    en: "Asset correlation graph edges",
    zh: "资产相关性图谱",
    desc_en: "Returns correlation edges between assets based on Themis's internal graph model, useful for portfolio-level signal aggregation.",
    desc_zh: "返回基于 Themis 内部图模型的资产间相关性边数据，适用于组合级信号聚合。",
    fields: ["edges[]", "edge.from", "edge.to", "edge.weight", "edge.regime_aligned"],
    curl: `curl -H "X-API-Key: YOUR_KEY" \\
  "https://api.themisverdict.xyz/api/v1/graph/edges?symbol=BTC"`,
    py: `resp = requests.get(
    "https://api.themisverdict.xyz/api/v1/graph/edges",
    params={"symbol": "BTCUSDT"},
    headers={"X-API-Key": "YOUR_KEY"}
)`,
    js: `const res = await fetch(
  "https://api.themisverdict.xyz/api/v1/graph/edges?symbol=BTC",
  { headers: { "X-API-Key": "YOUR_KEY" } }
);`,
  },
];

const PLAN_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free:     { label: "FREE",     color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  standard: { label: "STANDARD", color: "#0047cc", bg: "#eef2ff", border: "#c7d3f8" },
  pro:      { label: "PRO",      color: "#6633cc", bg: "#f5f3ff", border: "#ddd6fe" },
  agent:    { label: "AGENT",    color: "#059669", bg: "#ecfdf5", border: "#6ee7b7" },
};

const PLAN_ACCESS: Record<string, string[]> = {
  free:     ["regime/current", "accuracy/stats"],
  standard: ["regime/current", "accuracy/stats", "verdict/latest", "verdict/history"],
  pro:      ["regime/current", "accuracy/stats", "verdict/latest", "verdict/history", "verdict/stream", "graph/edges"],
  agent:    ["regime/current", "accuracy/stats", "verdict/latest", "verdict/history", "verdict/stream", "graph/edges"],
};

const ALL_ENDPOINTS_SHORT = ["regime/current", "accuracy/stats", "verdict/latest", "verdict/history", "verdict/stream", "graph/edges"];

function PlanBadge({ plan }: { plan: string }) {
  const m = PLAN_META[plan];
  return (
    <span style={{ fontFamily: M, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, color: m.color, background: m.bg, border: `1px solid ${m.border}`, letterSpacing: "0.08em" }}>
      {m.label}+
    </span>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{ position: "relative" }}>
      <pre style={{ background: "#0d1117", borderRadius: 8, padding: "16px 18px", margin: 0, overflowX: "auto", fontFamily: M, fontSize: 12, lineHeight: 1.7, color: "#e6edf3" }}>
        {code}
      </pre>
      <button onClick={copy} style={{ position: "absolute", top: 10, right: 10, fontFamily: M, fontSize: 9, fontWeight: 700, color: copied ? "#34d399" : "#94a3b8", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "4px 10px", cursor: "pointer", letterSpacing: "0.06em" }}>
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  );
}

export default function AgentAPIPage() {
  const [lang, setLang] = useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("themis_lang") || "en";
  });
  const handleLang = (l: string) => { setLang(l); localStorage.setItem("themis_lang", l); };
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  const [activeEndpoint, setActiveEndpoint] = useState(0);
  const [codeLang, setCodeLang] = useState<"curl" | "py" | "js">("curl");

  const ep = ENDPOINTS[activeEndpoint];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafd" }}>
      <SiteNav lang={lang} onLangChange={handleLang} />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #eef2f8", paddingTop: 80, paddingBottom: 64 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#eef2ff", border: "1px solid #c7d3f8", borderRadius: 20, padding: "4px 14px", marginBottom: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0047cc", animation: "pulse 2s ease infinite" }} />
            <span style={{ fontFamily: M, fontSize: 10, color: "#0047cc", letterSpacing: "0.15em", fontWeight: 700 }}>THEMIS · SIGNAL API</span>
          </div>
          <h1 style={{ fontFamily: M, fontSize: 42, fontWeight: 800, color: "#0a1a3a", marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            {t("Agent Signal API", "Agent 信号订阅层")}
          </h1>
          <p style={{ fontSize: 16, color: "#4a5568", lineHeight: 1.8, maxWidth: 620, marginBottom: 36 }}>
            {t(
              "Subscribe to Themis verdict signals as a data feed. Other AI agents and developers can integrate real-time market intelligence directly into their strategies.",
              "将 Themis 裁决信号作为数据源订阅。其他 AI Agent 和开发者可以将实时市场智能直接集成到自己的策略中。"
            )}
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a href="#endpoints" style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: "#fff", background: "#0047cc", padding: "12px 24px", borderRadius: 9, textDecoration: "none", letterSpacing: "0.06em" }}>
              {t("VIEW ENDPOINTS", "查看端点")}
            </a>
            <Link href="/dashboard" style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: "#0047cc", background: "#eef2ff", border: "1px solid #c7d3f8", padding: "12px 24px", borderRadius: 9, textDecoration: "none", letterSpacing: "0.06em" }}>
              {t("GET API KEY →", "获取 API Key →")}
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 32px" }}>

        {/* ── Capability Cards ─────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "48px 0 0" }}>
          {[
            {
              icon: "⚡",
              en: "Real-time Verdict Signals",
              zh: "实时裁决信号",
              desc_en: "7-dimension AI verdicts with confidence scores, entry/SL/TP levels, and market regime context.",
              desc_zh: "含置信度评分、入场/止损/目标价和市场状态的 7 维度 AI 裁决。",
              endpoints: ["verdict/latest", "verdict/stream"],
            },
            {
              icon: "◎",
              en: "Market Regime Detection",
              zh: "市场状态识别",
              desc_en: "Real-time macro regime classification across 5 states, updated continuously from on-chain and price data.",
              desc_zh: "基于链上数据和价格数据持续更新的 5 类宏观市场状态实时分类。",
              endpoints: ["regime/current"],
            },
            {
              icon: "↗",
              en: "Signal Analytics",
              zh: "信号统计分析",
              desc_en: "Historical accuracy, win rate, and PnL statistics. Asset correlation graph for portfolio-level context.",
              desc_zh: "历史准确率、胜率和盈亏统计。资产相关性图谱用于组合级别分析。",
              endpoints: ["accuracy/stats", "verdict/history", "graph/edges"],
            },
          ].map(({ icon, en, zh, desc_en, desc_zh, endpoints }) => (
            <div key={en} style={{ background: "#fff", border: "1px solid #eef2f8", borderRadius: 12, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
              <div style={{ fontSize: 22, marginBottom: 12 }}>{icon}</div>
              <div style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: "#0a1a3a", marginBottom: 8 }}>{t(en, zh)}</div>
              <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.7, marginBottom: 14 }}>{t(desc_en, desc_zh)}</p>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
                {endpoints.map(ep => (
                  <span key={ep} style={{ fontFamily: M, fontSize: 9, color: "#0047cc", background: "#eef2ff", border: "1px solid #c7d3f8", borderRadius: 4, padding: "2px 7px" }}>{ep}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Endpoint Reference ───────────────────────────────── */}
        <div id="endpoints" style={{ paddingTop: 64, paddingBottom: 16 }}>
          <div style={{ fontFamily: M, fontSize: 10, color: "#94a3b8", letterSpacing: "0.18em", marginBottom: 10 }}>ENDPOINT REFERENCE</div>
          <h2 style={{ fontFamily: M, fontSize: 24, fontWeight: 800, color: "#0a1a3a", marginBottom: 6 }}>{t("API Endpoints", "API 端点文档")}</h2>
          <p style={{ fontSize: 13.5, color: "#64748b", marginBottom: 32 }}>
            {t("Base URL: ", "基础 URL：")}
            <code style={{ fontFamily: M, fontSize: 12, color: "#0047cc", background: "#eef2ff", padding: "2px 8px", borderRadius: 4 }}>https://api.themisverdict.xyz</code>
            {"  "}
            {t("Authentication: ", "鉴权方式：")}
            <code style={{ fontFamily: M, fontSize: 12, color: "#6633cc", background: "#f5f3ff", padding: "2px 8px", borderRadius: 4 }}>X-API-Key: YOUR_KEY</code>
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24 }}>
            {/* Left: endpoint list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {ENDPOINTS.map((e, i) => {
                const pm = PLAN_META[e.plan];
                return (
                  <button key={e.path} onClick={() => setActiveEndpoint(i)} style={{
                    textAlign: "left", padding: "11px 14px", borderRadius: 9,
                    background: activeEndpoint === i ? "#0047cc" : "#fff",
                    border: `1px solid ${activeEndpoint === i ? "#0047cc" : "#eef2f8"}`,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: activeEndpoint === i ? "rgba(255,255,255,0.7)" : "#22c55e", background: activeEndpoint === i ? "rgba(255,255,255,0.15)" : "rgba(34,197,94,0.1)", padding: "1px 5px", borderRadius: 3 }}>GET</span>
                      <span style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: activeEndpoint === i ? "rgba(255,255,255,0.6)" : pm.color, background: activeEndpoint === i ? "rgba(255,255,255,0.1)" : pm.bg, padding: "1px 5px", borderRadius: 3 }}>{pm.label}+</span>
                    </div>
                    <div style={{ fontFamily: M, fontSize: 10.5, fontWeight: 700, color: activeEndpoint === i ? "#fff" : "#0a1a3a", marginBottom: 2 }}>{e.path.replace("/api/v1/", "")}</div>
                    <div style={{ fontSize: 10.5, color: activeEndpoint === i ? "rgba(255,255,255,0.65)" : "#94a3b8" }}>{t(e.en, e.zh)}</div>
                  </button>
                );
              })}
            </div>

            {/* Right: endpoint detail */}
            <div style={{ background: "#fff", border: "1px solid #eef2f8", borderRadius: 12, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #eef2f8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "3px 8px", borderRadius: 4 }}>GET</span>
                  <code style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: "#0a1a3a" }}>{ep.path}{ep.query}</code>
                  <PlanBadge plan={ep.plan} />
                </div>
                <p style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.7, margin: 0 }}>{t(ep.desc_en, ep.desc_zh)}</p>
              </div>

              {/* Response fields */}
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #eef2f8" }}>
                <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 10 }}>RESPONSE FIELDS</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                  {ep.fields.map(f => (
                    <code key={f} style={{ fontFamily: M, fontSize: 10.5, color: "#4a5568", background: "#f8fafd", border: "1px solid #eef2f8", borderRadius: 4, padding: "3px 8px" }}>{f}</code>
                  ))}
                </div>
              </div>

              {/* Code example */}
              <div style={{ padding: "16px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em" }}>CODE EXAMPLE</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["curl", "py", "js"] as const).map(l => (
                      <button key={l} onClick={() => setCodeLang(l)} style={{ fontFamily: M, fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 5, border: `1px solid ${codeLang === l ? "#0047cc" : "#eef2f8"}`, background: codeLang === l ? "#0047cc" : "#fff", color: codeLang === l ? "#fff" : "#94a3b8", cursor: "pointer", letterSpacing: "0.06em" }}>
                        {l === "py" ? "Python" : l === "js" ? "JS" : "cURL"}
                      </button>
                    ))}
                  </div>
                </div>
                <CodeBlock code={ep[codeLang]} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Plan Access Table ────────────────────────────────── */}
        <div style={{ paddingTop: 64, paddingBottom: 16 }}>
          <div style={{ fontFamily: M, fontSize: 10, color: "#94a3b8", letterSpacing: "0.18em", marginBottom: 10 }}>ACCESS CONTROL</div>
          <h2 style={{ fontFamily: M, fontSize: 24, fontWeight: 800, color: "#0a1a3a", marginBottom: 6 }}>{t("Plan Access", "套餐权限对照")}</h2>
          <p style={{ fontSize: 13.5, color: "#64748b", marginBottom: 28 }}>{t("Which endpoints are available on each plan.", "各套餐可访问的端点。")}</p>

          <div style={{ background: "#fff", border: "1px solid #eef2f8", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafd" }}>
                  <th style={{ fontFamily: M, fontSize: 10, color: "#94a3b8", letterSpacing: "0.12em", padding: "12px 20px", textAlign: "left", borderBottom: "1px solid #eef2f8", fontWeight: 600 }}>ENDPOINT</th>
                  {(["free", "standard", "pro", "agent"] as const).map(p => {
                    const pm = PLAN_META[p];
                    return (
                      <th key={p} style={{ fontFamily: M, fontSize: 10, color: pm.color, letterSpacing: "0.12em", padding: "12px 20px", textAlign: "center", borderBottom: "1px solid #eef2f8", fontWeight: 700 }}>{pm.label}</th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ALL_ENDPOINTS_SHORT.map((ep, i) => (
                  <tr key={ep} style={{ borderBottom: i < ALL_ENDPOINTS_SHORT.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ fontFamily: M, fontSize: 11, color: "#0a1a3a", padding: "13px 20px" }}>{ep}</td>
                    {(["free", "standard", "pro", "agent"] as const).map(plan => {
                      const has = PLAN_ACCESS[plan].includes(ep);
                      return (
                        <td key={plan} style={{ textAlign: "center", padding: "13px 20px" }}>
                          {has
                            ? <span style={{ color: "#22c55e", fontSize: 15, fontWeight: 700 }}>✓</span>
                            : <span style={{ color: "#e2e8f0", fontSize: 14 }}>—</span>
                          }
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr style={{ background: "#f8fafd" }}>
                  <td style={{ fontFamily: M, fontSize: 10, color: "#94a3b8", padding: "12px 20px", letterSpacing: "0.06em" }}>{t("Daily call quota", "每日调用额度")}</td>
                  {[
                    { label: "10 / day", color: "#64748b" },
                    { label: "500 / day", color: "#0047cc" },
                    { label: "5,000 / day", color: "#6633cc" },
                    { label: "Unlimited", color: "#059669" },
                  ].map(({ label, color }) => (
                    <td key={label} style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color, textAlign: "center", padding: "12px 20px" }}>{label}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <Link href="/pricing" style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: "#0047cc", background: "#eef2ff", border: "1px solid #c7d3f8", padding: "12px 28px", borderRadius: 9, textDecoration: "none", letterSpacing: "0.06em" }}>
              {t("VIEW FULL PRICING →", "查看完整定价 →")}
            </Link>
          </div>
        </div>

        {/* ── Quick Start ──────────────────────────────────────── */}
        <div style={{ paddingTop: 64, paddingBottom: 80 }}>
          <div style={{ fontFamily: M, fontSize: 10, color: "#94a3b8", letterSpacing: "0.18em", marginBottom: 10 }}>QUICK START</div>
          <h2 style={{ fontFamily: M, fontSize: 24, fontWeight: 800, color: "#0a1a3a", marginBottom: 32 }}>{t("Start in 3 steps", "3 步接入")}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {[
              {
                step: "01",
                en: "Create an account & get your API Key",
                zh: "注册账户并获取 API Key",
                desc_en: "Sign up and head to your Dashboard. Generate an API key from the API Keys section.",
                desc_zh: "注册账户后进入控制台，在 API Keys 模块生成你的密钥。",
                cta_en: "Go to Dashboard →",
                cta_zh: "前往控制台 →",
                href: "/dashboard",
                color: "#0047cc",
              },
              {
                step: "02",
                en: "Choose a plan",
                zh: "选择订阅套餐",
                desc_en: "Start free with regime and accuracy endpoints. Upgrade to Standard or Pro for real-time verdict signals.",
                desc_zh: "免费套餐即可访问 regime 和准确率端点，升级 Standard 或 Pro 获取实时裁决信号。",
                cta_en: "View Pricing →",
                cta_zh: "查看定价 →",
                href: "/pricing",
                color: "#6633cc",
              },
              {
                step: "03",
                en: "Integrate and go live",
                zh: "接入并上线",
                desc_en: "Use your API key in the header. Start with verdict/latest, then add verdict/stream for real-time updates.",
                desc_zh: "在请求头中使用 API Key，从 verdict/latest 开始，再接入 verdict/stream 获取实时推送。",
                cta_en: "See Endpoints ↑",
                cta_zh: "查看端点 ↑",
                href: "#endpoints",
                color: "#059669",
              },
            ].map(({ step, en, zh, desc_en, desc_zh, cta_en, cta_zh, href, color }) => (
              <div key={step} style={{ background: "#fff", border: "1px solid #eef2f8", borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
                <div style={{ fontFamily: M, fontSize: 28, fontWeight: 800, color: "#eef2f8", marginBottom: 14, letterSpacing: "-0.02em" }}>{step}</div>
                <div style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: "#0a1a3a", marginBottom: 10 }}>{t(en, zh)}</div>
                <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.7, marginBottom: 18 }}>{t(desc_en, desc_zh)}</p>
                <Link href={href} style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color, textDecoration: "none", letterSpacing: "0.04em" }}>{t(cta_en, cta_zh)}</Link>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
