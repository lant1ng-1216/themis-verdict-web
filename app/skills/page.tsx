"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SiteNav } from "../page";
import { useUser } from "@clerk/nextjs";

const M = "JetBrains Mono, monospace";
const API = process.env.NEXT_PUBLIC_AGENT_API || "https://api.themisverdict.xyz";

const ALL_TAGS = ["全部", "中低频", "高频", "7维度", "AI裁决", "套利", "官方"];

const TAG_EN: Record<string, string> = {
  "全部": "All", "中低频": "Mid-Low Freq", "高频": "High Freq",
  "7维度": "7-Dimension", "AI裁决": "AI Verdict", "套利": "Arbitrage", "官方": "Official",
};
const translateTag = (tag: string, lang: string) => lang === "en" ? (TAG_EN[tag] || tag) : tag;

interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  description_en?: string;
  tags: string[];
  price_usdt: number;
  developer_name: string;
  supported_pairs: string[];
  stats: { win_rate?: number; sharpe?: number; max_dd?: number };
  sales_count: number;
  created_at: string;
}

function SkillCard({ skill, lang, owned }: { skill: Skill; lang: string; owned: boolean }) {
  const isFree = skill.price_usdt === 0;
  const isOfficial = skill.tags.includes("官方");

  return (
    <Link href={`/skills/${skill.id}`} style={{ textDecoration: "none" }}>
      <div style={{
        background: "#fff", border: "1px solid #e8ecf4", borderRadius: 14,
        padding: "20px 22px", cursor: "pointer", transition: "all 0.2s",
        boxShadow: "0 1px 4px rgba(0,20,60,0.05)",
        display: "flex", flexDirection: "column", gap: 14, height: "100%",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(0,71,204,0.12)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#c7d3f8"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,20,60,0.05)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#e8ecf4"; }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              {isOfficial && (
                <span style={{ fontSize: 8, fontWeight: 700, color: "#0047cc", background: "#eef2ff", border: "1px solid #c7d3f8", padding: "2px 7px", borderRadius: 4, letterSpacing: "0.08em", fontFamily: M }}>OFFICIAL</span>
              )}
              <span style={{ fontSize: 8, color: "#94a3b8", fontFamily: M }}>{skill.version}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0a1a3a", fontFamily: M, marginBottom: 4 }}>{skill.name}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontFamily: M }}>by {skill.developer_name}</div>
          </div>
          <div style={{ textAlign: "right" as const, flexShrink: 0, marginLeft: 12 }}>
            {owned ? (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "4px 10px", borderRadius: 6, fontFamily: M }}>
                ✓ {lang === "zh" ? "已购" : "Owned"}
              </span>
            ) : isFree ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: "#059669", fontFamily: M }}>FREE</span>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 800, color: "#0a1a3a", fontFamily: M }}>${skill.price_usdt}</span>
            )}
          </div>
        </div>

        {/* Description */}
        <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.65, fontFamily: M,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
          {lang === "en" ? (skill.description_en || skill.description) : (skill.description || skill.description_en)}
        </div>

        {/* Stats */}
        {(skill.stats.win_rate || skill.stats.sharpe || skill.stats.max_dd) && (
          <div style={{ display: "flex", gap: 0, background: "#f8fafc", borderRadius: 8, overflow: "hidden" }}>
            {[
              { l: lang === "zh" ? "胜率" : "Win Rate", v: skill.stats.win_rate != null ? `${skill.stats.win_rate}%` : "—", c: "#059669" },
              { l: "Sharpe", v: skill.stats.sharpe != null ? skill.stats.sharpe.toFixed(1) : "—", c: "#0047cc" },
              { l: lang === "zh" ? "最大回撤" : "Max DD", v: skill.stats.max_dd != null ? `${skill.stats.max_dd}%` : "—", c: "#dc2626" },
            ].map(({ l, v, c }, i, arr) => (
              <div key={l} style={{ flex: 1, padding: "9px 10px", textAlign: "center" as const, borderRight: i < arr.length - 1 ? "1px solid #e8ecf4" : "none" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: M, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 8, color: "#94a3b8", fontFamily: M, marginTop: 3, letterSpacing: "0.06em" }}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tags + pairs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
            {skill.tags.filter(t => t !== "官方").slice(0, 3).map(tag => (
              <span key={tag} style={{ fontSize: 9, color: "#5a6480", background: "#f1f5f9", padding: "2px 7px", borderRadius: 4, fontFamily: M }}>{translateTag(tag, lang)}</span>
            ))}
          </div>
          <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: M }}>
            {skill.sales_count > 0 ? `${skill.sales_count} ${lang === "zh" ? "用户" : "users"}` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function SkillsPage() {
  const { user } = useUser();
  const [lang, setLang] = useState(() => typeof window !== "undefined" ? (localStorage.getItem("themis_lang") || "zh") : "zh");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("全部");

  useEffect(() => {
    const s = localStorage.getItem("themis_lang");
    if (s) setLang(s);
  }, []);

  useEffect(() => {
    fetch(`${API}/api/skills`)
      .then(r => r.json())
      .then(d => { setSkills(d.skills || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API}/api/skills/my?user_id=${user.id}`)
      .then(r => r.json())
      .then(d => setOwnedIds(new Set((d.skills || []).map((s: Skill) => s.id))))
      .catch(() => {});
  }, [user?.id]);

  const t = (zh: string, en: string) => lang === "zh" ? zh : en;

  const filtered = skills.filter(s => {
    const matchTag = activeTag === "全部" || s.tags.includes(activeTag);
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.developer_name.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: M, position: "relative", zIndex: 1 }}>
      <SiteNav lang={lang} onLangChange={l => { setLang(l); localStorage.setItem("themis_lang", l); }} />
      <div style={{ paddingTop: 56 }}>

        {/* Hero */}
        <div style={{ background: "#fff", padding: "52px 48px 44px", position: "relative", zIndex: 1, borderBottom: "1px solid #e8ecf4" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#b0b8cc", letterSpacing: "0.22em", marginBottom: 16, fontFamily: M }}>THEMIS · SKILL MARKET</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#0a1a3a", fontFamily: M, marginBottom: 10, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {t("策略技能广场", "Strategy Skill Market")}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", fontFamily: M, marginBottom: 32, lineHeight: 1.6 }}>
              {t("发现、验证、部署专业交易策略 Skill，由 AI Agent 自动执行", "Discover, backtest, and deploy professional trading skills powered by AI Agent")}
            </div>

            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e6ef", borderRadius: 9, padding: "0 14px", gap: 8, flex: 1, maxWidth: 500, transition: "border-color 0.15s" }}>
                <span style={{ fontSize: 13, color: "#b0b8cc", flexShrink: 0 }}>⌕</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t("搜索 Skill 名称或开发者…", "Search skills or developers…")}
                  onFocus={e => (e.currentTarget.parentElement!.style.borderColor = "#0047cc")}
                  onBlur={e => (e.currentTarget.parentElement!.style.borderColor = "#e2e6ef")}
                  style={{ fontFamily: M, fontSize: 12, color: "#0a1a3a", background: "none", border: "none", outline: "none", padding: "12px 0", width: "100%" } as React.CSSProperties}
                />
                {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "#b0b8cc", cursor: "pointer", fontSize: 13, padding: 0, flexShrink: 0 }}>×</button>}
              </div>
              <Link href="/skills/publish" style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: "#0047cc", borderRadius: 8, padding: "11px 22px", textDecoration: "none", letterSpacing: "0.05em", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                + {t("发布 Skill", "Publish Skill")}
              </Link>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e8ecf4", padding: "0 48px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", gap: 2, overflowX: "auto" as const }}>
            {ALL_TAGS.map(tag => (
              <button key={tag} onClick={() => setActiveTag(tag)}
                style={{ fontFamily: M, fontSize: 11, fontWeight: activeTag === tag ? 700 : 400, color: activeTag === tag ? "#0047cc" : "#64748b", background: "none", border: "none", borderBottom: `2px solid ${activeTag === tag ? "#0047cc" : "transparent"}`, padding: "14px 16px", cursor: "pointer", whiteSpace: "nowrap" as const, transition: "all 0.15s" }}>
                {translateTag(tag, lang)}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{ padding: "28px 48px" }}>
          {loading ? (
            <div style={{ textAlign: "center" as const, padding: "80px 0", color: "#94a3b8", fontSize: 12, fontFamily: M }}>
              {t("加载中…", "Loading…")}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {filtered.map(s => (
                <SkillCard key={s.id} skill={s} lang={lang} owned={ownedIds.has(s.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
