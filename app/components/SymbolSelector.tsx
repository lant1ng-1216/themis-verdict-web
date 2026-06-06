"use client";
import { useState, useRef, useEffect } from "react";

const ALL_SYMBOLS = [
  "BTC","ETH","BNB","SOL","PEPE","DOGE","ARB","OP",
  "AVAX","MATIC","LINK","UNI","ADA","DOT","ATOM","APT",
  "SUI","SEI","TIA","INJ","JUP","WIF","BONK","FLOKI",
];

const CMC_IDS: Record<string, number> = {
  BTC:1,ETH:1027,BNB:1839,SOL:5426,PEPE:24478,DOGE:74,
  ARB:11841,OP:11840,AVAX:5805,MATIC:3890,LINK:1975,UNI:7083,
  ADA:2010,DOT:6636,ATOM:3794,APT:21794,SUI:20947,SEI:23149,
  TIA:22861,INJ:7226,JUP:29210,WIF:28752,BONK:23095,FLOKI:10804,
};

const SYMBOL_COLORS: Record<string, string> = {
  BTC:"#f7931a",ETH:"#627eea",BNB:"#f3ba2f",SOL:"#9945ff",
  PEPE:"#00cc44",DOGE:"#c2a633",ARB:"#28a0f0",OP:"#ff0420",
  AVAX:"#e84142",MATIC:"#8247e5",LINK:"#375bd2",UNI:"#ff007a",
  ADA:"#0033ad",DOT:"#e6007a",ATOM:"#2e3148",APT:"#00d4b8",
};

interface Props {
  symbols: string[];
  onChange: (symbols: string[]) => void;
  lang: string;
}

export default function SymbolSelector({ symbols, onChange, lang }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = ALL_SYMBOLS.filter(s =>
    s.includes(search.toUpperCase()) && !symbols.includes(s)
  );

  const remove = (sym: string) => {
    if (symbols.length <= 2) return;
    onChange(symbols.filter(s => s !== sym));
  };

  const add = (sym: string) => {
    if (symbols.length >= 4) return;
    onChange([...symbols, sym]);
    setSearch("");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {/* Selected symbols */}
        {symbols.map(sym => (
          <div key={sym} style={{ display: "flex", alignItems: "center", gap: 5, background: `${SYMBOL_COLORS[sym] || "#0047cc"}15`, border: `1px solid ${SYMBOL_COLORS[sym] || "#0047cc"}44`, borderRadius: 20, padding: "3px 8px 3px 5px" }}>
            {CMC_IDS[sym] && (
              <img src={`https://s2.coinmarketcap.com/static/img/coins/32x32/${CMC_IDS[sym]}.png`}
                style={{ width: 16, height: 16, borderRadius: "50%" }} alt={sym} />
            )}
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: SYMBOL_COLORS[sym] || "#0047cc" }}>{sym}</span>
            {symbols.length > 2 && (
              <button onClick={() => remove(sym)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(10,26,58,0.3)", fontSize: 12, lineHeight: 1, padding: 0, marginLeft: 1 }}>×</button>
            )}
          </div>
        ))}

        {/* Add button */}
        {symbols.length < 4 && (
          <button onClick={() => setOpen(v => !v)}
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0047cc", background: "rgba(0,71,204,0.06)", border: "1px dashed rgba(0,71,204,0.3)", borderRadius: 20, padding: "3px 10px", cursor: "pointer", letterSpacing: "0.05em" }}>
            + {t("Add", "添加")}
          </button>
        )}

        {/* Reset default */}
        <button onClick={() => onChange(["BTC","ETH","BNB","SOL"])}
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(10,26,58,0.35)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em" }}>
          ↺ {t("Reset", "重置")}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 200, width: 260, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.7)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,40,120,0.12)", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t("Search symbol...", "搜索币种...")}
              style={{ width: "100%", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0a1a3a", background: "rgba(0,40,120,0.04)", border: "1px solid rgba(0,71,204,0.15)", borderRadius: 6, padding: "6px 10px", outline: "none" }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto", padding: "6px 0" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.35)" }}>
                {t("No results", "无结果")}
              </div>
            ) : filtered.map(sym => (
              <div key={sym} onClick={() => add(sym)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,71,204,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                {CMC_IDS[sym] && (
                  <img src={`https://s2.coinmarketcap.com/static/img/coins/32x32/${CMC_IDS[sym]}.png`}
                    style={{ width: 18, height: 18, borderRadius: "50%" }} alt={sym} />
                )}
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: SYMBOL_COLORS[sym] || "#0a1a3a" }}>{sym}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(0,0,0,0.05)", fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "rgba(10,26,58,0.3)" }}>
            {symbols.length}/4 {t("selected · max 4 · min 2", "已选 · 最多4个 · 最少2个")}
          </div>
        </div>
      )}
    </div>
  );
}
