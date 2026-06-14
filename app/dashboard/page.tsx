"use client";
import { useUser, useClerk, UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCommerceJob } from "../lib/useCommerceJob";

const API_BASE = process.env.NEXT_PUBLIC_AGENT_API || "https://api.themisverdict.xyz";

// ── Types ────────────────────────────────────────────────────────────────────
type NavItem = "overview" | "apikeys" | "usage" | "billing" | "commission";

// ── Constants ────────────────────────────────────────────────────────────────
const PLANS = {
  free:     { label: "FREE",     color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", quota: 60,    tokenLimit: 25_000,     price: "$0",   sub: "Free forever" },
  standard: { label: "STANDARD", color: "#0047cc", bg: "#eef2ff", border: "#c7d3f8", quota: 1000,  tokenLimit: 1_000_000,  price: "$29",  sub: "/month" },
  pro:      { label: "PRO",      color: "#6633cc", bg: "#f5f3ff", border: "#d8b4fe", quota: 4000,  tokenLimit: 5_000_000,  price: "$99",  sub: "/month" },
  agent:    { label: "AGENT",    color: "#059669", bg: "#ecfdf5", border: "#6ee7b7", quota: 15000, tokenLimit: 70_000_000, price: "$299", sub: "/month" },
};

const PLAN_FEATURES: Record<string, string[]> = {
  free:     ["Agent 1.5M tokens / month", "Verdict feed access", "Market regime signals", "Community support"],
  standard: ["Agent 5M tokens / month", "Real-time verdict signals", "verdict/latest & history", "Email support"],
  pro:      ["Agent 50M tokens / month", "verdict/stream (SSE)", "Signal monitoring", "Priority support"],
  agent:    ["Agent 200M tokens / month", "Webhook push", "SLA guarantee", "Dedicated support"],
};

const ENDPOINT_PERMISSIONS: { path: string; plans: string[] }[] = [
  { path: "/api/v1/regime/current",  plans: ["free","standard","pro","agent"] },
  { path: "/api/v1/accuracy/stats",  plans: ["free","standard","pro","agent"] },
  { path: "/api/v1/verdict/latest",  plans: ["standard","pro","agent"] },
  { path: "/api/v1/verdict/history", plans: ["standard","pro","agent"] },
  { path: "/api/v1/verdict/stream",  plans: ["pro","agent"] },
  { path: "/api/v1/graph/edges",     plans: ["pro","agent"] },
  { path: "/api/v1/* + webhook",     plans: ["agent"] },
];

type DevNavItem = "dev-overview" | "dev-skills" | "dev-analytics" | "dev-revenue" | "dev-settings";

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, lang, plan, consoleTab, isDeveloper, devNav, setDevNav }: {
  active: NavItem; setActive: (n: NavItem) => void; lang: string; plan: keyof typeof PLANS;
  consoleTab: "user" | "dev"; isDeveloper: boolean;
  devNav: DevNavItem; setDevNav: (n: DevNavItem) => void;
}) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const cfg = PLANS[plan];
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "—";

  const NavIcon = ({ name, color }: { name: string; color: string }) => {
    const s = { display: "block", flexShrink: 0 } as React.CSSProperties;
    const props = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: color, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, style: s };
    if (name === "overview") return <svg {...props}><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>;
    if (name === "apikeys")  return <svg {...props}><circle cx="6" cy="8" r="3"/><path d="M9 8h5M12 6.5V8"/></svg>;
    if (name === "usage")    return <svg {...props}><polyline points="2,12 5,7 8,10 11,5 14,8"/></svg>;
    if (name === "billing")  return <svg {...props}><rect x="2" y="4" width="12" height="8" rx="1.5"/><line x1="2" y1="7" x2="14" y2="7"/><line x1="5" y1="10.5" x2="7" y2="10.5"/></svg>;
    if (name === "agent")    return <svg {...props}><path d="M8 2L10 6H14L11 9L12.5 13.5L8 11L3.5 13.5L5 9L2 6H6L8 2Z"/></svg>;
    if (name === "feed")     return <svg {...props}><path d="M3 12a7 7 0 0 1 10-6.24"/><path d="M3 12a4 4 0 0 1 5.66-3.66"/><circle cx="3" cy="12" r="1" fill={color} stroke="none"/></svg>;
    if (name === "api")      return <svg {...props}><polyline points="5,4 2,8 5,12"/><polyline points="11,4 14,8 11,12"/><line x1="9" y1="3" x2="7" y2="13"/></svg>;
    if (name === "docs")     return <svg {...props}><path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><polyline points="10,2 10,5 13,5"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="5" y1="11" x2="9" y2="11"/></svg>;
    if (name === "verdict")  return <svg {...props}><line x1="8" y1="4" x2="8" y2="13"/><line x1="5" y1="13" x2="11" y2="13"/><line x1="2" y1="5" x2="14" y2="5"/><path d="M2 5 C2 5 1.5 8 4 8 C6.5 8 6 5 6 5"/><path d="M10 5 C10 5 9.5 8 12 8 C14.5 8 14 5 14 5"/></svg>;
    if (name === "skills")        return <svg {...props}><path d="M8 2l1.5 2.5H13L10.5 6.5l1 3L8 8l-3.5 1.5 1-3L3 4.5h3.5L8 2z"/><circle cx="8" cy="12" r="1.5"/></svg>;
    if (name === "dev-overview")  return <svg {...props}><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>;
    if (name === "dev-skills")    return <svg {...props}><path d="M8 2l1.5 2.5H13L10.5 6.5l1 3L8 8l-3.5 1.5 1-3L3 4.5h3.5L8 2z"/><circle cx="8" cy="12" r="1.5"/></svg>;
    if (name === "dev-analytics") return <svg {...props}><polyline points="2,12 5,7 8,10 11,5 14,8"/></svg>;
    if (name === "dev-revenue")   return <svg {...props}><rect x="2" y="4" width="12" height="8" rx="1.5"/><line x1="2" y1="7" x2="14" y2="7"/><line x1="5" y1="10.5" x2="7" y2="10.5"/></svg>;
    if (name === "dev-settings")  return <svg {...props}><circle cx="8" cy="8" r="2.5"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M11.5 3.5l-1 1M3.5 11.5l1-1"/></svg>;
    if (name === "commission") return <svg {...props}><path d="M8 2l1.8 4.5L14 7l-3 3 1 4.5L8 12l-4 2.5 1-4.5-3-3 4.2-.5L8 2z"/></svg>;
    return null;
  };

  const navItems: { key: NavItem; iconName: string; en: string; zh: string }[] = [
    { key: "overview",  iconName: "overview",   en: "Overview",   zh: "概览" },
    { key: "apikeys",   iconName: "apikeys",    en: "API Keys",   zh: "API 密钥" },
    { key: "usage",     iconName: "usage",      en: "Usage",      zh: "用量统计" },
    { key: "billing",   iconName: "billing",    en: "Billing",    zh: "套餐账单" },
    { key: "commission",iconName: "commission", en: "Commission", zh: "委托分析" },
  ];

  return (
    <aside style={{ width: 220, flexShrink: 0, background: "#fff", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
      {/* Logo */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/themis-logo.png" alt="Themis" style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 800, color: "#0a1a3a", letterSpacing: "0.08em", lineHeight: 1.2 }}>
              THEMIS<span style={{ color: "#0047cc" }}>·</span>VERDICT
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em" }}>MARKET COURT</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 10px", flex: 1, overflowY: "auto" }}>
        {consoleTab === "dev" && isDeveloper ? (
          <>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8.5, color: "#7c3aed", letterSpacing: "0.18em", padding: "0 10px", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <span>DEVELOPER</span>
              <span style={{ fontSize: 7, fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #d8b4fe", borderRadius: 4, padding: "1px 5px" }}>DEV</span>
            </div>
            {([
              { key: "dev-overview",   iconName: "dev-overview",   en: "Overview",   zh: "概览" },
              { key: "dev-skills",     iconName: "dev-skills",     en: "My Skills",  zh: "我的 Skills" },
              { key: "dev-analytics",  iconName: "dev-analytics",  en: "Analytics",  zh: "数据分析" },
              { key: "dev-revenue",    iconName: "dev-revenue",    en: "Revenue",    zh: "收入" },
              { key: "dev-settings",   iconName: "dev-settings",   en: "Settings",   zh: "开发者设置" },
            ] as { key: DevNavItem; iconName: string; en: string; zh: string }[]).map(({ key, iconName, en, zh }) => {
              const isActive = devNav === key;
              const color = isActive ? "#7c3aed" : "#94a3b8";
              return (
                <button key={key} onClick={() => setDevNav(key)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, background: isActive ? "rgba(124,58,237,0.07)" : "transparent", border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2, transition: "all 0.15s" }}>
                  <NavIcon name={iconName} color={color} />
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? "#7c3aed" : "#64748b", letterSpacing: "0.04em" }}>{t(en, zh)}</span>
                  {isActive && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#7c3aed", flexShrink: 0 }} />}
                </button>
              );
            })}
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8.5, color: "#cbd5e1", letterSpacing: "0.18em", padding: "0 10px", marginTop: 16, marginBottom: 6 }}>LINKS</div>
            <Link href="/skills/publish" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, textDecoration: "none", marginBottom: 2 }}>
              <NavIcon name="skills" color="#94a3b8" />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 500, color: "#64748b" }}>{t("Publish Skill", "发布 Skill")}</span>
              <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#cbd5e1" }}>↗</span>
            </Link>
            <Link href="/skills" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, textDecoration: "none", marginBottom: 2 }}>
              <NavIcon name="overview" color="#94a3b8" />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 500, color: "#64748b" }}>{t("Skill Market", "Skill 市场")}</span>
              <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#cbd5e1" }}>↗</span>
            </Link>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8.5, color: "#cbd5e1", letterSpacing: "0.18em", padding: "0 10px", marginBottom: 6 }}>DASHBOARD</div>
            {navItems.map(({ key, iconName, en, zh }) => {
              const isActive = active === key;
              const iconColor = isActive ? "#0047cc" : "#94a3b8";
              return (
                <button key={key} onClick={() => setActive(key)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, background: isActive ? "rgba(0,71,204,0.07)" : "transparent", border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2, transition: "all 0.15s" }}>
                  <NavIcon name={iconName} color={iconColor} />
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? "#0047cc" : "#64748b", letterSpacing: "0.04em" }}>{t(en, zh)}</span>
                  {isActive && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#0047cc", flexShrink: 0 }} />}
                </button>
              );
            })}
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8.5, color: "#cbd5e1", letterSpacing: "0.18em", padding: "0 10px", marginTop: 16, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>PRODUCT</span>
              {isDeveloper && <span style={{ fontSize: 7, fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #d8b4fe", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.1em" }}>DEV</span>}
            </div>
            {[
              { href: "/agent",     iconName: "agent",   en: "Themis Agent", zh: "交易 Agent" },
              { href: "/feed",      iconName: "feed",    en: "Verdict Feed",  zh: "裁决广播" },
              { href: "/verdict",   iconName: "verdict", en: "Verdict",       zh: "法庭裁决" },
              { href: "/skills",    iconName: "skills",  en: "Skills",        zh: "Skill 市场" },
              { href: "/agent-api", iconName: "api",     en: "Agent API",     zh: "API 文档" },
              { href: "/docs",      iconName: "docs",    en: "Docs",          zh: "文档" },
            ].map(({ href, iconName, en, zh }) => (
              <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, textDecoration: "none", marginBottom: 2 }}>
                <NavIcon name={iconName} color="#94a3b8" />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 500, color: "#64748b" }}>{t(en, zh)}</span>
                <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#cbd5e1" }}>↗</span>
              </Link>
            ))}
            {(user?.publicMetadata as any)?.role === "admin" && (
              <>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8.5, color: "#cbd5e1", letterSpacing: "0.18em", padding: "0 10px", marginTop: 16, marginBottom: 6 }}>INTERNAL</div>
                <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, textDecoration: "none", marginBottom: 2, background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.12)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
                    <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
                  </svg>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#dc2626" }}>{t("Admin", "管理后台")}</span>
                  <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#fca5a5" }}>↗</span>
                </Link>
              </>
            )}
          </>
        )}
      </nav>

      {/* User profile */}
      <div style={{ padding: "14px 16px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <UserButton />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#0a1a3a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: cfg.color, fontWeight: 700, letterSpacing: "0.1em" }}>{cfg.label}</span>
            </div>
          </div>
        </div>
        <button onClick={() => signOut({ redirectUrl: "/" })}
          style={{ width: "100%", fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#94a3b8", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 7, padding: "7px", cursor: "pointer", letterSpacing: "0.06em" }}>
          {t("Sign out", "退出登录")}
        </button>
      </div>
    </aside>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
function OverviewPanel({ plan, lang, userId }: { plan: keyof typeof PLANS; lang: string; userId: string }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const cfg = PLANS[plan];
  const [todayCalls, setTodayCalls] = useState<number | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [sysStatus, setSysStatus] = useState<{ ok: boolean; latency: number | null }>({ ok: false, latency: null });
  const [agentTokens, setAgentTokens] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/v1/keys/by-user?user_id=${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.keys && d.keys.length > 0) {
          setHasKey(true);
          setTodayCalls(d.keys[0].daily_count || 0);
        } else { setHasKey(false); setTodayCalls(0); }
      }).catch(() => { setHasKey(false); setTodayCalls(0); });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/agent/token-quota?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { if (!d.login_required && typeof d.used === "number") setAgentTokens({ used: d.used, limit: d.limit }); })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    const t0 = Date.now();
    fetch(`${API_BASE}/status`).then(() => setSysStatus({ ok: true, latency: Date.now() - t0 }))
      .catch(() => setSysStatus({ ok: false, latency: null }));
  }, []);

  const todayPct = todayCalls !== null ? Math.min(100, Math.round((todayCalls / cfg.quota) * 100)) : null;
  const quotaColor = todayPct === null ? "#94a3b8" : todayPct > 90 ? "#dc2626" : todayPct > 70 ? "#f59e0b" : "#0047cc";
  const tokenPct = agentTokens ? Math.min(100, Math.round((agentTokens.used / agentTokens.limit) * 100)) : null;
  const tokenColor = tokenPct === null ? "#94a3b8" : tokenPct > 90 ? "#dc2626" : tokenPct > 70 ? "#f59e0b" : "#6633cc";

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 800, color: "#0a1a3a", margin: "0 0 4px" }}>{t("Overview", "概览")}</h2>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#94a3b8", margin: 0 }}>{t("Your account at a glance", "账户核心数据一览")}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {/* Plan */}
        <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderTop: `3px solid ${cfg.color}`, borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 10 }}>{t("PLAN", "套餐")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 800, color: cfg.color, lineHeight: 1, marginBottom: 5 }}>{cfg.label}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: cfg.color }}>{cfg.price}{cfg.sub !== "Free forever" ? cfg.sub : ""}</div>
        </div>

        {/* Agent Tokens */}
        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderTop: `3px solid ${tokenColor}`, borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 10 }}>{t("AGENT TOKENS / MO", "Agent Token / 月")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 16, fontWeight: 800, color: "#0a1a3a", lineHeight: 1, marginBottom: 8 }}>
            {agentTokens === null ? <span style={{ color: "#cbd5e1" }}>—</span> : `${(agentTokens.used / 1_000_000).toFixed(2)}M`}
          </div>
          {tokenPct !== null && agentTokens && (
            <>
              <div style={{ height: 3, background: "#f1f5f9", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                <div style={{ height: "100%", width: `${tokenPct}%`, background: tokenColor, borderRadius: 2, transition: "width 0.6s ease" }} />
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: tokenColor }}>{tokenPct}% {t("of", "/")} {(agentTokens.limit / 1_000_000).toFixed(0)}M {t("limit", "上限")}</div>
            </>
          )}
        </div>

        {/* API Key status */}
        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderTop: "3px solid #059669", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 10 }}>{t("API KEY", "API 密钥")}</div>
          {hasKey === null
            ? <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#cbd5e1" }}>—</div>
            : hasKey
              ? <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#059669", boxShadow: "0 0 6px rgba(5,150,105,0.5)" }} />
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 800, color: "#059669" }}>{t("ACTIVE", "已激活")}</span>
                </div>
              : <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>{t("No key yet", "未生成")}</div>
          }
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", marginTop: 4 }}>tmv_••••••••</div>
        </div>

        {/* System */}
        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderTop: `3px solid ${sysStatus.ok ? "#059669" : "#dc2626"}`, borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 10 }}>{t("API SERVER", "服务状态")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: sysStatus.ok ? "#059669" : "#dc2626", boxShadow: sysStatus.ok ? "0 0 6px rgba(5,150,105,0.5)" : "none" }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 800, color: sysStatus.ok ? "#059669" : "#dc2626" }}>{sysStatus.ok ? t("ONLINE", "在线") : t("OFFLINE", "离线")}</span>
          </div>
          {sysStatus.latency !== null && <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8" }}>{sysStatus.latency}ms {t("latency", "延迟")}</div>}
        </div>
      </div>

      {/* Quick Access */}
      <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "20px 22px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#0a1a3a", marginBottom: 14 }}>{t("Quick Access", "快速入口")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[
            { href: "/agent",     en: "Themis Agent",  zh: "交易 Agent", desc: t("Automated trading","自动交易"), color: "#0047cc",
              icon: <svg width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="#0047cc" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M8 2L10 6H14L11 9L12.5 13.5L8 11L3.5 13.5L5 9L2 6H6L8 2Z"/></svg> },
            { href: "/feed",      en: "Verdict Feed",  zh: "裁决广播",   desc: t("Live signals","实时信号"),  color: "#059669",
              icon: <svg width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a7 7 0 0 1 10-6.24"/><path d="M3 12a4 4 0 0 1 5.66-3.66"/><circle cx="3" cy="12" r="1" fill="#059669" stroke="none"/></svg> },
            { href: "/agent-api", en: "Agent API",     zh: "API 文档",   desc: t("Explore endpoints","接口列表"), color: "#6633cc",
              icon: <svg width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="#6633cc" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="5,4 2,8 5,12"/><polyline points="11,4 14,8 11,12"/><line x1="9" y1="3" x2="7" y2="13"/></svg> },
            { href: "/docs",      en: "Docs",          zh: "文档",       desc: t("Get started","快速开始"), color: "#d4800a",
              icon: <svg width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="#d4800a" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><polyline points="10,2 10,5 13,5"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="5" y1="11" x2="9" y2="11"/></svg> },
            { href: "/verdict",   en: "Verdict",       zh: "法庭裁决",   desc: t("Analyze verdicts","裁决分析"), color: "#b45309",
              icon: <svg width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="#b45309" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="4" x2="8" y2="13"/><line x1="5" y1="13" x2="11" y2="13"/><line x1="2" y1="5" x2="14" y2="5"/><path d="M2 5 C2 5 1.5 8 4 8 C6.5 8 6 5 6 5"/><path d="M10 5 C10 5 9.5 8 12 8 C14.5 8 14 5 14 5"/></svg> },
            { href: "/skills",    en: "Skills",        zh: "Skill 市场", desc: t("Skill marketplace","技能市场"), color: "#7c3aed",
              icon: <svg width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="#7c3aed" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.5 2.5H13L10.5 6.5l1 3L8 8l-3.5 1.5 1-3L3 4.5h3.5L8 2z"/><circle cx="8" cy="12" r="1.5"/></svg> },
          ].map(({ href, en, zh, desc, color, icon }) => (
            <Link key={href} href={href} style={{ padding: "16px", background: `${color}06`, border: `1px solid ${color}18`, borderRadius: 10, textDecoration: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}10`, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color, marginBottom: 3 }}>{lang === "zh" ? zh : en}</div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "#94a3b8" }}>{desc} →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting started checklist */}
      <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#0a1a3a", marginBottom: 14 }}>{t("Getting Started", "快速开始")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { done: !!userId,   en: "Create your account",          zh: "创建账户" },
            { done: !!hasKey,   en: "Generate your first API key",   zh: "生成 API Key" },
            { done: plan !== "free", en: "Upgrade to a paid plan",   zh: "升级付费套餐" },
          ].map(({ done, en, zh }) => (
            <div key={en} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${done ? "#059669" : "#e2e8f0"}`, background: done ? "#059669" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {done && <svg width={10} height={10} viewBox="0 0 10 10" fill="none"><polyline points="2,5 4,7 8,3" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: done ? "#64748b" : "#0a1a3a", textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>{lang === "zh" ? zh : en}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── API Keys ──────────────────────────────────────────────────────────────────
function ApiKeysPanel({ lang, plan }: { lang: string; plan: keyof typeof PLANS }) {
  const { user } = useUser();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyData, setKeyData] = useState<{ plan: string; created_at: string; daily_count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [codeTab, setCodeTab] = useState<"curl"|"python"|"node">("curl");
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  const userId = user?.id || "";
  const masked = apiKey ? "tmv_" + "•".repeat(32) : "";

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/v1/keys/by-user?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.keys && data.keys.length > 0) {
          const k = data.keys[0];
          setApiKey(k.key);
          setKeyData({ plan: k.plan, created_at: k.created_at, daily_count: k.daily_count || 0 });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/keys/generate?plan=free&user_id=${userId}`, { method: "POST" });
      const data = await res.json();
      setApiKey(data.key);
      setKeyData({ plan: data.plan, created_at: data.created_at, daily_count: 0 });
    } catch {}
    setGenerating(false);
  };

  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!apiKey) return;
    await fetch(`${API_BASE}/api/v1/keys/${apiKey}`, { method: "DELETE" }).catch(() => {});
    setApiKey(null); setKeyData(null);
    handleGenerate();
  };

  const createdDate = keyData?.created_at ? new Date(keyData.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const displayKey = revealed ? apiKey! : masked;

  const codeSnippets: Record<string, string> = {
    curl: `curl https://api.themis-verdict.ai/api/v1/verdict/latest?symbol=BTC \\\n  -H "X-API-Key: ${apiKey || "tmv_..."}"`,
    python: `import requests\n\nheaders = {"X-API-Key": "${apiKey || "tmv_..."}"}\nres = requests.get(\n  "https://api.themis-verdict.ai/api/v1/verdict/latest",\n  params={"symbol": "BTC"},\n  headers=headers\n)\nprint(res.json())`,
    node: `const res = await fetch(\n  "https://api.themis-verdict.ai/api/v1/verdict/latest?symbol=BTC",\n  { headers: { "X-API-Key": "${apiKey || "tmv_..."}" } }\n);\nconst data = await res.json();\nconsole.log(data);`,
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 800, color: "#0a1a3a", margin: "0 0 4px" }}>{t("API Keys", "API 密钥")}</h2>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#94a3b8", margin: 0 }}>{t("Manage your API keys for accessing the Themis signal network", "管理你的 Themis 信号网络接入密钥")}</p>
      </div>

      {/* Key management card */}
      <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,20,80,0.04)", marginBottom: 16 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.08em" }}>{t("YOUR KEY", "你的密钥")}</div>
          {apiKey && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", boxShadow: "0 0 5px rgba(5,150,105,0.5)" }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#059669", fontWeight: 700, letterSpacing: "0.1em" }}>{t("ACTIVE", "活跃")}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#94a3b8", padding: "40px", textAlign: "center" }}>LOADING...</div>
        ) : !apiKey ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#0a1a3a", marginBottom: 8 }}>{t("No API key yet", "还没有 API Key")}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#94a3b8", marginBottom: 20 }}>{t("Generate a key to start accessing the Themis API", "生成一个 Key 开始调用 Themis API")}</div>
            <button onClick={handleGenerate} disabled={generating} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#fff", background: "#0047cc", border: "none", borderRadius: 8, padding: "10px 24px", cursor: generating ? "wait" : "pointer", opacity: generating ? 0.7 : 1 }}>
              {generating ? t("Generating...", "生成中...") : t("Generate API Key", "生成 API Key")}
            </button>
          </div>
        ) : (
          <div style={{ padding: "18px 20px" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0a1a3a", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 8, padding: "10px 14px", marginBottom: 10, letterSpacing: "0.04em", wordBreak: "break-all", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{displayKey}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setRevealed(!revealed)} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#0047cc", background: "rgba(0,71,204,0.06)", border: "1px solid rgba(0,71,204,0.18)", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>{revealed ? t("Hide","隐藏") : t("Reveal","显示")}</button>
              <button onClick={handleCopy} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: copied ? "#059669" : "#0047cc", background: copied ? "rgba(5,150,105,0.06)" : "rgba(0,71,204,0.06)", border: `1px solid ${copied ? "rgba(5,150,105,0.2)" : "rgba(0,71,204,0.18)"}`, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>{copied ? t("Copied ✓","已复制 ✓") : t("Copy","复制")}</button>
              <button onClick={handleRegenerate} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#dc2626", background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.14)", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>{t("Regenerate","重置")}</button>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 14, paddingTop: 14, borderTop: "1px solid #f8fafc" }}>
              <div><div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 3 }}>{t("CREATED", "创建时间")}</div><div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#64748b" }}>{createdDate}</div></div>
              <div><div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 3 }}>{t("TODAY'S CALLS", "今日调用")}</div><div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#64748b" }}>{keyData?.daily_count ?? 0}</div></div>
            </div>
          </div>
        )}
      </div>

      {/* Permissions table */}
      <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,20,80,0.04)", marginBottom: 16 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f8fafc" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.08em" }}>{t("ENDPOINT ACCESS", "接口权限")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", marginTop: 3 }}>{t("Based on your current plan", "基于你的当前套餐")}</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <th style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.1em", fontWeight: 500, textAlign: "left", padding: "8px 20px" }}>ENDPOINT</th>
                {(["FREE","STANDARD","PRO","AGENT"] as const).map(p => (
                  <th key={p} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: p.toLowerCase() === plan ? PLANS[p.toLowerCase() as keyof typeof PLANS].color : "#94a3b8", letterSpacing: "0.1em", fontWeight: p.toLowerCase() === plan ? 700 : 500, textAlign: "center", padding: "8px 12px", background: p.toLowerCase() === plan ? `${PLANS[p.toLowerCase() as keyof typeof PLANS].color}08` : "transparent" }}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ENDPOINT_PERMISSIONS.map(({ path, plans }) => (
                <tr key={path} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "#0a1a3a", padding: "9px 20px" }}>{path}</td>
                  {(["free","standard","pro","agent"] as const).map(p => {
                    const allowed = plans.includes(p);
                    const isCurrentPlan = p === plan;
                    return (
                      <td key={p} style={{ textAlign: "center", padding: "9px 12px", background: isCurrentPlan ? `${PLANS[p].color}08` : "transparent" }}>
                        {allowed
                          ? <span style={{ color: "#059669", fontSize: 12 }}>✓</span>
                          : <span style={{ color: "#e2e8f0", fontSize: 12 }}>✗</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code example tabs */}
      <div style={{ background: "#0a1a3a", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", padding: "12px 20px", flex: 1 }}>{t("USAGE EXAMPLE", "接入示例")}</div>
          <div style={{ display: "flex" }}>
            {(["curl","python","node"] as const).map(tab => (
              <button key={tab} onClick={() => setCodeTab(tab)}
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "12px 16px", background: codeTab === tab ? "rgba(255,255,255,0.1)" : "transparent", color: codeTab === tab ? "#7ab8ff" : "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", borderBottom: codeTab === tab ? "2px solid #7ab8ff" : "2px solid transparent" }}>
                {tab === "node" ? "Node.js" : tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <pre style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#7ab8ff", margin: 0, padding: "20px 22px", lineHeight: 1.8, overflowX: "auto", whiteSpace: "pre-wrap" as const }}>
          {codeSnippets[codeTab]}
        </pre>
      </div>

      {/* Security tips */}
      <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.08em", marginBottom: 12 }}>{t("SECURITY TIPS", "安全建议")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            t("Never commit your API key to public repositories", "不要将 API Key 提交到公开仓库"),
            t("Store it in environment variables, not source code", "请存储在环境变量中，不要写入源码"),
            t("Regenerate immediately if you suspect a leak", "若怀疑泄露请立即重置密钥"),
          ].map((tip, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", marginTop: 4, flexShrink: 0 }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Topup Modal ───────────────────────────────────────────────────────────────
const TOPUP_AMOUNTS = [10, 25, 50, 100];
const PAYMENT_WALLET_CREDIT = "0xB0088d6Eb46c3C15D878b54900ce1d5AEad54bD7";

function TopupModal({ lang, userId, onClose, onSuccess }: { lang: string; userId: string; onClose: () => void; onSuccess: (newBal: number) => void }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState("");
  const [chain, setChain] = useState<"bsc" | "polygon">("bsc");
  const [step, setStep] = useState<"select" | "pay" | "confirm">("select");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const finalAmount = custom ? parseFloat(custom) : amount;

  const handleConfirm = async () => {
    if (!txHash.trim()) { setError(t("Please enter transaction hash", "请输入交易哈希")); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/credit/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, amount: finalAmount, tx_hash: txHash.trim(), chain, note: "dashboard topup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      onSuccess(data.balance);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 36px", width: 440, boxShadow: "0 20px 60px rgba(0,20,80,0.18)" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 800, color: "#0a1a3a", marginBottom: 4 }}>{t("Top Up API Credit", "充值 API 余额")}</div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#94a3b8", marginBottom: 24 }}>{t("Pay via USDT · credited instantly after confirmation", "USDT 支付 · 确认后立即到账")}</div>

        {step === "select" && (<>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", marginBottom: 10 }}>{t("SELECT AMOUNT", "选择充值金额")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
            {TOPUP_AMOUNTS.map(a => (
              <button key={a} onClick={() => { setAmount(a); setCustom(""); }} style={{
                padding: "10px 0", borderRadius: 8, border: `2px solid ${amount === a && !custom ? "#0047cc" : "#e2e8f0"}`,
                background: amount === a && !custom ? "#eef2ff" : "#fff",
                color: amount === a && !custom ? "#0047cc" : "#475569",
                fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>${a}</button>
            ))}
          </div>
          <input
            placeholder={t("Custom amount ($5–$500)", "自定义金额（$5–$500）")}
            value={custom}
            onChange={e => { setCustom(e.target.value); }}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0a1a3a", boxSizing: "border-box" as const, marginBottom: 20 }}
          />
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#64748b" }}>
            <div style={{ marginBottom: 4 }}>{t("You'll receive:", "到账余额：")} <span style={{ color: "#0a1a3a", fontWeight: 700 }}>${finalAmount || "—"} USDT</span></div>
            <div>{t("Approx:", "约可用：")} <span style={{ color: "#0047cc", fontWeight: 600 }}>{finalAmount ? `${Math.round(finalAmount / 3.0 * 1000).toLocaleString()}K input tokens` : "—"}</span></div>
          </div>
          <button onClick={() => setStep("pay")} disabled={!finalAmount || finalAmount < 5 || finalAmount > 500} style={{
            width: "100%", padding: "11px", borderRadius: 8, background: "#0047cc", color: "#fff",
            fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
          }}>{t("Continue to Payment →", "继续付款 →")}</button>
        </>)}

        {step === "pay" && (<>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", marginBottom: 12 }}>{t("SELECT CHAIN", "选择链")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {(["bsc", "polygon"] as const).map(c => (
              <button key={c} onClick={() => setChain(c)} style={{
                padding: "8px", borderRadius: 8, border: `2px solid ${chain === c ? "#0047cc" : "#e2e8f0"}`,
                background: chain === c ? "#eef2ff" : "#fff", color: chain === c ? "#0047cc" : "#475569",
                fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>{c === "bsc" ? "BNB Chain" : "Polygon"}</button>
            ))}
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", marginBottom: 12 }}>{t("SEND PAYMENT", "发送付款")}</div>
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", marginBottom: 6 }}>{t("Send exactly", "请发送精确金额")}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 800, color: "#0047cc", marginBottom: 12 }}>${finalAmount} <span style={{ fontSize: 11, color: "#94a3b8" }}>USDT</span></div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", marginBottom: 4 }}>{t(`To address (${chain === "bsc" ? "BNB Chain" : "Polygon"})`, `收款地址（${chain === "bsc" ? "BNB Chain" : "Polygon"}）`)}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#0a1a3a", wordBreak: "break-all" as const, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 10px" }}>{PAYMENT_WALLET_CREDIT}</div>
          </div>
          <button onClick={() => setStep("confirm")} style={{
            width: "100%", padding: "11px", borderRadius: 8, background: "#059669", color: "#fff",
            fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", marginBottom: 8,
          }}>{t("I've sent the payment →", "我已完成付款 →")}</button>
          <button onClick={() => setStep("select")} style={{ width: "100%", padding: "8px", borderRadius: 8, background: "none", color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", fontSize: 11, border: "none", cursor: "pointer" }}>{t("← Back", "← 返回")}</button>
        </>)}

        {step === "confirm" && (<>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", marginBottom: 12 }}>{t("ENTER TX HASH", "输入交易哈希")}</div>
          <input
            placeholder="0x..."
            value={txHash}
            onChange={e => { setTxHash(e.target.value); setError(""); }}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${error ? "#fecaca" : "#e2e8f0"}`, fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0a1a3a", boxSizing: "border-box" as const, marginBottom: 8 }}
          />
          {error && <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#dc2626", marginBottom: 8 }}>{error}</div>}
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", marginBottom: 16 }}>{t("Copy the tx hash from your wallet after sending", "从钱包复制发送完成后的交易哈希")}</div>
          <button onClick={handleConfirm} disabled={loading} style={{
            width: "100%", padding: "11px", borderRadius: 8, background: loading ? "#94a3b8" : "#0047cc", color: "#fff",
            fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, border: "none", cursor: loading ? "default" : "pointer", marginBottom: 8,
          }}>{loading ? t("Verifying...", "验证中...") : t("Confirm & Credit", "确认到账")}</button>
          <button onClick={() => setStep("pay")} style={{ width: "100%", padding: "8px", borderRadius: 8, background: "none", color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", fontSize: 11, border: "none", cursor: "pointer" }}>{t("← Back", "← 返回")}</button>
        </>)}
      </div>
    </div>
  );
}

// ── Usage ─────────────────────────────────────────────────────────────────────
function UsagePanel({ plan, lang, userId }: { plan: keyof typeof PLANS; lang: string; userId: string }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const cfg = PLANS[plan];
  const [todayCalls, setTodayCalls] = useState<number | null>(null);
  const [agentTokens, setAgentTokens] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [credit, setCredit] = useState<{ balance: number; usage: { cost: number; input_tokens: number; output_tokens: number } } | null>(null);
  const [showTopup, setShowTopup] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/v1/keys/by-user?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { setTodayCalls(d.keys?.[0]?.daily_count ?? 0); })
      .catch(() => setTodayCalls(0))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/agent/token-quota?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { if (!d.login_required) setAgentTokens({ used: d.used, limit: d.limit, remaining: d.remaining }); })
      .catch(() => {});
    fetch(`${API_BASE}/api/credit/balance?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { if (!d.login_required) setCredit({ balance: d.balance, usage: d.usage }); })
      .catch(() => {});
  }, [userId]);

  const tokenPct = agentTokens ? Math.min(100, Math.round((agentTokens.used / agentTokens.limit) * 100)) : 0;
  const tokenColor = tokenPct > 90 ? "#dc2626" : tokenPct > 70 ? "#f59e0b" : "#6633cc";
  const todayPct = todayCalls !== null ? Math.min(100, Math.round((todayCalls / cfg.quota) * 100)) : 0;
  const quotaColor = todayPct > 90 ? "#dc2626" : todayPct > 70 ? "#f59e0b" : "#0047cc";

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 800, color: "#0a1a3a", margin: "0 0 4px" }}>{t("Usage", "用量统计")}</h2>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#94a3b8", margin: 0 }}>{t("Agent token quota and API call volume this month", "本月 Agent token 配额与 API 调用量")}</p>
      </div>

      {/* Agent token cards */}
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 10 }}>{t("AGENT USAGE", "Agent 用量")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {/* Used */}
        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderTop: `3px solid ${tokenColor}`, borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 10 }}>{t("TOKENS USED / MO", "本月已用 Token")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 800, color: "#0a1a3a", lineHeight: 1, marginBottom: 12 }}>
            {agentTokens === null ? <span style={{ color: "#cbd5e1" }}>—</span> : `${(agentTokens.used / 1_000_000).toFixed(2)}M`}
          </div>
          <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ height: "100%", width: `${tokenPct}%`, background: tokenColor, borderRadius: 3, transition: "width 0.6s ease" }} />
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: tokenColor }}>{tokenPct}% {t("of monthly quota", "月度配额")}</div>
        </div>

        {/* Remaining */}
        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderTop: "3px solid #059669", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 10 }}>{t("REMAINING / MO", "本月剩余")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 800, color: "#059669", lineHeight: 1, marginBottom: 12 }}>
            {agentTokens === null ? <span style={{ color: "#cbd5e1" }}>—</span> : `${(agentTokens.remaining / 1_000_000).toFixed(2)}M`}
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8" }}>
            {t("out of", "共")} {agentTokens ? (agentTokens.limit / 1_000_000).toFixed(0) : "—"}M {t("tokens total", "tokens/月")}
          </div>
        </div>

        {/* Plan quota */}
        <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderTop: `3px solid ${cfg.color}`, borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 10 }}>{t("MONTHLY LIMIT", "月度上限")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 800, color: cfg.color, lineHeight: 1, marginBottom: 8 }}>{cfg.tokenLimit >= 1_000_000 ? `${(cfg.tokenLimit / 1_000_000).toFixed(0)}M` : `${(cfg.tokenLimit / 1_000).toFixed(0)}K`}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: cfg.color, fontWeight: 700, letterSpacing: "0.06em" }}>{cfg.label} · {t("TOKENS / MO", "TOKENS / 月")}</div>
        </div>
      </div>

      {/* API calls section */}
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 10 }}>{t("API USAGE", "API 调用")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {/* Credit balance */}
        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderTop: "3px solid #0047cc", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em" }}>{t("API CREDIT", "API 余额")}</div>
            <button onClick={() => setShowTopup(true)} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 8, fontWeight: 700, cursor: "pointer", background: "#eef2ff", color: "#0047cc", border: "1px solid #c7d3f8", fontFamily: "JetBrains Mono, monospace" }}>
              + {t("Top Up", "充值")}
            </button>
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 24, fontWeight: 800, color: "#0a1a3a", lineHeight: 1, marginBottom: 8 }}>
            ${credit ? credit.balance.toFixed(2) : "—"}
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8" }}>{t("USDT · pay per token", "USDT · 按 token 扣费")}</div>
        </div>

        {/* This month usage */}
        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderTop: "3px solid #6633cc", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 10 }}>{t("SPENT THIS MONTH", "本月消费")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 24, fontWeight: 800, color: "#6633cc", lineHeight: 1, marginBottom: 8 }}>
            ${credit ? credit.usage.cost.toFixed(4) : "—"}
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8" }}>
            {credit ? `${(credit.usage.input_tokens / 1000).toFixed(1)}K in · ${(credit.usage.output_tokens / 1000).toFixed(1)}K out` : t("No usage yet", "暂无消费记录")}
          </div>
        </div>

        {/* Rates */}
        <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 12, padding: "20px 22px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", marginBottom: 8 }}>{t("API TOKEN RATES", "API 单价")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#64748b", lineHeight: 2 }}>
            <div>Input &nbsp;· <span style={{ color: "#0a1a3a", fontWeight: 700 }}>$0.003</span> / 1K tokens</div>
            <div>Output · <span style={{ color: "#0a1a3a", fontWeight: 700 }}>$0.012</span> / 1K tokens</div>
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", marginTop: 8 }}>{t("Billed from API credit balance", "从 API 余额扣除")}</div>
        </div>
      </div>

      {showTopup && <TopupModal lang={lang} userId={userId} onClose={() => setShowTopup(false)} onSuccess={(bal) => { setCredit(c => c ? { ...c, balance: bal } : { balance: bal, usage: { cost: 0, input_tokens: 0, output_tokens: 0 } }); setShowTopup(false); }} />}

      {/* Monthly history — empty state */}
      <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "20px 22px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#0a1a3a", marginBottom: 2 }}>{t("Call History", "调用历史")}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8" }}>{t("Daily call volume over time", "历史每日调用量")}</div>
          </div>
        </div>
        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #e2e8f0", borderRadius: 8 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#cbd5e1", marginBottom: 4 }}>
              {t("No history data yet", "暂无历史数据")}
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#e2e8f0" }}>
              {t("Data will appear after your first API call", "首次调用 API 后数据将显示在此")}
            </div>
          </div>
        </div>
      </div>

      {/* Endpoint breakdown — empty state */}
      <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f8fafc" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.08em" }}>{t("ENDPOINT BREAKDOWN", "接口调用分布")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", marginTop: 3 }}>{t("Which endpoints you're calling most", "各接口调用次数占比")}</div>
        </div>
        <div style={{ padding: "36px 20px", textAlign: "center" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#cbd5e1", marginBottom: 4 }}>
            {t("No calls recorded yet", "暂无调用记录")}
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#e2e8f0" }}>
            {t("Breakdown will populate as you use the API", "调用 API 后此处将展示各接口使用占比")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Billing ───────────────────────────────────────────────────────────────────
const PAYMENT_WALLET = "0xB0088d6Eb46c3C15D878b54900ce1d5AEad54bD7";
const PLAN_PRICES: Record<string, number> = { standard: 29, pro: 99, agent: 299 };

function BillingPanel({ plan, lang, userId, onPlanChange }: {
  plan: keyof typeof PLANS; lang: string; userId: string; onPlanChange: (p: string, exp: string) => void;
}) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const [modal, setModal] = useState<string | null>(null); // plan key
  const [chain, setChain] = useState<"bsc" | "polygon">("bsc");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; expires?: string } | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/payment/status?user_id=${userId}`)
      .then(r => r.json()).then(d => { if (d.expires_at) setExpiresAt(d.expires_at); }).catch(() => {});
  }, [userId]);

  const openModal = (planKey: string) => {
    setModal(planKey); setTxHash(""); setResult(null); setChain("bsc");
  };

  const copyAddr = () => {
    navigator.clipboard.writeText(PAYMENT_WALLET);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const verify = async () => {
    if (!txHash.trim()) return;
    setVerifying(true); setResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/payment/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_hash: txHash.trim(), plan: modal, chain, user_id: userId }),
      });
      const d = await r.json();
      if (r.ok) {
        const exp = new Date(d.expires_at).toLocaleDateString();
        setResult({ ok: true, msg: t(`${modal?.toUpperCase()} activated · expires ${exp}`, `${modal?.toUpperCase()} 已激活 · 有效期至 ${exp}`) });
        setExpiresAt(d.expires_at);
        onPlanChange(modal!, d.expires_at);
        setTimeout(() => setModal(null), 2000);
      } else {
        setResult({ ok: false, msg: d.detail || t("Verification failed", "验证失败") });
      }
    } catch { setResult({ ok: false, msg: t("Network error", "网络错误") }); }
    setVerifying(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 800, color: "#0a1a3a", margin: "0 0 4px" }}>{t("Billing", "套餐账单")}</h2>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#94a3b8", margin: 0 }}>
          {t("Manage your subscription plan", "管理你的订阅套餐")}
          {plan !== "free" && expiresAt && (
            <span style={{ marginLeft: 12, color: "#059669" }}>
              · {t("expires", "到期")} {new Date(expiresAt).toLocaleDateString()}
            </span>
          )}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {(Object.entries(PLANS) as [string, typeof PLANS.free][]).map(([key, cfg]) => {
          const isCurrent = key === plan;
          const isFree = key === "free";
          return (
            <div key={key} style={{ background: isCurrent ? cfg.bg : "#fff", border: `1.5px solid ${isCurrent ? cfg.border : "#f1f5f9"}`, borderRadius: 12, padding: "20px", boxShadow: isCurrent ? `0 4px 16px ${cfg.color}18` : "0 1px 4px rgba(0,20,80,0.04)", position: "relative" as const }}>
              {isCurrent && <div style={{ position: "absolute" as const, top: 12, right: 12, fontFamily: "JetBrains Mono, monospace", fontSize: 8, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 7px", borderRadius: 10, letterSpacing: "0.1em" }}>CURRENT</div>}
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 800, color: isCurrent ? cfg.color : "#64748b", marginBottom: 6, letterSpacing: "0.06em" }}>{cfg.label}</div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", marginBottom: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: isCurrent ? cfg.color : "#0a1a3a" }}>{cfg.price}</span>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{cfg.sub}</span>
              </div>
              <div style={{ marginBottom: 16 }}>
                {PLAN_FEATURES[key].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: isCurrent ? cfg.color : "#059669", flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "#64748b", lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
              {isCurrent
                ? <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: cfg.color, textAlign: "center" as const, padding: "8px", background: `${cfg.color}10`, borderRadius: 7 }}>{t("Current Plan", "当前套餐")}</div>
                : isFree ? null
                : <button onClick={() => openModal(key)} style={{ width: "100%", fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: cfg.color, background: `${cfg.color}10`, border: `1px solid ${cfg.color}30`, borderRadius: 7, padding: "8px", cursor: "pointer" }}>
                    {t("Upgrade", "升级")} · {cfg.price} USDT/mo
                  </button>
              }
            </div>
          );
        })}
      </div>

      {/* 支付说明 */}
      <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 10, padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#64748b", lineHeight: 1.8 }}>
          {t("Pay with USDT on BNB Chain or Polygon. No credit card required. Plans activate instantly after on-chain verification.", "使用 BNB Chain 或 Polygon 上的 USDT 付款。无需信用卡，链上验证后立即激活。")}
        </div>
      </div>

      {/* 支付 Modal */}
      {modal && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(10,26,58,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px", width: 440, maxWidth: "92vw", boxShadow: "0 24px 64px rgba(0,20,80,0.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 800, color: "#0a1a3a", marginBottom: 4 }}>
              {t(`Upgrade to ${modal.toUpperCase()}`, `升级到 ${modal.toUpperCase()}`)}
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#94a3b8", marginBottom: 24 }}>
              {PLAN_PRICES[modal]} USDT · 30 {t("days", "天")}
            </div>

            {/* 链选择 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 8 }}>{t("SELECT CHAIN", "选择链")}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["bsc", "polygon"] as const).map(c => (
                  <button key={c} onClick={() => setChain(c)}
                    style={{ flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, padding: "8px", borderRadius: 8, border: chain === c ? "1.5px solid #0047cc" : "1.5px solid #e2e8f0", background: chain === c ? "#eef2ff" : "#fff", color: chain === c ? "#0047cc" : "#64748b", cursor: "pointer" }}>
                    {c === "bsc" ? "BNB Chain" : "Polygon"}
                  </button>
                ))}
              </div>
            </div>

            {/* 收款地址 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 8 }}>{t("SEND TO", "转账到")}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#0a1a3a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", wordBreak: "break-all" as const }}>
                  {PAYMENT_WALLET}
                </div>
                <button onClick={copyAddr} style={{ flexShrink: 0, fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 700, color: copied ? "#059669" : "#0047cc", background: copied ? "#f0fdf4" : "#eef2ff", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer" }}>
                  {copied ? "✓" : t("Copy", "复制")}
                </button>
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#f59e0b", marginTop: 8 }}>
                ⚠️ {t(`Send USDT on ${chain === "bsc" ? "BNB Chain (BEP-20)" : "Polygon"} only`, `仅发送 ${chain === "bsc" ? "BNB Chain (BEP-20)" : "Polygon"} 上的 USDT`)}
              </div>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: "center" as const, marginBottom: 20 }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${PAYMENT_WALLET}`} alt="QR" style={{ width: 100, height: 100, borderRadius: 8, border: "1px solid #e2e8f0" }} />
            </div>

            {/* txHash 输入 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 8 }}>{t("TRANSACTION HASH", "交易哈希")}</div>
              <input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="0x..."
                style={{ width: "100%", fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#0a1a3a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", outline: "none", boxSizing: "border-box" as const }} />
            </div>

            {/* 结果提示 */}
            {result && (
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: result.ok ? "#059669" : "#dc2626", background: result.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.ok ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                {result.ok ? "✓ " : "✗ "}{result.msg}
              </div>
            )}

            <button onClick={verify} disabled={verifying || !txHash.trim()}
              style={{ width: "100%", fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#fff", background: verifying ? "#94a3b8" : "#0047cc", border: "none", borderRadius: 8, padding: "12px", cursor: verifying ? "not-allowed" : "pointer" }}>
              {verifying ? t("Verifying...", "验证中...") : t("Verify Payment", "验证付款")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Developer Onboarding ─────────────────────────────────────────────────────
function DeveloperOnboarding({ lang, userId, onActivated }: { lang: string; userId: string; onActivated: () => void }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const M = "JetBrains Mono, monospace";
  const [modal, setModal]     = useState(false);
  const [chain, setChain]     = useState<"bsc"|"polygon">("bsc");
  const [txHash, setTxHash]   = useState("");
  const [copied, setCopied]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult]   = useState<{ ok: boolean; msg: string } | null>(null);

  const copyAddr = () => {
    navigator.clipboard.writeText(PAYMENT_WALLET);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const verify = async () => {
    if (!txHash.trim()) return;
    setVerifying(true); setResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/payment/verify-developer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, tx_hash: txHash.trim(), chain }),
      });
      const d = await r.json();
      if (d.ok) { setResult({ ok: true, msg: t("Developer account activated!", "开发者账号已激活！") }); setTimeout(onActivated, 1500); }
      else setResult({ ok: false, msg: d.message || t("Verification failed. Please check your transaction hash.", "验证失败，请检查交易哈希。") });
    } catch { setResult({ ok: false, msg: t("Network error, please try again.", "网络错误，请重试。") }); }
    setVerifying(false);
  };

  const benefits = [
    [t("Publish Prompt Skills","发布 Prompt Skill"), t("Create and sell your AI prompt templates to other users","创建并向其他用户出售你的 AI Prompt 模板")],
    [t("Zero Commission (Early Access)","零抽佣（早期特权）"), t("100% of revenue goes directly to your wallet","100% 收益直接转入你的钱包")],
    [t("Developer Analytics","开发者数据分析"), t("Track skill usage, calls, and revenue in real-time","实时追踪 Skill 调用量、用户数与收益")],
    [t("Official Certification","官方认证资格"), t("Top developers earn the ✦ OFFICIAL badge based on performance","头部开发者可获得官方 ✦ OFFICIAL 认证")],
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", paddingTop: 20 }}>
      {/* Header */}
      <div style={{ textAlign: "center" as const, marginBottom: 40 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width={28} height={28} viewBox="0 0 16 16" fill="none" stroke="#0047cc" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2l1.5 2.5H13L10.5 6.5l1 3L8 8l-3.5 1.5 1-3L3 4.5h3.5L8 2z"/><circle cx="8" cy="12" r="1.5"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: M, fontSize: 22, fontWeight: 800, color: "#0a1a3a", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
          {t("Become a Themis Developer", "成为 Themis 开发者")}
        </h2>
        <p style={{ fontFamily: M, fontSize: 11, color: "#64748b", lineHeight: 1.8, margin: 0 }}>
          {t("Join the developer ecosystem and monetize your AI expertise.", "加入开发者生态，将你的 AI 能力变现。")}
        </p>
      </div>

      {/* Benefits */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
        {benefits.map(([title, desc]) => (
          <div key={title} style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
            <div style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#0a1a3a", marginBottom: 6 }}>{title}</div>
            <div style={{ fontFamily: M, fontSize: 9.5, color: "#94a3b8", lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Fee card */}
      <div style={{ background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)", border: "1px solid #c7d3f8", borderRadius: 14, padding: "24px 28px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <div>
          <div style={{ fontFamily: M, fontSize: 10, color: "#6633cc", letterSpacing: "0.12em", marginBottom: 6 }}>ONE-TIME ENROLLMENT FEE</div>
          <div style={{ fontFamily: M, fontSize: 32, fontWeight: 800, color: "#0a1a3a", lineHeight: 1 }}>$30 <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 400 }}>USDT</span></div>
          <div style={{ fontFamily: M, fontSize: 10, color: "#64748b", marginTop: 8, lineHeight: 1.7 }}>
            {t("This fee covers platform maintenance and operational costs for hosting your skills and processing transactions on behalf of your users.",
               "此费用用于维持平台运营，包括托管你的 Skill、处理用户交易的相关运营与维护成本。")}
          </div>
        </div>
        <button onClick={() => setModal(true)} style={{ flexShrink: 0, fontFamily: M, fontSize: 12, fontWeight: 700, color: "#fff", background: "#0047cc", border: "none", borderRadius: 10, padding: "14px 28px", cursor: "pointer", letterSpacing: "0.04em", whiteSpace: "nowrap" as const }}>
          {t("Enroll Now →", "立即入驻 →")}
        </button>
      </div>

      <div style={{ fontFamily: M, fontSize: 9.5, color: "#94a3b8", textAlign: "center" as const, lineHeight: 1.6 }}>
        {t("Payment is processed on-chain (BNB Chain or Polygon). Activation is instant after verification.",
           "链上支付（BNB Chain 或 Polygon），验证后立即激活。")}
      </div>

      {/* Payment Modal */}
      {modal && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(10,26,58,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px", width: 440, maxWidth: "92vw", boxShadow: "0 24px 64px rgba(0,20,80,0.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: M, fontSize: 14, fontWeight: 800, color: "#0a1a3a", marginBottom: 4 }}>{t("Developer Enrollment", "开发者入驻")}</div>
            <div style={{ fontFamily: M, fontSize: 11, color: "#94a3b8", marginBottom: 24 }}>30 USDT · {t("One-time fee", "一次性费用")}</div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 8 }}>{t("SELECT CHAIN", "选择链")}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["bsc","polygon"] as const).map(c => (
                  <button key={c} onClick={() => setChain(c)} style={{ flex: 1, fontFamily: M, fontSize: 10, fontWeight: 700, padding: "8px", borderRadius: 8, border: chain === c ? "1.5px solid #0047cc" : "1.5px solid #e2e8f0", background: chain === c ? "#eef2ff" : "#fff", color: chain === c ? "#0047cc" : "#64748b", cursor: "pointer" }}>
                    {c === "bsc" ? "BNB Chain" : "Polygon"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 8 }}>{t("SEND TO", "转账到")}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, fontFamily: M, fontSize: 9, color: "#0a1a3a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", wordBreak: "break-all" as const }}>{PAYMENT_WALLET}</div>
                <button onClick={copyAddr} style={{ flexShrink: 0, fontFamily: M, fontSize: 9, fontWeight: 700, color: copied ? "#059669" : "#0047cc", background: copied ? "#f0fdf4" : "#eef2ff", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer" }}>{copied ? "✓" : t("Copy","复制")}</button>
              </div>
              <div style={{ fontFamily: M, fontSize: 9, color: "#f59e0b", marginTop: 8 }}>⚠️ {t(`Send USDT on ${chain === "bsc" ? "BNB Chain (BEP-20)" : "Polygon"} only`, `仅发送 ${chain === "bsc" ? "BNB Chain (BEP-20)" : "Polygon"} 上的 USDT`)}</div>
            </div>

            <div style={{ textAlign: "center" as const, marginBottom: 20 }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${PAYMENT_WALLET}`} alt="QR" style={{ width: 100, height: 100, borderRadius: 8, border: "1px solid #e2e8f0" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 8 }}>{t("TRANSACTION HASH", "交易哈希")}</div>
              <input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="0x..."
                style={{ width: "100%", fontFamily: M, fontSize: 10, color: "#0a1a3a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", outline: "none", boxSizing: "border-box" as const }} />
            </div>

            {result && (
              <div style={{ fontFamily: M, fontSize: 10, color: result.ok ? "#059669" : "#dc2626", background: result.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.ok ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                {result.ok ? "✓ " : "✗ "}{result.msg}
              </div>
            )}

            <button onClick={verify} disabled={verifying || !txHash.trim()}
              style={{ width: "100%", fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: verifying ? "#94a3b8" : "#0047cc", border: "none", borderRadius: 8, padding: "12px", cursor: verifying ? "not-allowed" : "pointer" }}>
              {verifying ? t("Verifying...","验证中...") : t("Verify Payment","验证付款")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dev Overview ─────────────────────────────────────────────────────────────
function DevOverviewPanel({ lang, userId }: { lang: string; userId: string }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const M = "JetBrains Mono, monospace";
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/skills/developer/dashboard?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { setSkills(d.skills || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const totalRevenue = skills.reduce((s: number, sk: any) => s + (sk.total_revenue || 0), 0);
  const totalSales   = skills.reduce((s: number, sk: any) => s + (sk.sales_count || 0), 0);
  const totalCalls   = skills.reduce((s: number, sk: any) => s + (sk.call_count || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: M, fontSize: 18, fontWeight: 800, color: "#0a1a3a", margin: "0 0 4px" }}>{t("Developer Overview", "开发者概览")}</h2>
        <p style={{ fontFamily: M, fontSize: 11, color: "#94a3b8", margin: 0 }}>{t("Your developer stats at a glance", "你的开发者数据一览")}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { l: t("Published Skills","发布数"), v: String(skills.length), c: "#7c3aed", icon: "📦" },
          { l: t("Total Sales","累计销售"),    v: String(totalSales),     c: "#0047cc", icon: "🛒" },
          { l: t("Total Calls","累计调用"),    v: String(totalCalls),     c: "#059669", icon: "⚡" },
          { l: t("Revenue (USDT)","总收入"),   v: `$${totalRevenue.toFixed(2)}`, c: "#f59e0b", icon: "💰" },
        ].map(({ l, v, c, icon }) => (
          <div key={l} style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
            <div style={{ fontSize: 20, marginBottom: 10 }}>{icon}</div>
            <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", marginBottom: 6 }}>{l.toUpperCase()}</div>
            <div style={{ fontFamily: M, fontSize: 24, fontWeight: 800, color: c }}>{loading ? "—" : v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)", marginBottom: 16 }}>
        <div style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "#0a1a3a", marginBottom: 14 }}>{t("Recent Skills", "最近发布的 Skills")}</div>
        {loading ? (
          <div style={{ fontFamily: M, fontSize: 11, color: "#94a3b8" }}>{t("Loading…","加载中…")}</div>
        ) : skills.length === 0 ? (
          <div style={{ fontFamily: M, fontSize: 11, color: "#94a3b8" }}>{t("No skills yet. Publish your first skill!","还没有 Skill，去发布你的第一个吧！")}</div>
        ) : skills.slice(0, 5).map((sk: any) => (
          <div key={sk.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f8fafc" }}>
            <div style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#0a1a3a" }}>{sk.name}</div>
            <div style={{ fontFamily: M, fontSize: 11, color: "#059669", fontWeight: 700 }}>${(sk.total_revenue || 0).toFixed(2)}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontFamily: M, fontSize: 11, color: "#92400e", lineHeight: 1.6 }}>
        💡 {t("Early developer perk: 0% commission. 100% of revenue goes to your wallet.", "早期特权：平台零抽佣，100% 收益直接进入你的钱包。")}
      </div>
    </div>
  );
}

// ── Dev Skills ────────────────────────────────────────────────────────────────
function DevSkillsPanel({ lang, userId }: { lang: string; userId: string }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const M = "JetBrains Mono, monospace";
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", version: "v1",
    tags: "", supported_pairs: "BTC,ETH,BNB",
    price_usdt: "0",
    developer_name: "",
    prompt_template: "", example_input: "", example_output: "",
    visibility: "public",
  });

  const loadSkills = () => {
    if (!userId) return;
    fetch(`${API_BASE}/api/skills/developer/dashboard?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { setSkills(d.skills || []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { loadSkills(); }, [userId]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const totalRevenue = skills.reduce((s: number, sk: any) => s + (sk.total_revenue || 0), 0);
  const totalSales   = skills.reduce((s: number, sk: any) => s + (sk.sales_count || 0), 0);
  const statusColor  = (s: string) => s === "active" ? "#059669" : s === "pending" ? "#f59e0b" : "#dc2626";
  const statusLabel  = (s: string) => s === "active" ? t("Active","上架中") : s === "pending" ? t("Pending","审核中") : t("Inactive","已下架");

  // 从 prompt_template 中解析变量
  const parseVars = (tpl: string) => {
    const matches = tpl.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, "")))];
  };

  async function publish() {
    if (!form.name || !form.description || !form.prompt_template) {
      setMsg(t("Please fill in name, description and prompt template", "请填写名称、描述和 Prompt 模板")); return;
    }
    setSubmitting(true); setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/skills/publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, description: form.description, version: form.version,
          tags: form.tags.split(",").map((s: string) => s.trim()).filter(Boolean),
          supported_pairs: form.supported_pairs.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean),
          price_usdt: parseFloat(form.price_usdt) || 0,
          developer_name: form.developer_name || "Developer",
          prompt_template: form.prompt_template,
          example_input: form.example_input,
          example_output: form.example_output,
          visibility: form.visibility,
          user_id: userId,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Publish failed");
      setShowModal(false);
      setForm({ name: "", description: "", version: "v1", tags: "", supported_pairs: "BTC,ETH,BNB", price_usdt: "0", developer_name: "", prompt_template: "", example_input: "", example_output: "", visibility: "public" });
      setLoading(true); loadSkills();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = { width: "100%", fontFamily: M, fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 7, padding: "8px 10px", outline: "none", boxSizing: "border-box", background: "#fafafa", color: "#0a1a3a" };
  const labelStyle: React.CSSProperties = { fontFamily: M, fontSize: 9, color: "#64748b", letterSpacing: "0.1em", display: "block", marginBottom: 4 };
  const vars = parseVars(form.prompt_template);

  return (
    <div>
      {/* Publish Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(10,26,58,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px", width: "100%", maxWidth: 640, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontFamily: M, fontSize: 15, fontWeight: 800, color: "#0a1a3a" }}>{t("Publish New Skill", "发布新 Skill")}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8" }}>✕</button>
            </div>

            {/* Section: Basic */}
            <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.15em", marginBottom: 12 }}>{t("BASIC INFO", "基本信息")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={labelStyle}>{t("SKILL NAME *","Skill 名称 *")}</label><input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder={t("e.g. BTC Trend Analyzer","如：BTC 趋势分析")} /></div>
              <div><label style={labelStyle}>{t("VERSION","版本")}</label><input style={inputStyle} value={form.version} onChange={e => set("version", e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={labelStyle}>{t("DESCRIPTION *","描述 *")}</label><textarea style={{ ...inputStyle, height: 60, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder={t("Briefly describe what this skill does","简述这个 Skill 的功能")} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div><label style={labelStyle}>{t("TAGS","标签")}</label><input style={inputStyle} value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="趋势,风险" /></div>
              <div><label style={labelStyle}>{t("PAIRS","支持交易对")}</label><input style={inputStyle} value={form.supported_pairs} onChange={e => set("supported_pairs", e.target.value)} placeholder="BTC,ETH" /></div>
              <div><label style={labelStyle}>{t("PRICE (USDT)","售价 USDT")}</label><input style={inputStyle} type="number" min="0" step="0.5" value={form.price_usdt} onChange={e => set("price_usdt", e.target.value)} /></div>
            </div>

            {/* Section: Prompt Template */}
            <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.15em", marginBottom: 12 }}>{t("PROMPT TEMPLATE", "PROMPT 模板")}</div>
            <div style={{ marginBottom: 8 }}><label style={labelStyle}>{t("SYSTEM PROMPT *  (use {{variable}} for dynamic params)","系统提示词 *（用 {{变量名}} 插入动态参数）")}</label>
              <textarea style={{ ...inputStyle, height: 120, resize: "vertical", fontFamily: "monospace", fontSize: 11 }} value={form.prompt_template} onChange={e => set("prompt_template", e.target.value)} placeholder={t("You are a professional trading analyst. Analyze {{symbol}} on {{timeframe}} timeframe and provide a verdict...","你是专业交易分析师。分析 {{symbol}} 在 {{timeframe}} 周期的走势并给出裁决...")} />
            </div>
            {vars.length > 0 && (
              <div style={{ marginBottom: 12, padding: "8px 12px", background: "#f5f3ff", borderRadius: 8, fontFamily: M, fontSize: 10, color: "#7c3aed" }}>
                {t("Detected variables:","检测到变量：")} <strong>{vars.join(", ")}</strong> — {t("users will pass these when calling","用户调用时需传入这些参数")}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div><label style={labelStyle}>{t("EXAMPLE INPUT","示例输入（选填）")}</label><textarea style={{ ...inputStyle, height: 70, resize: "none", fontFamily: "monospace", fontSize: 11 }} value={form.example_input} onChange={e => set("example_input", e.target.value)} placeholder='{"symbol":"BTC","timeframe":"4h"}' /></div>
              <div><label style={labelStyle}>{t("EXAMPLE OUTPUT","示例输出（选填）")}</label><textarea style={{ ...inputStyle, height: 70, resize: "none", fontFamily: "monospace", fontSize: 11 }} value={form.example_output} onChange={e => set("example_output", e.target.value)} placeholder={t("BTC is showing bullish momentum...","BTC 呈现看涨动量...")} /></div>
            </div>

            {/* Section: Publishing Options */}
            <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.15em", marginBottom: 12 }}>{t("PUBLISHING OPTIONS", "发布设置")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={labelStyle}>{t("DISPLAY NAME","开发者显示名称")}</label><input style={inputStyle} value={form.developer_name} onChange={e => set("developer_name", e.target.value)} placeholder="Dev Team" /></div>
              <div><label style={labelStyle}>{t("VISIBILITY","可见性")}</label>
                <select style={inputStyle} value={form.visibility} onChange={e => set("visibility", e.target.value)}>
                  <option value="public">{t("Public — visible in Skills Market","公开 — 在 Skill 市场展示")}</option>
                  <option value="private">{t("Private — only accessible via direct link","私有 — 仅通过链接访问")}</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 20, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontFamily: M, fontSize: 10, color: "#166534" }}>
              ✓ {t("Early access: publishing is free. Skill goes live immediately after submission.","早期特权：发布免费，提交后立即上架。")}
            </div>

            {msg && <div style={{ fontFamily: M, fontSize: 11, color: "#dc2626", marginBottom: 12 }}>{msg}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, fontFamily: M, fontSize: 11, fontWeight: 700, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "11px", cursor: "pointer" }}>{t("Cancel","取消")}</button>
              <button onClick={publish} disabled={submitting} style={{ flex: 2, fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: submitting ? "#94a3b8" : "#7c3aed", border: "none", borderRadius: 8, padding: "11px", cursor: submitting ? "not-allowed" : "pointer" }}>
                {submitting ? t("Publishing…","发布中…") : t("Publish Skill →","发布 Skill →")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: M, fontSize: 18, fontWeight: 800, color: "#0a1a3a", margin: "0 0 4px" }}>{t("My Skills", "我的 Skills")}</h2>
          <p style={{ fontFamily: M, fontSize: 11, color: "#94a3b8", margin: 0 }}>{t("Manage your published skills and track revenue", "管理你发布的 Skill 并追踪收入")}</p>
        </div>
        <Link href="/skills/publish" style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: "#7c3aed", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", textDecoration: "none", display: "inline-block" }}>
          + {t("Publish Skill", "发布新 Skill")}
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { l: t("Published","已发布"), v: String(skills.length), c: "#7c3aed" },
          { l: t("Total Sales","累计销售"), v: String(totalSales), c: "#059669" },
          { l: t("Total Revenue","累计收入"), v: `$${totalRevenue.toFixed(2)}`, c: "#f59e0b" },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
            <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", marginBottom: 8 }}>{l.toUpperCase()}</div>
            <div style={{ fontFamily: M, fontSize: 26, fontWeight: 800, color: c }}>{loading ? "—" : v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,20,80,0.04)", marginBottom: 16 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "#0a1a3a" }}>{t("My Skills","我的 Skills")}</span>
          <span style={{ fontFamily: M, fontSize: 10, color: "#94a3b8" }}>{skills.length} {t("skills","个")}</span>
        </div>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center" as const, fontFamily: M, fontSize: 12, color: "#94a3b8" }}>{t("Loading…","加载中…")}</div>
        ) : skills.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" as const }}>
            <div style={{ fontSize: 32, opacity: 0.1, marginBottom: 12 }}>📦</div>
            <div style={{ fontFamily: M, fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>{t("No skills published yet","还没有发布过 Skill")}</div>
            <Link href="/skills/publish" style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "8px 18px", borderRadius: 7, cursor: "pointer", textDecoration: "none", display: "inline-block" }}>
              {t("Publish your first skill →","立即发布第一个 Skill →")}
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 100px 100px 100px", padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              {[t("Name","名称"), t("Ver","版本"), t("Price","售价"), t("Status","状态"), t("Sales","销售量"), t("Revenue","收入")].map(h => (
                <span key={h} style={{ fontFamily: M, fontSize: 8, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em" }}>{h.toUpperCase()}</span>
              ))}
            </div>
            {skills.map((sk: any, i: number) => (
              <div key={sk.id} style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 100px 100px 100px", padding: "14px 20px", borderBottom: i < skills.length - 1 ? "1px solid #f4f6f8" : "none", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: "#0a1a3a" }}>{sk.name}</div>
                  <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", marginTop: 2 }}>ID: {sk.id}</div>
                </div>
                <span style={{ fontFamily: M, fontSize: 11, color: "#64748b" }}>{sk.version}</span>
                <span style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: sk.price_usdt === 0 ? "#059669" : "#0a1a3a" }}>{sk.price_usdt === 0 ? "FREE" : `$${sk.price_usdt}`}</span>
                <span style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: statusColor(sk.status), background: statusColor(sk.status) + "18", padding: "3px 8px", borderRadius: 5, display: "inline-block" }}>{statusLabel(sk.status)}</span>
                <span style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: "#0a1a3a" }}>{sk.sales_count}</span>
                <span style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: "#059669" }}>${(sk.total_revenue || 0).toFixed(2)}</span>
              </div>
            ))}
          </>
        )}
      </div>
      <div style={{ padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontFamily: M, fontSize: 11, color: "#92400e", lineHeight: 1.6 }}>
        💡 {t("Early access perk: 0% commission. 100% of revenue goes to your wallet.","早期入驻特权：平台零抽佣，100% 收益直接进入你的钱包。")}
      </div>
    </div>
  );
}

