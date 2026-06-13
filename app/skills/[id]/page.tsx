"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "../../page";
import { useUser } from "@clerk/nextjs";

const M = "JetBrains Mono, monospace";
const API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:8000";

const TAG_EN: Record<string, string> = {
  "全部": "All", "中低频": "Mid-Low Freq", "高频": "High Freq",
  "7维度": "7-Dimension", "AI裁决": "AI Verdict", "套利": "Arbitrage", "官方": "Official",
};
const translateTag = (tag: string, lang: string) => lang === "en" ? (TAG_EN[tag] || tag) : tag;

const PAIRS  = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"];
const RANGES = ["7D", "30D", "90D", "1Y"];

const CHAIN_OPTIONS = [
  { id: "bsc",     name: "BSC (BNB Chain)" },
  { id: "polygon", name: "Polygon" },
];

export default function SkillDetailPage() {
  const params  = useParams();
  const skillId = params.id as string;
  const { user } = useUser();

  const [lang, setLang]         = useState("zh");
  const [skill, setSkill]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [owned, setOwned]       = useState(false);

  // Backtest
  const [pair,      setPair]     = useState("BTC/USDT");
  const [range,     setRange]    = useState("30D");
  const [btResult,  setBtResult] = useState<any>(null);
  const [btRunning, setBtRunning] = useState(false);
  const [btError,   setBtError]  = useState("");

  // Purchase
  const [showBuy, setShowBuy] = useState(false);
  const [txHash,  setTxHash]  = useState("");
  const [chain,   setChain]   = useState("bsc");
  const [buying,  setBuying]  = useState(false);
  const [buyMsg,  setBuyMsg]  = useState("");

  // Deploy
  const [deployMsg, setDeployMsg] = useState("");

  useEffect(() => {
    const s = localStorage.getItem("themis_lang");
    if (s) setLang(s);
  }, []);

  useEffect(() => {
    fetch(`${API}/api/skills/${skillId}`)
      .then(r => r.json())
      .then(d => { setSkill(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [skillId]);

  useEffect(() => {
    if (!skill) return;
    runBacktest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill, pair, range]);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API}/api/skills/my?user_id=${user.id}`)
      .then(r => r.json())
      .then(d => {
        const ids = new Set((d.skills || []).map((s: any) => s.id));
        setOwned(ids.has(skillId));
      }).catch(() => {});
  }, [user?.id, skillId]);

  const t = (zh: string, en: string) => lang === "zh" ? zh : en;
  const isFree = skill?.price_usdt === 0;
  const canUse = isFree || owned;

  async function runBacktest() {
    setBtRunning(true); setBtError(""); setBtResult(null);
    try {
      const symbol = pair.replace("/", "");
      const res = await fetch(`${API}/api/backtest/run?symbol=${symbol}&skill_id=${skillId}&range_key=${range}&capital=10000&data_source=binance`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Backtest failed");
      setBtResult(d);
    } catch (e: any) {
      setBtError(e.message);
    } finally {
      setBtRunning(false);
    }
  }

  async function purchase() {
    if (!user?.id) { setBuyMsg(t("请先登录", "Please sign in")); return; }
    if (!txHash.trim()) { setBuyMsg(t("请填写交易哈希", "Please enter tx hash")); return; }
    setBuying(true); setBuyMsg("");
    try {
      const res = await fetch(`${API}/api/skills/${skillId}/purchase`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, tx_hash: txHash.trim(), chain }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Purchase failed");
      setOwned(true); setShowBuy(false);
    } catch (e: any) {
      setBuyMsg(e.message);
    } finally {
      setBuying(false);
    }
  }

  async function deployToAgent() {
    if (!user?.id) { setDeployMsg(t("请先登录", "Please sign in")); return; }
    // 免费 Skill 先调 purchase 写入 owned 列表，已拥有的接口会直接返回成功
    if (isFree && !owned) {
      try {
        await fetch(`${API}/api/skills/${skillId}/purchase`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, tx_hash: "", chain: "bsc" }),
        });
      } catch {}
    }
    sessionStorage.setItem("skillTab", "mine");
    window.location.href = "/agent?tab=skill";
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: M, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>Loading…</div>
    </div>
  );
  if (!skill) return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: M, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 12, color: "#dc2626" }}>Skill not found</div>
    </div>
  );

  const stats   = skill.stats || {};
  const isUp    = (btResult?.stats?.total_ret ?? 0) >= 0;
  const equity: number[] = btResult?.equity ?? [];
  const bh: number[]     = btResult?.bh ?? [];

  // SVG chart helpers
  const CW = 620, CH = 220, PX = 44, PY = 20;
  const allPts = [...equity, ...bh];
  const minV   = allPts.length ? Math.min(...allPts) * 0.997 : 0;
  const maxV   = allPts.length ? Math.max(...allPts) * 1.003 : 1;
  const rng    = maxV - minV || 1;
  const n      = equity.length || 1;
  const sx = (i: number) => PX + (i / (n - 1)) * (CW - PX * 2);
  const sy = (v: number) => PY + (1 - (v - minV) / rng) * (CH - PY * 2);
  const toPath = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fa", fontFamily: M, position: "relative", zIndex: 1 }}>
      <SiteNav lang={lang} onLangChange={l => { setLang(l); localStorage.setItem("themis_lang", l); }} />
      <div style={{ paddingTop: 56 }}>

        {/* ── Hero bar ── */}
        <div style={{ background: "#0a1a3a", padding: "24px 48px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/skills" style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: M, textDecoration: "none" }}>
            ← {t("返回市场", "Back to Market")}
          </Link>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 14 }}>
            {/* Title */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                {skill.tags?.includes("官方") && (
                  <span style={{ fontSize: 8, fontWeight: 700, color: "#60a5fa", background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.25)", padding: "2px 8px", borderRadius: 4, fontFamily: M, letterSpacing: "0.1em" }}>OFFICIAL</span>
                )}
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: M }}>{skill.version}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: M, letterSpacing: "-0.02em" }}>{skill.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: M, marginTop: 4 }}>by {skill.developer_name}</div>
            </div>

            {/* Controls row: pair + range + action */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 4 }}>
              {/* Pair tabs */}
              <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: 2, gap: 1 }}>
                {PAIRS.filter(p => skill.supported_pairs?.includes(p.split("/")[0])).map(p => (
                  <button key={p} onClick={() => setPair(p)} disabled={btRunning}
                    style={{ fontFamily: M, fontSize: 9, fontWeight: pair === p ? 700 : 400, color: pair === p ? "#fff" : "rgba(255,255,255,0.3)", background: pair === p ? "rgba(255,255,255,0.14)" : "none", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", transition: "all 0.15s" }}>
                    {p.split("/")[0]}
                  </button>
                ))}
              </div>
              {/* Range tabs */}
              <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: 2, gap: 1 }}>
                {RANGES.map(r => (
                  <button key={r} onClick={() => setRange(r)} disabled={btRunning}
                    style={{ fontFamily: M, fontSize: 9, fontWeight: range === r ? 700 : 400, color: range === r ? "#fff" : "rgba(255,255,255,0.3)", background: range === r ? "rgba(255,255,255,0.14)" : "none", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", transition: "all 0.15s" }}>
                    {r}
                  </button>
                ))}
              </div>
              {/* Divider */}
              <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />
              {/* Action */}
              {canUse ? (
                <div>
                  <button onClick={deployToAgent}
                    style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: "#0047cc", border: "none", borderRadius: 8, padding: "10px 22px", cursor: "pointer" }}>
                    {t("部署到 Agent", "Deploy to Agent")}
                  </button>
                  {deployMsg && <div style={{ marginTop: 6, fontSize: 10, color: "#dc2626", fontFamily: M }}>{deployMsg}</div>}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: M }}>${skill.price_usdt} USDT</span>
                  <button onClick={() => setShowBuy(true)}
                    style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: "#059669", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer" }}>
                    {t("购买解锁", "Purchase")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 0, padding: "28px 48px", alignItems: "start" }}>

          {/* LEFT: Backtest + Prompt */}
          <div style={{ paddingRight: 20, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Backtest chart */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf4", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,20,60,0.05)" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.14em", fontFamily: M }}>BACKTEST · {pair.split("/")[0]} · {range}</span>
                {btRunning && <span style={{ fontSize: 9, color: "#0047cc", fontFamily: M }}>{t("加载中…", "Loading…")}</span>}
                {!btRunning && btResult && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#64748b", fontFamily: M }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: isUp ? "#059669" : "#dc2626", display: "inline-block" }} />
                      Strategy
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#94a3b8", fontFamily: M }}>
                      <span style={{ width: 12, height: 1.5, background: "#cbd5e1", display: "inline-block" }} />
                      B&H
                    </span>
                  </div>
                )}
              </div>
              <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                {btRunning && (
                  <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 11, fontFamily: M }}>
                    {t("拉取历史数据中…", "Fetching historical data…")}
                  </div>
                )}
                {!btRunning && btError && (
                  <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, gap: 12 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: M }}>{t("暂无回测数据", "Backtest data unavailable")}</div>
                    <button onClick={runBacktest} style={{ fontFamily: M, fontSize: 10, color: "#0047cc", background: "#eef2ff", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
                      {t("重新运行", "Retry")}
                    </button>
                  </div>
                )}
                {!btRunning && btResult?.stats && (
                  <>
                    <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", display: "block", minHeight: 180 }}>
                      {[0, 0.25, 0.5, 0.75, 1].map(f => {
                        const y = PY + f * (CH - PY * 2);
                        return <line key={f} x1={PX} x2={CW - PX} y1={y} y2={y} stroke="#f1f5f9" strokeWidth="1" />;
                      })}
                      {bh.length > 1 && <path d={toPath(bh)} fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="4 3" />}
                      {equity.length > 1 && (
                        <path d={`${toPath(equity)} L${sx(n-1).toFixed(1)},${(CH - PY).toFixed(1)} L${PX},${(CH - PY).toFixed(1)} Z`}
                          fill={isUp ? "rgba(5,150,105,0.07)" : "rgba(220,38,38,0.07)"} />
                      )}
                      {equity.length > 1 && (
                        <path d={toPath(equity)} fill="none" stroke={isUp ? "#059669" : "#dc2626"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                      {[0, 0.5, 1].map(f => {
                        const v = maxV - f * rng;
                        const y = PY + f * (CH - PY * 2);
                        return <text key={f} x={PX - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#b0b8cc" fontFamily={M}>{v.toFixed(0)}</text>;
                      })}
                    </svg>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      {[
                        { l: t("总收益", "Total Return"), v: `${isUp ? "+" : ""}${btResult.stats.total_ret.toFixed(2)}%`, c: isUp ? "#059669" : "#dc2626" },
                        { l: t("胜率", "Win Rate"),       v: `${btResult.stats.win_rate.toFixed(0)}%`,                    c: "#0047cc" },
                        { l: "Sharpe",                    v: btResult.stats.sharpe.toFixed(2),                            c: "#0047cc" },
                        { l: t("最大回撤", "Max DD"),     v: `${btResult.stats.max_dd.toFixed(2)}%`,                     c: "#dc2626" },
                      ].map(({ l, v, c }) => (
                        <div key={l} style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 10px", textAlign: "center" as const }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: M, lineHeight: 1 }}>{v}</div>
                          <div style={{ fontSize: 8, color: "#94a3b8", fontFamily: M, marginTop: 5, letterSpacing: "0.08em" }}>{l.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Prompt Template — always rendered, content gated by ownership */}
            {(() => {
              const isOfficial = skill.developer_user_id === "official" || (skill.tags || []).includes("官方");
              const tmpl: string = skill.prompt_template || "";
              const templateVars = Array.from(
                new Set((tmpl.match(/\{\{(\w+)\}\}/g) || []).map((m: string) => m.replace(/[{}]/g, "")))
              ) as string[];
              const previewLines = tmpl ? tmpl.split("\n").slice(0, 3).join("\n") : "";
              const hasTemplate = tmpl.trim().length > 0;

              const renderHighlighted = (text: string) =>
                text.split(/(\{\{[\w]+\}\})/g).map((part: string, i: number) =>
                  /^\{\{[\w]+\}\}$/.test(part)
                    ? <mark key={i} style={{ background: "#f5f3ff", color: "#7c3aed", borderRadius: 3, padding: "0 2px", fontWeight: 700 }}>{part}</mark>
                    : part
                );

              return (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf4", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,20,60,0.05)" }}>
                  {/* Header */}
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.14em", fontFamily: M }}>PROMPT TEMPLATE</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {!isOfficial && templateVars.length > 0 && templateVars.map(v => (
                        <span key={v} style={{ fontFamily: M, fontSize: 8, fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "2px 7px", borderRadius: 10 }}>
                          {`{{${v}}}`}
                        </span>
                      ))}
                      <span style={{ fontFamily: M, fontSize: 8, color: isOfficial ? "#0047cc" : canUse ? "#059669" : "#f59e0b", background: isOfficial ? "#eef2ff" : canUse ? "#f0fdf4" : "#fffbeb", border: `1px solid ${isOfficial ? "#c7d2fe" : canUse ? "#bbf7d0" : "#fde68a"}`, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                        {isOfficial ? t("官方专有", "OFFICIAL") : canUse ? t("已解锁", "UNLOCKED") : t("预览", "PREVIEW")}
                      </span>
                    </div>
                  </div>

                  {isOfficial ? (
                    /* ── Official skill: always hide prompt ── */
                    <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 28, opacity: 0.15 }}>⚡</div>
                      <div style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: "#0a1a3a" }}>
                        {t("该 Skill 使用官方专有策略引擎", "This skill uses the official proprietary strategy engine")}
                      </div>
                      <div style={{ fontFamily: M, fontSize: 10, color: "#94a3b8", textAlign: "center" as const, lineHeight: 1.7, maxWidth: 360 }}>
                        {t("核心逻辑由 Themis 官方团队维护，不对外公开 Prompt 模板", "Core logic is maintained by the Themis team and is not publicly disclosed")}
                      </div>
                    </div>
                  ) : canUse ? (
                    /* ── Unlocked: full content ── */
                    <div style={{ padding: "20px" }}>
                      {hasTemplate ? (
                        <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 12, color: "#1e293b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 18px", lineHeight: 1.8, whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const }}>
                          {renderHighlighted(tmpl)}
                        </pre>
                      ) : (
                        <div style={{ padding: "24px", textAlign: "center" as const, fontFamily: M, fontSize: 11, color: "#94a3b8" }}>
                          {t("该 Skill 使用专有策略引擎，无公开 Prompt 模板", "This skill uses a proprietary strategy engine")}
                        </div>
                      )}

                      {(skill.example_input || skill.example_output) && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                          {skill.example_input && (
                            <div>
                              <div style={{ fontSize: 8, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.12em", fontFamily: M, marginBottom: 8 }}>EXAMPLE INPUT</div>
                              <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 11, color: "#334155", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px", lineHeight: 1.7, whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const }}>{skill.example_input}</pre>
                            </div>
                          )}
                          {skill.example_output && (
                            <div>
                              <div style={{ fontSize: 8, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.12em", fontFamily: M, marginBottom: 8 }}>EXAMPLE OUTPUT</div>
                              <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 11, color: "#334155", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 14px", lineHeight: 1.7, whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const }}>{skill.example_output}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── Locked: blurred preview + CTA ── */
                    <div>
                      <div style={{ position: "relative" as const, padding: "20px 20px 0" }}>
                        <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 12, color: "#1e293b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 18px", lineHeight: 1.8, whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const, maxHeight: 110, overflow: "hidden" }}>
                          {hasTemplate ? renderHighlighted(previewLines) : t("该 Skill 包含完整的 Prompt 模板…", "This skill contains a full prompt template…")}
                        </pre>
                        <div style={{ position: "absolute" as const, bottom: 0, left: 20, right: 20, height: 90, background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 60%, #fff 100%)", pointerEvents: "none" as const, borderRadius: "0 0 10px 10px" }} />
                      </div>
                      <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 22, opacity: 0.2 }}>🔒</div>
                        <div style={{ fontFamily: M, fontSize: 11, color: "#64748b", textAlign: "center" as const, lineHeight: 1.6 }}>
                          {t("购买后解锁完整 Prompt 模板、变量说明及调用示例", "Purchase to unlock the full prompt, variable docs, and usage examples")}
                        </div>
                        {!isFree && (
                          <button onClick={() => setShowBuy(true)} style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: "#0047cc", border: "none", borderRadius: 8, padding: "10px 28px", cursor: "pointer" }}>
                            {t(`解锁完整内容 · $${skill.price_usdt} USDT`, `Unlock Full Access · $${skill.price_usdt} USDT`)}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* RIGHT: Info sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Description */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf4", padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,20,60,0.05)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.14em", marginBottom: 10, fontFamily: M }}>DESCRIPTION</div>
              <div style={{ fontSize: 12, color: "#2a3350", lineHeight: 1.8, fontFamily: M }}>
                {lang === "en"
                  ? (skill.description_en || skill.description)
                  : (skill.description || skill.description_en)}
              </div>
              <div style={{ display: "flex", gap: 5, marginTop: 12, flexWrap: "wrap" as const }}>
                {(skill.tags || []).map((tag: string) => (
                  <span key={tag} style={{ fontSize: 9, color: "#5a6480", background: "#f1f5f9", padding: "3px 9px", borderRadius: 5, fontFamily: M }}>{translateTag(tag, lang)}</span>
                ))}
              </div>
            </div>

            {/* Performance */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf4", padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,20,60,0.05)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.14em", marginBottom: 12, fontFamily: M }}>PERFORMANCE</div>
              {[
                { l: t("胜率", "Win Rate"),   v: stats.win_rate != null ? `${stats.win_rate}%` : "—",     c: "#059669" },
                { l: "Sharpe",                v: stats.sharpe   != null ? stats.sharpe.toFixed(1) : "—",  c: "#0047cc" },
                { l: t("最大回撤", "Max DD"), v: stats.max_dd   != null ? `${stats.max_dd}%` : "—",       c: "#dc2626" },
              ].map(({ l, v, c }, i, arr) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid #f4f6f8" : "none" }}>
                  <span style={{ fontSize: 11, color: "#64748b", fontFamily: M }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: M }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Info */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf4", padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,20,60,0.05)", flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.14em", marginBottom: 12, fontFamily: M }}>INFO</div>
              {[
                { l: t("版本", "Version"),       v: skill.version },
                { l: t("支持币对", "Pairs"),     v: (skill.supported_pairs || []).join(", ") },
                { l: t("支持周期", "Intervals"), v: skill.supported_intervals.join(", ") },
                { l: t("销售量", "Sales"),        v: `${skill.sales_count}` },
              ].map(({ l, v }, i, arr) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < arr.length - 1 ? "1px solid #f4f6f8" : "none" }}>
                  <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: M }}>{l}</span>
                  <span style={{ fontSize: 11, color: "#0a1a3a", fontFamily: M, textAlign: "right" as const, maxWidth: 160 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Owned badge */}
            {owned && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, color: "#059669" }}>✓</span>
                <span style={{ fontSize: 11, color: "#059669", fontFamily: M, fontWeight: 700 }}>{t("已购买", "You own this skill")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Purchase modal */}
      {showBuy && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,26,58,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowBuy(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "32px 36px", maxWidth: 440, width: "90%", boxShadow: "0 24px 80px rgba(0,20,80,0.2)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.14em", marginBottom: 10, fontFamily: M }}>PURCHASE SKILL</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0a1a3a", marginBottom: 4, fontFamily: M }}>{skill.name}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0047cc", fontFamily: M, marginBottom: 20 }}>${skill.price_usdt} USDT</div>

            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: "#94a3b8", fontFamily: M, marginBottom: 6 }}>{t("开发者收款地址", "Developer Wallet")}</div>
              <div style={{ fontSize: 11, color: "#0a1a3a", fontFamily: M, wordBreak: "break-all" as const }}>{skill.developer_wallet}</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#64748b", fontFamily: M, marginBottom: 6 }}>{t("选择链", "Select Chain")}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {CHAIN_OPTIONS.map(c => (
                  <button key={c.id} onClick={() => setChain(c.id)}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${chain === c.id ? "#0047cc" : "#e2e6ef"}`, background: chain === c.id ? "#eef2ff" : "#fff", color: chain === c.id ? "#0047cc" : "#64748b", fontSize: 11, fontFamily: M, cursor: "pointer", fontWeight: chain === c.id ? 700 : 400 }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#64748b", fontFamily: M, marginBottom: 6 }}>Tx Hash</div>
              <input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="0x..."
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e6ef", borderRadius: 8, fontSize: 12, fontFamily: M, outline: "none", boxSizing: "border-box" as const }} />
            </div>

            {buyMsg && <div style={{ fontSize: 11, color: "#dc2626", fontFamily: M, marginBottom: 12 }}>{buyMsg}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowBuy(false)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #e2e6ef", background: "#fff", color: "#64748b", fontSize: 12, fontFamily: M, cursor: "pointer" }}>
                {t("取消", "Cancel")}
              </button>
              <button onClick={purchase} disabled={buying}
                style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: buying ? "#94a3b8" : "#0047cc", color: "#fff", fontSize: 12, fontFamily: M, fontWeight: 700, cursor: buying ? "not-allowed" : "pointer" }}>
                {buying ? t("验证中…", "Verifying…") : t("验证并解锁", "Verify & Unlock")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
