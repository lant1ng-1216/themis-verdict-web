"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import VerdictGraph from "../components/VerdictGraph";
import VerdictTree from "../components/VerdictTree";

const ALL_SYMBOLS = [
  "BTC", "ETH", "BNB", "SOL", "PEPE", "DOGE",
  "ARB", "OP", "AVAX", "MATIC", "LINK", "UNI",
  "ADA", "DOT", "ATOM", "APT", "SUI", "INJ",
];

const CMC_IDS: Record<string, number> = {
  BTC: 1, ETH: 1027, BNB: 1839, SOL: 5426,
  PEPE: 24478, DOGE: 74, ARB: 11841, OP: 11840,
  AVAX: 5805, MATIC: 3890, LINK: 1975, UNI: 7083,
  ADA: 2010, DOT: 6636, ATOM: 3794, APT: 21794,
  SUI: 20947, INJ: 7226,
};

const SYMBOL_COLORS: Record<string, string> = {
  BTC: "#f7931a", ETH: "#627eea", BNB: "#f3ba2f", SOL: "#9945ff",
  PEPE: "#00cc44", DOGE: "#c2a633", ARB: "#28a0f0", OP: "#ff0420",
  AVAX: "#e84142", MATIC: "#8247e5", LINK: "#375bd2", UNI: "#ff007a",
  ADA: "#0033ad", DOT: "#e6007a", ATOM: "#2e3148", APT: "#00d4b8",
  SUI: "#4da2ff", INJ: "#00b4d8",
};

