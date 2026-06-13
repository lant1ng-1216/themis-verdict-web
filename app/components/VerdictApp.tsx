"use client";
import { useState, useRef, useEffect, useCallback } from "react";

type Step = "idle" | "running" | "complete" | "error";

interface EvidenceItem {
  dim: string;
  signal: "bearish" | "bullish" | "neutral";
  weight: "HIGH" | "MED" | "LOW";
  detail: string;
}

interface RegimeData {
  label: string;
  confidence_pct: number;
  description: string;
  signal_bias: string;
  color: string;
  icon: string;
  bull_bear_intensity: number;
}

interface VerdictData {
  headline?: string;
  claim?: string;
  claim_basis?: string;
  falsification?: string[];
  evidence_summary?: EvidenceItem[];
  conclusion?: "bearish" | "bullish" | "neutral";
  confidence?: number;
  market_context?: string;
  verdict_reasons?: string[];
  risk_level?: "HIGH" | "MEDIUM" | "LOW";
  risk_reason?: string;
  entry_price?: string;
  target1?: string;
  target2?: string;
  stoploss?: string;
  valid_until?: string;
  invalidation?: string[];
  appeal_points?: string[];
  macro_warning?: string;
  price_levels?: Record<string, string>;
}

interface LogLine { text: string; status: "loading" | "done" | "error"; }

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260525_070034_60e5670b-6bb0-402b-a6c1-c9a8c05ae3a4.mp4";

const glass = {
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.6)",
  borderRadius: 16,
  boxShadow: "0 8px 32px rgba(0,40,120,0.1), 0 1px 0 rgba(255,255,255,0.8) inset",
};

const glassStrong = {
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(32px) saturate(200%)",
  WebkitBackdropFilter: "blur(32px) saturate(200%)",
  border: "1px solid rgba(255,255,255,0.8)",
  borderRadius: 20,
  boxShadow: "0 16px 48px rgba(0,40,120,0.12), 0 1px 0 rgba(255,255,255,0.9) inset",
};

const SIG_COLOR = { bearish: "#e8193c", bullish: "#00954a", neutral: "#d4800a" };
const SIG_LABEL = { bearish: "BEARISH ⬇", bullish: "BULLISH ⬆", neutral: "NEUTRAL ➡" };
const SIG_BG = { bearish: "rgba(232,25,60,0.08)", bullish: "rgba(0,149,74,0.08)", neutral: "rgba(212,128,10,0.08)" };

