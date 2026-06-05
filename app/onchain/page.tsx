"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function OnChainPage() {
  const [lang, setLang] = useState("en");
  useEffect(() => { setLang(localStorage.getItem("themis_lang") || "en"); }, []);
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4fb", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(226,232,244,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,244,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "5px 12px", borderRadius: 8, textDecoration: "none" }}>← {t("Back", "返回")}</Link>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.15em" }}>ON-CHAIN PROTOCOL</span>
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

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(247,147,26,0.06)", border: "1px solid rgba(247,147,26,0.2)", borderRadius: 20, padding: "5px 16px", marginBottom: 32 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f7931a", opacity: 0.5 }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#d4800a", letterSpacing: "0.15em" }}>{t("COMING SOON", "即将推出")}</span>
          </div>

          <h1 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 40, fontWeight: 700, color: "#0a1a3a", marginBottom: 8, letterSpacing: "-0.01em" }}>
            {t("On-Chain Verdict Protocol", "链上裁决协议")}
          </h1>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#d4800a", letterSpacing: "0.2em", marginBottom: 32 }}>THEMIS · CHAIN LAYER</div>

          <p style={{ fontSize: 15, color: "rgba(10,26,58,0.6)", lineHeight: 1.8, marginBottom: 40 }}>
            {t(
              "Every Themis verdict is recorded on-chain as an immutable judgment. Anyone can challenge a verdict by staking tokens. After 48 hours, the outcome is auto-verified on-chain, and the reputation system updates accordingly.",
              "每一次 Themis 裁决都作为不可篡改的判决上链记录。任何人可以质押代币来质疑裁决。48小时后，结果链上自动验证，声誉系统随之更新。"
            )}
          </p>

          {/* How it differs from Verdict Protocol */}
          <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 14, padding: "24px 28px", marginBottom: 32, textAlign: "left" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 16 }}>{t("HOW THIS DIFFERS FROM TRADITIONAL BETTING", "与传统对赌协议的区别")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#e8193c", letterSpacing: "0.1em", marginBottom: 8 }}>{t("TRADITIONAL BET", "传统对赌")}</div>
                {(lang === "zh" ? ["用户 A vs 用户 B 押注", "需要两个对手方在线", "结果靠预言机或人工判定", "无声誉积累机制"] : ["User A vs User B wager", "Requires two counterparties", "Outcome via oracle or manual", "No reputation accumulation"]).map(item => (
                  <div key={item} style={{ display: "flex", gap: 8, fontSize: 12, color: "rgba(10,26,58,0.5)", padding: "4px 0" }}>
                    <span style={{ color: "#e8193c" }}>✗</span>{item}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#00954a", letterSpacing: "0.1em", marginBottom: 8 }}>{t("THEMIS ON-CHAIN", "Themis 链上裁决")}</div>
                {(lang === "zh" ? ["AI 裁决官 vs 市场集体判断", "单人即可发起裁决", "链上价格数据自动验证", "声誉系统决定信号价值"] : ["AI verdict officer vs market", "Single party initiates verdict", "On-chain price auto-verification", "Reputation determines signal value"]).map(item => (
                  <div key={item} style={{ display: "flex", gap: 8, fontSize: 12, color: "rgba(10,26,58,0.5)", padding: "4px 0" }}>
                    <span style={{ color: "#00954a" }}>✓</span>{item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Flow */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 40, flexWrap: "wrap" }}>
            {[
              { label: t("Verdict Issued", "裁决发出"), color: "#0047cc" },
              { label: "→", color: "rgba(10,26,58,0.2)", plain: true },
              { label: t("On-Chain Record", "链上存证"), color: "#6633cc" },
              { label: "→", color: "rgba(10,26,58,0.2)", plain: true },
              { label: t("Challenge Window", "质疑窗口"), color: "#d4800a" },
              { label: "→", color: "rgba(10,26,58,0.2)", plain: true },
              { label: t("Auto Verify", "自动验证"), color: "#00954a" },
              { label: "→", color: "rgba(10,26,58,0.2)", plain: true },
              { label: t("Reputation Update", "声誉更新"), color: "#f7931a" },
            ].map((item, i) => (
              item.plain
                ? <span key={i} style={{ color: item.color, fontSize: 16 }}>{item.label}</span>
                : <span key={i} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: item.color, background: `${item.color}10`, border: `1px solid ${item.color}30`, padding: "5px 10px", borderRadius: 6 }}>{item.label}</span>
            ))}
          </div>

          <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 16, padding: "28px 32px", boxShadow: "0 8px 32px rgba(0,40,120,0.08)" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 12 }}>{t("STAY UPDATED", "保持关注")}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input placeholder={t("Enter your email or wallet address", "输入邮箱或钱包地址")} style={{ flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#0a1a3a", background: "rgba(0,40,120,0.04)", border: "1.5px solid rgba(247,147,26,0.2)", borderRadius: 8, padding: "11px 14px", outline: "none" }} />
              <button style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#d4800a,#f7931a)", border: "none", padding: "11px 20px", borderRadius: 8, cursor: "pointer", letterSpacing: "0.08em" }}>
                {t("NOTIFY ME", "通知我")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