export default function GraphPage() {
  const [tab, setTab] = useState<"graph" | "tree">("graph");
  const [lang, setLang] = useState(() => typeof window !== "undefined" ? (localStorage.getItem("themis_lang") || "en") : "en");
  const [confirmed, setConfirmed] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeSymbols, setActiveSymbols] = useState<string[]>([]);

  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  useEffect(() => {
    setLang(localStorage.getItem("themis_lang") || "en");
  }, []);

  const toggle = (sym: string) => {
    setSelected(prev => {
      if (prev.includes(sym)) {
        if (prev.length <= 2) return prev;
        return prev.filter(s => s !== sym);
      } else {
        if (prev.length >= 4) return prev;
        return [...prev, sym];
      }
    });
  };

  const confirm = () => {
    if (selected.length < 2) return;
    setActiveSymbols(selected);
    localStorage.setItem("themis_symbols", JSON.stringify(selected));
    setConfirmed(true);
  };

  const changeGroup = () => {
    setConfirmed(false);
    setSelected(activeSymbols);
  };

  // Selection screen
  if (!confirmed) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f4fb", position: "relative" }}>
        <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(226,232,244,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,244,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

        <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "5px 12px", borderRadius: 8, textDecoration: "none" }}>← {t("Back", "返回")}</Link>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.15em" }}>VERDICT GRAPH</span>
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
          <div style={{ maxWidth: 600, width: "100%", position: "relative", zIndex: 1 }}>

            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#0047cc", letterSpacing: "0.2em", marginBottom: 10 }}>
                {t("STEP 1 OF 1", "第一步")}
              </div>
              <h1 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 26, fontWeight: 700, color: "#0a1a3a", marginBottom: 8 }}>
                {t("Choose Your Asset Group", "选择你的资产组合")}
              </h1>
              <p style={{ fontSize: 14, color: "rgba(10,26,58,0.5)", lineHeight: 1.7 }}>
                {t("Select 2–4 assets. The graph will track their relationships and correlations.", "选择2至4个资产，图谱将追踪它们之间的关联关系。")}
              </p>
            </div>

            {/* Asset grid */}
            <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 16, padding: "24px", marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                {ALL_SYMBOLS.map(sym => {
                  const isSelected = selected.includes(sym);
                  const isFull = selected.length >= 4 && !isSelected;
                  const color = SYMBOL_COLORS[sym] || "#0047cc";
                  const cmcId = CMC_IDS[sym];
                  return (
                    <button key={sym}
                      onClick={() => toggle(sym)}
                      disabled={isFull}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        padding: "12px 8px", borderRadius: 10, cursor: isFull ? "not-allowed" : "pointer",
                        background: isSelected ? `${color}15` : "rgba(0,0,0,0.02)",
                        border: `1.5px solid ${isSelected ? color : "rgba(0,0,0,0.06)"}`,
                        transition: "all 0.15s",
                        opacity: isFull ? 0.35 : 1,
                        transform: isSelected ? "scale(1.05)" : "scale(1)",
                      }}
                      onMouseEnter={e => { if (!isFull && !isSelected) (e.currentTarget as HTMLElement).style.border = `1.5px solid ${color}66`; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.border = "1.5px solid rgba(0,0,0,0.06)"; }}
                    >
                      {cmcId ? (
                        <img src={`https://s2.coinmarketcap.com/static/img/coins/32x32/${cmcId}.png`}
                          style={{ width: 28, height: 28, borderRadius: "50%", border: isSelected ? `2px solid ${color}` : "2px solid transparent" }}
                          alt={sym} />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, fontWeight: 700, color: "white" }}>{sym[0]}</span>
                        </div>
                      )}
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: isSelected ? 700 : 400, color: isSelected ? color : "rgba(10,26,58,0.5)" }}>
                        {sym}
                      </span>
                      {isSelected && (
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", top: 6, right: 6 }}>
                          <span style={{ fontSize: 9, color: "white", fontWeight: 700 }}>✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected preview */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {selected.length === 0 ? (
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "rgba(10,26,58,0.35)" }}>
                    {t("No assets selected", "未选择资产")}
                  </span>
                ) : selected.map(sym => (
                  <div key={sym} style={{ display: "flex", alignItems: "center", gap: 5, background: `${SYMBOL_COLORS[sym] || "#0047cc"}15`, border: `1px solid ${SYMBOL_COLORS[sym] || "#0047cc"}44`, borderRadius: 20, padding: "4px 10px 4px 6px" }}>
                    {CMC_IDS[sym] && <img src={`https://s2.coinmarketcap.com/static/img/coins/32x32/${CMC_IDS[sym]}.png`} style={{ width: 16, height: 16, borderRadius: "50%" }} alt={sym} />}
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: SYMBOL_COLORS[sym] || "#0047cc" }}>{sym}</span>
                  </div>
                ))}
              </div>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.4)" }}>
                {selected.length}/4
              </span>
            </div>

            {/* Confirm button */}
            <button onClick={confirm} disabled={selected.length < 2}
              style={{
                width: "100%", fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700,
                letterSpacing: "0.15em", color: "#fff",
                background: selected.length >= 2 ? "linear-gradient(135deg,#0047cc,#0066ff)" : "rgba(0,0,0,0.1)",
                border: "none", padding: "16px", borderRadius: 10, cursor: selected.length >= 2 ? "pointer" : "not-allowed",
                boxShadow: selected.length >= 2 ? "0 4px 20px rgba(0,71,204,0.3)" : "none",
                transition: "all 0.2s",
              }}>
              {selected.length < 2
                ? t(`SELECT AT LEAST 2 ASSETS (${selected.length}/2)`, `至少选择2个资产 (${selected.length}/2)`)
                : t("ENTER THE GRAPH →", "进入图谱 →")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Graph screen
  return (
    <div style={{ minHeight: "100vh", background: "#f0f4fb", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(226,232,244,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,244,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "5px 12px", borderRadius: 8, textDecoration: "none" }}>← {t("Back", "返回")}</Link>
          <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 3, gap: 3 }}>
            {[
              { key: "graph" as const, en: "Relation Graph", zh: "关系图谱" },
              { key: "tree" as const, en: "Correlation Tree", zh: "相关性树" },
            ].map(({ key, en, zh }) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: tab === key ? "#fff" : "rgba(10,26,58,0.45)", background: tab === key ? "#0047cc" : "none", border: "none", padding: "5px 14px", borderRadius: 6, cursor: "pointer", transition: "all 0.15s" }}>
                {t(en, zh)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Active symbols display */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {activeSymbols.map(sym => (
              <div key={sym} style={{ display: "flex", alignItems: "center", gap: 4, background: `${SYMBOL_COLORS[sym] || "#0047cc"}12`, border: `1px solid ${SYMBOL_COLORS[sym] || "#0047cc"}33`, borderRadius: 16, padding: "3px 8px 3px 5px" }}>
                {CMC_IDS[sym] && <img src={`https://s2.coinmarketcap.com/static/img/coins/32x32/${CMC_IDS[sym]}.png`} style={{ width: 14, height: 14, borderRadius: "50%" }} alt={sym} />}
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: SYMBOL_COLORS[sym] || "#0047cc" }}>{sym}</span>
              </div>
            ))}
          </div>
          <button onClick={changeGroup}
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.5)", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>
            ⊞ {t("Change Group", "更换组合")}
          </button>
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

      <div style={{ paddingTop: 52, height: "100vh", position: "relative", zIndex: 1 }}>
        {tab === "graph" && <VerdictGraph symbols={activeSymbols} lang={lang} setLang={setLang} />}
        {tab === "tree" && (
          <div style={{ height: "calc(100vh - 52px)", overflow: "auto" }}>
            <VerdictTree symbols={activeSymbols} lang={lang} />
          </div>
        )}
      </div>
    </div>
  );
}
