"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function VerdictFeedPage() {
  const [lang, setLang] = useState("en");
  const [tab, setTab] = useState<"feed" | "onchain">("feed");
  useEffect(() => { setLang(localStorage.getItem("themis_lang") || "en"); }, []);
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4fb", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(226,232,244,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,244,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      {/* Header */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "5px 12px", borderRadius: 8, textDecoration: "none" }}>← {t("Back", "返回")}</Link>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.15em" }}>VERDICT FEED</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 3, gap: 3 }}>
            {[
              { key: "feed" as const, en: "Public Feed", zh: "公开广播" },
              { key: "onchain" as const, en: "On-Chain Protocol", zh: "链上协议" },
            ].map(({ key, en, zh }) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: tab === key ? "#fff" : "rgba(10,26,58,0.4)", background: tab === key ? "#0047cc" : "none", border: "none", padding: "5px 14px", borderRadius: 6, cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.05em" }}>
                {t(en, zh)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 6, padding: 2 }}>
            {["EN","ZH"].map(l => (
              <button key={l} onClick={() => { setLang(l.toLowerCase()); localStorage.setItem("themis_lang", l.toLowerCase()); }}
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: lang === l.toLowerCase() ? "#fff" : "rgba(10,26,58,0.4)", background: lang === l.toLowerCase() ? "#0047cc" : "none", border: "none", padding: "4px 10px", borderRadius: 5, cursor: "pointer", transition: "all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ paddingTop: 52, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px" }}>
        <div style={{ maxWidth: 680, width: "100%", position: "relative", zIndex: 1 }}>

          {/* PUBLIC FEED TAB */}
          {tab === "feed" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,71,204,0.06)", border: "1px solid rgba(0,71,204,0.15)", borderRadius: 20, padding: "5px 16px", marginBottom: 32 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0047cc", opacity: 0.4 }} />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0047cc", letterSpacing: "0.15em" }}>{t("COMING SOON", "即将推出")}</span>
              </div>
              <h1 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 36, fontWeight: 700, color: "#0a1a3a", marginBottom: 8 }}>{t("Public Verdict Feed", "公开裁决广播站")}</h1>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0047cc", letterSpacing: "0.2em", marginBottom: 28 }}>THEMIS · LIVE BROADCAST</div>
              <p style={{ fontSize: 15, color: "rgba(10,26,58,0.6)", lineHeight: 1.8, marginBottom: 40 }}>
                {t(
                  "Every verdict Themis delivers will be broadcast here in real time — publicly visible, verifiable, and permanently archived. The community can follow verdicts, track accuracy, and hold the system accountable.",
                  "Themis 每一次裁决都将在这里实时广播——公开可见、可验证、永久存档。社区可以追踪裁决历史、查看准确率，并对每一次判断进行监督。"
                )}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40, textAlign: "left" }}>
                {[
                  { icon: "📡", en: "Real-time verdict broadcast", zh: "实时裁决广播" },
                  { icon: "✅", en: "24h auto-verification", zh: "24小时自动验证" },
                  { icon: "📊", en: "Public accuracy leaderboard", zh: "公开准确率排行榜" },
                  { icon: "🔔", en: "Subscribe to verdict alerts", zh: "订阅裁决通知" },
                  { icon: "🗂", en: "Full verdict archive", zh: "完整裁决存档" },
                  { icon: "🌐", en: "Open API access", zh: "开放 API 接入" },
                ].map(({ icon, en, zh }) => (
                  <div key={en} style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span style={{ fontSize: 13, color: "rgba(10,26,58,0.65)", fontWeight: 500 }}>{t(en, zh)}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 16, padding: "28px 32px" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 12 }}>{t("GET EARLY ACCESS", "申请早期访问")}</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input placeholder={t("Enter your email", "输入你的邮箱")} style={{ flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#0a1a3a", background: "rgba(0,40,120,0.04)", border: "1.5px solid rgba(0,71,204,0.15)", borderRadius: 8, padding: "11px 14px", outline: "none" }} />
                  <button style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: "#fff", background: "#0047cc", border: "none", padding: "11px 20px", borderRadius: 8, cursor: "pointer" }}>{t("NOTIFY ME", "通知我")}</button>
                </div>
              </div>
            </div>
          )}

          {/* ON-CHAIN TAB */}
          {tab === "onchain" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(247,147,26,0.06)", border: "1px solid rgba(247,147,26,0.2)", borderRadius: 20, padding: "5px 16px", marginBottom: 32 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f7931a", opacity: 0.5 }} />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#d4800a", letterSpacing: "0.15em" }}>{t("COMING SOON", "即将推出")}</span>
              </div>
              <h1 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 36, fontWeight: 700, color: "#0a1a3a", marginBottom: 8 }}>{t("On-Chain Verdict Protocol", "链上裁决协议")}</h1>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#d4800a", letterSpacing: "0.2em", marginBottom: 28 }}>THEMIS · CHAIN LAYER</div>
              <p style={{ fontSize: 15, color: "rgba(10,26,58,0.6)", lineHeight: 1.8, marginBottom: 40 }}>
                {t(
                  "Every Themis verdict is recorded on-chain as an immutable judgment. Anyone can challenge a verdict by staking tokens. After 48 hours, the outcome is auto-verified on-chain, and the reputation system updates accordingly.",
                  "每一次 Themis 裁决都作为不可篡改的判决上链存证。任何人可以质押代币来质疑裁决。48小时后链上自动验证结果，声誉系统随之更新。"
                )}
              </p>

              {/* Comparison */}
              <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 14, padding: "24px 28px", marginBottom: 28, textAlign: "left" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 16 }}>{t("VS TRADITIONAL BETTING PROTOCOL", "与传统对赌协议的区别")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#e8193c", letterSpacing: "0.1em", marginBottom: 10 }}>{t("TRADITIONAL BET", "传统对赌")}</div>
                    {(lang === "zh" ? ["用户 A vs 用户 B 押注", "需要两个对手方在线", "结果靠预言机或人工判定", "无声誉积累机制", "冷启动困难"] : ["User A vs User B wager", "Requires two counterparties", "Outcome via oracle or manual", "No reputation system", "Hard cold start"]).map(item => (
                      <div key={item} style={{ display: "flex", gap: 8, fontSize: 12, color: "rgba(10,26,58,0.5)", padding: "5px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                        <span style={{ color: "#e8193c", flexShrink: 0 }}>✗</span>{item}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#00954a", letterSpacing: "0.1em", marginBottom: 10 }}>{t("THEMIS ON-CHAIN", "Themis 链上裁决")}</div>
                    {(lang === "zh" ? ["AI 裁决官 vs 市场集体判断", "单人即可发起裁决", "链上价格数据自动验证", "声誉系统决定信号价值", "无需对手方即可运行"] : ["AI verdict officer vs market", "Single party initiates", "On-chain price auto-verify", "Reputation drives signal value", "No counterparty needed"]).map(item => (
                      <div key={item} style={{ display: "flex", gap: 8, fontSize: 12, color: "rgba(10,26,58,0.5)", padding: "5px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                        <span style={{ color: "#00954a", flexShrink: 0 }}>✓</span>{item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Flow */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 32, flexWrap: "wrap" }}>
                {[
                  { label: t("Verdict", "裁决发出"), color: "#0047cc" },
                  "→",
                  { label: t("On-Chain", "链上存证"), color: "#6633cc" },
                  "→",
                  { label: t("Challenge", "质疑窗口"), color: "#d4800a" },
                  "→",
                  { label: t("Verify", "自动验证"), color: "#00954a" },
                  "→",
                  { label: t("Reputation", "声誉更新"), color: "#f7931a" },
                ].map((item, i) => (
                  typeof item === "string"
                    ? <span key={i} style={{ color: "rgba(10,26,58,0.2)", fontSize: 16 }}>{item}</span>
                    : <span key={i} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: item.color, background: `${item.color}10`, border: `1px solid ${item.color}30`, padding: "5px 10px", borderRadius: 6 }}>{item.label}</span>
                ))}
              </div>

              <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 16, padding: "28px 32px" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 12 }}>{t("STAY UPDATED", "保持关注")}</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input placeholder={t("Email or wallet address", "邮箱或钱包地址")} style={{ flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#0a1a3a", background: "rgba(0,40,120,0.04)", border: "1.5px solid rgba(247,147,26,0.2)", borderRadius: 8, padding: "11px 14px", outline: "none" }} />
                  <button style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#d4800a,#f7931a)", border: "none", padding: "11px 20px", borderRadius: 8, cursor: "pointer" }}>{t("NOTIFY ME", "通知我")}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
