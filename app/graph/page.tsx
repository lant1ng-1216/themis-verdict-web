"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import VerdictGraph from "../components/VerdictGraph";
import VerdictTree from "../components/VerdictTree";
import SymbolSelector from "../components/SymbolSelector";

const DEFAULT_SYMBOLS = ["BTC", "ETH", "BNB", "SOL"];

export default function GraphPage() {
  const [tab, setTab] = useState<"graph" | "tree">("graph");
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [lang, setLang] = useState("en");
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  useEffect(() => {
    const stored = localStorage.getItem("themis_lang") || "en";
    setLang(stored);
    const storedSymbols = localStorage.getItem("themis_symbols");
    if (storedSymbols) {
      try { setSymbols(JSON.parse(storedSymbols)); } catch {}
    }
  }, []);

  const handleSymbolChange = (newSymbols: string[]) => {
    setSymbols(newSymbols);
    localStorage.setItem("themis_symbols", JSON.stringify(newSymbols));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4fb", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(226,232,244,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,244,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      {/* Header */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "5px 12px", borderRadius: 8, textDecoration: "none" }}>
            ← {t("Back", "返回")}
          </Link>
          {/* Tab switcher */}
          <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 3, gap: 3 }}>
            {[
              { key: "graph" as const, en: "Relation Graph", zh: "关系图谱" },
              { key: "tree" as const, en: "Correlation Tree", zh: "相关性树" },
            ].map(({ key, en, zh }) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: tab === key ? "#fff" : "rgba(10,26,58,0.45)", background: tab === key ? "#0047cc" : "none", border: "none", padding: "5px 14px", borderRadius: 6, cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.05em" }}>
                {t(en, zh)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Symbol selector */}
          <SymbolSelector symbols={symbols} onChange={handleSymbolChange} lang={lang} />
          {/* Lang switcher */}
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

      {/* Content */}
      <div style={{ paddingTop: 52, height: "100vh", position: "relative", zIndex: 1 }}>
        {tab === "graph" && <VerdictGraph symbols={symbols} lang={lang} setLang={setLang} />}
        {tab === "tree" && (
          <div style={{ height: "calc(100vh - 52px)", overflow: "auto" }}>
            <VerdictTree symbols={symbols} />
          </div>
        )}
      </div>
    </div>
  );
}