function Spinner({ size = 16, color = "#0047cc" }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid rgba(0,71,204,0.15)`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function AnimatedBar({ value, color, height = 8, delay = 0 }: { value: number; color: string; height?: number; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), delay + 150); return () => clearTimeout(t); }, [value, delay]);
  return (
    <div style={{ height, background: "rgba(0,0,0,0.06)", borderRadius: height, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: height, transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

function CountUp({ target, color }: { target: number; color: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let v = 0;
    const step = () => { v = Math.min(v + Math.ceil((target - v) / 8 + 1), target); setVal(v); if (v < target) requestAnimationFrame(step); };
    const t = setTimeout(() => requestAnimationFrame(step), 400);
    return () => clearTimeout(t);
  }, [target]);
  return <span style={{ color, fontFamily: "var(--font-mono)", fontSize: 56, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>{val}%</span>;
}

export default function VerdictApp({ onBack, lang, setLang, hideHeader }: { onBack: () => void; lang: string; setLang: (l: string) => void; hideHeader?: boolean }) {
  const [mode, setMode] = useState<"select" | "single" | "multi">("single");
  const [symbol, setSymbol] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [regime, setRegime] = useState<RegimeData | null>(null);
  const [verdict, setVerdict] = useState<VerdictData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // no auto-scroll

  const addLog = useCallback((text: string, status: LogLine["status"] = "loading") => {
    setLogs(p => [...p, { text, status }]);
  }, []);
  const doneLog = useCallback(() => {
    setLogs(p => p.map((l, i) => i === p.length - 1 ? { ...l, status: "done" } : l));
  }, []);

  const runVerdict = async (sym: string) => {
    setStep("running");
    setLogs([]); setEvidence([]); setRegime(null); setVerdict(null); setError(null);
    addLog(`Resolving ${sym}...`);
    try {
      const res = await fetch("/api/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym, lang }),
      });
      if (!res.ok || !res.body) throw new Error("API error");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6).trim());
            if (ev.type === "status") { ev.data.done ? doneLog() : addLog(ev.data.text); }
            else if (ev.type === "regime") setRegime(ev.data);
            else if (ev.type === "evidence_item") setEvidence(p => [...p, ev.data]);
            else if (ev.type === "verdict") { setVerdict(ev.data); setStep("complete"); }
            else if (ev.type === "error") { setError(ev.data.message); setStep("error"); }
          } catch {}
        }
      }
    } catch (e) { setError(String(e)); setStep("error"); }
  };

  const reset = () => { setStep("idle"); setMode("single"); setLogs([]); setEvidence([]); setRegime(null); setVerdict(null); setError(null); };

  const conclusionColor = verdict?.conclusion === "bearish" ? "#e8193c" : verdict?.conclusion === "bullish" ? "#00954a" : "#d4800a";
  const conclusionLabel = verdict?.conclusion === "bearish" ? "BEARISH" : verdict?.conclusion === "bullish" ? "BULLISH" : "NEUTRAL";
  const conclusionIcon = verdict?.conclusion === "bearish" ? "📉" : verdict?.conclusion === "bullish" ? "📈" : "⚖";
  const regimeAccent = regime?.color === "red" ? "#e8193c" : regime?.color === "green" ? "#00954a" : "#d4800a";

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Video BG */}
      <video autoPlay muted loop playsInline style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}>
        <source src={VIDEO_URL} type="video/mp4" />
      </video>
      <div style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.12)", zIndex: 1 }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, rgba(0,50,150,0.1) 1px, transparent 1px)", backgroundSize: "28px 28px", zIndex: 2, pointerEvents: "none" }} />

      {/* Header */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "5px 12px", borderRadius: 8, cursor: "pointer", letterSpacing: "0.05em" }}>← Back</button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.15em" }}>THEMIS-VERDICT</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(10,26,58,0.4)", letterSpacing: "0.12em" }}>MARKET COURT</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", background: "rgba(0,0,0,0.06)", borderRadius: 6, padding: 2 }}>
            {["EN","ZH"].map(l => (
              <button key={l} onClick={() => setLang(l.toLowerCase())}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: lang === l.toLowerCase() ? "#fff" : "rgba(10,26,58,0.4)", background: lang === l.toLowerCase() ? "#0047cc" : "none", border: "none", padding: "4px 10px", borderRadius: 5, cursor: "pointer", transition: "all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00cc66", animation: "pulse 2s ease infinite" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(10,26,58,0.5)", letterSpacing: "0.1em" }}>LIVE</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 10, paddingTop: 52, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* MODE SELECT */}
        {/* MODE SELECT */}
        {mode === "select" && step === "idle" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
            <div style={{ width: "100%", maxWidth: 800 }}>
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(0,71,204,0.6)", letterSpacing: "0.3em", marginBottom: 12 }}>{lang === "zh" ? "选择功能" : "SELECT FEATURE"}</div>
                <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: "#0a1a3a" }}>{lang === "zh" ? "你想做什么？" : "What would you like to do?"}</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                {/* Card 1: Terminal Visual */}
                <button onClick={() => setMode("single")}
                  style={{ ...glassStrong, padding: "32px 28px", cursor: "pointer", textAlign: "left", transition: "all 0.25s" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-4px)"; el.style.boxShadow = "0 24px 64px rgba(0,40,120,0.16), 0 0 0 1.5px #0047cc33"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = "0 16px 48px rgba(0,40,120,0.12)"; }}
                >
                  <div style={{ fontSize: 32, marginBottom: 16 }}>⚖</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#0047cc", letterSpacing: "0.15em", marginBottom: 6, fontWeight: 600 }}>{lang === "zh" ? "终端可视化分析" : "TERMINAL VISUAL ANALYSIS"}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "#0a1a3a", marginBottom: 12 }}>{lang === "zh" ? "基于终端的可视化使用" : "Terminal-Based Visualization"}</div>
                  <div style={{ fontSize: 13, color: "rgba(10,26,58,0.5)", lineHeight: 1.7, marginBottom: 16 }}>{lang === "zh" ? "使用 Themis 裁决引擎对任意代币进行深度分析，或同时对比 BTC · ETH · BNB · SOL 四大主流资产的市场状态。" : "Run deep judicial analysis on any token, or compare BTC · ETH · BNB · SOL simultaneously across all 7 evidence dimensions."}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                    {(lang === "zh" ? ["单一资产裁决", "多资产对比", "7维度证据", "市场状态分类"] : ["Single Asset", "Multi-Asset", "7 Dimensions", "Regime Detection"]).map(tag => (
                      <span key={tag} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#0047cc", background: "rgba(0,71,204,0.06)", border: "1px solid rgba(0,71,204,0.15)", padding: "3px 8px", borderRadius: 4 }}>{tag}</span>
                    ))}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "#0047cc", letterSpacing: "0.1em" }}>{lang === "zh" ? "进入 →" : "START →"}</div>
                </button>

                {/* Card 2: AI Agent */}
                <button onClick={() => { window.location.href = "/agent"; }}
                  style={{ ...glassStrong, padding: "32px 28px", cursor: "pointer", textAlign: "left", transition: "all 0.25s", position: "relative", overflow: "hidden" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-4px)"; el.style.boxShadow = "0 24px 64px rgba(0,71,204,0.18), 0 0 0 1.5px #0047cc44"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = "0 16px 48px rgba(0,40,120,0.12)"; }}
                >
                  <div style={{ position: "absolute", top: 16, right: 16, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "3px 10px", borderRadius: 20, letterSpacing: "0.1em" }}>BETA</div>
                  <div style={{ fontSize: 32, marginBottom: 16 }}>🤖</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#0047cc", letterSpacing: "0.15em", marginBottom: 6, fontWeight: 600 }}>{lang === "zh" ? "AI 代理交易" : "AI AGENT TRADING"}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "#0a1a3a", marginBottom: 12 }}>{lang === "zh" ? "AI Agent 交易代理" : "AI Agent Execution Layer"}</div>
                  <div style={{ fontSize: 13, color: "rgba(10,26,58,0.65)", lineHeight: 1.7, marginBottom: 16 }}>{lang === "zh" ? "部署 Themis 官方 AI Agent，基于裁决信号自动执行交易策略，实时信号监控，半自动与全自动模式可选。" : "Deploy the official Themis AI Agent to auto-execute strategies based on verdict signals. Real-time signal monitoring with semi-auto and full-auto modes."}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                    {(lang === "zh" ? ["信号监控", "半自动交易", "风控管理", "实时裁决"] : ["Signal Monitor", "Semi-Auto Trade", "Risk Control", "Live Verdict"]).map(tag => (
                      <span key={tag} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#0047cc", background: "rgba(0,71,204,0.06)", border: "1px solid rgba(0,71,204,0.15)", padding: "3px 8px", borderRadius: 4 }}>{tag}</span>
                    ))}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "#0047cc", letterSpacing: "0.1em" }}>{lang === "zh" ? "启动 Agent →" : "LAUNCH AGENT →"}</div>
                </button>

              </div>
            </div>
          </div>
        )}

        {/* SINGLE + MULTI INPUT — unified */}
        {(mode === "single" || mode === "multi") && step === "idle" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
            <div style={{ width: "100%", maxWidth: 520 }}>

              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(0,71,204,0.6)", letterSpacing: "0.3em", marginBottom: 8 }}>{lang === "zh" ? "终端可视化分析" : "TERMINAL VISUAL ANALYSIS"}</div>
                <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: "#0a1a3a" }}>{lang === "zh" ? "选择分析类型" : "Select Analysis Type"}</h2>
              </div>

              {/* Mode toggle */}
              <div style={{ display: "flex", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.7)", borderRadius: 10, padding: 4, marginBottom: 20, gap: 4 }}>
                {[
                  { m: "single" as const, label: lang === "zh" ? "⚖ 单一资产裁决" : "⚖ Single Asset" },
                  { m: "multi" as const, label: lang === "zh" ? "📊 多资产对比" : "📊 Multi-Asset" },
                ].map(({ m, label }) => (
                  <button key={m} onClick={() => setMode(m)}
                    style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: mode === m ? "#fff" : "rgba(10,26,58,0.45)", background: mode === m ? "#0047cc" : "none", border: "none", padding: "10px 16px", borderRadius: 7, cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.05em" }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Single asset input */}
              {mode === "single" && (
                <div style={{ ...glassStrong, padding: "28px 24px" }}>
                  <input
                    value={symbol}
                    onChange={e => setSymbol(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && symbol && runVerdict(symbol)}
                    placeholder={lang === "zh" ? "输入符号: BTC, ETH, PEPE..." : "Enter symbol: BTC, ETH, PEPE..."}
                    style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "#0a1a3a", background: "rgba(0,40,120,0.04)", border: "1.5px solid rgba(0,71,204,0.15)", borderRadius: 10, padding: "12px 16px", outline: "none", marginBottom: 14, transition: "border-color 0.2s", letterSpacing: "0.05em" }}
                    onFocus={e => (e.target.style.borderColor = "#0047cc")}
                    onBlur={e => (e.target.style.borderColor = "rgba(0,71,204,0.15)")}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                    {["BTC", "ETH", "BNB", "SOL", "PEPE", "DOGE"].map(s => (
                      <button key={s} onClick={() => setSymbol(s)}
                        style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: symbol === s ? "#0047cc" : "rgba(10,26,58,0.4)", background: symbol === s ? "rgba(0,71,204,0.08)" : "rgba(0,0,0,0.03)", border: `1px solid ${symbol === s ? "rgba(0,71,204,0.3)" : "rgba(0,0,0,0.08)"}`, padding: "5px 12px", borderRadius: 6, cursor: "pointer", transition: "all 0.15s" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => symbol && runVerdict(symbol)} disabled={!symbol}
                    style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#fff", background: symbol ? "linear-gradient(135deg,#0047cc,#0066ff)" : "rgba(0,0,0,0.1)", border: "none", padding: "14px", borderRadius: 10, cursor: symbol ? "pointer" : "not-allowed", transition: "all 0.2s", boxShadow: symbol ? "0 4px 20px rgba(0,71,204,0.3)" : "none" }}>
                    {lang === "zh" ? "召唤裁决" : "SUMMON VERDICT"}
                  </button>
                </div>
              )}

              {/* Multi asset */}
              {mode === "multi" && (
                <div style={{ ...glassStrong, padding: "24px" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(10,26,58,0.4)", marginBottom: 16, textAlign: "center" }}>{lang === "zh" ? "同步分析以下四大资产" : "Simultaneous analysis across 4 assets"}</p>
                  {["BTC", "ETH", "BNB", "SOL"].map((s, i) => (
                    <div key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#0a1a3a" }}>{s}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(10,26,58,0.3)" }}>{lang === "zh" ? "7维度分析" : "7-dimension analysis"}</span>
                    </div>
                  ))}
                  <button onClick={() => runVerdict("MULTI")}
                    style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#fff", background: "linear-gradient(135deg,#0047cc,#0066ff)", border: "none", padding: "14px", borderRadius: 10, cursor: "pointer", marginTop: 18, boxShadow: "0 4px 20px rgba(0,71,204,0.3)" }}>
                    {lang === "zh" ? "开始对比" : "RUN COMPARISON"}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}


        {/* RUNNING / RESULTS */}
        {step !== "idle" && (
          <div style={{ flex: 1, display: "flex", gap: 0, minHeight: "calc(100vh - 52px)" }}>

            {/* LEFT: Live feed */}
            <div style={{ width: 340, flexShrink: 0, padding: "24px 20px", borderRight: "1px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.3)", backdropFilter: "blur(20px)", overflowY: "auto" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(0,71,204,0.6)", letterSpacing: "0.2em", marginBottom: 16 }}>{lang === "zh" ? "实时分析" : "LIVE ANALYSIS FEED"}</div>

              {/* Logs */}
              {(() => {
                const last = logs[logs.length - 1];
                const doneCount = logs.filter(l => l.status === "done").length;
                const total = logs.length;
                if (!last) return null;
                return (
                  <div style={{ animation: "fadeUp 0.3s ease both" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 8, marginBottom: 8 }}>
                      {last.status === "loading" && <Spinner size={12} />}
                      {last.status === "done" && <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#00cc66", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 8, fontWeight: 700 }}>✓</span></div>}
                      {last.status === "error" && <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#e8193c", flexShrink: 0 }} />}
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: last.status === "error" ? "#e8193c" : "#0a1a3a", flex: 1 }}>{last.text}</span>
                    </div>
                    {total > 1 && (
                      <div style={{ padding: "0 4px", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(10,26,58,0.4)" }}>{lang === "zh" ? "进度" : "PROGRESS"}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(0,71,204,0.6)" }}>{doneCount}/{total}</span>
                        </div>
                        <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${(doneCount/total)*100}%`, background: "#0047cc", borderRadius: 2, transition: "width 0.4s ease" }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Regime mini */}
              {regime && (
                <div style={{ marginTop: 20, padding: "14px", background: "rgba(255,255,255,0.6)", borderRadius: 12, border: `1px solid ${regimeAccent}33`, animation: "fadeUp 0.4s ease both" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 8 }}>{lang === "zh" ? "市场状态" : "REGIME DETECTED"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{regime.icon}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: regimeAccent }}>{regime.label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: regimeAccent, marginLeft: "auto" }}>{regime.confidence_pct}%</span>
                  </div>
                  <AnimatedBar value={regime.confidence_pct} color={regimeAccent} height={5} />
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#e8193c" }}>BEARS</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#00954a" }}>BULLS</span>
                    </div>
                    <div style={{ height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                      <BullBearBar intensity={regime.bull_bear_intensity} />
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence items */}
              {evidence.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(0,71,204,0.6)", letterSpacing: "0.15em", marginBottom: 10 }}>{lang === "zh" ? `证据 — ${Math.min(evidence.length, 7)}/7` : `EVIDENCE — ${Math.min(evidence.length, 7)}/7`}</div>
                  {evidence.slice(-7).map((ev, i) => (
                    <div key={i} style={{ padding: "8px 10px", marginBottom: 6, background: "rgba(255,255,255,0.6)", borderRadius: 8, borderLeft: `3px solid ${SIG_COLOR[ev.signal]}`, animation: "slideInLeft 0.3s ease both" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#0a1a3a" }}>{ev.dim}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: SIG_COLOR[ev.signal] }}>{SIG_LABEL[ev.signal]}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(10,26,58,0.45)", lineHeight: 1.4 }}>{ev.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {step === "running" && !error && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(0,71,204,0.6)" }}>
                  <Spinner size={12} /> Deliberating...
                </div>
              )}

              {error && (
                <div style={{ marginTop: 12, padding: "12px", background: "rgba(232,25,60,0.08)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "#e8193c" }}>✗ {error}</div>
              )}
              <div ref={logsEndRef} />
            </div>

            {/* RIGHT: Verdict result */}
            <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
              {!verdict && step === "running" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
                  <div style={{ ...glass, padding: "40px 48px", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><Spinner size={32} /></div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "rgba(0,71,204,0.7)", marginTop: 20, letterSpacing: "0.1em" }}>COURT IN SESSION</div>
                    <div style={{ fontSize: 13, color: "rgba(10,26,58,0.4)", marginTop: 8 }}>Examining evidence across 7 dimensions...</div>
                  </div>
                </div>
              )}

              {verdict && (
                <div style={{ animation: "fadeUp 0.5s ease both" }}>
                  {/* Headline */}
                  {verdict.headline && (
                    <div style={{ padding: "12px 16px", background: "rgba(255,200,0,0.12)", border: "1px solid rgba(255,200,0,0.3)", borderRadius: 10, marginBottom: 16, display: "flex", gap: 10, backdropFilter: "blur(8px)" }}>
                      <span style={{ fontSize: 16 }}>⚡</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#a06000" }}>{verdict.headline}</span>
                    </div>
                  )}

                  {/* MAIN VERDICT */}
                  <div style={{ ...glassStrong, padding: "28px", marginBottom: 16, borderTop: `3px solid ${conclusionColor}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.2em" }}>{lang === "zh" ? "⚖ 最终裁决" : "⚖ FINAL VERDICT"}</span>
                      {verdict.risk_level && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: verdict.risk_level === "HIGH" ? "#e8193c" : verdict.risk_level === "LOW" ? "#00954a" : "#d4800a", background: verdict.risk_level === "HIGH" ? "rgba(232,25,60,0.08)" : verdict.risk_level === "LOW" ? "rgba(0,149,74,0.08)" : "rgba(212,128,10,0.08)", padding: "4px 10px", borderRadius: 6 }}>
                          {verdict.risk_level === "HIGH" ? "🔴" : verdict.risk_level === "LOW" ? "🟢" : "🟡"} {verdict.risk_level} RISK
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                      <span style={{ fontSize: 20 }}>{conclusionIcon}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900, color: conclusionColor, letterSpacing: "0.05em", minWidth: 110 }}>{conclusionLabel}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(10,26,58,0.35)", letterSpacing: "0.1em" }}>{lang === "zh" ? "置信度" : "CONFIDENCE"}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: conclusionColor }}>{verdict.confidence}%</span>
                        </div>
                        <AnimatedBar value={verdict.confidence || 0} color={conclusionColor} height={5} />
                      </div>
                    </div>

                    {verdict.market_context && (
                      <div style={{ padding: "12px 14px", background: "rgba(0,40,120,0.04)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "rgba(10,26,58,0.6)", lineHeight: 1.65 }}>{verdict.market_context}</div>
                    )}

                    {verdict.verdict_reasons && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 8 }}>{lang === "zh" ? "裁决理由" : "RATIONALE"}</div>
                        {verdict.verdict_reasons.map((r, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13, color: "rgba(10,26,58,0.7)", animation: `fadeUp 0.3s ease ${i * 0.1}s both` }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: conclusionColor, flexShrink: 0 }}>{i + 1}.</span>{r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Strategy */}
                  <div style={{ ...glass, padding: "20px 24px", marginBottom: 16 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.2em", marginBottom: 14 }}>{lang === "zh" ? "策略规格" : "STRATEGY SPECIFICATION"}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      {[
                        { label: (lang === "zh" ? "入场" : "ENTRY"), value: verdict.entry_price, color: "#0047cc", bg: "rgba(0,71,204,0.06)" },
                        { label: (lang === "zh" ? "目标1" : "TARGET 1"), value: verdict.target1, color: conclusionColor, bg: `${conclusionColor}10` },
                        { label: (lang === "zh" ? "目标2" : "TARGET 2"), value: verdict.target2, color: conclusionColor, bg: `${conclusionColor}08` },
                        { label: (lang === "zh" ? "止损" : "STOP LOSS"), value: verdict.stoploss, color: "#e8193c", bg: "rgba(232,25,60,0.06)" },
                        { label: (lang === "zh" ? "有效期" : "VALID UNTIL"), value: verdict.valid_until?.replace("T", " ").split(".")[0], color: "rgba(10,26,58,0.5)", bg: "rgba(0,0,0,0.03)" },
                        { label: (lang === "zh" ? "风险" : "RISK"), value: verdict.risk_level, color: verdict.risk_level === "HIGH" ? "#e8193c" : verdict.risk_level === "LOW" ? "#00954a" : "#d4800a", bg: verdict.risk_level === "HIGH" ? "rgba(232,25,60,0.06)" : "rgba(0,149,74,0.06)" },
                      ].map(({ label, value, color, bg }, i) => (
                        <div key={i} style={{ background: bg, borderRadius: 10, padding: "11px 13px", animation: `fadeUp 0.3s ease ${i * 0.06}s both` }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color }}>{value || "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price levels + Invalidation */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                    {verdict.price_levels && (
                      <div style={{ ...glass, padding: "18px 20px" }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 12 }}>{lang === "zh" ? "关键价位" : "KEY PRICE LEVELS"}</div>
                        {[
                          { key: "key_resistance", label: (lang === "zh" ? "关键阻力" : "Resistance"), icon: "▲", color: "#e8193c" },
                          { key: "stoploss", label: (lang === "zh" ? "止损位" : "Stop Loss"), icon: "✕", color: "#e8193c" },
                          { key: "current", label: (lang === "zh" ? "当前价" : "Current"), icon: "●", color: "#0047cc" },
                          { key: "target1", label: (lang === "zh" ? "目标1" : "Target 1"), icon: "▼", color: "#00954a" },
                          { key: "target2", label: (lang === "zh" ? "目标2" : "Target 2"), icon: "▼", color: "#00954a" },
                          { key: "key_support", label: (lang === "zh" ? "关键支撑" : "Support"), icon: "═", color: "#00954a" },
                        ].map(({ key, label, icon, color }, i) => {
                          const val = verdict.price_levels?.[key] || "—";
                          const cur = parseFloat((verdict.entry_price || "0").replace(/[$,]/g, ""));
                          const num = parseFloat(val.replace(/[$,]/g, "") || "0");
                          const pct = cur && num && key !== "current" ? ((num - cur) / cur * 100).toFixed(1) : null;
                          return (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < 5 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color, width: 16, textAlign: "center" }}>{icon}</span>
                              <span style={{ fontSize: 12, color: "rgba(10,26,58,0.5)", flex: 1 }}>{label}</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color }}>{val}</span>
                              {pct ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(10,26,58,0.3)" }}>{`${Number(pct) > 0 ? "+" : ""}${pct}%`}</span> : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ ...glass, padding: "18px 20px" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 12 }}>{lang === "zh" ? "失效条件" : "INVALIDATION"}</div>
                      {verdict.invalidation?.map((c, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", fontSize: 12, color: "rgba(10,26,58,0.6)", borderBottom: i < (verdict.invalidation?.length || 0) - 1 ? "1px solid rgba(0,0,0,0.04)" : "none", animation: `fadeUp 0.3s ease ${i * 0.07}s both` }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#e8193c", background: "rgba(232,25,60,0.08)", width: 18, height: 18, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                          {c}
                        </div>
                      ))}
                      {verdict.appeal_points && (
                        <>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.12em", margin: "12px 0 8px" }}>{lang === "zh" ? "24H上诉机制" : "APPEAL 24H"}</div>
                          {verdict.appeal_points.map((p, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: "rgba(10,26,58,0.4)", padding: "3px 0" }}>
                              <span style={{ color: "#0047cc" }}>→</span>{p}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Claim */}
                  <div style={{ ...glass, padding: "18px 20px", marginBottom: 16 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 10 }}>{lang === "zh" ? "庭一 — 起诉" : "COURT I — CLAIM"}</div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#0a1a3a", marginBottom: 8 }}>{verdict.claim}</p>
                    <p style={{ fontSize: 12, color: "rgba(10,26,58,0.5)", lineHeight: 1.6, marginBottom: 10 }}>{verdict.claim_basis}</p>
                    {verdict.falsification?.map((f, i) => (
                      <div key={i} style={{ fontSize: 12, color: "rgba(10,26,58,0.4)", padding: "3px 0", display: "flex", gap: 6 }}><span style={{ color: "rgba(10,26,58,0.2)" }}>•</span>{f}</div>
                    ))}
                  </div>

                  {/* Macro warning */}
                  {verdict.macro_warning && verdict.macro_warning.toLowerCase() !== "null" && (
                    <div style={{ padding: "14px 16px", background: "rgba(255,200,0,0.1)", border: "1px solid rgba(255,200,0,0.3)", borderRadius: 10, marginBottom: 16, display: "flex", gap: 12, backdropFilter: "blur(8px)" }}>
                      <span style={{ fontSize: 18 }}>⚠</span>
                      <div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "#a06000", letterSpacing: "0.1em", marginBottom: 4 }}>{lang === "zh" ? "宏观事件警告" : "MACRO EVENT WARNING"}</div>
                        <div style={{ fontSize: 12, color: "#a06000" }}>{verdict.macro_warning}</div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={reset} style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#fff", background: "linear-gradient(135deg,#0047cc,#0066ff)", border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,71,204,0.3)" }}>NEW VERDICT</button>
                    <button onClick={() => { setStep("idle"); setLogs([]); setEvidence([]); setRegime(null); setVerdict(null); }} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(10,26,58,0.5)", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.5)", padding: "12px 20px", borderRadius: 8, cursor: "pointer", backdropFilter: "blur(8px)" }}>RUN AGAIN</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BullBearBar({ intensity }: { intensity: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(intensity), 300); return () => clearTimeout(t); }, [intensity]);
  return (
    <div style={{ height: "100%", width: `${w}%`, background: "linear-gradient(90deg,#e8193c,#ff4466)", borderRadius: 3, transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
  );
}