// ── Dev Analytics ─────────────────────────────────────────────────────────────
function DevAnalyticsPanel({ lang, userId }: { lang: string; userId: string }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const M = "JetBrains Mono, monospace";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/skills/developer/analytics?user_id=${userId}&days=14`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const daily: { date: string; calls: number }[] = data?.daily || [];
  const skills: any[] = data?.skills || [];
  const maxDay = Math.max(...daily.map(d => d.calls), 1);
  const maxSkill = Math.max(...skills.map(s => s.total_calls), 1);
  const filteredDaily = filter === "all" ? daily : daily; // per-skill filtering future work

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: M, fontSize: 18, fontWeight: 800, color: "#0a1a3a", margin: "0 0 4px" }}>{t("Analytics", "数据分析")}</h2>
        <p style={{ fontFamily: M, fontSize: 11, color: "#94a3b8", margin: 0 }}>{t("Skill usage trends and performance", "Skill 调用趋势与表现")}</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { l: t("Total Calls","总调用"), v: loading ? "—" : String(data?.total_calls ?? 0), c: "#7c3aed" },
          { l: t("This Month","本月调用"), v: loading ? "—" : String(data?.month_calls ?? 0), c: "#0047cc" },
          { l: t("Skills","Skill 数"), v: loading ? "—" : String(skills.length), c: "#059669" },
          { l: t("Success Rate","成功率"), v: "100%", c: "#f59e0b" },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
            <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", marginBottom: 8 }}>{l.toUpperCase()}</div>
            <div style={{ fontFamily: M, fontSize: 24, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "#0a1a3a" }}>{t("14-Day Call Trend","14 天调用趋势")}</span>
          <span style={{ fontFamily: M, fontSize: 9, color: "#94a3b8" }}>{t("All Skills","全部 Skill")}</span>
        </div>
        {loading ? (
          <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: M, fontSize: 11, color: "#94a3b8" }}>{t("Loading…","加载中…")}</div>
        ) : daily.every(d => d.calls === 0) ? (
          <div style={{ height: 100, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 6 }}>
            <div style={{ fontFamily: M, fontSize: 28, opacity: 0.07 }}>📊</div>
            <div style={{ fontFamily: M, fontSize: 11, color: "#94a3b8" }}>{t("No call data yet","暂无调用数据")}</div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100 }}>
            {filteredDaily.map((d, i) => {
              const h = Math.max(4, Math.round((d.calls / maxDay) * 100));
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
                  <div title={`${d.date}: ${d.calls}`} style={{ width: "100%", height: h, background: "linear-gradient(180deg,#7c3aed,#a78bfa)", borderRadius: "3px 3px 0 0", transition: "height 0.6s ease" }} />
                  {i % 3 === 0 && <div style={{ fontFamily: M, fontSize: 7, color: "#cbd5e1" }}>{d.date.slice(4, 6)}/{d.date.slice(6, 8)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-skill breakdown */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", fontFamily: M, fontSize: 10, fontWeight: 700, color: "#0a1a3a" }}>{t("Calls by Skill","各 Skill 调用量")}</div>
        {loading ? (
          <div style={{ padding: "32px", fontFamily: M, fontSize: 11, color: "#94a3b8" }}>{t("Loading…","加载中…")}</div>
        ) : skills.length === 0 ? (
          <div style={{ padding: "32px", fontFamily: M, fontSize: 11, color: "#94a3b8" }}>{t("No skills yet","暂无 Skill")}</div>
        ) : skills.map((sk: any, i: number) => {
          const pct = Math.round((sk.total_calls / maxSkill) * 100);
          return (
            <div key={sk.id} style={{ padding: "14px 20px", borderBottom: i < skills.length - 1 ? "1px solid #f8fafc" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: M, fontSize: 11, fontWeight: 600, color: "#0a1a3a" }}>{sk.name}</span>
                <span style={{ fontFamily: M, fontSize: 11, color: "#7c3aed", fontWeight: 700 }}>{sk.total_calls} {t("calls","次")}</span>
              </div>
              <div style={{ height: 5, background: "#f1f5f9", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)", borderRadius: 5 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dev Revenue ───────────────────────────────────────────────────────────────
function DevRevenuePanel({ lang, userId }: { lang: string; userId: string }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const M = "JetBrains Mono, monospace";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [wForm, setWForm] = useState({ wallet: "", amount: "", chain: "bsc", note: "" });
  const [wMsg, setWMsg] = useState("");
  const [wSubmitting, setWSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/skills/developer/revenue?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const inputStyle: React.CSSProperties = { width: "100%", fontFamily: M, fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 7, padding: "8px 10px", outline: "none", boxSizing: "border-box", background: "#fafafa", color: "#0a1a3a" };

  async function submitWithdraw() {
    if (!wForm.wallet || !wForm.amount) { setWMsg(t("Please fill wallet and amount","请填写钱包地址和金额")); return; }
    setWSubmitting(true); setWMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/skills/developer/withdraw`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, wallet: wForm.wallet, amount: parseFloat(wForm.amount), chain: wForm.chain, note: wForm.note }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowWithdraw(false);
      setWMsg(t("Withdrawal request submitted!","提现申请已提交！"));
    } catch {
      setWMsg(t("Submission failed, try again","提交失败，请重试"));
    } finally { setWSubmitting(false); }
  }

  const records: any[] = data?.records || [];

  return (
    <div>
      {showWithdraw && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(10,26,58,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px", width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: M, fontSize: 14, fontWeight: 800, color: "#0a1a3a" }}>{t("Request Withdrawal","申请提现")}</div>
              <button onClick={() => setShowWithdraw(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8" }}>✕</button>
            </div>
            <div style={{ fontFamily: M, fontSize: 10, color: "#64748b", marginBottom: 16 }}>
              {t("Withdrawable balance:","可提现余额：")} <strong style={{ color: "#059669" }}>${(data?.withdrawable || 0).toFixed(2)} USDT</strong>
            </div>
            {[
              { k: "wallet", l: t("Wallet Address *","收款钱包地址 *"), ph: "0x..." },
              { k: "amount", l: t("Amount (USDT) *","金额 USDT *"), ph: "0.00" },
              { k: "note",   l: t("Note (optional)","备注（选填）"), ph: "" },
            ].map(({ k, l, ph }) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: M, fontSize: 9, color: "#64748b", marginBottom: 4 }}>{l}</div>
                <input style={inputStyle} value={(wForm as any)[k]} onChange={e => setWForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} type={k === "amount" ? "number" : "text"} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: M, fontSize: 9, color: "#64748b", marginBottom: 4 }}>{t("Chain","链")}</div>
              <select style={inputStyle} value={wForm.chain} onChange={e => setWForm(f => ({ ...f, chain: e.target.value }))}>
                <option value="bsc">BSC (BNB Chain)</option><option value="polygon">Polygon</option>
              </select>
            </div>
            {wMsg && <div style={{ fontFamily: M, fontSize: 10, color: "#dc2626", marginBottom: 10 }}>{wMsg}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowWithdraw(false)} style={{ flex: 1, fontFamily: M, fontSize: 11, fontWeight: 700, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px", cursor: "pointer" }}>{t("Cancel","取消")}</button>
              <button onClick={submitWithdraw} disabled={wSubmitting} style={{ flex: 2, fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: wSubmitting ? "#94a3b8" : "#059669", border: "none", borderRadius: 8, padding: "10px", cursor: wSubmitting ? "not-allowed" : "pointer" }}>
                {wSubmitting ? t("Submitting…","提交中…") : t("Submit Request →","提交申请 →")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: M, fontSize: 18, fontWeight: 800, color: "#0a1a3a", margin: "0 0 4px" }}>{t("Revenue", "收入")}</h2>
        <p style={{ fontFamily: M, fontSize: 11, color: "#94a3b8", margin: 0 }}>{t("Your earnings from skill sales","你的 Skill 销售收益")}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
        {[
          { l: t("Total Revenue","累计收入"), v: loading ? "—" : `$${(data?.total_revenue || 0).toFixed(2)}`, c: "#059669" },
          { l: t("This Month","本月收入"),    v: loading ? "—" : `$${(data?.month_revenue || 0).toFixed(2)}`, c: "#0047cc" },
          { l: t("Commission","平台抽佣"),    v: "$0.00",                                                        c: "#94a3b8" },
          { l: t("Withdrawable","可提现"),    v: loading ? "—" : `$${(data?.withdrawable || 0).toFixed(2)}`,    c: "#f59e0b" },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
            <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", marginBottom: 8 }}>{l.toUpperCase()}</div>
            <div style={{ fontFamily: M, fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,20,80,0.04)", marginBottom: 16 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", fontFamily: M, fontSize: 10, fontWeight: 700, color: "#0a1a3a" }}>{t("Transaction Records","收入明细")}</div>
        {loading ? (
          <div style={{ padding: "32px", fontFamily: M, fontSize: 11, color: "#94a3b8" }}>{t("Loading…","加载中…")}</div>
        ) : records.length === 0 ? (
          <div style={{ padding: "48px 32px", textAlign: "center" as const }}>
            <div style={{ fontSize: 28, opacity: 0.08, marginBottom: 10 }}>💰</div>
            <div style={{ fontFamily: M, fontSize: 11, color: "#94a3b8" }}>{t("No revenue yet. Publish skills to start earning.","暂无收入记录，发布 Skill 开始变现吧。")}</div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px 80px 70px", padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              {[t("Time","时间"), t("Skill","Skill"), t("Buyer","买家"), t("Amount","金额"), t("Status","状态")].map(h => (
                <span key={h} style={{ fontFamily: M, fontSize: 8, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em" }}>{h.toUpperCase()}</span>
              ))}
            </div>
            {records.map((rec: any, i: number) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px 80px 70px", padding: "12px 20px", borderBottom: i < records.length - 1 ? "1px solid #f8fafc" : "none", alignItems: "center" }}>
                <span style={{ fontFamily: M, fontSize: 10, color: "#64748b" }}>{rec.ts?.slice(0, 10) || "—"}</span>
                <span style={{ fontFamily: M, fontSize: 11, fontWeight: 600, color: "#0a1a3a" }}>{rec.skill_name}</span>
                <span style={{ fontFamily: M, fontSize: 10, color: "#94a3b8" }}>{rec.buyer_id}</span>
                <span style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: "#059669" }}>${rec.amount?.toFixed(2)}</span>
                <span style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#059669", background: "#f0fdf4", padding: "2px 6px", borderRadius: 4 }}>{t("Done","完成")}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
        <div>
          <div style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#0a1a3a" }}>{t("Withdraw Earnings","提现收益")}</div>
          <div style={{ fontFamily: M, fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{t("Min. $10 USDT. Processed within 3 business days.","最低 $10 USDT，3 个工作日内处理。")}</div>
        </div>
        <button onClick={() => setShowWithdraw(true)} style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: "#059669", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
          {t("Request Withdrawal →","申请提现 →")}
        </button>
      </div>
    </div>
  );
}

// ── Dev Settings ──────────────────────────────────────────────────────────────
function DevSettingsPanel({ lang, userId }: { lang: string; userId: string }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const M = "JetBrains Mono, monospace";
  const { user } = useUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "—";
  const [profile, setProfile] = useState({ display_name: "", bio: "", bsc_wallet: "", polygon_wallet: "", notify_purchase: true, notify_weekly: false });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/skills/developer/profile?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { if (d.user_id) setProfile({ display_name: d.display_name || "", bio: d.bio || "", bsc_wallet: d.bsc_wallet || "", polygon_wallet: d.polygon_wallet || "", notify_purchase: d.notify_purchase ?? true, notify_weekly: d.notify_weekly ?? false }); })
      .catch(() => {});
  }, [userId]);

  const set = (k: string, v: any) => setProfile(f => ({ ...f, [k]: v }));
  const inputStyle: React.CSSProperties = { width: "100%", fontFamily: M, fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 7, padding: "8px 10px", outline: "none", boxSizing: "border-box", background: "#fafafa", color: "#0a1a3a" };
  const labelStyle: React.CSSProperties = { fontFamily: M, fontSize: 9, color: "#64748b", letterSpacing: "0.1em", display: "block", marginBottom: 4 };

  async function save() {
    setSaving(true);
    await fetch(`${API_BASE}/api/skills/developer/profile`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, ...profile }),
    }).catch(() => {});
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      {showRevoke && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(10,26,58,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px", width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontFamily: M, fontSize: 14, fontWeight: 800, color: "#dc2626", marginBottom: 12 }}>{t("Revoke Developer Status","注销开发者身份")}</div>
            <div style={{ fontFamily: M, fontSize: 11, color: "#64748b", lineHeight: 1.7, marginBottom: 20 }}>
              {t("This will remove your developer access and unpublish all your skills. This action cannot be undone.","此操作将移除你的开发者权限并下架所有 Skill，无法撤销。")}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowRevoke(false)} style={{ flex: 1, fontFamily: M, fontSize: 11, fontWeight: 700, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px", cursor: "pointer" }}>{t("Cancel","取消")}</button>
              <button style={{ flex: 1, fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: "#dc2626", border: "none", borderRadius: 8, padding: "10px", cursor: "pointer" }}>{t("Confirm Revoke","确认注销")}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: M, fontSize: 18, fontWeight: 800, color: "#0a1a3a", margin: "0 0 4px" }}>{t("Developer Settings","开发者设置")}</h2>
        <p style={{ fontFamily: M, fontSize: 11, color: "#94a3b8", margin: 0 }}>{t("Your developer profile and account settings","你的开发者资料与账号设置")}</p>
      </div>

      {/* Profile */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "24px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)", marginBottom: 16 }}>
        <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.15em", marginBottom: 16 }}>{t("DEVELOPER PROFILE","开发者资料")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><label style={labelStyle}>{t("DISPLAY NAME","显示名称")}</label><input style={inputStyle} value={profile.display_name} onChange={e => set("display_name", e.target.value)} placeholder={t("Shown in Skills Market","在 Skill 市场展示的名称")} /></div>
          <div><label style={labelStyle}>{t("EMAIL","邮箱")}</label><input style={{ ...inputStyle, background: "#f8fafc", color: "#94a3b8" }} value={email} readOnly /></div>
        </div>
        <div style={{ marginBottom: 14 }}><label style={labelStyle}>{t("BIO","个人简介")}</label><textarea style={{ ...inputStyle, height: 72, resize: "vertical" }} value={profile.bio} onChange={e => set("bio", e.target.value)} placeholder={t("Tell buyers about yourself (max 150 chars)","介绍你自己（最多150字）")} maxLength={150} /></div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #f8fafc" }}>
          {[
            { l: t("Status","状态"), v: "✦ " + t("Active Developer","已入驻开发者"), c: "#7c3aed" },
            { l: t("Developer ID","开发者ID"), v: userId.slice(0, 16) + "…", c: "#0a1a3a" },
            { l: t("Commission","抽佣率"), v: "0% (" + t("Early Access","早期特权") + ")", c: "#059669" },
          ].map(({ l, v, c }) => (
            <div key={l}>
              <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8" }}>{l}</div>
              <div style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: c, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Wallets */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "24px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)", marginBottom: 16 }}>
        <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.15em", marginBottom: 16 }}>{t("PAYMENT WALLETS","收款钱包")}</div>
        <div style={{ marginBottom: 12 }}><label style={labelStyle}>{t("BSC WALLET (Primary)","BSC 钱包（主要）")}</label><input style={inputStyle} value={profile.bsc_wallet} onChange={e => set("bsc_wallet", e.target.value)} placeholder="0x..." /></div>
        <div><label style={labelStyle}>{t("POLYGON WALLET (Optional)","Polygon 钱包（选填）")}</label><input style={inputStyle} value={profile.polygon_wallet} onChange={e => set("polygon_wallet", e.target.value)} placeholder="0x..." /></div>
      </div>

      {/* Notifications */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "24px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)", marginBottom: 16 }}>
        <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.15em", marginBottom: 16 }}>{t("NOTIFICATIONS","通知设置")}</div>
        {[
          { k: "notify_purchase", l: t("Email when someone purchases my Skill","有人购买我的 Skill 时发邮件通知") },
          { k: "notify_weekly",   l: t("Weekly revenue report","每周收入报告") },
        ].map(({ k, l }) => (
          <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f8fafc" }}>
            <span style={{ fontFamily: M, fontSize: 11, color: "#0a1a3a" }}>{l}</span>
            <button onClick={() => set(k, !(profile as any)[k])} style={{ width: 38, height: 22, borderRadius: 11, border: "none", background: (profile as any)[k] ? "#7c3aed" : "#e2e8f0", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 3, left: (profile as any)[k] ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </button>
          </div>
        ))}
      </div>

      {/* Official Certification */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "24px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)", marginBottom: 16 }}>
        <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.15em", marginBottom: 12 }}>{t("OFFICIAL CERTIFICATION","官方认证")}</div>
        <div style={{ fontFamily: M, fontSize: 10, color: "#64748b", lineHeight: 1.8, marginBottom: 14 }}>
          {t("Reach milestones to earn the ✦ OFFICIAL badge from the Themis team.","达成以下门槛即可获得 Themis 团队授予的 ✦ OFFICIAL 认证徽章。")}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {[{ l: t("MILESTONE A","门槛 A"), v: t("1,000+ Calls","累计调用 ≥ 1,000 次") }, { l: t("MILESTONE B","门槛 B"), v: t("$500+ Revenue","累计收入 ≥ $500") }].map(({ l, v }) => (
            <div key={l} style={{ flex: 1, background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", marginBottom: 4 }}>{l}</div>
              <div style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#0a1a3a" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setShowRevoke(true)} style={{ fontFamily: M, fontSize: 11, color: "#dc2626", background: "none", border: "1px solid #fecaca", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>
          {t("Revoke Developer Status","注销开发者身份")}
        </button>
        <button onClick={save} disabled={saving} style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: saved ? "#059669" : saving ? "#94a3b8" : "#7c3aed", border: "none", padding: "10px 24px", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
          {saved ? t("✓ Saved","✓ 已保存") : saving ? t("Saving…","保存中…") : t("Save Changes","保存设置")}
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isLoaded, user } = useUser();
  const [lang, setLang] = useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("themis_lang") || "en";
  });
  const [activeNav, setActiveNav] = useState<NavItem>("overview");
  const [plan, setPlan] = useState<keyof typeof PLANS>("free");
  const [consoleTab, setConsoleTab] = useState<"user" | "dev">("user");
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [devNav, setDevNav] = useState<DevNavItem>("dev-overview");

  useEffect(() => {
    const meta = user?.publicMetadata as any;
    if (meta?.developer === true) { setIsDeveloper(true); return; }
    const uid = user?.id;
    if (!uid) return;
    fetch(`${API_BASE}/api/payment/developer-status?user_id=${uid}`)
      .then(r => r.json())
      .then(d => { if (d.is_developer) setIsDeveloper(true); })
      .catch(() => {});
  }, [user]);
  const userId = user?.id || "";

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/payment/status?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { if (d.plan && d.plan !== "free") setPlan(d.plan as keyof typeof PLANS); })
      .catch(() => {});
  }, [userId]);

  if (!isLoaded) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#94a3b8", letterSpacing: "0.15em" }}>LOADING...</div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar active={activeNav} setActive={setActiveNav} lang={lang} plan={plan} consoleTab={consoleTab} isDeveloper={isDeveloper} devNav={devNav} setDevNav={setDevNav} />

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto" }}>
        {/* Top bar */}
        <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", background: "#fff", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: 3 }}>
            {([["user", lang === "zh" ? "用户控制台" : "Console"], ["dev", lang === "zh" ? "开发者控制台" : "Developer"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setConsoleTab(key)}
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: consoleTab === key ? "#fff" : "#64748b", background: consoleTab === key ? "#0047cc" : "transparent", border: "none", padding: "5px 14px", borderRadius: 6, cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", background: "rgba(0,0,0,0.04)", borderRadius: 6, padding: 2 }}>
              {["EN","ZH"].map(l => (
                <button key={l} onClick={() => { const v = l.toLowerCase(); setLang(v); localStorage.setItem("themis_lang", v); }}
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: lang === l.toLowerCase() ? "#fff" : "rgba(10,26,58,0.35)", background: lang === l.toLowerCase() ? "#0047cc" : "none", border: "none", padding: "4px 10px", borderRadius: 5, cursor: "pointer", transition: "all 0.15s" }}>
                  {l}
                </button>
              ))}
            </div>
            <Link href="/" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#64748b", background: "#f8fafc", border: "1px solid #f1f5f9", padding: "5px 12px", borderRadius: 8, textDecoration: "none" }}>
              ← {lang === "zh" ? "返回官网" : "Back to site"}
            </Link>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: "32px 32px 60px" }}>
          {consoleTab === "dev" ? (
            isDeveloper ? (
              <>
                {devNav === "dev-overview"  && <DevOverviewPanel  lang={lang} userId={userId} />}
                {devNav === "dev-skills"    && <DevSkillsPanel    lang={lang} userId={userId} />}
                {devNav === "dev-analytics" && <DevAnalyticsPanel lang={lang} userId={userId} />}
                {devNav === "dev-revenue"   && <DevRevenuePanel   lang={lang} userId={userId} />}
                {devNav === "dev-settings"  && <DevSettingsPanel  lang={lang} userId={userId} />}
              </>
            ) : <DeveloperOnboarding lang={lang} userId={userId} onActivated={() => setIsDeveloper(true)} />
          ) : (
            <>
              {activeNav === "overview" && <OverviewPanel plan={plan} lang={lang} userId={userId} />}
              {activeNav === "apikeys"  && <ApiKeysPanel lang={lang} plan={plan} />}
              {activeNav === "usage"    && <UsagePanel plan={plan} lang={lang} userId={userId} />}
              {activeNav === "billing"  && <BillingPanel plan={plan} lang={lang} userId={userId} onPlanChange={(p) => setPlan(p as keyof typeof PLANS)} />}
              {activeNav === "commission" && <CommissionPanel lang={lang} userId={userId} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Commission Panel (ERC-8183 verdict委托) ─────────────────────────────────
function CommissionPanel({ lang, userId }: { lang: string; userId: string }) {
  const t = (zh: string, en: string) => lang === "zh" ? zh : en;
  const M = "JetBrains Mono, monospace";
  const API = process.env.NEXT_PUBLIC_AGENT_API || "https://api.themisverdict.xyz";
  const [symbol, setSymbol]   = useState("BTC");
  const [budget, setBudget]   = useState("0.005");
  const [question, setQuestion] = useState("");
  const [jobs, setJobs]       = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const commerce = useCommerceJob();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const stepLabel: Record<string, [string, string]> = {
    idle: ["", ""],
    switching_chain: ["切换到 BSC Testnet…", "Switching to BSC Testnet…"],
    preparing: ["准备链上参数…", "Preparing chain params…"],
    approving: ["批准 U token 使用额度…", "Approving U token allowance…"],
    creating_job: ["创建链上 Job…", "Creating on-chain job…"],
    funding: ["锁仓资金…", "Escrowing funds…"],
    executing: ["Themis Agent 生成分析…", "Generating verdict…"],
    done: ["✓ 完成", "✓ Done"],
    error: ["✗ 失败", "✗ Failed"],
  };

  const loadJobs = () => {
    if (!userId) return;
    setLoadingJobs(true);
    fetch(`${API}/api/commerce/jobs/by-user?user_id=${userId}`)
      .then(r => r.json())
      .then(d => setJobs(d.jobs || []))
      .catch(() => {})
      .finally(() => setLoadingJobs(false));
  };

  useEffect(() => { loadJobs(); /* eslint-disable-next-line */ }, [userId]);
  useEffect(() => { if (commerce.step === "done") loadJobs(); /* eslint-disable-next-line */ }, [commerce.step]);

  async function commission() {
    if (!userId) return;
    await commerce.run({
      kind: "verdict", user_id: userId,
      symbol, question, budget_bnb: parseFloat(budget) || 0.005, lang,
    });
  }

  async function settle(jobId: number) {
    await fetch(`${API}/api/commerce/job/${jobId}/settle`, { method: "POST" });
    loadJobs();
  }

  const running = ["switching_chain","preparing","approving","creating_job","funding","executing"].includes(commerce.step);
  const result  = commerce.result;

  return (
    <div style={{ padding: 32, maxWidth: 920 }}>
      <h1 style={{ fontFamily: M, fontSize: 22, fontWeight: 800, color: "#0a1a3a", margin: 0, marginBottom: 6 }}>
        {t("链上委托分析", "On-chain Commission")}
      </h1>
      <p style={{ fontFamily: M, fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 18, lineHeight: 1.7 }}>
        {t("通过 ERC-8183 商务协议向 Themis Agent 委托一份链上可验证的市场分析。你的钱包出资锁仓 72 小时争议窗口，到期自动结算给平台。",
          "Commission an on-chain verifiable verdict via ERC-8183. Your wallet escrows the budget for a 72h dispute window, then auto-settles to the platform.")}
      </p>

      {/* Wallet connect bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", padding: "12px 16px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: mounted && commerce.isConnected ? "#10b981" : "#94a3b8", boxShadow: mounted && commerce.isConnected ? "0 0 6px #10b981" : "none" }} />
          <div style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.08em" }}>
            {mounted && commerce.isConnected ? t("钱包已连接", "WALLET CONNECTED") : t("请连接钱包以开始委托", "CONNECT WALLET TO COMMISSION")}
          </div>
          {mounted && commerce.address && (
            <span style={{ fontFamily: M, fontSize: 9, color: "#64748b" }}>{commerce.address.slice(0,6)}…{commerce.address.slice(-4)}</span>
          )}
        </div>
        {mounted ? (
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
        ) : (
          <div style={{ fontFamily: M, fontSize: 10, color: "#94a3b8" }}>Loading…</div>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 28, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#0047cc", letterSpacing: "0.14em", marginBottom: 6 }}>{t("交易对", "SYMBOL")}</div>
            <select value={symbol} onChange={e => setSymbol(e.target.value)}
              style={{ width: "100%", fontFamily: M, fontSize: 12, padding: "9px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0a1a3a", outline: "none" }}>
              {["BTC","ETH","BNB","SOL","DOGE","XRP"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#0047cc", letterSpacing: "0.14em", marginBottom: 6 }}>{t("预算 (BNB)", "BUDGET (BNB)")}</div>
            <input value={budget} onChange={e => setBudget(e.target.value)} type="number" step="0.001" min="0.001"
              style={{ width: "100%", boxSizing: "border-box", fontFamily: M, fontSize: 12, padding: "9px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0a1a3a", outline: "none" }} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={commission} disabled={running || !userId || !commerce.isConnected}
              title={!commerce.isConnected ? t("请先连接钱包","Connect wallet first") : ""}
              style={{ width: "100%", fontFamily: M, fontSize: 11, fontWeight: 800, color: "#fff", background: (running || !commerce.isConnected) ? "#94a3b8" : "#0047cc", border: "none", borderRadius: 8, padding: "11px 0", cursor: (running || !commerce.isConnected) ? "not-allowed" : "pointer", letterSpacing: "0.08em" }}>
              {running ? t("处理中…", "Running…") : t("▶ 委托分析", "▶ COMMISSION")}
            </button>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#0047cc", letterSpacing: "0.14em", marginBottom: 6 }}>{t("具体问题（可选）", "QUESTION (OPTIONAL)")}</div>
          <input value={question} onChange={e => setQuestion(e.target.value)}
            placeholder={t("例：未来 48 小时是否适合建仓 BTC？", "e.g. Good time to enter BTC in 48h?")}
            style={{ width: "100%", boxSizing: "border-box", fontFamily: M, fontSize: 12, padding: "9px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0a1a3a", outline: "none" }} />
        </div>
      </div>

      {/* Step indicator */}
      {running && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ width: 14, height: 14, border: "2px solid #0047cc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <span style={{ fontFamily: M, fontSize: 11, color: "#1e3a8a", fontWeight: 700 }}>
            {t(stepLabel[commerce.step]?.[0] || "", stepLabel[commerce.step]?.[1] || "")}
          </span>
        </div>
      )}

      {commerce.error && (
        <div style={{ fontFamily: M, fontSize: 12, color: "#dc2626", marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, wordBreak: "break-word" as const }}>
          ✗ {commerce.error}
        </div>
      )}

      {result && commerce.step === "done" && (
        <div style={{ background: "linear-gradient(135deg,#ecfeff,#f0fdf4)", borderRadius: 12, border: "1px solid #6ee7b7", padding: 22, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            <span style={{ fontFamily: M, fontSize: 10, fontWeight: 800, color: "#064e3b", letterSpacing: "0.12em" }}>
              {t("委托完成 · JOB #", "COMMISSIONED · JOB #")}{result.job_id}
            </span>
          </div>
          <pre style={{ fontFamily: M, fontSize: 11, color: "#0a1a3a", margin: 0, whiteSpace: "pre-wrap" as const, maxHeight: 280, overflowY: "auto" as const }}>
            {result.verdict?.rationale || result.verdict?.conclusion || (result.analysis ?? JSON.stringify(result.verdict, null, 2))}
          </pre>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" as const }}>
            {result.tx_approve && <a href={`https://testnet.bscscan.com/tx/${result.tx_approve}`} target="_blank" rel="noreferrer" style={{ fontFamily: M, fontSize: 10, color: "#059669", textDecoration: "none" }}>↗ Approve TX</a>}
            {result.tx_create  && <a href={`https://testnet.bscscan.com/tx/${result.tx_create}`}  target="_blank" rel="noreferrer" style={{ fontFamily: M, fontSize: 10, color: "#059669", textDecoration: "none" }}>↗ Create TX</a>}
            {result.tx_fund    && <a href={`https://testnet.bscscan.com/tx/${result.tx_fund}`}    target="_blank" rel="noreferrer" style={{ fontFamily: M, fontSize: 10, color: "#059669", textDecoration: "none" }}>↗ Fund TX</a>}
            {result.tx_submit_url && <a href={result.tx_submit_url} target="_blank" rel="noreferrer" style={{ fontFamily: M, fontSize: 10, color: "#059669", textDecoration: "none" }}>↗ Submit TX</a>}
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 22, boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: M, fontSize: 11, fontWeight: 800, color: "#0a1a3a", letterSpacing: "0.1em" }}>
            {t("我的委托历史", "MY COMMISSIONS")} · {jobs.length}
          </div>
          <button onClick={loadJobs} disabled={loadingJobs}
            style={{ fontFamily: M, fontSize: 9, color: "#0047cc", background: "transparent", border: "1px solid #0047cc", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
            {loadingJobs ? "…" : t("刷新", "Refresh")}
          </button>
        </div>
        {jobs.length === 0 ? (
          <div style={{ fontFamily: M, fontSize: 11, color: "#94a3b8", padding: "16px 0" }}>
            {t("暂无委托记录", "No commissions yet")}
          </div>
        ) : jobs.map(j => (
          <div key={j.job_id} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderTop: "1px solid #f1f5f9" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#0a1a3a" }}>
                #{j.job_id} · {j.kind === "verdict" ? (j.symbol || "—") : (j.skill_name || j.skill_id)}
              </div>
              <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
                {j.budget_bnb || j.price_bnb} BNB · {j.status} · {new Date(j.created_at).toLocaleString()}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(j.tx_fund_url || j.tx_create_url || j.submit?.tx_submit_url) && (
                <a href={j.submit?.tx_submit_url || j.tx_fund_url || j.tx_create_url} target="_blank" rel="noreferrer"
                  style={{ fontFamily: M, fontSize: 9, color: "#0047cc", textDecoration: "none", padding: "4px 10px", border: "1px solid #0047cc", borderRadius: 6 }}>
                  ↗ TX
                </a>
              )}
              {j.status === "submitted" && (
                <button onClick={() => settle(j.job_id)}
                  style={{ fontFamily: M, fontSize: 9, color: "#fff", background: "#059669", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                  {t("结算", "Settle")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
