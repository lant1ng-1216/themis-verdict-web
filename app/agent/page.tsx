"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "https://api.themisverdict.xyz";

interface Message {
  id: string;
  role: "user" | "agent";
  type: "text" | "verdict" | "execute_success" | "error" | "positions";
  isPush?: boolean;
  content: string;
  data?: any;
  thinkingLog?: string[];  // 完成后的推理步骤，用于常驻气泡
}

interface AgentStatus {
  status: string;
  balance_usdt: number;
  open_positions: number;
  mode: string;
  btc_price?: number;
  eth_price?: number;
  fear_greed?: number;
}

const QUICK_PROMPTS = [
  { label: "分析 BTC ↗", msg: "分析一下 BTC 现在的市场情况" },
  { label: "分析 ETH ↗", msg: "分析一下 ETH 现在的市场情况" },
  { label: "BTC / ETH / SOL 对比 ↗", msg: "对比分析 BTC、ETH、SOL 当前信号" },
  { label: "查看持仓 ↗", msg: "查看我当前的持仓" },
  { label: "账户余额 ↗", msg: "我的账户余额是多少" },
  { label: "Agent 状态 ↗", msg: "Agent 当前运行状态" },
];

const NAV_ITEMS = [
  { group: "WORKSPACE", items: [
    { id: "chat", icon: "ti-message", zh: "对话", en: "Chat" },
    { id: "positions", icon: "ti-briefcase", zh: "持仓管理", en: "Positions" },
    { id: "history", icon: "ti-history", zh: "交易历史", en: "Trade History" },
    { id: "evolution", icon: "ti-brain", zh: "进化报告", en: "Evolution" },
  ]},
  { group: "CONFIGURATION", items: [
    { id: "symbols", icon: "ti-adjustments", zh: "监控组合", en: "Watchlist" },
    { id: "risk", icon: "ti-shield", zh: "风控参数", en: "Risk Control" },
    { id: "exchange", icon: "ti-plug", zh: "交易所绑定", en: "Exchange" },
    { id: "skill", icon: "ti-puzzle", zh: "Skill 配置", en: "Skill Config" },
    { id: "collab", icon: "ti-network", zh: "协作节点", en: "Collab Node" },
  ]},
];


const REGIME_LABELS: Record<string, { zh: string; en: string }> = {
  PANIC_SELLOFF: { zh: "恐慌抛售", en: "Panic Selloff" },
  BEAR_TREND:    { zh: "熊市趋势", en: "Bear Trend" },
  ACCUMULATION:  { zh: "筹码积累", en: "Accumulation" },
  RECOVERY:      { zh: "修复反弹", en: "Recovery" },
  BULL_TREND:    { zh: "牛市趋势", en: "Bull Trend" },
};
const regimeLabel = (regime: string, lang: string) =>
  REGIME_LABELS[regime] ? REGIME_LABELS[regime][lang as "zh" | "en"] || regime : regime;

function getTerminalSteps(command: string): string[] {
  const lower = command.toLowerCase();
  const isVerdict = /btc|eth|bnb|sol|ada|xrp|doge|avax|link|dot|pepe|shib|uni|atom|matic|分析|裁决|行情|信号|看看/.test(lower);
  const isMulti = (lower.match(/[a-z]{2,6}/g) || []).length >= 2 && isVerdict;
  const isPosition = /持仓|仓位|position/.test(lower);
  const isBalance = /余额|balance|资金/.test(lower);
  const isStatus = /状态|status/.test(lower);

  if (isMulti) return [
    "› fetching CMC multi-asset data...",
    "› running three-court verdict × " + ((lower.match(/\b[a-z]{2,6}\b/g) || []).length) + " symbols...",
    "› calculating SQS signal quality...",
    "› generating comparative analysis...",
  ];
  if (isVerdict) {
    const sym = (lower.match(/\b(btc|eth|bnb|sol|ada|xrp|doge|avax|link|dot|pepe|shib|uni|atom|matic)\b/)?.[0] || "token").toUpperCase();
    return [
      `› fetching CMC market data for ${sym}...`,
      "› loading global metrics & fear/greed index...",
      "› running three-court verdict process...",
      "› calculating SQS · kelly position sizing...",
      "› generating agent insight...",
    ];
  }
  if (isPosition) return ["› querying open positions from redis...", "› fetching live prices from binance..."];
  if (isBalance) return ["› querying binance demo account balance..."];
  if (isStatus) return ["› pinging redis · binance · deepseek api..."];
  return ["› processing request...", "› generating response..."];
}

const THINKING_I18N = {
  zh: { done: "已完成", running: "运行中", steps: "步" },
  en: { done: "Done", running: "Running", steps: "steps" },
};

