"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AgentAPIPage() {
  const [lang, setLang] = useState("en");
  useEffect(() => { setLang(localStorage.getItem("themis_lang") || "en"); }, []);
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4fb", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(226,232,244,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,244,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "5px 12px", borderRadius: 8, textDecoration: "none" }}>← {t("Back", "返回")}</Link>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.15em" }}>AGENT API</span>
        </div>
        <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 6, padding: 2 }}>
          {["EN","ZH"].map(l => (
            <button key={l} onClick={() => { setLang(l.toLowerCase()); localStorage.setItem("themis_lang", l.toLowerCase()); }}
              style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: lang === l.toLowerCase() ? "#fff" : "rgba(10,26,58,0.4)", background: lang === l.toLowerCase() ? "#0047cc" : "none", border: "none", padding: "4px 10px", borderRadius: 5, cursor: "pointer", transition: "all 0.15s" }}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <div style={{ paddingTop: 52, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px" }}>
        <div style={{ maxWidth: 700, width: "100%", textAlign: "center", position: "relative", zIndex: 1 }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(102,51,204,0.06)", border: "1px solid rgba(102,51,204,0.15)", borderRadius: 20, padding: "5px 16px", marginBottom: 32 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6633cc", opacity: 0.4 }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#6633cc", letterSpacing: "0.15em" }}>{t("COMING SOON", "即将推出")}</span>
          </div>

          <h1 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 40, fontWeight: 700, color: "#0a1a3a", marginBottom: 8, letterSpacing: "-0.01em" }}>
            {t("Agent Subscription API", "Agent 订阅层")}
          </h1>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#6633cc", letterSpacing: "0.2em", marginBottom: 32 }}>THEMIS · AGENT-TO-AGENT</div>

          <p style={{ fontSize: 15, color: "rgba(10,26,58,0.6)", lineHeight: 1.8, marginBottom: 40 }}>
            {t(
              "Themis operates as a professional verdict data provider. Other AI agents can subscribe to real-time verdict signals and use them as strategy inputs — forming an Agent-to-Agent verdict network.",
              "Themis 作为专业裁决数据提供商运营。其他 AI Agent 可以订阅实时裁决信号，将其作为策略输入，形成 Agent-to-Agent 的裁决网络。"
            )}
          </p>

          {/* API preview */}
          <div style={{ background: "#0a1a3a", borderRadius: 12, padding: "20px 24px", marginBottom: 32, textAlign: "left" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", marginBottom: 12 }}>API PREVIEW</div>
            {[
              { method: "GET", path: "/api/v1/verdict/latest?symbol=BTC", desc: t("Latest verdict for any asset", "获取任意资产最新裁决") },
              { method: "GET", path: "/api/v1/verdict/stream", desc: t("SSE real-time verdict stream", "SSE 实时裁决数据流") },
              { method: "GET", path: "/api/v1/verdict/history?limit=24", desc: t("Historical verdicts with accuracy", "历史裁决记录及准确率") },
              { method: "GET", path: "/api/v1/regime/current", desc: t("Current market regime snapshot", "当前市场状态快照") },
            ].map(({ method, path, desc }) => (
              <div key={path} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#00cc66", background: "rgba(0,204,102,0.1)", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>{method}</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#7ab8ff", flex: 1 }}>{path}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{desc}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40, textAlign: "left" }}>
            {[
              { icon: "⚡", en: "Real-time SSE stream", zh: "实时 SSE 数据流" },
              { icon: "🔑", en: "API key authentication", zh: "API Key 鉴权" },
              { icon: "📈", en: "Verdict + confidence + regime", zh: "裁决 + 置信度 + 市场状态" },
              { icon: "🤝", en: "Agent-to-Agent network", zh: "Agent-to-Agent 网络" },
              { icon: "💰", en: "Freemium subscription model", zh: "免费+付费订阅模型" },
              { icon: "📜", en: "On-chain reputation score", zh: "链上声誉评分" },
            ].map(({ icon, en, zh }) => (
              <div key={en} style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 13, color: "rgba(10,26,58,0.65)", fontWeight: 500 }}>{t(en, zh)}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 16, padding: "28px 32px", boxShadow: "0 8px 32px rgba(0,40,120,0.08)" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 12 }}>{t("JOIN THE WAITLIST", "加入候补名单")}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input placeholder={t("Enter your email or agent endpoint", "输入邮箱或 Agent 端点")} style={{ flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#0a1a3a", background: "rgba(0,40,120,0.04)", border: "1.5px solid rgba(102,51,204,0.15)", borderRadius: 8, padding: "11px 14px", outline: "none" }} />
              <button style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: "#fff", background: "#6633cc", border: "none", padding: "11px 20px", borderRadius: 8, cursor: "pointer", letterSpacing: "0.08em" }}>
                {t("APPLY", "申请")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
