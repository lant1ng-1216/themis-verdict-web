"use client";
import { useState, useEffect } from "react";
import VerdictApp from "./components/VerdictApp";
import Link from "next/link";

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260525_070034_60e5670b-6bb0-402b-a6c1-c9a8c05ae3a4.mp4";

export default function Home() {
  const [started, setStarted] = useState(false);
  const [lang, setLang] = useState("en");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setLang(localStorage.getItem("themis_lang") || "en");
  }, []);

  const handleSetLang = (l: string) => {
    setLang(l);
    localStorage.setItem("themis_lang", l);
  };

  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  if (started) return <VerdictApp onBack={() => setStarted(false)} lang={lang} setLang={handleSetLang} />;

  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>

      {/* Video background */}
      <video autoPlay muted loop playsInline style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}>
        <source src={VIDEO_URL} type="video/mp4" />
      </video>
      <div style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.08)", zIndex: 1 }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, rgba(0,50,150,0.1) 1px, transparent 1px)", backgroundSize: "28px 28px", zIndex: 2, pointerEvents: "none" }} />

      {/* Navigation */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.25)" }}>

        {/* Logo */}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.15em" }}>
          THEMIS<span style={{ color: "#0047cc" }}>·</span>VERDICT
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[
            { href: "/", label: t("Court", "法庭"), active: true, onClick: () => setStarted(true) },
            { href: "/graph", label: t("Live Graph", "关系图谱"), active: false },
            { href: "/feed", label: t("Verdict Feed", "裁决广播"), active: false, soon: true },
            { href: "/agent-api", label: t("Agent API", "Agent API"), active: false, soon: true },
            { href: "/docs", label: t("Docs", "文档"), active: false },
          ].map(({ href, label, active, soon, onClick }) => (
            onClick ? (
              <button key={label} onClick={onClick}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: active ? 700 : 500, color: active ? "#0047cc" : "rgba(10,26,58,0.5)", background: active ? "rgba(0,71,204,0.08)" : "none", border: active ? "1px solid rgba(0,71,204,0.15)" : "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                {label}
              </button>
            ) : (
              <Link key={label} href={href}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: "rgba(10,26,58,0.45)", background: "none", padding: "5px 12px", borderRadius: 6, textDecoration: "none", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s", position: "relative" }}>
                {label}
                {soon && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#6633cc", background: "rgba(102,51,204,0.08)", border: "1px solid rgba(102,51,204,0.2)", padding: "1px 5px", borderRadius: 4, letterSpacing: "0.1em" }}>SOON</span>}
              </Link>
            )
          ))}
        </div>

        {/* Right: lang + live */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", background: "rgba(0,0,0,0.06)", borderRadius: 6, padding: 2 }}>
            {["EN","ZH"].map(l => (
              <button key={l} onClick={() => handleSetLang(l.toLowerCase())}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: lang === l.toLowerCase() ? "#fff" : "rgba(10,26,58,0.4)", background: lang === l.toLowerCase() ? "#0047cc" : "none", border: "none", padding: "4px 10px", borderRadius: 5, cursor: "pointer", transition: "all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00cc66", animation: "pulse 2s ease infinite" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(10,26,58,0.45)", letterSpacing: "0.1em" }}>LIVE</span>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div style={{ position: "relative", zIndex: 3, maxWidth: 580, width: "100%", textAlign: "center", padding: "40px 24px", marginTop: 56 }}>

        {/* Eyebrow */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,71,204,0.1)", border: "1px solid rgba(0,71,204,0.25)", borderRadius: 20, padding: "5px 14px", marginBottom: 28, backdropFilter: "blur(8px)" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0047cc", animation: "pulse 2s ease infinite" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#0047cc", letterSpacing: "0.15em", fontWeight: 600 }}>
            {t("VERDICT PROTOCOL", "裁决协议")}
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(56px,10vw,88px)", fontWeight: 700, color: "#0a1a3a", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 6, textShadow: "0 2px 20px rgba(255,255,255,0.8)" }}>
          THEMIS
        </h1>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(13px,2.5vw,18px)", color: "#0047cc", letterSpacing: "0.4em", marginBottom: 32, fontWeight: 600 }}>
          {t("VERDICT", "裁决")}
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, justifyContent: "center" }}>
          <div style={{ height: 1, width: 48, background: "linear-gradient(90deg, transparent, rgba(0,71,204,0.4))" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(0,40,120,0.4)", letterSpacing: "0.2em" }}>{t("MARKET COURT", "市场法庭")}</span>
          <div style={{ height: 1, width: 48, background: "linear-gradient(90deg, rgba(0,71,204,0.4), transparent)" }} />
        </div>

        {/* Description */}
        <p style={{ fontSize: 15, color: "rgba(10,26,58,0.65)", lineHeight: 1.8, marginBottom: 40, maxWidth: 460, margin: "0 auto 40px" }}>
          {lang === "zh" ? (
            <>基于司法框架的 AI 智能体。从 <strong style={{ color: "#0a1a3a", fontWeight: 600 }}>7个维度</strong>审查市场证据，分类市场状态，输出<strong style={{ color: "#0a1a3a", fontWeight: 600 }}>结构化、可证伪的裁决</strong> — 由 CoinMarketCap 实时数据驱动。</>
          ) : (
            <>A judicial-framework AI agent. Examines <strong style={{ color: "#0a1a3a", fontWeight: 600 }}>7 market dimensions</strong>, classifies regimes, and delivers <strong style={{ color: "#0a1a3a", fontWeight: 600 }}>structured, falsifiable verdicts</strong> — powered by CoinMarketCap real-time data.</>
          )}
        </p>

        {/* Feature pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 44 }}>
          {(lang === "zh"
            ? ["三庭裁决框架", "5种市场状态", "自动校准", "宏观事件", "多币种对比"]
            : ["Three-Court Framework", "5 Market Regimes", "Self-Calibrating", "Macro Events", "Multi-Asset"]
          ).map(f => (
            <span key={f} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#0047cc", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,71,204,0.2)", borderRadius: 6, padding: "4px 12px", letterSpacing: "0.04em", backdropFilter: "blur(8px)" }}>{f}</span>
          ))}
        </div>

        {/* CTA */}
        <button onClick={() => setStarted(true)}
          style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#fff", background: "linear-gradient(135deg,#0047cc,#0066ff)", border: "none", padding: "16px 48px", borderRadius: 8, cursor: "pointer", boxShadow: "0 4px 24px rgba(0,71,204,0.35)", transition: "all 0.2s", textTransform: "uppercase" }}
          onMouseEnter={e => { const el = e.target as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 32px rgba(0,71,204,0.45)"; }}
          onMouseLeave={e => { const el = e.target as HTMLElement; el.style.transform = ""; el.style.boxShadow = "0 4px 24px rgba(0,71,204,0.35)"; }}
        >
          {t("Enter the Court", "进入法庭")}
        </button>

        {/* Footer */}
        <p style={{ marginTop: 40, fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(0,40,120,0.35)", letterSpacing: "0.1em" }}>
          {t("POWERED BY COINMARKETCAP AI AGENT HUB · VERDICT PROTOCOL", "由 COINMARKETCAP AI AGENT HUB 驱动 · VERDICT PROTOCOL")}
        </p>
      </div>
    </main>
  );
}