function ThinkingBubble({ liveLog, done, lang = "zh" }: { liveLog: string[]; done: boolean; lang?: string }) {
  const t = THINKING_I18N[lang as keyof typeof THINKING_I18N] || THINKING_I18N.zh;
  const FRAMES = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  const [frame, setFrame] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setFrame(f => (f + 1) % FRAMES.length), 80);
    return () => clearInterval(t);
  }, [done]);

  const steps = liveLog.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: done ? 4 : 0 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.12em", marginBottom: 5 }}>THEMIS AGENT</div>
      <div style={{ background: "#0d1117", borderRadius: done ? "3px 12px 12px 12px" : "3px 12px 12px 12px", minWidth: 260, maxWidth: 460, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        {/* 顶部状态栏 — 始终可见，点击折叠展开 */}
        <button
          onClick={() => steps > 0 && setExpanded(e => !e)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", cursor: steps > 0 ? "pointer" : "default", textAlign: "left" }}
        >
          {done ? (
            <span style={{ fontSize: 11, color: "#4ade80", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>✓</span>
          ) : (
            <span style={{ fontSize: 13, color: "#4ade80", fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{FRAMES[frame]}</span>
          )}
          <span style={{ fontSize: 10, color: "#4ade80", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, letterSpacing: "0.06em" }}>themis-agent</span>
          <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "JetBrains Mono, monospace", flex: 1 }}>
            {done ? `${t.done} · ${steps} ${t.steps}` : `${t.running} · ${steps} ${t.steps}`}
          </span>
          {steps > 0 && (
            <span style={{ fontSize: 9, color: "#4b5563", fontFamily: "JetBrains Mono, monospace", transition: "transform 0.2s", display: "inline-block", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
          )}
        </button>

        {/* 步骤列表 — 折叠/展开 */}
        {expanded && steps > 0 && (
          <div style={{ padding: "0 14px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {liveLog.map((line, i) => {
              const stepDone = done || i < liveLog.length - 1;
              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 7, animation: "termLine 0.15s ease forwards" }}>
                  <span style={{ fontSize: 10, color: stepDone ? "#4ade80" : "#6b7280", fontFamily: "JetBrains Mono, monospace", flexShrink: 0, marginTop: 1, transition: "color 0.3s" }}>
                    {stepDone ? "✓" : FRAMES[frame]}
                  </span>
                  <span style={{ fontSize: 10, color: stepDone ? "#9ca3af" : "#d1d5db", fontFamily: "JetBrains Mono, monospace", transition: "color 0.3s", wordBreak: "break-word", lineHeight: 1.5 }}>{line}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// 逐字渲染 markdown — 截断到当前字符数后交给 ReactMarkdown 解析
function MarkdownTypewriter({ text, speed = 12, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayed("");
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);

  const mdComponents = {
    p: ({ children }: any) => <p style={{ margin: "0 0 8px", fontSize: 13, color: "#2a3350", lineHeight: 1.75 }}>{children}</p>,
    h2: ({ children }: any) => <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0a1a3a", margin: "14px 0 5px" }}>{children}</h2>,
    h3: ({ children }: any) => <h3 style={{ fontSize: 13, fontWeight: 700, color: "#2a3350", margin: "10px 0 4px" }}>{children}</h3>,
    strong: ({ children }: any) => <strong style={{ fontWeight: 700, color: "#0a1a3a" }}>{children}</strong>,
    hr: () => <hr style={{ border: "none", borderTop: "1px solid #e8ecf4", margin: "12px 0" }} />,
    ul: ({ children }: any) => <ul style={{ margin: "4px 0 8px", paddingLeft: 18 }}>{children}</ul>,
    ol: ({ children }: any) => <ol style={{ margin: "4px 0 8px", paddingLeft: 18 }}>{children}</ol>,
    li: ({ children }: any) => <li style={{ fontSize: 13, color: "#2a3350", lineHeight: 1.7, marginBottom: 3 }}>{children}</li>,
    code: ({ children }: any) => <code style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, background: "#f0f3fa", padding: "1px 5px", borderRadius: 4, color: "#0047cc" }}>{children}</code>,
    table: ({ children }: any) => (
      <div style={{ overflowX: "auto", margin: "10px 0" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead style={{ background: "#f4f6fc" }}>{children}</thead>,
    th: ({ children }: any) => <th style={{ padding: "6px 12px", border: "1px solid #e2e6ef", fontWeight: 700, color: "#0a1a3a", textAlign: "left", whiteSpace: "nowrap" }}>{children}</th>,
    td: ({ children }: any) => <td style={{ padding: "5px 12px", border: "1px solid #e2e6ef", color: "#2a3350", verticalAlign: "top" }}>{children}</td>,
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {displayed}
    </ReactMarkdown>
  );
}

function TypewriterText({ text, delay = 0, speed = 18, style: s }: { text: string; delay?: number; speed?: number; style?: React.CSSProperties }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayed("");
    const t = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(iv);
      }, speed);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay, speed]);
  return <span style={s}>{displayed}<span style={{ opacity: displayed.length < text.length ? 1 : 0, transition: "opacity 0.2s" }}>▊</span></span>;
}

function CountUp({ to, duration = 1000, delay = 0 }: { to: number; duration?: number; delay?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = Date.now();
      const iv = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setVal(Math.round(eased * to));
        if (progress >= 1) clearInterval(iv);
      }, 16);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [to, duration, delay]);
  return <>{val}</>;
}

const parsePrice = (val: any) => {
  const s = String(val).replace(/,/g, "");
  if (s.includes("-") && !s.startsWith("-")) {
    const parts = s.split("-");
    return ((parseFloat(parts[0]) + parseFloat(parts[1])) / 2).toLocaleString();
  }
  const n = parseFloat(s);
  return isNaN(n) ? val : n.toLocaleString();
};

const signalColor = (s: string) => s === "bullish" ? "#059669" : s === "bearish" ? "#d63b3b" : "#8a95b0";

function ConfidenceGauge({ value, color }: { value: number; color: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      <circle cx={55} cy={55} r={r} fill="none" stroke="#f0f2f8" strokeWidth={8} />
      <circle cx={55} cy={55} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x={55} y={50} textAnchor="middle" fontSize={22} fontWeight={700} fill={color} fontFamily="JetBrains Mono, monospace">{value}</text>
      <text x={55} y={66} textAnchor="middle" fontSize={9} fill="#b0b8cc" fontFamily="JetBrains Mono, monospace">CONFIDENCE</text>
    </svg>
  );
}

function VerdictDetailPanel({ data, onClose, onExecute, lang = "zh" }: { data: any; onClose: () => void; onExecute: (d: any) => void; lang?: string }) {
  const v = data.verdict;
  const decision = data.decision;
  const sqs = data.sqs;
  const comment = data.agent_comment;
  const ask = data.ask_execute && decision?.action !== "observe";
  const isBull = v.conclusion === "bullish";
  const isBear = v.conclusion === "bearish";
  const conclusionColor = isBear ? "#d63b3b" : isBull ? "#059669" : "#8a95b0";
  const directionLabel = lang === "zh"
    ? (isBull ? "做多" : isBear ? "做空" : "观望")
    : (isBull ? "Long" : isBear ? "Short" : "Hold");
  const directionIcon = isBull ? "↑" : isBear ? "↓" : "—";
  const [visible, setVisible] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 10); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }} onClick={handleClose}>
      {/* 蒙层 */}
      <div style={{ flex: 1, background: "rgba(10,26,58,0.18)", transition: "opacity 0.3s", opacity: visible ? 1 : 0 }} />
      {/* 面板 */}
      <div onClick={e => e.stopPropagation()}
        style={{ width: 480, background: "#fff", borderLeft: "1px solid #e8ecf4", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column",
          transform: visible ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "-8px 0 40px rgba(0,40,120,0.10)" }}>

        {/* 面板头部 */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0f2f8", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#0a1a3a", fontFamily: "JetBrains Mono, monospace" }}>{v.symbol}</span>
            <span style={{ fontSize: 10, color: "#8a95b0", background: "#f4f6fc", padding: "3px 10px", borderRadius: 20, fontFamily: "JetBrains Mono, monospace" }}>{regimeLabel(v.regime, lang)}</span>
          </div>
          <button onClick={handleClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e6ef", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#8a95b0" }}>✕</button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* 仪表盘 + 结论 */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <ConfidenceGauge value={v.confidence} color={conclusionColor} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: conclusionColor, fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{directionIcon} {directionLabel}</div>
              {sqs && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 10, color: "#b0b8cc", fontFamily: "JetBrains Mono, monospace" }}>SQS SIGNAL QUALITY</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "#f0f2f8", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${sqs.sqs}%`, background: "linear-gradient(90deg, #0047cc88, #0047cc)", borderRadius: 3, transition: "width 1s ease" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0047cc", fontFamily: "JetBrains Mono, monospace" }}>{sqs.sqs} · {sqs.signal_grade}</span>
                  </div>
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 10, color: "#b0b8cc", fontFamily: "JetBrains Mono, monospace" }}>
                {lang === "zh" ? "有效" : "Valid"} {v.valid_hours || 48}H · {new Date(v.timestamp).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>

          {/* 价格四象限 */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.12em", marginBottom: 10, fontFamily: "JetBrains Mono, monospace" }}>PRICE LEVELS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, background: "#f0f2f8", borderRadius: 10, overflow: "hidden" }}>
              {[
                { labelZh: "入场价", labelEn: "Entry", value: v.entry_price ? `$${parsePrice(v.entry_price)}` : "—", color: "#0a1a3a", bg: "#fafbff" },
                { labelZh: "止损位", labelEn: "Stop Loss", value: v.stoploss ? `$${parsePrice(v.stoploss)}` : "—", color: "#d63b3b", bg: "#fff8f8" },
                { labelZh: "目标价 ①", labelEn: "Target 1", value: v.target1 ? `$${parsePrice(v.target1)}` : "—", color: "#059669", bg: "#f8fffc" },
                { labelZh: "目标价 ②", labelEn: "Target 2", value: v.target2 ? `$${parsePrice(v.target2)}` : "—", color: "#059669", bg: "#f8fffc" },
              ].map(({ labelZh, labelEn, value, color, bg }) => (
                <div key={labelZh} style={{ padding: "12px 14px", background: bg }}>
                  <div style={{ fontSize: 9, color: "#b0b8cc", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em", marginBottom: 4 }}>{lang === "zh" ? labelZh : labelEn}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence 信号强度条 */}
          {v.evidence_summary?.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.12em", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>EVIDENCE · {v.evidence_summary.length} DIMENSIONS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {v.evidence_summary.map((e: any, i: number) => {
                  const sc = signalColor(e.signal);
                  const barWidth = e.signal === "bullish" ? "75%" : e.signal === "bearish" ? "75%" : "40%";
                  const weightOpacity = e.weight === "HIGH" ? 1 : e.weight === "MEDIUM" ? 0.65 : 0.35;
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, opacity: weightOpacity, transition: `opacity 0.3s ${i * 60}ms` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#2a3350", fontFamily: "JetBrains Mono, monospace" }}>{e.dim}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 9, color: "#b0b8cc", fontFamily: "JetBrains Mono, monospace" }}>{e.weight}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: sc, background: sc + "18", padding: "1px 6px", borderRadius: 3, fontFamily: "JetBrains Mono, monospace" }}>{e.signal?.toUpperCase()}</span>
                        </div>
                      </div>
                      <div style={{ height: 3, background: "#f0f2f8", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: barWidth, background: sc, borderRadius: 2, transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms` }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#8a95b0", lineHeight: 1.5 }}>{e.note}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 裁决摘要 */}
          {v.rationale && (
            <div style={{ padding: "14px 16px", background: "#f8f9ff", borderRadius: 10, borderLeft: "3px solid #0047cc" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#0047cc", letterSpacing: "0.12em", marginBottom: 8, fontFamily: "JetBrains Mono, monospace" }}>VERDICT RATIONALE</div>
              <div style={{ fontSize: 12, color: "#2a3350", lineHeight: 1.8 }}>{v.rationale}</div>
            </div>
          )}

          {/* 失效条件 */}
          {v.invalidation_conditions?.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#d63b3b", letterSpacing: "0.12em", marginBottom: 10, fontFamily: "JetBrains Mono, monospace" }}>⚠ INVALIDATION CONDITIONS</div>
              {v.invalidation_conditions.slice(0, 4).map((c: string, i: number) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                  <span style={{ width: 18, height: 18, borderRadius: 4, background: "#fff0f0", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#d63b3b", fontWeight: 700, flexShrink: 0, fontFamily: "JetBrains Mono, monospace" }}>{i + 1}</span>
                  <span style={{ fontSize: 12, color: "#5a6480", lineHeight: 1.6 }}>{c}</span>
                </div>
              ))}
            </div>
          )}

          {/* Agent 建议 */}
          {comment && (
            <div style={{ padding: "14px 16px", background: "#fafbff", borderRadius: 10, border: "1px solid #e8ecf4" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.12em", marginBottom: 8, fontFamily: "JetBrains Mono, monospace" }}>AGENT INSIGHT</div>
              <div style={{ fontSize: 12, color: "#3d4f7c", lineHeight: 1.8, fontStyle: "italic" }}>{comment}</div>
            </div>
          )}

          {/* 执行按钮 */}
          {ask && (
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button onClick={() => { onExecute(data); handleClose(); }}
                style={{ flex: 1, padding: "12px", borderRadius: 10, background: "#0047cc", border: "none", color: "#fff", fontSize: 12, fontFamily: "JetBrains Mono, monospace", cursor: "pointer", fontWeight: 700, letterSpacing: "0.04em" }}>
                ✓ {lang === "zh" ? "确认开仓" : "Confirm Trade"} {decision?.size_pct ? `· ${Math.round(decision.size_pct * 100)}% ${lang === "zh" ? "仓位" : "size"}` : ""}
              </button>
              <button onClick={handleClose}
                style={{ padding: "12px 20px", borderRadius: 10, background: "#fff", border: "1px solid #e2e6ef", color: "#8a95b0", fontSize: 12, fontFamily: "JetBrains Mono, monospace", cursor: "pointer" }}>
                {lang === "zh" ? "跳过" : "Skip"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerdictBubble({ data, onExecute, lang = "zh" }: { data: any; onExecute: (d: any) => void; lang?: string }) {
  const v = data.verdict;
  const decision = data.decision;
  const sqs = data.sqs;
  const comment = data.agent_comment;
  const ask = data.ask_execute && decision?.action !== "observe";
  const [showPanel, setShowPanel] = useState(false);

  const isBull = v.conclusion === "bullish";
  const isBear = v.conclusion === "bearish";
  const conclusionColor = isBear ? "#d63b3b" : isBull ? "#059669" : "#8a95b0";
  const conclusionBg = isBear ? "rgba(214,59,59,0.08)" : isBull ? "rgba(5,150,105,0.08)" : "rgba(138,149,176,0.08)";
  const directionLabel = lang === "zh"
    ? (isBull ? "做多" : isBear ? "做空" : "观望")
    : (isBull ? "Long" : isBear ? "Short" : "Hold");
  const directionIcon = isBull ? "↑" : isBear ? "↓" : "—";

  // 三段动画：0 = 无, 1 = 段一可见, 2 = 段二可见, 3 = 段三可见
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 60);
    const t2 = setTimeout(() => setStage(2), 480);
    const t3 = setTimeout(() => setStage(3), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const fadeIn = (s: number): React.CSSProperties => ({
    opacity: stage >= s ? 1 : 0,
    transform: stage >= s ? "translateY(0)" : "translateY(10px)",
    transition: "opacity 0.45s ease, transform 0.45s ease",
  });

  return (
    <>
      {showPanel && <VerdictDetailPanel data={data} onClose={() => setShowPanel(false)} onExecute={onExecute} lang={lang} />}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.12em", marginBottom: 5 }}>THEMIS AGENT</div>
        <div style={{ background: "#fff", border: "1px solid #e8ecf4", borderRadius: "3px 14px 14px 14px", padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,40,120,0.04)", maxWidth: 500, width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* 段一：深色头部 + 置信度条 */}
          <div style={fadeIn(1)}>
            {/* 深色头部 */}
            <div style={{ background: "#0a1a3a", borderRadius: "0px 10px 0 0", margin: "-16px -18px 12px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: conclusionColor, display: "inline-block", boxShadow: `0 0 6px ${conclusionColor}` }} className="pulse-dot" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "JetBrains Mono, monospace" }}>{v.symbol}</span>
                <span style={{ fontSize: 9, color: "#4a5568", fontFamily: "JetBrains Mono, monospace", background: "#1a2744", padding: "1px 7px", borderRadius: 3 }}>{regimeLabel(v.regime, lang)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {sqs && <span style={{ fontSize: 9, color: "#60a5fa", fontFamily: "JetBrains Mono, monospace" }}>SQS {sqs.sqs}</span>}
                <span style={{ fontSize: 10, fontWeight: 700, color: conclusionColor, fontFamily: "JetBrains Mono, monospace", background: conclusionColor + "22", padding: "2px 8px", borderRadius: 4 }}>
                  {directionIcon} {directionLabel}
                </span>
              </div>
            </div>
            {/* 置信度 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ fontSize: 9, color: "#b0b8cc", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em" }}>CONFIDENCE</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: conclusionColor, fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
                <CountUp to={v.confidence} duration={900} delay={200} />%
              </span>
            </div>
            <div style={{ height: 4, background: "#f0f2f8", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: stage >= 1 ? `${v.confidence}%` : "0%", background: `linear-gradient(90deg, ${conclusionColor}66, ${conclusionColor})`, borderRadius: 2, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1) 0.15s" }} />
            </div>
          </div>

          {/* 段二：价格四象限 */}
          <div style={fadeIn(2)}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#f0f2f8", borderRadius: 8, overflow: "hidden" }}>
              {[
                { labelZh: "入场价", labelEn: "Entry", value: v.entry_price ? `$${parsePrice(v.entry_price)}` : "—", color: "#0a1a3a", bg: "#fafbff" },
                { labelZh: "止损位", labelEn: "Stop Loss", value: v.stoploss ? `$${parsePrice(v.stoploss)}` : "—", color: "#d63b3b", bg: "#fff8f8" },
                { labelZh: "目标价 ①", labelEn: "Target 1", value: v.target1 ? `$${parsePrice(v.target1)}` : "—", color: "#059669", bg: "#f8fffc" },
                { labelZh: "目标价 ②", labelEn: "Target 2", value: v.target2 ? `$${parsePrice(v.target2)}` : "—", color: "#059669", bg: "#f8fffc" },
              ].map(({ labelZh, labelEn, value, color, bg }) => (
                <div key={labelZh} style={{ padding: "10px 12px", background: bg }}>
                  <div style={{ fontSize: 9, color: "#b0b8cc", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em", marginBottom: 3 }}>{lang === "zh" ? labelZh : labelEn}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 段三：摘要 + Agent建议 + 操作按钮 */}
          <div style={{ ...fadeIn(3), display: "flex", flexDirection: "column", gap: 10 }}>
            {v.rationale && (
              <div style={{ fontSize: 12, color: "#2a3350", lineHeight: 1.75, paddingBottom: 10, borderBottom: "1px solid #f0f2f8" }}>
                <TypewriterText text={v.rationale} delay={100} speed={14} />
              </div>
            )}
            {comment && (
              <div style={{ fontSize: 11, color: "#3d4f7c", lineHeight: 1.75, fontStyle: "italic" }}>
                <TypewriterText text={comment} delay={v.rationale ? v.rationale.length * 14 + 200 : 100} speed={12} />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 2 }}>
              <button onClick={() => setShowPanel(true)}
                style={{ fontSize: 10, color: "#0047cc", background: "#eef2ff", border: "1px solid #c7d3f8", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>
                {lang === "zh" ? "查看完整报告 →" : "Full Report →"}
              </button>
              {ask && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => onExecute(data)}
                    style={{ padding: "6px 16px", borderRadius: 7, background: "#0047cc", border: "none", color: "#fff", fontSize: 11, fontFamily: "JetBrains Mono, monospace", cursor: "pointer", fontWeight: 700 }}>
                    ✓ {lang === "zh" ? "确认开仓" : "Confirm Trade"}
                  </button>
                  <button style={{ padding: "6px 14px", borderRadius: 7, background: "#fff", border: "1px solid #e2e6ef", color: "#8a95b0", fontSize: 11, fontFamily: "JetBrains Mono, monospace", cursor: "pointer" }}>
                    {lang === "zh" ? "跳过" : "Skip"}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ── 共享面板样式 ──────────────────────────────────
const P = {
  page: { flex: 1, overflowY: "auto" as const, padding: "32px 40px", background: "#fafbff" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  title: { fontSize: 16, fontWeight: 700, color: "#0a1a3a", fontFamily: "JetBrains Mono, monospace" },
  subtitle: { fontSize: 10, color: "#8a95b0", fontFamily: "JetBrains Mono, monospace", marginTop: 3 },
  card: { background: "#fff", border: "1px solid #e8ecf4", borderRadius: 12, overflow: "hidden" },
  cardHeader: { padding: "12px 18px", borderBottom: "1px solid #f0f2f8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardLabel: { fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.12em", fontFamily: "JetBrains Mono, monospace" },
  row: { padding: "13px 18px", borderBottom: "1px solid #f4f6fc", display: "flex", alignItems: "center", gap: 16 },
  emptyState: { padding: "48px 24px", textAlign: "center" as const, color: "#b0b8cc", fontSize: 12, fontFamily: "JetBrains Mono, monospace" },
  btn: { padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 700 },
  tag: (color: string) => ({ fontSize: 9, fontWeight: 700, color, background: color + "18", padding: "2px 8px", borderRadius: 4, fontFamily: "JetBrains Mono, monospace" }),
  input: { padding: "8px 12px", border: "1px solid #e2e6ef", borderRadius: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "#0a1a3a", outline: "none", background: "#fff", width: "100%" },
};

function PanelLoading() {
  return <div style={{ padding: 48, textAlign: "center", color: "#b0b8cc", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>loading...</div>;
}

// ── 持仓管理 ─────────────────────────────────────
const POSITION_STYLES = `
@keyframes pnlFlash {
  0%   { opacity: 0.3; transform: translateY(-3px); }
  100% { opacity: 1;   transform: translateY(0); }
}
@keyframes cardSlideIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes chatCardIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}
@keyframes liveDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.7); }
}
@keyframes barFill {
  from { width: 0; }
}
@keyframes termScan {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
`;

function AnimatedNumber({ value, decimals = 2, prefix = "" }: { value: number; decimals?: number; prefix?: string }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (Math.abs(value - prev.current) < 0.001) return;
    setFlash(true);
    const start = prev.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(start + (end - start) * ease);
      if (t < 1) requestAnimationFrame(tick);
      else { setDisplay(end); prev.current = end; }
    };
    requestAnimationFrame(tick);
    setTimeout(() => setFlash(false), 400);
  }, [value]);

  const str = display.toFixed(decimals);
  return (
    <span style={{ display: "inline-block", animation: flash ? "pnlFlash 0.3s ease" : "none" }}>
      {prefix}{str}
    </span>
  );
}

// ── 聊天内嵌持仓卡片 ──────────────────────────────
const SVG_W = 520, SVG_H = 60, SVG_PAD = 4;

function buildSparkPath(prices: number[]) {
  if (prices.length < 2) return { line: "", fill: "", lx: SVG_W - SVG_PAD, ly: SVG_H / 2 };
  const min = Math.min(...prices) - 2;
  const max = Math.max(...prices) + 2;
  const range = max - min || 1;
  const W = SVG_W - SVG_PAD;
  const pts = prices.map((p, i) => [
    (i / (prices.length - 1)) * W,
    SVG_H - ((p - min) / range) * (SVG_H - 8) - 4,
  ]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i-1][0] + pts[i][0]) / 2;
    d += ` C${cx.toFixed(1)},${pts[i-1][1].toFixed(1)} ${cx.toFixed(1)},${pts[i][1].toFixed(1)} ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
  }
  const lx = pts[pts.length-1][0], ly = pts[pts.length-1][1];
  const fill = d + ` L${lx.toFixed(1)},${SVG_H} L${pts[0][0].toFixed(1)},${SVG_H} Z`;
  return { line: d, fill, lx, ly };
}

const BAR_COUNT = 32;

function makeFakeBars(seed: number) {
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const v = Math.sin(i * 0.85 + seed) * 0.55 + Math.sin(i * 1.9 + seed * 0.3) * 0.3 + Math.sin(i * 3.1) * 0.15;
    return { h: Math.max(6, Math.abs(v) * 92), up: v > 0, intensity: Math.min(1, Math.abs(v) * 1.4) };
  });
}

function pricesToBars(prices: number[]) {
  if (prices.length < 2) return makeFakeBars(1);
  const chunk = Math.max(1, Math.floor(prices.length / BAR_COUNT));
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const slice = prices.slice(i * chunk, i * chunk + chunk + 1);
    if (slice.length < 2) return { h: 18, up: true, intensity: 0.3 };
    const open = slice[0], close = slice[slice.length - 1];
    const range = Math.max(...prices) - Math.min(...prices) || 1;
    const diff = Math.abs(close - open);
    return { h: Math.max(6, (diff / range) * 82 + 8), up: close >= open, intensity: Math.min(1, diff / range * 3 + 0.3) };
  });
}

function ChatPositionCard({ t, lang }: { t: any; lang: string }) {
  const isLong = t.side === "BUY";
  const entry  = Number(t.entry_price ?? 0);
  const sl     = Number(t.stoploss ?? 0);
  const tp1    = Number(t.target1 ?? 0);
  const tp2    = Number(t.target2 ?? 0);
  const margin = Number(t.margin_required ?? 0);
  const lev    = t.leverage ?? 5;
  const sym    = t.symbol?.replace("USDT", "") ?? "—";
  const qty    = Number(t.quantity ?? 0);
  const initPx = Number(t.current_price ?? entry);

  const CARD_MS = 500;
  const BAR_MS  = 700; // bars grow after card lands

  // Animation phases
  const [cardVisible, setCardVisible] = useState(false);
  const [barsReady,   setBarsReady]   = useState(false);
  const [dotReady,    setDotReady]    = useState(false);

  // Live price state
  const [curPx,  setCurPx]  = useState(initPx);
  const [bars,   setBars]   = useState(() => makeFakeBars(entry % 10));
  const historyRef = useRef<number[]>([initPx]);
  const targetRef  = useRef(initPx);
  const rafRef     = useRef<number>(0);

  // DOM refs for label mutations (price, pnl — high-freq, no re-render)
  const priceElRef = useRef<HTMLSpanElement>(null);
  const pnlElRef   = useRef<HTMLDivElement>(null);
  const absElRef   = useRef<HTMLDivElement>(null);

  const seedRef = useMemo(() => (entry % 10) + 0.5, [entry]);
  const fakeBars = useMemo(() => makeFakeBars(seedRef), [seedRef]);

  // Entrance sequencing
  useEffect(() => {
    requestAnimationFrame(() => setCardVisible(true));
    const t1 = setTimeout(() => setBarsReady(true),  CARD_MS);
    const t2 = setTimeout(() => setDotReady(true),   CARD_MS + BAR_MS + 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Live price fetch every 3s
  useEffect(() => {
    const go = async () => {
      try {
        const res = await fetch(`${AGENT_API}/api/agent/positions`);
        const d = await res.json();
        const found = (d.trades || []).find((x: any) => x.trade_id === t.trade_id);
        if (found) targetRef.current = Number(found.current_price ?? targetRef.current);
      } catch {}
    };
    go();
    const id = setInterval(go, 3000);
    return () => clearInterval(id);
  }, [t.trade_id]);

  // rAF: smooth price lerp + label mutations
  useEffect(() => {
    let displayPx = initPx;
    let lastBarUpdate = Date.now();

    const tick = () => {
      displayPx += (targetRef.current - displayPx) * 0.04;

      // Update price label directly
      if (priceElRef.current)
        priceElRef.current.textContent = `$${displayPx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const move = isLong ? (displayPx - entry) : (entry - displayPx);
      const pnl  = entry > 0 ? (move / entry) * lev * 100 : 0;
      const abs  = Math.abs(move * qty);
      const isP  = pnl >= 0;
      if (pnlElRef.current) {
        pnlElRef.current.textContent = `${isP ? "+" : ""}${pnl.toFixed(2)}%`;
        pnlElRef.current.style.color = isP ? "#059669" : "#dc2626";
      }
      if (absElRef.current)
        absElRef.current.textContent = `${isP ? "▲" : "▼"} $${abs.toFixed(2)} · ${lang === "zh" ? "浮动盈亏" : "unrealized"}`;

      // Bars update every 4s via setState (infrequent, OK to re-render)
      if (Date.now() - lastBarUpdate > 4000) {
        historyRef.current.push(displayPx);
        if (historyRef.current.length > BAR_COUNT * 3) historyRef.current.shift();
        setBars(pricesToBars(historyRef.current));
        setCurPx(displayPx);
        lastBarUpdate = Date.now();
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [entry, isLong, lev, qty, lang]);

  // Track: SL always left (0%), furthest TP always right (100%)
  // For LONG: furthest TP = max(tp1, tp2); For SHORT: furthest TP = min(tp1, tp2)
  const furthestTp = tp2 > 0
    ? (isLong ? Math.max(tp1, tp2) : Math.min(tp1, tp2))
    : tp1;
  const trackSpan = Math.abs(furthestTp - sl) || 1;
  const toPct = (p: number) => {
    const raw = isLong
      ? ((p - sl) / trackSpan) * 100          // LONG: higher price → more right
      : ((sl - p) / trackSpan) * 100;          // SHORT: lower price → more right
    return Math.max(0, Math.min(raw, 100));
  };

  const slPct    = toPct(sl);       // always ~0
  const entryPct = toPct(entry);
  const curPct   = toPct(curPx);
  const tp1Pct   = toPct(tp1);      // always ~100
  const tp2Pct   = tp2 > 0 ? toPct(tp2) : null;

  // Profit fill: entry → current (capped at tp1), always left-to-right on track
  const fillLeft  = entryPct;
  const fillWidth = Math.max(0, Math.min(curPct, tp1Pct) - entryPct);

  const isProfit0 = isLong ? (initPx >= entry) : (initPx <= entry);
  const pnlColor0 = isProfit0 ? "#059669" : "#dc2626";
  const accentColor = isLong ? "#059669" : "#dc2626";
  const fp0 = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const initPnl = entry > 0 ? ((isLong ? (initPx - entry) : (entry - initPx)) / entry * lev * 100) : 0;

  const displayBars = barsReady ? bars : fakeBars;

  return (
    <div style={{
      position: "relative", background: "#fff",
      borderRadius: 12, border: "1px solid #e8edf5",
      overflow: "hidden", marginBottom: 8, width: 360,
      boxShadow: "0 2px 12px rgba(0,20,80,0.07), 0 1px 3px rgba(0,20,80,0.04)",
      opacity: cardVisible ? 1 : 0,
      transform: cardVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.96)",
      transition: `opacity ${CARD_MS}ms cubic-bezier(0.22,1,0.36,1), transform ${CARD_MS}ms cubic-bezier(0.22,1,0.36,1)`,
    }}>
      <div style={{ padding: "14px 16px 0" }}>
        {/* Row 1: symbol badges left, PnL right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#0d1b35", fontFamily: "JetBrains Mono, monospace", letterSpacing: -0.3 }}>
              {sym}<span style={{ color: "#c8d3e0", fontWeight: 400 }}>/USDT</span>
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
              background: isLong ? "#ecfdf5" : "#fff1f1",
              color: isLong ? "#059669" : "#dc2626",
              border: `1px solid ${isLong ? "#bbf7d0" : "#fecaca"}`,
              fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.3,
            }}>{isLong ? "LONG ↑" : "SHORT ↓"}</span>
            <span style={{
              fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 5,
              color: "#8a97aa", background: "#f4f6f9", border: "1px solid #e8edf5",
              fontFamily: "JetBrains Mono, monospace",
            }}>{lev}×</span>
          </div>
          <div style={{ textAlign: "right" as const }}>
            <div ref={pnlElRef} style={{ fontSize: 22, fontWeight: 800, color: pnlColor0, fontFamily: "JetBrains Mono, monospace", lineHeight: 1, letterSpacing: -0.5 }}>
              {initPnl >= 0 ? "+" : ""}{initPnl.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Row 2: current price + unrealized */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb", display: "inline-block", animation: "liveDot 1.4s ease infinite", flexShrink: 0 }} />
            <span ref={priceElRef} style={{ fontSize: 24, fontWeight: 800, color: "#0d1b35", fontFamily: "JetBrains Mono, monospace", letterSpacing: -0.8, lineHeight: 1 }}>
              ${initPx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div ref={absElRef} style={{ fontSize: 10, color: isProfit0 ? "#059669" : "#dc2626", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
            {isProfit0 ? "▲" : "▼"} ${Math.abs((isLong ? initPx - entry : entry - initPx) * qty).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Row 3: activity bars — full bleed with subtle bg */}
      <div style={{ background: "#f8fafd", borderTop: "1px solid #eef2f8", borderBottom: "1px solid #eef2f8", padding: "10px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 52, marginBottom: 4 }}>
          {displayBars.map((bar, i) => {
            const isRecent = i >= BAR_COUNT - 4;
            const alpha = bar.up
              ? (isRecent ? 0.65 + bar.intensity * 0.35 : 0.28 + bar.intensity * 0.38)
              : (isRecent ? 0.6 + bar.intensity * 0.35 : 0.25 + bar.intensity * 0.35);
            return (
              <div key={i} style={{
                flex: 1,
                borderRadius: "2px 2px 0 0",
                background: bar.up ? `rgba(5,150,105,${alpha})` : `rgba(220,38,38,${alpha})`,
                height: barsReady ? `${bar.h}%` : "0%",
                transition: `height ${BAR_MS}ms cubic-bezier(0.22,1,0.36,1) ${i * 18}ms`,
              }} />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 8, color: "#c4cdd9", fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.3 }}>
            {lang === "zh" ? "价格活动" : "PRICE ACTIVITY"}
          </span>
          <span style={{ fontSize: 8, color: "#2563eb", fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.3 }}>
            {lang === "zh" ? "实时 ●" : "LIVE ●"}
          </span>
        </div>
      </div>

      {/* Row 4: SL → Entry → TP track */}
      <div style={{ padding: "12px 24px 14px" }}>
        <div style={{ position: "relative", height: 24, marginBottom: 6 }}>
          {/* Base track */}
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 5, background: "#eef2f8", borderRadius: 3, transform: "translateY(-50%)" }} />
          {/* SL zone — always left side (0 → entry) */}
          <div style={{
            position: "absolute", top: "50%",
            left: 0, width: `${entryPct}%`,
            height: 5, background: "rgba(220,38,38,0.18)",
            borderRadius: "3px 0 0 3px",
            transform: "translateY(-50%)",
          }} />
          {/* Profit fill — animates toward TP */}
          <div style={{
            position: "absolute", top: "50%",
            left: `${fillLeft}%`,
            width: dotReady ? `${fillWidth}%` : "0%",
            height: 5, background: `linear-gradient(${isLong ? "90deg" : "270deg"}, ${pnlColor0}44, ${pnlColor0}bb)`,
            borderRadius: 3, transform: "translateY(-50%)",
            transition: "width 900ms cubic-bezier(0.22,1,0.36,1), left 900ms cubic-bezier(0.22,1,0.36,1)",
          }} />
          {/* Current price dot */}
          <div style={{
            position: "absolute", top: "50%", left: `${dotReady ? curPct : entryPct}%`,
            transform: "translate(-50%,-50%)",
            opacity: dotReady ? 1 : 0,
            transition: dotReady ? "left 900ms cubic-bezier(0.22,1,0.36,1), opacity 300ms ease" : "none",
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%", background: "#fff",
              border: `2.5px solid ${pnlColor0}`,
              boxShadow: `0 0 0 3px ${pnlColor0}22, 0 2px 8px ${pnlColor0}44`,
            }} />
          </div>
        </div>
        {/* Track labels */}
        <div style={{ position: "relative", height: 14 }}>
          {/* SL — anchored left */}
          <span style={{ position: "absolute", left: 0, fontSize: 8, fontWeight: 700, color: "#f87171", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" as const }}>
            SL
          </span>
          {/* Entry — centered */}
          <span style={{ position: "absolute", left: `${entryPct}%`, transform: "translateX(-50%)", fontSize: 8, color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" as const }}>
            {lang === "zh" ? "入场" : "ENTRY"}
          </span>
          {/* T1 — by percentage */}
          <span style={{ position: "absolute", left: `${tp1Pct}%`, transform: "translateX(-50%)", fontSize: 8, fontWeight: 700, color: "#34d399", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" as const }}>
            T1
          </span>
          {/* T2 — anchored right (only if exists) */}
          {tp2Pct !== null && (
            <span style={{ position: "absolute", right: 0, fontSize: 8, fontWeight: 700, color: "#34d399", opacity: 0.75, fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" as const }}>
              T2
            </span>
          )}
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", gap: 0, marginTop: 10, paddingTop: 10, borderTop: "1px solid #eef2f8" }}>
          {[
            { label: lang === "zh" ? "入场" : "ENTRY", value: fp0(entry), color: "#4a5568" },
            { label: "TP1", value: fp0(tp1), color: "#059669" },
            ...(tp2 > 0 ? [{ label: "TP2", value: fp0(tp2), color: "#059669" }] : [{ label: lang === "zh" ? "保证金" : "MARGIN", value: `$${margin.toFixed(2)}`, color: "#4a5568" }]),
            { label: lang === "zh" ? "数量" : "QTY", value: `${t.quantity} ${sym}`, color: "#4a5568" },
          ].map(({ label, value, color }, i, arr) => (
            <div key={i} style={{ flex: 1, borderRight: i < arr.length - 1 ? "1px solid #eef2f8" : "none", paddingRight: 10, paddingLeft: i > 0 ? 10 : 0 }}>
              <div style={{ fontSize: 8, color: "#a0aec0", fontFamily: "JetBrains Mono, monospace", marginBottom: 2, letterSpacing: 0.4 }}>{label}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color, fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatPositionsMessage({ trades, lang, onGoPositions }: { trades: any[]; lang: string; onGoPositions?: () => void }) {
  if (!trades || trades.length === 0) {
    return (
      <div style={{
        padding: "12px 16px", background: "#fff", border: "1px solid #e2e8f0",
        borderRadius: "3px 14px 14px 14px",
        fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#94a3b8",
        letterSpacing: 0.5,
      }}>
        📭 &nbsp;{lang === "zh" ? "暂无持仓" : "NO OPEN POSITIONS"}
      </div>
    );
  }
  return (
    <div style={{ maxWidth: 680 }}>
      <style>{`
        @keyframes chatCardIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.5, marginBottom: 6 }}>
        {lang === "zh" ? `持仓快照 · ${trades.length} 个` : `POSITIONS SNAPSHOT · ${trades.length} open`}
      </div>
      {trades.map((t: any) => (
        <ChatPositionCard key={t.trade_id} t={t} lang={lang} />
      ))}
      <div style={{ fontSize: 9.5, color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", marginTop: 6 }}>
        {lang === "zh" ? "实时更新中 · " : "Live · "}
        <span
          onClick={onGoPositions}
          style={{ color: "#0047cc", cursor: "pointer" }}
        >
          {lang === "zh" ? "→ 前往持仓管理" : "→ Positions page"}
        </span>
      </div>
    </div>
  );
}

function BottomProgressLine({ entry, current, sl, tp1, isLong }: {
  entry: number; current: number; sl: number; tp1: number; isLong: boolean;
}) {
  const tpDist = Math.abs(tp1 - entry);
  const slDist = Math.abs(sl - entry);
  if (tpDist <= 0 || slDist <= 0) return null;
  const move = isLong ? (current - entry) : (entry - current);
  const progress = Math.max(0, Math.min(move / tpDist, 1));
  const fillColor = progress >= 0.6 ? "#059669" : progress <= 0 ? "#dc2626" : "#0047cc";
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#f1f5f9", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${progress * 100}%`,
        background: `linear-gradient(90deg, ${fillColor}88, ${fillColor})`,
        animation: "barFill 1s cubic-bezier(0.22,1,0.36,1) both",
        overflow: "hidden", position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 0, bottom: 0, width: "35%",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
          animation: "termScan 2s linear infinite",
        }} />
      </div>
    </div>
  );
}

function PositionCard({ t, live, lang, onCloseNav, index }: {
  t: any; live: { price: number; pnl: number } | null;
  lang: string; onCloseNav: (sym: string, tradeId: string) => void; index: number;
}) {
  const isLong = t.side === "BUY";
  const cur = live?.price ?? Number(t.current_price ?? 0);
  const pnl = live?.pnl ?? (t.floating_pnl_pct ?? 0);
  const entry = Number(t.entry_price ?? 0);
  const margin = Number(t.margin_required ?? 0);
  const lev  = t.leverage ?? 5;
  const sym  = t.symbol?.replace("USDT", "") ?? "—";
  const isProfit = pnl >= 0;
  const pnlColor = isProfit ? "#059669" : "#dc2626";
  const fp = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{
      background: "#fff",
      borderRadius: 8,
      border: "1px solid #e8edf5",
      borderLeft: `3px solid ${pnlColor}`,
      marginBottom: 6,
      animation: `cardSlideIn 0.25s ease ${index * 0.05}s both`,
      padding: "10px 16px",
      display: "grid",
      gridTemplateColumns: "auto 1fr auto auto auto auto",
      alignItems: "center",
      gap: "0 20px",
    }}>
      {/* Col 1: symbol + badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 140 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#0a1a3a", fontFamily: "JetBrains Mono, monospace", letterSpacing: -0.2 }}>
          {sym}<span style={{ color: "#cbd5e1", fontWeight: 400, fontSize: 11 }}>/USDT</span>
        </span>
        <span style={{
          fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
          background: isLong ? "#ecfdf5" : "#fef2f2",
          color: isLong ? "#059669" : "#dc2626",
          border: `1px solid ${isLong ? "#bbf7d0" : "#fecaca"}`,
          fontFamily: "JetBrains Mono, monospace",
        }}>{isLong ? "L" : "S"} {lev}×</span>
      </div>

      {/* Col 2: meta info */}
      <div style={{ display: "flex", gap: 16 }}>
        {[
          { k: lang === "zh" ? "保证金" : "MGN", v: `$${margin.toFixed(2)}` },
          { k: lang === "zh" ? "数量" : "QTY",   v: `${t.quantity} ${sym}` },
        ].map(({ k, v }) => (
          <span key={k} style={{ fontSize: 9, color: "#8a95b0", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" as const }}>
            {k} <span style={{ color: "#475569", fontWeight: 600 }}>{v}</span>
          </span>
        ))}
      </div>

      {/* Col 3: entry */}
      <div style={{ textAlign: "right" as const }}>
        <div style={{ fontSize: 8, color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", marginBottom: 2 }}>{lang === "zh" ? "开仓价" : "ENTRY"}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", fontFamily: "JetBrains Mono, monospace" }}>{fp(entry)}</div>
      </div>

      {/* Col 4: current price */}
      <div style={{ textAlign: "right" as const }}>
        <div style={{ fontSize: 8, color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", marginBottom: 2, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
          <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "#22c55e", animation: "liveDot 1.4s ease infinite" }} />
          {lang === "zh" ? "当前" : "NOW"}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0a1a3a", fontFamily: "JetBrains Mono, monospace" }}>
          <AnimatedNumber value={cur} decimals={2} prefix="$" />
        </div>
      </div>

      {/* Col 5: PnL */}
      <div style={{ textAlign: "right" as const, minWidth: 60 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: pnlColor, fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
          {pnl >= 0 ? "+" : ""}<AnimatedNumber value={pnl} decimals={2} />%
        </div>
      </div>

      {/* Col 6: close button */}
      <button
        onClick={() => onCloseNav(t.symbol ?? sym, t.trade_id)}
        style={{
          padding: "3px 10px", borderRadius: 4, fontSize: 9, fontWeight: 700,
          cursor: "pointer", background: "#fff5f5", color: "#dc2626",
          border: "1px solid #fecaca", fontFamily: "JetBrains Mono, monospace",
          whiteSpace: "nowrap" as const, flexShrink: 0,
        }}
      >
        {lang === "zh" ? "平仓" : "CLOSE"}
      </button>
    </div>
  );
}

function PositionsPanel({ lang = "zh", onCloseNav }: { lang?: string; onCloseNav: (sym: string, tradeId: string) => void }) {
  const { user } = useUser();
  const uid = user?.id ? `?user_id=${user.id}` : "";
  const [data, setData] = useState<any>(null);
  const [liveMap, setLiveMap] = useState<Record<string, { price: number; pnl: number }>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = async () => {
    try { setData(await (await fetch(`${AGENT_API}/api/agent/positions${uid}`)).json()); } catch {}
  };

  const refreshLive = useCallback(async () => {
    if (!data?.trades?.length) return;
    try {
      const fresh = await (await fetch(`${AGENT_API}/api/agent/positions${uid}`)).json();
      const map: Record<string, { price: number; pnl: number }> = {};
      for (const t of (fresh.trades || [])) {
        map[t.trade_id] = { price: Number(t.current_price ?? 0), pnl: t.floating_pnl_pct ?? 0 };
      }
      setLiveMap(map);
      setLastUpdate(new Date());
    } catch {}
  }, [data]);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const timer = setInterval(refreshLive, 3000);
    return () => clearInterval(timer);
  }, [refreshLive]);

  if (!data) return <div style={P.page}><PanelLoading /></div>;
  const trades: any[] = data.trades || [];

  return (
    <div style={P.page}>
      <style>{POSITION_STYLES}</style>

      <div style={P.header}>
        <div>
          <div style={P.title}>{lang === "zh" ? "持仓管理" : "Positions"}</div>
          <div style={P.subtitle}>
            OPEN POSITIONS · {trades.length} {lang === "zh" ? "个" : "active"}
            {lastUpdate && <span style={{ marginLeft: 8, color: "#34d399" }}>● {lang === "zh" ? "实时" : "LIVE"}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0a1a3a", fontFamily: "JetBrains Mono, monospace" }}>
              ${data.balance_usdt?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}
            </div>
            <div style={{ fontSize: 9, color: "#8a95b0", fontFamily: "JetBrains Mono, monospace" }}>ACCOUNT BALANCE</div>
          </div>
          <button onClick={load} style={{ ...P.btn, background: "#eef2ff", color: "#0047cc", border: "1px solid #c7d3f8" }}>
            ↻ {lang === "zh" ? "刷新" : "Refresh"}
          </button>
        </div>
      </div>

      {trades.length === 0 ? (
        <div style={{ ...P.card, padding: "50px 40px", textAlign: "center" as const }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📭</div>
          <div style={{ color: "#94a3b8", fontSize: 12, fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.8 }}>
            NO OPEN POSITIONS
          </div>
        </div>
      ) : (
        trades.map((t: any, i: number) => (
          <PositionCard
            key={t.trade_id} t={t} index={i}
            live={liveMap[t.trade_id] ?? null}
            lang={lang} onCloseNav={onCloseNav}
          />
        ))
      )}
    </div>
  );
}

// ── 交易历史 ─────────────────────────────────────
function TradesPanel({ lang }: { lang: string }) {
  const t = (zh: string, en: string) => lang === "zh" ? zh : en;
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(`${AGENT_API}/api/agent/trades?limit=50`).then(r => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) return <div style={P.page}><PanelLoading /></div>;
  const trades: any[] = data.trades || [];

  return (
    <div style={P.page}>
      <div style={P.header}>
        <div>
          <div style={P.title}>{t("交易历史", "Trade History")}</div>
          <div style={P.subtitle}>TRADE HISTORY · {trades.length} records</div>
        </div>
      </div>
      <div style={P.card}>
        <div style={{ ...P.cardHeader, display: "grid", gridTemplateColumns: "120px 70px 90px 90px 90px 80px 80px 1fr" }}>
          {[t("时间","Time"), t("方向","Side"), t("入场价","Entry"), t("平仓价","Close"), t("数量","Qty"), t("盈亏","P&L"), t("状态","Status"), t("备注","Note")].map(h => (
            <span key={h} style={P.cardLabel}>{h}</span>
          ))}
        </div>
        {trades.length === 0 ? (
          <div style={P.emptyState}>{t("暂无交易记录", "No trades yet")}</div>
        ) : trades.map((tr: any, i: number) => {
          const pnl = tr.final_pnl_pct ?? 0;
          const isOpen = tr.status === "open";
          const ts = tr.timestamp ? new Date(tr.timestamp).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
          return (
            <div key={i} style={{ ...P.row, display: "grid", gridTemplateColumns: "120px 70px 90px 90px 90px 80px 80px 1fr", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#8a95b0", fontFamily: "JetBrains Mono, monospace" }}>{ts}</span>
              <span style={P.tag(tr.side === "BUY" ? "#059669" : "#d63b3b")}>{tr.side === "BUY" ? (t("↑ 多", "↑ Long")) : (t("↓ 空", "↓ Short"))}</span>
              <span style={{ fontSize: 11, color: "#2a3350", fontFamily: "JetBrains Mono, monospace" }}>${Number(tr.entry_price ?? 0).toLocaleString()}</span>
              <span style={{ fontSize: 11, color: "#2a3350", fontFamily: "JetBrains Mono, monospace" }}>{tr.close_price ? `$${Number(tr.close_price).toLocaleString()}` : "—"}</span>
              <span style={{ fontSize: 11, color: "#2a3350", fontFamily: "JetBrains Mono, monospace" }}>{tr.quantity ?? "—"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: isOpen ? "#8a95b0" : pnl >= 0 ? "#059669" : "#d63b3b", fontFamily: "JetBrains Mono, monospace" }}>
                {isOpen ? t("持仓中", "Open") : `${pnl >= 0 ? "+" : ""}${(pnl * 100).toFixed(1)}%`}
              </span>
              <span style={P.tag(isOpen ? "#0047cc" : pnl >= 0 ? "#059669" : "#d63b3b")}>{isOpen ? "OPEN" : "CLOSED"}</span>
              <span style={{ fontSize: 10, color: "#8a95b0", fontFamily: "JetBrains Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.close_reason || tr.symbol || "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 进化报告 ─────────────────────────────────────
function EvolutionPanel({ lang }: { lang: string }) {
  const t = (zh: string, en: string) => lang === "zh" ? zh : en;
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(`${AGENT_API}/api/agent/evolution`).then(r => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) return <div style={P.page}><PanelLoading /></div>;
  const history: any[] = data.history || [];

  return (
    <div style={P.page}>
      <div style={P.header}>
        <div>
          <div style={P.title}>{t("进化报告", "Evolution Log")}</div>
          <div style={P.subtitle}>EVOLUTION LOG · self-learning history</div>
        </div>
      </div>
      <div style={P.card}>
        {history.length === 0 ? (
          <div style={P.emptyState}>{t("暂无进化记录\n需要至少 5 笔交易后触发首次复盘", "No evolution records yet\nRequires at least 5 trades to trigger the first review")}</div>
        ) : history.map((h: any, i: number) => (
          <div key={i} style={{ ...P.row, flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
              <span style={P.tag("#0047cc")}>v{h.version || i + 1}</span>
              <span style={{ fontSize: 10, color: "#8a95b0", fontFamily: "JetBrains Mono, monospace" }}>{h.timestamp ? new Date(h.timestamp).toLocaleString(lang === "zh" ? "zh-CN" : "en-US") : "—"}</span>
              {h.win_rate && <span style={{ ...P.tag("#059669"), marginLeft: "auto" }}>WIN {(h.win_rate * 100).toFixed(0)}%</span>}
            </div>
            {h.summary && <div style={{ fontSize: 12, color: "#2a3350", lineHeight: 1.6 }}>{h.summary}</div>}
            {h.changes && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                {Object.entries(h.changes).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 10, background: "#f4f6fc", border: "1px solid #e8ecf4", padding: "2px 8px", borderRadius: 4, color: "#5a6480", fontFamily: "JetBrains Mono, monospace" }}>
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 监控组合 ─────────────────────────────────────
interface WatchItem { symbol: string; enabled: boolean; }

function SymbolsPanel({ lang }: { lang: string }) {
  const t = (zh: string, en: string) => lang === "zh" ? zh : en;
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${AGENT_API}/api/agent/watchlist`)
      .then(r => r.json())
      .then(d => { setWatchlist(d.watchlist || []); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  const add = () => {
    const sym = input.trim().toUpperCase();
    if (!sym) return;
    if (sym.length < 2 || sym.length > 10) { setError(t("ticker 长度需在 2-10 位之间", "Ticker must be 2–10 characters")); return; }
    if (watchlist.some(w => w.symbol === sym)) { setError(t(`${sym} 已在监控列表中`, `${sym} is already in the watchlist`)); return; }
    if (watchlist.length >= 4) { setError(t("最多同时监控 4 个币种", "Maximum 4 tokens in watchlist")); return; }
    setError("");
    setWatchlist(w => [...w, { symbol: sym, enabled: true }]);
    setInput("");
  };

  const remove = (sym: string) => setWatchlist(w => w.filter(x => x.symbol !== sym));
  const toggle = (sym: string) => setWatchlist(w => w.map(x => x.symbol === sym ? { ...x, enabled: !x.enabled } : x));

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${AGENT_API}/api/agent/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchlist }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const PRESETS = ["BTC", "ETH", "BNB", "SOL", "AVAX", "DOGE", "LINK", "XRP", "PEPE", "WIF"];
  const enabledCount = watchlist.filter(w => w.enabled).length;

  if (loading) return <div style={P.page}><PanelLoading /></div>;

  return (
    <div style={P.page}>
      <div style={P.header}>
        <div>
          <div style={P.title}>{t("监控组合", "Watchlist")}</div>
          <div style={P.subtitle}>WATCHLIST · {enabledCount} {t("个启用", "active")} · {t("共", "total")} {watchlist.length}/4</div>
        </div>
        <button onClick={save} disabled={saving}
          style={{ ...P.btn, background: saved ? "#f0fdf4" : "#0047cc", color: saved ? "#059669" : "#fff", border: saved ? "1px solid #bbf7d0" : "none" }}>
          {saved ? t("✓ 已保存", "✓ Saved") : saving ? t("保存中...", "Saving...") : t("保存监控组合", "Save Watchlist")}
        </button>
      </div>

      {/* 添加区域 */}
      <div style={{ ...P.card, marginBottom: 16 }}>
        <div style={P.cardHeader}><span style={P.cardLabel}>{t("添加代币", "Add Token")}</span><span style={{ fontSize: 10, color: "#8892a4" }}>{t("支持任意 CMC 上市代币", "Any CMC-listed token")}</span></div>
        <div style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
          <input value={input} onChange={e => { setInput(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder={t("输入 ticker，如 PEPE、ONDO、JUP...", "Enter ticker, e.g. PEPE, ONDO, JUP...")} style={{ ...P.input, flex: 1 }} />
          <button onClick={add} style={{ ...P.btn, background: "#0047cc", color: "#fff", padding: "0 20px" }}>+ {t("添加", "Add")}</button>
        </div>
        {error && <div style={{ padding: "0 16px 10px", fontSize: 11, color: "#d63b3b" }}>{error}</div>}
        <div style={{ padding: "0 16px 14px", display: "flex", gap: 6, flexWrap: "wrap" as const }}>
          {PRESETS.map(s => {
            const inList = watchlist.some(w => w.symbol === s);
            return (
              <button key={s} onClick={() => { if (!inList && watchlist.length < 4) { setWatchlist(w => [...w, { symbol: s, enabled: true }]); } }}
                style={{ ...P.btn, background: inList ? "#eef2ff" : "#f4f6fc", color: inList ? "#0047cc" : "#5a6480", border: `1px solid ${inList ? "#c7d3f8" : "#e8ecf4"}`, cursor: inList ? "default" : "pointer" }}>
                {inList ? "✓ " : ""}{s}
              </button>
            );
          })}
        </div>
      </div>

      {/* 监控列表 */}
      <div style={P.card}>
        <div style={P.cardHeader}><span style={P.cardLabel}>{t("监控列表", "Watchlist")}</span></div>
        {watchlist.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" as const, color: "#b0b8cc", fontSize: 12 }}>
            {t("暂无监控币种，请在上方添加", "No tokens yet. Add one above.")}
          </div>
        ) : (
          <div style={{ padding: "8px 0" }}>
            {watchlist.map((item) => (
              <div key={item.symbol} style={{
                display: "flex", alignItems: "center", padding: "10px 16px",
                borderBottom: "1px solid #f0f3fa",
                opacity: item.enabled ? 1 : 0.5,
                transition: "opacity 0.2s",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.enabled ? "#22c55e" : "#d1d5db", marginRight: 12, flexShrink: 0 }} />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: 14, color: "#0a1a3a", flex: 1 }}>
                  {item.symbol}
                </span>
                <span style={{ fontSize: 10, color: item.enabled ? "#22c55e" : "#9ca3af", marginRight: 16, fontFamily: "monospace" }}>
                  {item.enabled ? t("监控中", "Active") : t("已暂停", "Paused")}
                </span>
                <button onClick={() => toggle(item.symbol)} style={{
                  background: item.enabled ? "#dcfce7" : "#f3f4f6",
                  color: item.enabled ? "#16a34a" : "#6b7280",
                  border: `1px solid ${item.enabled ? "#bbf7d0" : "#e5e7eb"}`,
                  borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", marginRight: 8,
                }}>
                  {item.enabled ? t("暂停", "Pause") : t("启用", "Enable")}
                </button>
                <button onClick={() => remove(item.symbol)} style={{
                  background: "none", border: "1px solid #fecaca", color: "#ef4444",
                  borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer",
                }}>
                  {t("删除", "Remove")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: "#8892a4", lineHeight: 1.6 }}>
        · {t("监控扫描仅对「监控中」状态的代币生效", "Scan only applies to tokens with Active status")}<br />
        · {t("支持任意 CMC 上市代币，输入正确 ticker 即可", "Any CMC-listed token is supported — just enter the correct ticker")}<br />
        · {t("修改后点击「保存监控组合」生效，下次扫描周期起生效", "Click Save Watchlist to apply changes; takes effect from the next scan cycle")}
      </div>
    </div>
  );
}

// ── 风控参数 ─────────────────────────────────────
function RiskPanel({ lang }: { lang: string }) {
  const t = (zh: string, en: string) => lang === "zh" ? zh : en;
  const { user } = useUser();
  const uid = user?.id ? `?user_id=${user.id}` : "";
  const [risk, setRisk] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${AGENT_API}/api/agent/config${uid}`).then(r => r.json()).then(d => setRisk(d.risk || {})).catch(() => {});
  }, [user?.id]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${AGENT_API}/api/agent/config${uid}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ risk }) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  if (!risk) return <div style={P.page}><PanelLoading /></div>;

  const fields = [
    { key: "max_loss_per_trade_pct", label: t("单笔最大亏损", "Max Loss / Trade"), desc: t("单笔交易最大亏损比例", "Max loss ratio per trade"), unit: "%", scale: 100 },
    { key: "max_daily_loss_pct", label: t("每日最大亏损", "Max Daily Loss"), desc: t("当日累计最大亏损比例", "Max cumulative daily loss ratio"), unit: "%", scale: 100 },
    { key: "max_open_positions", label: t("最大持仓数", "Max Positions"), desc: t("同时持有的最大仓位数量", "Maximum number of simultaneous positions"), unit: t("个", "pos"), scale: 1 },
    { key: "min_confidence", label: t("最低置信度", "Min Confidence"), desc: t("低于此值 Agent 不会开仓", "Agent won't open a position below this threshold"), unit: "%", scale: 1 },
    { key: "default_leverage", label: t("默认杠杆", "Default Leverage"), desc: t("开仓默认使用的杠杆倍数", "Default leverage multiplier for new positions"), unit: "x", scale: 1 },
  ];

  return (
    <div style={P.page}>
      <div style={P.header}>
        <div>
          <div style={P.title}>{t("风控参数", "Risk Parameters")}</div>
          <div style={P.subtitle}>RISK MANAGEMENT · edit with caution</div>
        </div>
        <button onClick={save} disabled={saving}
          style={{ ...P.btn, background: saved ? "#f0fdf4" : "#0047cc", color: saved ? "#059669" : "#fff", border: saved ? "1px solid #bbf7d0" : "none" }}>
          {saved ? t("✓ 已保存", "✓ Saved") : saving ? t("保存中...", "Saving...") : t("保存修改", "Save Changes")}
        </button>
      </div>

      <div style={P.card}>
        {fields.map(({ key, label, desc, unit, scale }, i) => (
          <div key={key} style={{ ...P.row, justifyContent: "space-between", borderBottom: i < fields.length - 1 ? "1px solid #f4f6fc" : "none" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0a1a3a", fontFamily: "JetBrains Mono, monospace" }}>{label}</div>
              <div style={{ fontSize: 10, color: "#8a95b0", marginTop: 2 }}>{desc}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="number" value={scale === 100 ? ((risk[key] || 0) * 100).toFixed(0) : (risk[key] || 0)}
                onChange={e => setRisk((r: any) => ({ ...r, [key]: scale === 100 ? Number(e.target.value) / 100 : Number(e.target.value) }))}
                style={{ ...P.input, width: 72, textAlign: "right" as const }} />
              <span style={{ fontSize: 11, color: "#8a95b0", fontFamily: "JetBrains Mono, monospace", minWidth: 14 }}>{unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: "12px 16px", background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 10, fontSize: 11, color: "#92400e", fontFamily: "JetBrains Mono, monospace" }}>
        ⚠ {t("修改风控参数将立即影响 Agent 的开仓决策，请谨慎操作。", "Changes to risk parameters immediately affect Agent trading decisions. Proceed with caution.")}
      </div>
    </div>
  );
}

// ── 交易所绑定 ────────────────────────────────────
function ExchangePanel({ status, lang }: { status: any; lang: string }) {
  const t = (zh: string, en: string) => lang === "zh" ? zh : en;
  const { user } = useUser();
  const uid = user?.id ? `?user_id=${user.id}` : "";
  const [env, setEnv] = useState<"demo"|"testnet"|"live">("demo");
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ok: boolean; msg: string} | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${AGENT_API}/api/agent/config${uid}`).then(r => r.json()).then(d => {
      const ex = d.exchange || {};
      if (ex.env) setEnv(ex.env as "demo"|"testnet"|"live");
      if (ex.api_key) setApiKey(ex.api_key);
      if (ex.secret) setSecret(ex.secret);
    }).catch(() => {});
  }, [user?.id]);

  const testConn = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch(`${AGENT_API}/api/agent/status${uid}`);
      const d = await r.json();
      setTestResult({ ok: d.status === "online", msg: d.status === "online" ? t(`连接成功 · 余额 $${d.balance_usdt}`, `Connected · Balance $${d.balance_usdt}`) : t("连接失败", "Connection failed") });
    } catch { setTestResult({ ok: false, msg: t("无法连接到 Agent 后端", "Cannot reach Agent backend") }); }
    setTesting(false);
  };

  const save = async () => {
    if (!apiKey.trim() || !secret.trim()) {
      setTestResult({ ok: false, msg: t("API Key 和 Secret 不能为空", "API Key and Secret are required") });
      return;
    }
    setSaving(true);
    try {
      await fetch(`${AGENT_API}/api/agent/config${uid}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchange: { env, api_key: apiKey.trim(), secret: secret.trim() } }) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const isOnline = status?.status === "online";

  return (
    <div style={P.page}>
      <div style={P.header}>
        <div>
          <div style={P.title}>{t("交易所绑定", "Exchange Connection")}</div>
          <div style={P.subtitle}>EXCHANGE CONNECTION · binance futures</div>
        </div>
        <button onClick={save} disabled={saving}
          style={{ ...P.btn, background: saved ? "#f0fdf4" : "#0047cc", color: saved ? "#059669" : "#fff", border: saved ? "1px solid #bbf7d0" : "none" }}>
          {saved ? t("✓ 已保存", "✓ Saved") : saving ? t("保存中...", "Saving...") : t("保存配置", "Save Config")}
        </button>
      </div>

      {/* 状态卡片 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: t("连接状态", "Status"), value: isOnline ? "● ONLINE" : "○ OFFLINE", color: isOnline ? "#059669" : "#d63b3b" },
          { label: t("账户余额", "Balance"), value: status?.balance_usdt != null ? `$${status.balance_usdt.toLocaleString()}` : "—", color: "#0a1a3a" },
          { label: t("持仓数量", "Positions"), value: status?.open_positions != null ? `${status.open_positions}` : "—", color: "#0047cc" },
          { label: t("交易环境", "Environment"), value: status?.exchange?.toUpperCase() ?? "—", color: "#8a95b0" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...P.card, padding: "16px 20px" }}>
            <div style={{ fontSize: 9, color: "#b0b8cc", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em", marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* 环境选择 */}
      <div style={{ ...P.card, marginBottom: 16 }}>
        <div style={P.cardHeader}><span style={P.cardLabel}>{t("交易环境", "Trading Environment")}</span></div>
        <div style={{ padding: "16px 18px", display: "flex", gap: 8 }}>
          {(["demo","testnet","live"] as const).map(e => (
            <button key={e} onClick={() => setEnv(e)}
              style={{ flex: 1, padding: "10px", borderRadius: 8, border: env === e ? "2px solid #0047cc" : "1px solid #e2e6ef",
                background: env === e ? "#eef2ff" : "#fff", color: env === e ? "#0047cc" : "#8a95b0",
                fontSize: 11, fontWeight: env === e ? 700 : 400, fontFamily: "JetBrains Mono, monospace", cursor: "pointer" }}>
              {e === "demo" ? t("🧪 模拟盘", "🧪 Demo") : e === "testnet" ? t("🔬 测试网", "🔬 Testnet") : t("🔴 实盘", "🔴 Live")}
              <div style={{ fontSize: 9, marginTop: 3, color: env === e ? "#0047cc" : "#b0b8cc" }}>
                {e === "demo" ? "Demo Futures" : e === "testnet" ? "Testnet Futures" : "Live Futures"}
              </div>
            </button>
          ))}
        </div>
        {env === "live" && (
          <div style={{ margin: "0 18px 14px", padding: "10px 14px", background: "#fff0f0", border: "1px solid #fecaca", borderRadius: 8, fontSize: 11, color: "#d63b3b", fontFamily: "JetBrains Mono, monospace" }}>
            ⚠ {t("实盘模式将使用真实资金交易，请确认风控参数后再启用。", "Live mode uses real funds. Confirm your risk parameters before enabling.")}
          </div>
        )}
      </div>

      {/* API 配置 */}
      <div style={{ ...P.card, marginBottom: 16 }}>
        <div style={P.cardHeader}><span style={P.cardLabel}>{t("API 密钥配置", "API Key Configuration")}</span></div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "API Key", value: apiKey, setter: setApiKey, show: showKey, toggle: () => setShowKey(s => !s), placeholder: t("输入 Binance API Key...", "Enter Binance API Key...") },
            { label: "Secret Key", value: secret, setter: setSecret, show: showSecret, toggle: () => setShowSecret(s => !s), placeholder: t("输入 Binance Secret Key...", "Enter Binance Secret Key...") },
          ].map(({ label, value, setter, show, toggle, placeholder }) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#5a6480", fontFamily: "JetBrains Mono, monospace", marginBottom: 6 }}>{label}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type={show ? "text" : "password"} value={value} onChange={e => setter(e.target.value)}
                  placeholder={placeholder}
                  style={{ ...P.input, flex: 1, fontFamily: "JetBrains Mono, monospace", letterSpacing: show ? "normal" : "0.1em" }} />
                <button onClick={toggle} style={{ ...P.btn, background: "#f4f6fc", color: "#8a95b0", border: "1px solid #e2e6ef", width: 36, padding: 0 }}>
                  {show ? "🙈" : "👁"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 测试连接 */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={testConn} disabled={testing}
          style={{ ...P.btn, background: "#0a1a3a", color: "#fff", padding: "8px 20px", opacity: testing ? 0.6 : 1 }}>
          {testing ? t("测试中...", "Testing...") : t("⚡ 测试连接", "⚡ Test Connection")}
        </button>
        {testResult && (
          <div style={{ fontSize: 11, color: testResult.ok ? "#059669" : "#d63b3b", fontFamily: "JetBrains Mono, monospace", animation: "msgIn 0.3s ease" }}>
            {testResult.ok ? "✓" : "✕"} {testResult.msg}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Toggle 开关组件 ──────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 36, height: 20, borderRadius: 10, background: on ? "#0047cc" : "#e2e6ef", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: on ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </div>
  );
}

// ── Skill 配置 ────────────────────────────────────
function SkillPanel({ lang }: { lang: string }) {
  const t = (zh: string, en: string) => lang === "zh" ? zh : en;
  const { user } = useUser();
  const uid = user?.id ? `?user_id=${user.id}` : "";
  const [tab, setTab] = useState<"core" | "mine">(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem("skillTab") as "core" | "mine") || "core";
    }
    return "core";
  });

  // Core skills state
  const [skills, setSkills] = useState({
    cmc_data:       { enabled: true,  refresh_interval: 30 },
    verdict_engine: { enabled: true,  temperature: 0.1, max_tokens: 1500 },
    sqs_calculator: { enabled: true,  macro_penalty: 10 },
    kelly_position: { enabled: true,  kelly_fraction: 0.25 },
    agent_insight:  { enabled: true,  temperature: 0.4, max_tokens: 200 },
    evolution:      { enabled: false, trigger_every_n: 10, lookback: 20 },
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // My skills state
  const [mySkills, setMySkills]         = useState<any[]>([]);
  const [mySkillsLoading, setMySkillsLoading] = useState(false);
  const [activeSkillIds, setActiveSkillIds]   = useState<Set<string>>(new Set());
  const [toggling, setToggling]               = useState<string | null>(null);

  useEffect(() => {
    fetch(`${AGENT_API}/api/agent/config${uid}`).then(r => r.json()).then(d => {
      if (d.skills) setSkills(s => ({ ...s, ...d.skills }));
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setMySkillsLoading(true);
    fetch(`${AGENT_API}/api/skills/my?user_id=${user.id}`)
      .then(r => r.json())
      .then(d => { setMySkills(d.skills || []); setMySkillsLoading(false); })
      .catch(() => setMySkillsLoading(false));
    fetch(`${AGENT_API}/api/skills/agent/current?user_id=${user.id}`)
      .then(r => r.json())
      .then(d => { if (d.skill_id) setActiveSkillIds(new Set([d.skill_id])); })
      .catch(() => {});
  }, [user?.id]);

  async function toggleMySkill(skillId: string, on: boolean) {
    if (!user?.id) return;
    const skillName = mySkills.find(s => s.id === skillId)?.name || skillId;
    if (on) {
      const confirmed = window.confirm(t(
        `确认将「${skillName}」写入 Agent？\n启用后 Agent 将使用该策略执行交易。`,
        `Enable "${skillName}"?\nThe Agent will use this strategy for trading.`
      ));
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(t(
        `确认关闭「${skillName}」？\n关闭后 Agent 将停止使用该策略。`,
        `Disable "${skillName}"?\nThe Agent will stop using this strategy.`
      ));
      if (!confirmed) return;
    }
    setToggling(skillId);
    try {
      await fetch(`${AGENT_API}/api/skills/set-agent`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, skill_id: on ? skillId : null }),
      });
      setActiveSkillIds(on ? new Set([skillId]) : new Set());
    } catch {}
    setToggling(null);
  }

  const update = (key: string, field: string, val: any) =>
    setSkills(s => ({ ...s, [key]: { ...(s as any)[key], [field]: val } }));

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${AGENT_API}/api/agent/config${uid}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills }) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const SKILL_DEFS = [
    { key: "cmc_data", name: "CMC Market Data", icon: "📡",
      desc: t("实时价格 · 成交量 · 市值 · 7日走势", "Live price · Volume · Market cap · 7D trend"),
      color: "#0047cc", fields: [{ key: "refresh_interval", label: t("刷新间隔", "Refresh Interval"), unit: t("分钟", "min"), min: 5, max: 120, type: "number" }] },
    { key: "verdict_engine", name: "Three-Court Verdict", icon: "⚖️",
      desc: t("7维度证据评估 → 结论 + 置信度 + 价格区间", "7-dim evidence → Verdict + Confidence + Price range"),
      color: "#7c3aed", fields: [
        { key: "temperature", label: "Temperature", unit: "", min: 0, max: 1, step: 0.05, type: "slider" },
        { key: "max_tokens", label: "Max Tokens", unit: "", min: 500, max: 3000, type: "number" },
      ]},
    { key: "sqs_calculator", name: "SQS Signal Quality", icon: "📊",
      desc: t("Kelly仓位 × 时间窗口 × 市场共振", "Kelly sizing × Time window × Market resonance"),
      color: "#059669", fields: [{ key: "macro_penalty", label: t("宏观预警扣分", "Macro Penalty"), unit: t("分", "pts"), min: 0, max: 20, type: "number" }] },
    { key: "kelly_position", name: "Kelly Position Sizing", icon: "🎯",
      desc: t("动态仓位计算 · 风险收益最优化", "Dynamic position sizing · Risk-return optimization"),
      color: "#d97706", fields: [{ key: "kelly_fraction", label: t("Kelly 分数", "Kelly Fraction"), unit: "", min: 0.1, max: 1, step: 0.05, type: "slider" }] },
    { key: "agent_insight", name: "Agent Insight", icon: "🧠",
      desc: t("DeepSeek 生成自然语言交易建议", "DeepSeek natural language trading suggestions"),
      color: "#0891b2", fields: [
        { key: "temperature", label: "Temperature", unit: "", min: 0, max: 1, step: 0.05, type: "slider" },
        { key: "max_tokens", label: "Max Tokens", unit: "", min: 100, max: 500, type: "number" },
      ]},
    { key: "evolution", name: t("自进化模块", "Self-Evolution"), icon: "🔬",
      desc: t("基于历史交易复盘 · 自动调整参数", "Historical trade review · Auto parameter tuning"),
      color: "#db2777", fields: [
        { key: "trigger_every_n", label: t("每 N 笔触发", "Trigger every N trades"), unit: t("笔", ""), min: 5, max: 50, type: "number" },
        { key: "lookback", label: t("复盘回溯", "Lookback"), unit: t("笔", "trades"), min: 5, max: 50, type: "number" },
      ]},
  ];

  const M = "JetBrains Mono, monospace";

  return (
    <div style={P.page}>
      <div style={P.header}>
        <div>
          <div style={P.title}>{t("Skill 配置", "Skill Config")}</div>
          <div style={P.subtitle}>
            {tab === "core" ? "SKILL FRAMEWORK · three-court verdict system" : t("MY SKILLS · 从市场导入的策略", "MY SKILLS · Imported from market")}
          </div>
        </div>
        {tab === "core" && (
          <button onClick={save} disabled={saving}
            style={{ ...P.btn, background: saved ? "#f0fdf4" : "#0047cc", color: saved ? "#059669" : "#fff", border: saved ? "1px solid #bbf7d0" : "none" }}>
            {saved ? t("✓ 已保存", "✓ Saved") : saving ? t("保存中...", "Saving...") : t("保存配置", "Save Config")}
          </button>
        )}
      </div>

      {/* Tab 切换 */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#f4f6fa", borderRadius: 8, padding: 3 }}>
        {([["core", t("核心模块", "Core Modules")], ["mine", t("我的 Skill", "My Skills")]] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); sessionStorage.setItem("skillTab", key); }}
            style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "none", fontFamily: M, fontSize: 11, fontWeight: tab === key ? 700 : 400,
              background: tab === key ? "#fff" : "none", color: tab === key ? "#0a1a3a" : "#8a95b0",
              cursor: "pointer", boxShadow: tab === key ? "0 1px 4px rgba(0,20,60,0.08)" : "none", transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* 核心模块 Tab */}
      {tab === "core" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SKILL_DEFS.map(({ key, name, icon, desc, color, fields }) => {
            const s = (skills as any)[key];
            const isOpen = expanded === key;
            return (
              <div key={key} style={{ ...P.card, border: s.enabled ? `1px solid ${color}28` : "1px solid #e8ecf4", transition: "border 0.2s" }}>
                <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                  onClick={() => setExpanded(isOpen ? null : key)}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0a1a3a", fontFamily: M }}>{name}</span>
                      <span style={P.tag(s.enabled ? color : "#8a95b0")}>{s.enabled ? "ACTIVE" : "DISABLED"}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#8a95b0", marginTop: 2 }}>{desc}</div>
                  </div>
                  <Toggle on={s.enabled} onChange={v => update(key, "enabled", v)} />
                  <span style={{ fontSize: 10, color: "#b0b8cc", marginLeft: 4 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
                {isOpen && (
                  <div style={{ padding: "0 18px 16px", borderTop: "1px solid #f0f2f8", paddingTop: 14, display: "flex", flexDirection: "column", gap: 14, animation: "msgIn 0.2s ease" }}>
                    {fields.map((f: any) => (
                      <div key={f.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#5a6480", fontFamily: M }}>{f.label}</span>
                          <span style={{ fontSize: 10, color: color, fontFamily: M, fontWeight: 700 }}>{s[f.key]}{f.unit}</span>
                        </div>
                        {f.type === "slider" ? (
                          <div style={{ position: "relative" }}>
                            <input type="range" min={f.min} max={f.max} step={f.step || 1} value={s[f.key]}
                              onChange={e => update(key, f.key, Number(e.target.value))}
                              style={{ width: "100%", accentColor: color }} />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#b0b8cc", fontFamily: M, marginTop: 2 }}>
                              <span>{f.min}</span><span>{f.max}</span>
                            </div>
                          </div>
                        ) : (
                          <input type="number" min={f.min} max={f.max} value={s[f.key]}
                            onChange={e => update(key, f.key, Number(e.target.value))}
                            style={{ ...P.input, width: 100 }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 我的 Skill Tab */}
      {tab === "mine" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mySkillsLoading ? (
            <div style={{ padding: "40px 0", textAlign: "center" as const, color: "#94a3b8", fontSize: 11, fontFamily: M }}>{t("加载中…", "Loading…")}</div>
          ) : mySkills.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" as const }}>
              <div style={{ fontSize: 28, opacity: 0.1, marginBottom: 12 }}>⚖</div>
              <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: M, marginBottom: 16 }}>{t("还没有购买任何 Skill", "No skills purchased yet")}</div>
              <a href="/skills" style={{ fontSize: 11, fontWeight: 700, color: "#0047cc", background: "#eef2ff", border: "1px solid #c7d3f8", padding: "8px 18px", borderRadius: 7, textDecoration: "none", fontFamily: M }}>
                {t("去 Skill 市场逛逛 →", "Browse Skill Market →")}
              </a>
            </div>
          ) : mySkills.map(sk => {
            const isActive = activeSkillIds.has(sk.id);
            const isToggling = toggling === sk.id;
            return (
              <div key={sk.id} style={{ ...P.card, border: isActive ? "1px solid #0047cc28" : "1px solid #e8ecf4", transition: "border 0.2s" }}>
                <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: isActive ? "#eef2ff" : "#f4f6fa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>⚖</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0a1a3a", fontFamily: M }}>{sk.name}</span>
                      <span style={P.tag(isActive ? "#0047cc" : "#8a95b0")}>{isActive ? "ACTIVE" : "OFF"}</span>
                      {sk.tags?.includes("官方") && <span style={{ fontSize: 7, fontWeight: 700, color: "#0047cc", background: "#eef2ff", border: "1px solid #c7d3f8", padding: "1px 6px", borderRadius: 3, fontFamily: M }}>OFFICIAL</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "#8a95b0", marginTop: 2, fontFamily: M, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{sk.description}</div>
                  </div>
                  <Toggle on={isActive} onChange={v => toggleMySkill(sk.id, v)} />
                  {isToggling && <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: M }}>…</span>}
                </div>
              </div>
            );
          })}
          {mySkills.length > 0 && (
            <div style={{ fontSize: 9, color: "#b0b8cc", fontFamily: M, textAlign: "center" as const, paddingTop: 8 }}>
              {t("同一时间只能激活一个 Skill · 开启新 Skill 会自动关闭当前激活的", "Only one Skill can be active at a time · Enabling a new one disables the current")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const WELCOME: Record<string, string> = {
  zh: "你好，我是你的 Themis 交易代理。\n可以让我分析某个币种，或输入「查看持仓」「账户余额」等指令。",
  en: "Hello, I'm your Themis trading agent.\nAsk me to analyze any token, or type 'positions', 'balance', etc.",
};

const QUICK_PROMPTS_I18N: Record<string, { label: string; msg: string }[]> = {
  zh: [
    { label: "分析 BTC ↗", msg: "分析一下 BTC 现在的市场情况" },
    { label: "分析 ETH ↗", msg: "分析一下 ETH 现在的市场情况" },
    { label: "BTC / ETH / SOL 对比 ↗", msg: "对比分析 BTC、ETH、SOL 当前信号" },
    { label: "查看持仓 ↗", msg: "查看我当前的持仓" },
    { label: "账户余额 ↗", msg: "我的账户余额是多少" },
    { label: "Agent 状态 ↗", msg: "Agent 当前运行状态" },
  ],
  en: [
    { label: "Analyze BTC ↗", msg: "Analyze BTC market conditions" },
    { label: "Analyze ETH ↗", msg: "Analyze ETH market conditions" },
    { label: "BTC / ETH / SOL compare ↗", msg: "Compare BTC, ETH, SOL signals" },
    { label: "Positions ↗", msg: "Show my open positions" },
    { label: "Balance ↗", msg: "What is my account balance" },
    { label: "Agent status ↗", msg: "Agent current status" },
  ],
};

// ── 协作节点面板 ───────────────────────────────────
function CollabPanel({ lang, userId }: { lang: string; userId: string }) {
  const t = (zh: string, en: string) => lang === "zh" ? zh : en;
  const M = "JetBrains Mono, monospace";
  const [node, setNode] = useState<any>(null);
  const [pool, setPool] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("public");
  const [whitelist, setWhitelist] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [strategyBias, setStrategyBias] = useState("technical");
  const [riskPreference, setRiskPreference] = useState("moderate");
  const [msg, setMsg] = useState("");
  const [deployedSkillId, setDeployedSkillId] = useState<string>("");

  const PAIRS = ["BTC", "ETH", "BNB", "SOL", "DOGE", "XRP"];

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetch(`${AGENT_API}/api/collab/node/status?user_id=${userId}`).then(r => r.json()),
      fetch(`${AGENT_API}/api/collab/pool`).then(r => r.json()),
      fetch(`${AGENT_API}/api/skills/agent/current?user_id=${userId}`).then(r => r.json()).catch(() => ({})),
    ]).then(([nodeData, poolData, skillData]) => {
      setNode(nodeData);
      if (nodeData.enabled) {
        setMode(nodeData.mode || "public");
        setSpecializations(nodeData.specializations || []);
        setWhitelist((nodeData.whitelist || []).join(", "));
        setStrategyBias(nodeData.strategy_bias || "technical");
        setRiskPreference(nodeData.risk_preference || "moderate");
      }
      if (skillData?.skill_id) setDeployedSkillId(skillData.skill_id);
      setPool(poolData.nodes || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  async function toggleNode(enable: boolean) {
    setSaving(true); setMsg("");
    try {
      if (enable) {
        const res = await fetch(`${AGENT_API}/api/collab/node/enable`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId, mode, specializations,
            whitelist: whitelist.split(",").map(s => s.trim()).filter(Boolean),
            skills: deployedSkillId ? [deployedSkillId] : [],
            strategy_bias: strategyBias,
            risk_preference: riskPreference,
          }),
        });
        const d = await res.json();
        setNode(d.node);
        setPool(prev => [...prev.filter(n => n.user_id !== userId), { user_id: userId, ...d.node }]);
        setMsg(t("✓ 协作节点已开启，你的 Agent 已加入协作池", "✓ Collaboration node enabled"));
      } else {
        await fetch(`${AGENT_API}/api/collab/node/disable?user_id=${userId}`, { method: "POST" });
        setNode((prev: any) => ({ ...prev, enabled: false }));
        setPool(prev => prev.filter(n => n.user_id !== userId));
        setMsg(t("节点已关闭", "Node disabled"));
      }
    } catch { setMsg(t("操作失败，请重试", "Operation failed")); }
    setSaving(false);
  }

  async function saveSettings() {
    setSaving(true); setMsg("");
    try {
      await fetch(`${AGENT_API}/api/collab/node/settings`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId, mode, specializations,
          whitelist: whitelist.split(",").map(s => s.trim()).filter(Boolean),
          strategy_bias: strategyBias,
          risk_preference: riskPreference,
        }),
      });
      setMsg(t("✓ 设置已保存", "✓ Settings saved"));
    } catch { setMsg(t("保存失败", "Save failed")); }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", fontFamily: M, fontSize: 11,
    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7,
    padding: "9px 12px", outline: "none", color: "#0a1a3a",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: M, fontSize: 9, fontWeight: 700, color: "#0047cc",
    letterSpacing: "0.12em", display: "block", marginBottom: 6,
  };

  if (loading) return (
    <div style={{ padding: 32, fontFamily: M, fontSize: 12, color: "#94a3b8" }}>
      {t("加载中…", "Loading…")}
    </div>
  );

  const isEnabled = node?.enabled;
  const stats = node?.stats || {};

  return (
    <div style={{ padding: "24px", maxWidth: 680, height: "calc(100vh - 52px)", overflowY: "auto", boxSizing: "border-box" as const }}>
      {/* 主开关 */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "22px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: M, fontSize: 14, fontWeight: 800, color: "#0a1a3a", marginBottom: 4 }}>
              {t("协作节点", "Collaboration Node")}
            </div>
            <div style={{ fontFamily: M, fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              {t("开启后你的 Agent 将加入全网协作池，其他用户可借用你的 Skill 能力，你也可以调用他人的 Agent 协同分析", "Enable to join the collaboration pool. Others can use your Skills, and you can delegate tasks to other nodes.")}
            </div>
          </div>
          <button
            onClick={() => toggleNode(!isEnabled)} disabled={saving}
            style={{ marginLeft: 24, flexShrink: 0, fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: isEnabled ? "#dc2626" : "#0047cc", border: "none", borderRadius: 9, padding: "10px 20px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? t("处理中…", "Processing…") : isEnabled ? t("关闭节点", "Disable") : t("开启节点", "Enable")}
          </button>
        </div>

        {/* 链上身份徽章 (ERC-8004) */}
        {isEnabled && node?.onchain_identity && (
          <div style={{ marginTop: 16, padding: "12px 14px", background: "linear-gradient(90deg,#fef3c7,#fef9e7)", border: "1px solid #fcd34d", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: M, fontSize: 10, fontWeight: 800, color: "#78350f", letterSpacing: "0.06em" }}>
                  {t("ERC-8004 链上身份已注册", "ERC-8004 ON-CHAIN IDENTITY")}
                </div>
                <div style={{ fontFamily: M, fontSize: 9, color: "#92400e", marginTop: 2, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                  Agent #{node.onchain_identity.agent_id} · {node.onchain_identity.network}
                </div>
              </div>
            </div>
            <a href={node.onchain_identity.tx_url} target="_blank" rel="noreferrer"
              style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#fff", background: "#b45309", padding: "6px 12px", borderRadius: 6, textDecoration: "none", letterSpacing: "0.08em", flexShrink: 0 }}>
              {t("查看交易 ↗", "VIEW TX ↗")}
            </a>
          </div>
        )}

        {/* 今日统计 */}
        {isEnabled && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 20 }}>
            {[
              { l: t("今日处理", "Today"), v: stats.requests_today ?? 0, c: "#0047cc" },
              { l: t("累计协作", "Total"), v: stats.requests_total ?? 0, c: "#7c3aed" },
              { l: t("共识参与", "Consensus"), v: stats.consensus_participated ?? 0, c: "#059669" },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", textAlign: "center" as const }}>
                <div style={{ fontFamily: M, fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", letterSpacing: "0.1em", marginTop: 4 }}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 节点设置 */}
      {isEnabled && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "22px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
          <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#0047cc", letterSpacing: "0.15em", marginBottom: 18 }}>
            {t("节点设置", "NODE SETTINGS")}
          </div>

          {/* 开放模式 */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>{t("开放模式", "ACCESS MODE")}</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { v: "public", zh: "公开", en: "Public", desc: t("任何人可调用", "Anyone can call") },
                { v: "mutual", zh: "互相添加", en: "Mutual", desc: t("双方互相开放才可协作", "Both must whitelist each other") },
                { v: "whitelist", zh: "白名单", en: "Whitelist", desc: t("仅白名单用户", "Whitelist only") },
              ].map(opt => (
                <button key={opt.v} onClick={() => setMode(opt.v)}
                  style={{ flex: 1, padding: "10px 8px", borderRadius: 9, border: `1px solid ${mode === opt.v ? "#0047cc" : "#e2e8f0"}`, background: mode === opt.v ? "#eef2ff" : "#fff", cursor: "pointer", textAlign: "center" as const }}>
                  <div style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: mode === opt.v ? "#0047cc" : "#64748b" }}>{lang === "zh" ? opt.zh : opt.en}</div>
                  <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", marginTop: 3 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 白名单 */}
          {(mode === "whitelist" || mode === "mutual") && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{t("白名单用户 ID（逗号分隔）", "WHITELIST USER IDs (comma separated)")}</label>
              <input style={inputStyle} value={whitelist} onChange={e => setWhitelist(e.target.value)} placeholder="user_abc123, user_xyz456" />
            </div>
          )}

          {/* 专注方向 */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>{t("我的专注方向", "MY SPECIALIZATIONS")}</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" as const }}>
              {PAIRS.map(p => (
                <button key={p} onClick={() => setSpecializations(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  style={{ fontFamily: M, fontSize: 10, fontWeight: specializations.includes(p) ? 700 : 400, color: specializations.includes(p) ? "#0047cc" : "#64748b", background: specializations.includes(p) ? "#eef2ff" : "#f8fafc", border: `1px solid ${specializations.includes(p) ? "#0047cc" : "#e2e8f0"}`, borderRadius: 7, padding: "6px 14px", cursor: "pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 分析风格 */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>{t("分析风格", "ANALYSIS STYLE")}</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { v: "technical", zh: "技术面", en: "Technical" },
                { v: "onchain",   zh: "链上数据", en: "On-chain" },
                { v: "macro",     zh: "宏观策略", en: "Macro" },
              ].map(opt => (
                <button key={opt.v} onClick={() => setStrategyBias(opt.v)}
                  style={{ flex: 1, padding: "9px 8px", borderRadius: 9, border: `1px solid ${strategyBias === opt.v ? "#0047cc" : "#e2e8f0"}`, background: strategyBias === opt.v ? "#eef2ff" : "#fff", cursor: "pointer", fontFamily: M, fontSize: 10, fontWeight: strategyBias === opt.v ? 700 : 400, color: strategyBias === opt.v ? "#0047cc" : "#64748b" }}>
                  {lang === "zh" ? opt.zh : opt.en}
                </button>
              ))}
            </div>
          </div>

          {/* 风险偏好 */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{t("风险偏好", "RISK PREFERENCE")}</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { v: "conservative", zh: "保守型", en: "Conservative" },
                { v: "moderate",     zh: "稳健型", en: "Moderate" },
                { v: "aggressive",   zh: "激进型", en: "Aggressive" },
              ].map(opt => (
                <button key={opt.v} onClick={() => setRiskPreference(opt.v)}
                  style={{ flex: 1, padding: "9px 8px", borderRadius: 9, border: `1px solid ${riskPreference === opt.v ? "#0047cc" : "#e2e8f0"}`, background: riskPreference === opt.v ? "#eef2ff" : "#fff", cursor: "pointer", fontFamily: M, fontSize: 10, fontWeight: riskPreference === opt.v ? 700 : 400, color: riskPreference === opt.v ? "#0047cc" : "#64748b" }}>
                  {lang === "zh" ? opt.zh : opt.en}
                </button>
              ))}
            </div>
          </div>

          {msg && (
            <div style={{ padding: "9px 14px", borderRadius: 8, background: msg.startsWith("✓") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.startsWith("✓") ? "#bbf7d0" : "#fecaca"}`, fontFamily: M, fontSize: 11, color: msg.startsWith("✓") ? "#166534" : "#dc2626", marginBottom: 12 }}>
              {msg}
            </div>
          )}

          <button onClick={saveSettings} disabled={saving}
            style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: saving ? "#94a3b8" : "#0047cc", border: "none", borderRadius: 9, padding: "11px 28px", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? t("保存中…", "Saving…") : t("保存设置", "Save Settings")}
          </button>
        </div>
      )}

      {/* 协作池 */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "#0a1a3a" }}>{t("当前协作池", "Collaboration Pool")}</span>
          <span style={{ fontFamily: M, fontSize: 10, color: "#94a3b8" }}>{pool.length} {t("个节点在线", "nodes online")}</span>
        </div>
        {pool.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center" as const, fontFamily: M, fontSize: 11, color: "#94a3b8" }}>
            {t("暂无公开节点，成为第一个开启协作的用户！", "No public nodes yet. Be the first to enable collaboration!")}
          </div>
        ) : (
          <div>
            {pool.map((n, i) => (
              <div key={n.user_id} style={{ padding: "14px 20px", borderBottom: i < pool.length - 1 ? "1px solid #f1f5f9" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: M, fontSize: 11, fontWeight: 600, color: "#0a1a3a", marginBottom: 4 }}>
                    {n.user_id === userId ? `${t("我的节点", "My Node")} ·` : ""} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{n.user_id.slice(0, 18)}…</span>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
                    {(n.specializations || []).map((s: string) => (
                      <span key={s} style={{ fontFamily: M, fontSize: 8, color: "#0047cc", background: "#eef2ff", border: "1px solid #c7d3f8", padding: "2px 7px", borderRadius: 8 }}>{s}</span>
                    ))}
                    {(n.skills || []).map((s: string) => (
                      <span key={s} style={{ fontFamily: M, fontSize: 8, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "2px 7px", borderRadius: 8 }}>Skill</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                  <div style={{ fontFamily: M, fontSize: 10, color: "#059669", fontWeight: 700 }}>{n.stats?.requests_total ?? 0} {t("次协作", "collabs")}</div>
                  <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{n.mode === "public" ? t("公开", "Public") : t("受限", "Restricted")}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentPage() {
  const { user } = useUser();
  const uid = () => user?.id ? `?user_id=${user.id}` : "";
  const uidParam = () => user?.id ? `user_id=${user.id}` : "";

  const [lang, setLangState] = useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("themis_lang") || "en";
  });

  // 监听跨页面语言切换
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "themis_lang" && e.newValue) setLangState(e.newValue);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setLang = (l: string) => {
    setLangState(l);
    localStorage.setItem("themis_lang", l);
  };

  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome", role: "agent", type: "text",
    content: WELCOME["en"],
  }]);

  // 欢迎消息随语言切换更新
  useEffect(() => {
    setMessages(prev => prev.map(m => m.id === "welcome" ? { ...m, content: WELCOME[lang] || WELCOME["zh"] } : m));
  }, [lang]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingCommand, setLoadingCommand] = useState("");
  const [liveThinkingLog, setLiveThinkingLog] = useState<string[]>([]);
  const [confirmPending, setConfirmPending] = useState<{ tool: string; args: Record<string, any>; sessionId: string } | null>(null);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [tokenQuota, setTokenQuota] = useState<{ used: number; limit: number; remaining: number; plan: string; tokensThisTurn: number } | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const addMsgRef = useRef<((msg: Omit<Message, "id">) => void) | null>(null);
  const [activeNav, setActiveNav] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p) return p;
    }
    return "chat";
  });
  const [showSlash, setShowSlash] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUp.current = distFromBottom > 80;
  }, []);

  // RAF 循环：loading 或打字期间每帧跟随底部，用户上滚后自动暂停
  useEffect(() => {
    if (!loading && !isTyping) return;
    let rafId: number;
    const tick = () => {
      if (!userScrolledUp.current) {
        const el = messagesContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [loading, isTyping]);

  // 新消息到达时平滑滚动到底（非 loading 态，如欢迎消息等）
  useEffect(() => {
    if (loading) return;
    if (!userScrolledUp.current) {
      messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  // textarea 自增高
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  // 点击外部关闭斜杠菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setShowSlash(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await fetch(`${AGENT_API}/api/agent/status${uid()}`);
        setStatus(await r.json());
      } catch {}
    };
    fetch_();
    const t = setInterval(fetch_, 30000);
    return () => clearInterval(t);
  }, [user?.id]);

  // 初始化：读取监控状态
  useEffect(() => {
    fetch(`${AGENT_API}/api/agent/monitoring`)
      .then(r => r.json())
      .then(d => setMonitoring(d.enabled))
      .catch(() => {});
  }, []);

  // 初始化 + 每次对话后刷新 token 配额
  useEffect(() => {
    if (!user?.id) return;
    fetch(`${AGENT_API}/api/agent/token-quota?user_id=${user.id}`)
      .then(r => r.json())
      .then(d => { if (!d.login_required) setTokenQuota({ used: d.used, limit: d.limit, remaining: d.remaining, plan: d.plan, tokensThisTurn: 0 }); })
      .catch(() => {});
  }, [user?.id]);

  // SSE 连接：监控开启时建立，关闭时断开
  useEffect(() => {
    if (!monitoring) {
      sseRef.current?.close();
      sseRef.current = null;
      return;
    }
    const es = new EventSource(`${AGENT_API}/api/agent/stream`);
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === "signal") {
          addMsgRef.current?.({ role: "agent", type: "verdict", content: "", data: d, isPush: true });
          if (Notification.permission === "granted") {
            new Notification(`Themis · ${d.symbol} 信号`, {
              body: `${d.decision?.action === "open_long" ? "↑ 做多" : "↓ 做空"} · 置信度 ${d.verdict?.confidence}%`,
            });
          }
        }
      } catch {}
    };
    es.onerror = () => { es.close(); sseRef.current = null; };
    return () => { es.close(); sseRef.current = null; };
  }, [monitoring]);

  const toggleMonitoring = async () => {
    const next = !monitoring;
    setMonitoringLoading(true);
    try {
      // 开启前检查 watchlist 是否为空
      if (next) {
        const wlRes = await fetch(`${AGENT_API}/api/agent/watchlist`).then(r => r.json()).catch(() => ({ watchlist: [] }));
        const enabledSymbols = (wlRes.watchlist || []).filter((w: WatchItem) => w.enabled);
        if (enabledSymbols.length === 0) {
          addMsg({
            role: "agent", type: "text",
            content: lang === "zh"
              ? "⚠️ 还没有配置监控组合。\n\n请先前往左侧「监控组合」页面，添加你想监控的代币（最多4个），保存后再开启信号监控。"
              : "⚠️ No watchlist configured.\n\nPlease go to 'Watchlist' in the left panel, add up to 4 tokens, save, then enable monitoring.",
          });
          setMonitoringLoading(false);
          // 高亮跳转到监控组合页
          setActiveNav("symbols");
          return;
        }
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
      }
      await fetch(`${AGENT_API}/api/agent/monitoring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next, interval_minutes: 30, lang }),
      });
      setMonitoring(next);
      if (next) {
        addMsg({
          role: "agent", type: "text",
          content: lang === "zh"
            ? "✅ 信号监控已开启。\n\n正在对监控组合进行首次全量扫描，结果将立即推送…\n后续每30分钟自动扫描，仅在发现交易信号时推送。"
            : "✅ Signal monitoring enabled.\n\nRunning initial scan on your watchlist, results will be pushed shortly…\nSubsequent scans every 30 min, only actionable signals will be pushed.",
        });
      } else {
        addMsg({ role: "agent", type: "text", content: "⏹ 信号监控已停止。" });
      }
    } catch {
      addMsg({ role: "agent", type: "error", content: "监控状态切换失败，请检查后端连接" });
    }
    setMonitoringLoading(false);
  };

  const addMsg = useCallback((msg: Omit<Message, "id">) => {
    setMessages(p => [...p, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
  }, []);
  addMsgRef.current = addMsg;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setLoading(true);
    setLoadingCommand(trimmed);
    setLiveThinkingLog([]);
    userScrolledUp.current = false;
    addMsg({ role: "user", type: "text", content: trimmed });

    const collectedLog: string[] = [];

    try {
      const r = await fetch(`${AGENT_API}/api/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, lang, user_id: user?.id || "" }),
      });

      const reader = r.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // 解析 SSE 行
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const event = JSON.parse(raw);
            if (event.type === "thinking") {
              collectedLog.push(event.text);
              setLiveThinkingLog(prev => [...prev, event.text]);
            } else if (event.type === "confirm") {
              setConfirmPending({ tool: event.tool, args: event.args, sessionId: event.session_id });
            } else if (event.type === "token_usage") {
              setTokenQuota({ used: event.used, limit: event.limit, remaining: event.remaining, plan: event.plan, tokensThisTurn: event.tokens_this_turn });
            } else if (event.type === "login_required") {
              addMsg({ role: "agent", type: "error", content: lang === "zh" ? "请先登录账户后再使用 Agent。" : "Please sign in to use Agent." });
            } else if (event.type === "quota_exceeded") {
              setQuotaExceeded(true);
              addMsg({ role: "agent", type: "error", content: lang === "zh" ? `本月 Agent token 配额已用尽（${event.plan} 套餐：${(event.limit / 1_000_000).toFixed(0)}M tokens/月）。请升级套餐继续使用。` : `Monthly Agent token quota exhausted (${event.plan} plan: ${(event.limit / 1_000_000).toFixed(0)}M tokens/mo). Please upgrade to continue.` });
            } else if (event.type === "reply") {
              const thinkingLog = [...collectedLog];
              setIsTyping(true);
              addMsg({ role: "agent", type: "text", content: event.text || "已完成", thinkingLog });
            }
          } catch {}
        }
      }
    } catch {
      addMsg({ role: "agent", type: "error", content: "连接 Agent 失败，请检查 API 是否运行" });
    }

    setLiveThinkingLog([]);
    setLoading(false);
    inputRef.current?.focus();
  };

  const execute = async (data: any) => {
    addMsg({ role: "user", type: "text", content: "确认开仓" });
    setLoading(true);
    try {
      const v = data.verdict;
      const decision = data.decision;
      const parseP = (val: any) => {
        const s = String(val).replace(/,/g, "");
        if (s.includes("-") && !s.startsWith("-")) {
          const pts = s.split("-");
          return (parseFloat(pts[0]) + parseFloat(pts[1])) / 2;
        }
        return parseFloat(s) || 0;
      };
      const r = await fetch(`${AGENT_API}/api/agent/execute${uid()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verdict_id: v.verdict_id || "",
          symbol: v.symbol,
          action: decision.action,
          entry_price: parseP(v.entry_price),
          stoploss: parseP(v.stoploss),
          target1: parseP(v.target1),
          target2: parseP(v.target2),
          confidence: v.confidence,
          regime: v.regime,
          size_pct: decision.size_pct || 0.5,
          leverage: 5,
        }),
      });
      const d = await r.json();
      if (d.success) {
        const dir = decision.action === "open_short" ? (lang === "zh" ? "做空" : "Short") : (lang === "zh" ? "做多" : "Long");
        const sym = `${v.symbol}USDT`;
        addMsg({ role: "agent", type: "execute_success", content: lang === "zh"
          ? `已执行${dir} ${sym}\n数量 ${d.quantity} · 保证金 $${d.margin_required} · 监控已启动`
          : `${dir} ${sym} executed\nQty ${d.quantity} · Margin $${d.margin_required} · Monitoring started`,
          data: d });
      } else {
        const reason = d.reason
          ? (Array.isArray(d.reason) ? d.reason.join("；") : String(d.reason))
          : d.detail || (lang === "zh" ? "未知错误，请检查交易所连接和余额" : "Unknown error, check exchange connection and balance");
        addMsg({ role: "agent", type: "error", content: lang === "zh" ? `开仓失败：${reason}` : `Trade failed: ${reason}` });
      }
    } catch {
      addMsg({ role: "agent", type: "error", content: lang === "zh" ? "执行失败，请检查连接" : "Execution failed, check connection" });
    }
    setLoading(false);
  };

  const S: Record<string, any> = {
    root: { height: "100vh", display: "flex", background: "#ffffff", fontFamily: "JetBrains Mono, monospace", overflow: "hidden" },
    sidebar: { width: 256, background: "#fff", borderRight: "1px solid #e8ecf4", display: "flex", flexDirection: "column", flexShrink: 0 },
    sbTop: { padding: "20px 18px 16px" },
    brand: { display: "flex", alignItems: "center", gap: 8, marginBottom: 20 },
    dot: { width: 7, height: 7, borderRadius: "50%", background: status?.status === "online" ? "#22c55e" : "#e2e6ef", flexShrink: 0 },
    brandName: { fontSize: 11, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.14em" },
    statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 },
    statCard: { background: "#f4f6fc", borderRadius: 8, padding: "9px 11px" },
    nav: { padding: "8px 10px", flex: 1, overflowY: "auto" as const },
    navGroup: { marginBottom: 18 },
    navLabel: { fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.14em", padding: "0 8px", marginBottom: 5, display: "block" },
    sbFooter: { padding: "14px 18px", borderTop: "1px solid #e8ecf4" },
    autoBtn: { width: "100%", padding: 9, borderRadius: 8, background: "none", border: "1px solid #ffcdd2", color: "#d63b3b", fontSize: 10, fontFamily: "JetBrains Mono, monospace", cursor: "pointer", letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700 },
    main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" as const },
    topbar: { height: 52, borderBottom: "1px solid #e8ecf4", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0 },
    messages: { flex: 1, overflowY: "auto" as const, padding: "28px 0 12px", background: "#ffffff", backgroundImage: "radial-gradient(circle, #e8ecf4 1px, transparent 1px)", backgroundSize: "24px 24px" },
    msgInner: { padding: "0 28px", display: "flex", flexDirection: "column", gap: 20 },
    quickRow: { padding: "8px 28px", borderTop: "1px solid #e8ecf4", display: "flex", gap: 6, overflowX: "auto" as const, background: "#fff", flexShrink: 0 },
    inputArea: { padding: "0 0 20px", background: "transparent", flexShrink: 0, paddingLeft: "calc((100% - 760px) / 2)", paddingRight: "calc((100% - 760px) / 2)" },
    inputWrap: { display: "flex", flexDirection: "column", background: "#ffffff", border: "1.5px solid #e2e6ef", borderRadius: 16, padding: "12px 14px 8px 16px", transition: "border-color 0.15s", gap: 8, boxShadow: "0 8px 40px rgba(0,20,80,0.13), 0 2px 8px rgba(0,20,80,0.07)" },
  };

  return (
    <div style={S.root}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.sbTop}>
          <div style={S.brand}>
            <img src="/themis-logo.png" alt="Themis" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <div style={S.brandName}>THEMIS · AGENT</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <div style={S.dot} />
                <span style={{ fontSize: 8, color: "#b0b8cc", letterSpacing: "0.08em" }}>{status?.status === "online" ? "ONLINE" : "OFFLINE"}</span>
              </div>
            </div>
          </div>
          <div style={S.statsGrid}>
            {[
              { v: status?.balance_usdt != null ? `$${status.balance_usdt.toLocaleString()}` : "—", l: "BALANCE" },
              { v: "—", l: "TODAY P&L", c: "#d63b3b" },
              { v: status ? String(status.open_positions) : "0", l: "POSITIONS" },
              { v: status?.mode ? status.mode.toUpperCase() : "—", l: "MODE", c: "#0047cc" },
            ].map(({ v, l, c }) => (
              <div key={l} style={S.statCard}>
                <div style={{ fontSize: 14, fontWeight: 700, color: c || "#0a1a3a", lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 9, color: "#8a95b0", letterSpacing: "0.07em", marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={S.nav}>
          {NAV_ITEMS.map(({ group, items }) => (
            <div key={group} style={S.navGroup}>
              <span style={S.navLabel}>{group}</span>
              {items.map(({ id, icon, zh, en }) => (
                <button key={id} onClick={() => setActiveNav(id)}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 8px", borderRadius: 7, fontSize: 12, color: activeNav === id ? "#0047cc" : "#5a6480", border: "none", background: activeNav === id ? "#eef2ff" : "none", width: "100%", textAlign: "left", cursor: "pointer", fontWeight: activeNav === id ? 700 : 400, fontFamily: "JetBrains Mono, monospace" }}>
                  <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize: 15, width: 16, textAlign: "center", flexShrink: 0 }} />
                  {lang === "zh" ? zh : en}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={S.sbFooter}>
          {/* 信号监控开关 */}
          <button onClick={toggleMonitoring} disabled={monitoringLoading}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, marginBottom: 8, cursor: "pointer",
              background: monitoring ? "#0a1a3a" : "none",
              border: monitoring ? "1px solid #1a3a6a" : "1px solid #e2e6ef",
              color: monitoring ? "#4ade80" : "#5a6480",
              fontSize: 10, fontFamily: "JetBrains Mono, monospace",
              display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 700,
              transition: "all 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: monitoring ? "#4ade80" : "#e2e6ef",
                boxShadow: monitoring ? "0 0 6px #4ade80" : "none", flexShrink: 0 }}
                className={monitoring ? "pulse-dot" : ""} />
              {monitoringLoading
                ? (lang === "zh" ? "切换中..." : "Switching...")
                : monitoring
                  ? (lang === "zh" ? "监控运行中" : "Monitoring ON")
                  : (lang === "zh" ? "开启信号监控" : "Start Monitoring")}
            </div>
            <Toggle on={monitoring} onChange={() => {}} />
          </button>
          {/* 全自动托管 */}
          <button style={S.autoBtn}>
            <i className="ti ti-robot" aria-hidden="true" style={{ fontSize: 13 }} />
            {lang === "zh" ? "全自动托管" : "Full-Auto Mode"}
          </button>

          {/* Token 配额进度条 */}
          {tokenQuota && tokenQuota.limit > 0 && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#f8f9ff", border: "1px solid #e8ecf4", borderRadius: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.1em", fontFamily: "JetBrains Mono, monospace" }}>
                  AGENT TOKENS
                </span>
                <span style={{ fontSize: 8, color: "#5a6480", fontFamily: "JetBrains Mono, monospace" }}>
                  {tokenQuota.plan.toUpperCase()}
                </span>
              </div>
              <div style={{ height: 4, background: "#e2e6ef", borderRadius: 2, overflow: "hidden", marginBottom: 5 }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min((tokenQuota.used / tokenQuota.limit) * 100, 100).toFixed(1)}%`,
                  background: tokenQuota.used / tokenQuota.limit > 0.9 ? "#dc2626" : tokenQuota.used / tokenQuota.limit > 0.7 ? "#f59e0b" : "#0047cc",
                  borderRadius: 2,
                  transition: "width 0.6s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 8, color: "#b0b8cc", fontFamily: "JetBrains Mono, monospace" }}>
                  {(tokenQuota.used / 1_000_000).toFixed(2)}M {lang === "zh" ? "已用" : "used"}
                </span>
                <span style={{ fontSize: 8, color: "#b0b8cc", fontFamily: "JetBrains Mono, monospace" }}>
                  {(tokenQuota.limit / 1_000_000).toFixed(0)}M {lang === "zh" ? "总量" : "total"}
                </span>
              </div>
              {tokenQuota.tokensThisTurn > 0 && (
                <div style={{ marginTop: 4, fontSize: 8, color: "#0047cc", fontFamily: "JetBrains Mono, monospace" }}>
                  ↑ {lang === "zh" ? "本次" : "this turn"} +{tokenQuota.tokensThisTurn.toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={S.main}>
        {/* Topbar */}
        <div style={S.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={{ fontSize: 11, color: "#0047cc", background: "#eef2ff", border: "1px solid #c7d3f8", padding: "4px 10px", borderRadius: 6, textDecoration: "none", fontFamily: "JetBrains Mono, monospace" }}>← {lang === "zh" ? "返回" : "Back"}</Link>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.04em" }}>
              {lang === "zh"
                ? ({"chat":"对话","positions":"持仓管理","history":"交易历史","evolution":"进化报告","symbols":"监控组合","risk":"风控参数","exchange":"交易所绑定","skill":"Skill 配置","collab":"协作节点"}[activeNav] || "对话")
                : ({"chat":"Chat","positions":"Positions","history":"Trade History","evolution":"Evolution","symbols":"Watchlist","risk":"Risk Control","exchange":"Exchange","skill":"Skill Config","collab":"Collab Node"}[activeNav] || "Chat")
              }
            </span>
            {activeNav === "chat" && <span style={{ padding: "3px 10px", borderRadius: 20, background: "#eef2ff", border: "1px solid #c7d3f8", fontSize: 10, color: "#0047cc", fontWeight: 700 }}>{lang === "zh" ? "半自动模式" : "Semi-Auto"}</span>}
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {[
              { l: "BTC", v: status?.btc_price != null ? `$${Number(status.btc_price).toLocaleString()}` : "—" },
              { l: "ETH", v: status?.eth_price != null ? `$${Number(status.eth_price).toLocaleString()}` : "—" },
              { l: "F&G", v: status?.fear_greed != null ? String(status.fear_greed) : "—", c: status?.fear_greed != null ? (status.fear_greed >= 60 ? "#059669" : status.fear_greed <= 40 ? "#d63b3b" : "#f59e0b") : undefined },
            ].map(({ l, v, c }) => (
              <span key={l} style={{ fontSize: 11, color: "#8a95b0", fontFamily: "JetBrains Mono, monospace" }}>
                {l} <b style={{ color: c || "#0a1a3a", fontWeight: 700 }}>{v}</b>
              </span>
            ))}
            {/* 语言切换 */}
            <div style={{ display: "flex", gap: 2, background: "#f4f6fc", borderRadius: 6, padding: 2 }}>
              {["EN", "ZH"].map(l => (
                <button key={l} onClick={() => setLang(l.toLowerCase())}
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: lang === l.toLowerCase() ? "#fff" : "rgba(10,26,58,0.4)", background: lang === l.toLowerCase() ? "#0047cc" : "none", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", transition: "all 0.15s" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 非对话页面面板 */}
        {activeNav !== "chat" && (
          <div style={{ position: "absolute", inset: 0, top: 52, overflowY: "auto", background: "#fff" }}>
            {activeNav === "positions" && <PositionsPanel lang={lang} onCloseNav={(sym, tradeId) => {
              setInput(lang === "zh" ? `平仓 ${sym}，trade_id: ${tradeId}` : `Close position ${sym}, trade_id: ${tradeId}`);
              setActiveNav("chat");
            }} />}
            {activeNav === "history" && <TradesPanel lang={lang} />}
            {activeNav === "evolution" && <EvolutionPanel lang={lang} />}
            {activeNav === "symbols" && <SymbolsPanel lang={lang} />}
            {activeNav === "risk" && <RiskPanel lang={lang} />}
            {activeNav === "exchange" && <ExchangePanel status={status} lang={lang} />}
            {activeNav === "skill" && <SkillPanel lang={lang} />}
            {activeNav === "collab" && <CollabPanel lang={lang} userId={user?.id || ""} />}
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} onScroll={handleMessagesScroll} style={{ ...S.messages, display: activeNav === "chat" ? undefined : "none" }}>
          <div style={S.msgInner}>
            {messages.map((msg, msgIdx) => (
              <div key={msg.id} className="msg-enter" style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {/* 常驻推理气泡（done 态，仅 agent 消息且有 thinkingLog 时显示） */}
                {msg.role === "agent" && msg.thinkingLog && msg.thinkingLog.length > 0 && (
                  <ThinkingBubble liveLog={msg.thinkingLog} done={true} lang={lang} />
                )}
                {msg.role === "agent" && msg.type !== "verdict" && !msg.thinkingLog && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.12em", marginBottom: 5 }}>THEMIS AGENT</div>
                )}
                {msg.type === "verdict" && msg.data ? (
                  <>
                    {msg.isPush && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, animation: "msgIn 0.3s ease" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} className="pulse-dot" />
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#4ade80", letterSpacing: "0.12em", fontFamily: "JetBrains Mono, monospace", background: "#0a1a3a", padding: "2px 8px", borderRadius: 4 }}>
                          AGENT 主动推送 · {new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                    <VerdictBubble data={msg.data} onExecute={execute} lang={lang} />
                  </>
                ) : msg.type === "positions" ? (
                  <ChatPositionsMessage trades={msg.data?.trades || []} lang={lang} onGoPositions={() => setActiveNav("positions")} />
                ) : msg.type === "execute_success" ? (
                  <div style={{ background: "#fff", border: "1px solid #e8ecf4", borderRadius: "3px 14px 14px 14px", padding: "11px 16px", boxShadow: "0 1px 4px rgba(0,40,120,0.04)" }}>
                    <div style={{ fontSize: 13, color: "#2a3350", whiteSpace: "pre-line", lineHeight: 1.7 }}>{msg.content}</div>
                    <div style={{ marginTop: 8, padding: "7px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 11, color: "#059669", fontWeight: 700 }}>
                      ✓ 监控线程已启动，将自动跟踪止损止盈
                    </div>
                  </div>
                ) : msg.type === "error" ? (
                  <div style={{ padding: "10px 14px", background: "#fff0f0", border: "1px solid #fecaca", borderRadius: "3px 14px 14px 14px", fontSize: 12, color: "#d63b3b" }}>
                    {msg.content}
                  </div>
                ) : msg.role === "user" ? (
                  <div style={{ padding: "10px 16px", borderRadius: "14px 14px 3px 14px", background: "#0047cc", fontSize: 12, color: "#fff", lineHeight: 1.7, whiteSpace: "pre-line", maxWidth: 520, alignSelf: "flex-end", boxShadow: "0 2px 12px rgba(0,71,204,0.25)" }}>
                    {msg.content}
                  </div>
                ) : (
                  <div style={{ paddingLeft: 12, borderLeft: "2px solid #0047cc", maxWidth: 580 }}>
                    <MarkdownTypewriter
                      text={msg.content}
                      speed={12}
                      onDone={msgIdx === messages.length - 1 ? () => setIsTyping(false) : undefined}
                    />
                  </div>
                )}
              </div>
            ))}
            {loading && <ThinkingBubble liveLog={liveThinkingLog} done={false} lang={lang} />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input — 仅对话页面 */}
        {/* CONFIRM 弹窗 */}
        {confirmPending && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(10,26,58,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(3px)" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 440, width: "90%", boxShadow: "0 24px 80px rgba(0,20,80,0.2)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.14em", marginBottom: 10 }}>THEMIS AGENT · {lang === "zh" ? "请求执行交易" : "TRADE CONFIRMATION REQUIRED"}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1a3a", marginBottom: 16 }}>
                {lang === "zh" ? "Agent 请求执行以下操作" : "Agent requests the following action"}
              </div>
              <div style={{ background: "#0d1117", borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontFamily: "JetBrains Mono, monospace" }}>
                <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 700, marginBottom: 8 }}>{confirmPending.tool}</div>
                {Object.entries(confirmPending.args).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 12, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "#6b7280", minWidth: 80 }}>{k}</span>
                    <span style={{ fontSize: 11, color: "#d1d5db" }}>{String(v)}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#d63b3b", background: "#fff0f0", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 20 }}>
                ⚠️ {lang === "zh" ? "此操作将使用真实资金，不可撤销" : "This action uses real funds and cannot be undone"}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={async () => {
                    await fetch(`${AGENT_API}/api/agent/confirm/${confirmPending.sessionId}`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ approved: false }),
                    });
                    setConfirmPending(null);
                  }}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid #e2e6ef", background: "#fff", color: "#5a6480", fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", cursor: "pointer" }}>
                  {lang === "zh" ? "拒绝" : "Reject"}
                </button>
                <button
                  onClick={async () => {
                    await fetch(`${AGENT_API}/api/agent/confirm/${confirmPending.sessionId}`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ approved: true }),
                    });
                    setConfirmPending(null);
                  }}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#0047cc", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", cursor: "pointer" }}>
                  {lang === "zh" ? "确认执行" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quota exceeded modal */}
        {quotaExceeded && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,26,58,0.28)" }}
            onClick={() => setQuotaExceeded(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "32px 36px", maxWidth: 400, width: "90%", boxShadow: "0 24px 80px rgba(0,20,80,0.18)", textAlign: "center" as const }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1a3a", marginBottom: 8, fontFamily: "JetBrains Mono, monospace" }}>
                {lang === "zh" ? "本月 Token 配额已用尽" : "Monthly Token Quota Exhausted"}
              </div>
              <div style={{ fontSize: 12, color: "#8a95b0", marginBottom: 24, lineHeight: 1.7, fontFamily: "JetBrains Mono, monospace" }}>
                {lang === "zh"
                  ? `当前套餐（${tokenQuota?.plan || ""}）已达上限。升级套餐获取更多 Agent 使用额度。`
                  : `Your ${tokenQuota?.plan || ""} plan has reached its monthly limit. Upgrade for more Agent access.`}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <a href="/pricing" style={{ padding: "10px 24px", borderRadius: 9, background: "#0047cc", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
                  {lang === "zh" ? "查看套餐 →" : "View Plans →"}
                </a>
                <button onClick={() => setQuotaExceeded(false)} style={{ padding: "10px 20px", borderRadius: 9, background: "#f4f6fc", border: "none", color: "#8a95b0", fontSize: 12, cursor: "pointer", fontFamily: "JetBrains Mono, monospace" }}>
                  {lang === "zh" ? "关闭" : "Close"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeNav !== "chat" ? null : <div style={S.inputArea}>
          <div style={{ position: "relative", width: "100%", maxWidth: 740 }}>
            {/* 斜杠快捷指令浮层 */}
            {showSlash && (
              <div ref={slashMenuRef} style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, background: "#fff", border: "1.5px solid #e2e6ef", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,40,120,0.10)", overflow: "hidden", minWidth: 280, zIndex: 100 }}>
                <div style={{ padding: "8px 12px 6px", fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.12em", borderBottom: "1px solid #f0f2f8" }}>QUICK COMMANDS</div>
                {(QUICK_PROMPTS_I18N[lang] || QUICK_PROMPTS_I18N["en"]).map(({ label, msg }) => (
                  <button key={label} onMouseDown={() => { setInput(msg); setShowSlash(false); setTimeout(() => inputRef.current?.focus(), 0); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#2a3350", fontFamily: "JetBrains Mono, monospace", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f4f6fc")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <span style={{ fontSize: 10, color: "#0047cc", fontWeight: 700, background: "#eef2ff", padding: "1px 6px", borderRadius: 4 }}>/</span>
                    {label.replace(" ↗", "")}
                  </button>
                ))}
              </div>
            )}

            <div style={S.inputWrap}>
              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  const val = e.target.value;
                  setInput(val);
                  setShowSlash(val === "/");
                }}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && !isComposing) { e.preventDefault(); send(input); setShowSlash(false); }
                  if (e.key === "Escape") setShowSlash(false);
                }}
                onFocus={e => { e.currentTarget.parentElement!.style.borderColor = "#0047cc"; }}
                onBlur={e => { e.currentTarget.parentElement!.style.borderColor = "#e2e6ef"; }}
                placeholder={lang === "zh" ? "输入指令，或输入 / 查看快捷命令…" : "Enter command, or type / for shortcuts…"}
                rows={1}
                style={{ flex: 1, background: "none", border: "none", outline: "none", resize: "none", fontSize: 13, color: "#0a1a3a", fontFamily: "JetBrains Mono, monospace", lineHeight: 1.6, minHeight: 26, maxHeight: 200, overflowY: "auto", width: "100%", padding: 0 }}
              />
              {/* 底部工具栏 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button
                  onClick={() => { setShowSlash(s => !s); inputRef.current?.focus(); }}
                  title="快捷指令"
                  style={{ width: 28, height: 28, borderRadius: 7, background: showSlash ? "#eef2ff" : "none", border: showSlash ? "1px solid #c7d3f8" : "1px solid transparent", color: showSlash ? "#0047cc" : "#b0b8cc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, transition: "all 0.15s" }}>
                  <i className="ti ti-command" aria-hidden="true" />
                </button>
                <button onClick={() => { send(input); setShowSlash(false); }} disabled={loading || !input.trim()}
                  style={{ width: 32, height: 32, borderRadius: 9, background: input.trim() && !loading ? "#0047cc" : "#e8ecf4", border: "none", color: input.trim() && !loading ? "#fff" : "#b0b8cc", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, transition: "all 0.15s" }}>
                  <i className="ti ti-send" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 10, color: "#c8cedd", fontFamily: "JetBrains Mono, monospace", width: "100%", maxWidth: "760px", marginLeft: "auto", marginRight: "auto" }}>
            {lang === "zh" ? "Enter 发送 · Shift+Enter 换行 · / 快捷指令" : "Enter to send · Shift+Enter for newline · / for shortcuts"}
          </div>
        </div>}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        body { background-image: none !important; background: #ffffff !important; }
        body::before { display: none !important; }
        *::-webkit-scrollbar{width:4px;height:4px}
        *::-webkit-scrollbar-thumb{background:#e2e6ef;border-radius:2px}
        *::-webkit-scrollbar-track{background:transparent}
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes termLine {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
        .pulse-dot { animation: pulseDot 1.4s ease-in-out infinite; }
        .msg-enter { animation: msgIn 0.35s cubic-bezier(0.4,0,0.2,1) forwards; }
      `}</style>
    </div>
  );
}
