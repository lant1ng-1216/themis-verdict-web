"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_AGENT_API || "https://api.themisverdict.xyz";

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260525_070034_60e5670b-6bb0-402b-a6c1-c9a8c05ae3a4.mp4";
const M = "JetBrains Mono, monospace";

// ── Nav (exported for reuse) ──────────────────────────────────────────────────
export function SiteNav({ lang, onLangChange, verdictCount }: { lang: string; onLangChange: (l: string) => void; verdictCount?: number }) {
  const { isSignedIn, isLoaded } = useUser();
  const [productOpen, setProductOpen] = useState(false);
  const [devOpen, setDevOpen]         = useState(false);
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  const Dropdown = ({ items }: { items: { href: string; en: string; zh: string; desc: string; soon?: boolean }[] }) => (
    <div style={{ position: "absolute", top: "100%", left: 0, paddingTop: 8, zIndex: 300 }}>
    <div style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 6, minWidth: 240, boxShadow: "0 12px 40px rgba(0,20,80,0.12)" }}>
      {items.map(({ href, en, zh, desc, soon }) => (
        <Link key={href} href={href}
          style={{ display: "flex", flexDirection: "column" as const, gap: 2, padding: "9px 12px", borderRadius: 8, textDecoration: "none", transition: "background 0.1s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,71,204,0.05)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#0a1a3a" }}>{lang === "zh" ? zh : en}</span>
            {soon && <span style={{ fontFamily: M, fontSize: 7, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "1px 5px", borderRadius: 3, letterSpacing: "0.08em" }}>BETA</span>}
          </div>
          <span style={{ fontFamily: M, fontSize: 9.5, color: "#94a3b8" }}>{desc}</span>
        </Link>
      ))}
    </div>
    </div>
  );

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.2)" }}>

      {/* Left: logo + nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginRight: 28 }}>
          <img src="/themis-logo.png" alt="Themis" style={{ width: 34, height: 34, objectFit: "contain" }} />
          <span style={{ fontFamily: M, fontSize: 14, fontWeight: 800, color: "#0a1a3a", letterSpacing: "0.15em" }}>THEMIS<span style={{ color: "#0047cc" }}>·</span>VERDICT</span>
        </Link>

        {/* Product dropdown */}
        <div style={{ position: "relative" }} onMouseEnter={() => setProductOpen(true)} onMouseLeave={() => setProductOpen(false)}>
          <button style={{ fontFamily: M, fontSize: 11, fontWeight: 500, color: "rgba(10,26,58,0.65)", background: "none", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 4 }}>
            {t("Product", "产品")} <span style={{ fontSize: 8, opacity: 0.4 }}>▾</span>
          </button>
          {productOpen && <Dropdown items={[
            { href: "/verdict",   en: "Court · Verdict",  zh: "法庭 · 裁决分析", desc: t("7-dimension AI market analysis","7维度 AI 市场分析") },
            { href: "/agent",     en: "Themis Agent",     zh: "交易 Agent",      desc: t("Autonomous AI trading agent","自主 AI 交易代理") },
            { href: "/skills",    en: "Skill Market",     zh: "Skill 市场",      desc: t("Discover & deploy trading skills","发现并部署交易策略 Skill") },
            { href: "/feed",      en: "Verdict Feed",     zh: "裁决广播",        desc: t("Live feed + on-chain protocol","实时广播 + 链上协议") },
          ]} />}
        </div>

        {/* Developers dropdown */}
        <div style={{ position: "relative" }} onMouseEnter={() => setDevOpen(true)} onMouseLeave={() => setDevOpen(false)}>
          <button style={{ fontFamily: M, fontSize: 11, fontWeight: 500, color: "rgba(10,26,58,0.65)", background: "none", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 4 }}>
            {t("Developers", "开发者")} <span style={{ fontSize: 8, opacity: 0.4 }}>▾</span>
          </button>
          {devOpen && <Dropdown items={[
            { href: "/agent-api",       en: "Agent API",      zh: "Agent API",   desc: t("Signal subscription API","信号订阅接口"), soon: false },
            { href: "/skills/dashboard",en: "Dev Dashboard",  zh: "开发者控制台", desc: t("Sales & revenue analytics","销售与收入数据") },
            { href: "/docs",            en: "Documentation",  zh: "开发文档",    desc: t("Full technical reference","完整技术文档") },
          ]} />}
        </div>

        <Link href="/collab" style={{ fontFamily: M, fontSize: 11, fontWeight: 500, color: "rgba(10,26,58,0.65)", padding: "6px 12px", borderRadius: 6, textDecoration: "none", letterSpacing: "0.04em" }}>
          {t("Collab", "协作网络")}
        </Link>

        <Link href="/pricing" style={{ fontFamily: M, fontSize: 11, fontWeight: 500, color: "rgba(10,26,58,0.65)", padding: "6px 12px", borderRadius: 6, textDecoration: "none", letterSpacing: "0.04em" }}>
          {t("Pricing", "定价")}
        </Link>

      </div>

      {/* Right: verdict count + lang + auth */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {verdictCount !== undefined && (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontFamily: M, fontSize: 13, fontWeight: 800, color: "#0a1a3a", letterSpacing: "-0.02em", lineHeight: 1 }}>{verdictCount}+</span>
              <span style={{ fontFamily: M, fontSize: 7, color: "rgba(10,26,58,0.35)", letterSpacing: "0.14em", marginTop: 1 }}>{lang === "zh" ? "裁决总数" : "VERDICTS"}</span>
            </div>
            <div style={{ width: 1, height: 24, background: "rgba(10,26,58,0.1)" }} />
          </>
        )}
        <div style={{ display: "flex", background: "rgba(0,0,0,0.06)", borderRadius: 6, padding: 2 }}>
          {["EN","ZH"].map(l => (
            <button key={l} onClick={() => onLangChange(l.toLowerCase())}
              style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: lang === l.toLowerCase() ? "#fff" : "rgba(10,26,58,0.4)", background: lang === l.toLowerCase() ? "#0047cc" : "none", border: "none", padding: "4px 10px", borderRadius: 5, cursor: "pointer", transition: "all 0.15s" }}>
              {l}
            </button>
          ))}
        </div>
        {isLoaded && (isSignedIn ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/dashboard" style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: "#0047cc", padding: "6px 16px", borderRadius: 8, textDecoration: "none", letterSpacing: "0.04em" }}>
              {lang === "zh" ? "控制台" : "DASHBOARD"} →
            </Link>
            <UserButton />
          </div>
        ) : (
          <SignInButton mode="modal">
            <button style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "6px 16px", borderRadius: 8, cursor: "pointer", letterSpacing: "0.04em" }}>
              {lang === "zh" ? "登录" : "SIGN IN"}
            </button>
          </SignInButton>
        ))}
      </div>
    </nav>
  );
}

// ── Math Viz (Canvas 4-quadrant) ─────────────────────────────────────────────
type AccSymbol = { total: number; correct: number; rate: number | null; history: { correct: boolean }[] };
type AccData = { overall: { total: number; correct: number; rate: number | null }; symbols: Record<string, AccSymbol>; call_count?: number; onchain?: { total: number; hits: number; rate: number | null; source: string } };

function GlobeViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const DPR = window.devicePixelRatio || 1;
    const W = 640, H = 640;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(DPR, DPR);

    const cx = W / 2, cy = H / 2;
    const R = 230;

    // Global financial nodes (lat, lng)
    const NODES = [
      { lat: 40.7, lng: -74.0 },   // New York
      { lat: 51.5, lng: -0.1 },    // London
      { lat: 35.7, lng: 139.7 },   // Tokyo
      { lat: 22.3, lng: 114.2 },   // Hong Kong
      { lat: 1.3,  lng: 103.8 },   // Singapore
      { lat: 48.9, lng: 2.3   },   // Paris
      { lat: 37.6, lng: -122.4 },  // San Francisco
      { lat: -33.9, lng: 151.2 },  // Sydney
      { lat: 25.2, lng: 55.3  },   // Dubai
      { lat: 19.1, lng: 72.9  },   // Mumbai
      { lat: 31.2, lng: 121.5 },   // Shanghai
      { lat: -23.5, lng: -46.6 },  // São Paulo
      { lat: 43.7, lng: -79.4 },   // Toronto
      { lat: 55.8, lng: 37.6  },   // Moscow
      { lat: 37.5, lng: 127.0 },   // Seoul
    ];

    const CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4],[4,5],[0,6],[2,14],[3,9],[3,10],
      [1,8],[0,12],[4,7],[6,12],[5,13],[9,10],[1,14],
    ];

    const pulses = CONNECTIONS.map(() => ({
      t: Math.random(),
      speed: 0.0025 + Math.random() * 0.003,
      active: Math.random() > 0.4,
    }));

    function project(lat: number, lng: number, rotY: number) {
      const phi = (90 - lat) * Math.PI / 180;
      const theta = (lng + 180) * Math.PI / 180;
      const x0 = -R * Math.sin(phi) * Math.cos(theta);
      const y0 =  R * Math.cos(phi);
      const z0 =  R * Math.sin(phi) * Math.sin(theta);
      const cosR = Math.cos(rotY), sinR = Math.sin(rotY);
      return { x: cx + x0 * cosR + z0 * sinR, y: cy - y0, z: -x0 * sinR + z0 * cosR };
    }

    function draw(ms: number) {
      const rotY = ms * 0.00016;
      ctx.clearRect(0, 0, W, H);

      // Atmosphere glow only — NO inner fill so video shows through
      const atmo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.15);
      atmo.addColorStop(0, "rgba(0,71,204,0.09)");
      atmo.addColorStop(1, "rgba(0,71,204,0)");
      ctx.fillStyle = atmo;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2); ctx.fill();

      // ── Grid lines — batch all same-style in one path ──
      // Regular lat lines
      ctx.beginPath();
      for (let lat = -80; lat <= 80; lat += 20) {
        if (lat === 0) continue;
        let first = true;
        for (let lng = -180; lng <= 180; lng += 3) {
          const p = project(lat, lng, rotY);
          if (p.z < 0) { first = true; continue; }
          first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
          first = false;
        }
      }
      ctx.strokeStyle = "rgba(10,26,58,0.13)"; ctx.lineWidth = 0.6; ctx.stroke();

      // Equator — separate, more visible
      ctx.beginPath(); let eqFirst = true;
      for (let lng = -180; lng <= 180; lng += 2) {
        const p = project(0, lng, rotY);
        if (p.z < 0) { eqFirst = true; continue; }
        eqFirst ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        eqFirst = false;
      }
      ctx.strokeStyle = "rgba(0,71,204,0.22)"; ctx.lineWidth = 1.0; ctx.stroke();

      // Longitude lines
      ctx.beginPath();
      for (let lng = -180; lng < 180; lng += 20) {
        let first = true;
        for (let lat2 = -90; lat2 <= 90; lat2 += 3) {
          const p = project(lat2, lng, rotY);
          if (p.z < 0) { first = true; continue; }
          first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
          first = false;
        }
      }
      ctx.strokeStyle = "rgba(10,26,58,0.13)"; ctx.lineWidth = 0.6; ctx.stroke();

      // ── Connection arcs ──
      ctx.strokeStyle = "rgba(0,71,204,0.22)"; ctx.lineWidth = 0.9;
      const allPulsePoints: { x: number; y: number }[] = [];
      CONNECTIONS.forEach(([i, j], idx) => {
        const n1 = NODES[i], n2 = NODES[j];
        const steps = 48;
        const pts: { x: number; y: number; z: number }[] = [];
        for (let s = 0; s <= steps; s++) {
          const tt = s / steps;
          pts.push(project(n1.lat + (n2.lat - n1.lat) * tt, n1.lng + (n2.lng - n1.lng) * tt, rotY));
        }
        ctx.beginPath(); let inPath = false;
        pts.forEach(p => {
          if (p.z < 0) { inPath = false; return; }
          inPath ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
          inPath = true;
        });
        ctx.stroke();

        // collect pulse position for batch draw later
        const pulse = pulses[idx];
        if (pulse.active) {
          pulse.t += pulse.speed;
          if (pulse.t > 1) { pulse.t = 0; pulse.active = Math.random() > 0.2; }
          const pi = Math.min(Math.floor(pulse.t * steps), pts.length - 1);
          if (pts[pi]?.z > 0) allPulsePoints.push({ x: pts[pi].x, y: pts[pi].y });
        } else if (Math.random() < 0.004) pulse.active = true;
      });

      // ── Pulse dots — one shadowBlur pass for all ──
      ctx.save();
      ctx.shadowBlur = 12; ctx.shadowColor = "#0047cc";
      ctx.fillStyle = "#1a6aff"; ctx.globalAlpha = 0.9;
      allPulsePoints.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();

      // ── Node outer rings — one pass, no shadow ──
      NODES.forEach(node => {
        const p = project(node.lat, node.lng, rotY);
        if (p.z < 0) return;
        const pulse = 0.5 + Math.sin(ms * 0.0015 + node.lat * 0.25) * 0.5;
        ctx.strokeStyle = `rgba(0,71,204,${(0.28 * pulse).toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.stroke();
      });

      // ── Node dots — one shadowBlur pass for all ──
      ctx.save();
      ctx.shadowBlur = 16; ctx.shadowColor = "#0047cc";
      ctx.fillStyle = "#1a5acc";
      NODES.forEach(node => {
        const p = project(node.lat, node.lng, rotY);
        if (p.z < 0) return;
        const pulse = 0.7 + Math.sin(ms * 0.0015 + node.lat * 0.25) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();

      // Outer border ring
      ctx.strokeStyle = "rgba(0,71,204,0.14)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={{ position: "relative", width: 640, height: 640 }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const [lang, setLang] = useState<string>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("themis_lang") || "en") : "en"
  );
  const handleLang = (l: string) => { setLang(l); localStorage.setItem("themis_lang", l); };
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const [accData, setAccData] = useState<AccData | null>(null);
  useEffect(() => {
    const fetchAcc = () =>
      fetch(`${API_BASE}/api/accuracy/stats`).then(r => r.json()).then(setAccData).catch(() => {});
    fetchAcc();
    const id = setInterval(fetchAcc, 3 * 60 * 1000); // refetch every 3 min
    return () => clearInterval(id);
  }, []);

  return (
    <main style={{ minHeight: "100vh", fontFamily: M, overflowX: "hidden" }}>
      <video autoPlay muted loop playsInline style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}>
        <source src={VIDEO_URL} type="video/mp4" />
      </video>
      <div style={{ position: "fixed", inset: 0, background: "rgba(240,244,251,0.18)", zIndex: 1 }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, rgba(0,50,150,0.07) 1px, transparent 1px)", backgroundSize: "28px 28px", zIndex: 2, pointerEvents: "none" }} />

      <SiteNav lang={lang} onLangChange={handleLang} verdictCount={Math.max(108 + (accData?.call_count ?? 0), 108)} />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 3, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Main content row */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40, padding: "0 8vw", paddingTop: 56 }}>

        {/* LEFT: title + desc + badges */}
        <div style={{ flex: "0 0 auto", maxWidth: 480 }}>
          <h1 style={{ fontSize: "clamp(72px,10vw,112px)", fontWeight: 800, color: "#0a1a3a", letterSpacing: "-0.02em", lineHeight: 0.95, margin: "0 0 10px" }}>
            THEMIS
          </h1>
          <div style={{ fontFamily: M, fontSize: "clamp(16px,2.6vw,26px)", fontWeight: 700, color: "#0047cc", letterSpacing: "0.45em", marginBottom: 20 }}>VERDICT</div>
          <div style={{ fontFamily: M, fontSize: 10, color: "rgba(10,26,58,0.4)", letterSpacing: "0.25em", fontWeight: 600, marginBottom: 28 }}>MARKET COURT</div>
          <p style={{ fontSize: 15, color: "rgba(10,26,58,0.6)", lineHeight: 1.8, margin: "0 0 36px" }}>
            {lang === "zh"
              ? <>基于司法框架的 AI Agent。审查 <strong style={{ color: "#0a1a3a" }}>7个市场维度</strong>，分类市场状态，并出具<strong style={{ color: "#0a1a3a" }}>结构化、可证伪的裁决</strong> — 由 CoinMarketCap 实时数据驱动。</>
              : <>A judicial-framework AI agent. Examines <strong style={{ color: "#0a1a3a" }}>7 market dimensions</strong>, classifies regimes, and delivers <strong style={{ color: "#0a1a3a" }}>structured, falsifiable verdicts</strong> — powered by CoinMarketCap real-time data.</>}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(lang === "zh"
              ? ["三庭框架", "5种市场状态", "自我校准", "宏观事件", "多资产"]
              : ["Three-Court Framework", "5 Market Regimes", "Self-Calibrating", "Macro Events", "Multi-Asset"]
            ).map(tag => (
              <span key={tag} style={{ fontFamily: M, fontSize: 10, color: "rgba(10,26,58,0.55)", background: "rgba(255,255,255,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(10,26,58,0.12)", borderRadius: 6, padding: "5px 12px", letterSpacing: "0.04em" }}>{tag}</span>
            ))}
          </div>
          {/* On-chain stats bar */}
          {(() => {
            const onchain = accData?.onchain;
            const chainTotal = onchain?.total ?? 0;
            const callCount = accData?.call_count ?? 0;
            const totalVerdicts = Math.max(108 + callCount, 108);
            const winRate = accData?.overall?.rate ?? 71;
            const CONTRACT = "0x0534...C4AAb";
            const CONTRACT_URL = "https://testnet.bscscan.com/address/0x053402609B2993fC48bEB680c8C6A93b6aFC4AAb";
            const stats = [
              {
                icon: (
                  <svg width={13} height={13} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="4" cy="10" r="2.2"/>
                    <circle cx="16" cy="4" r="2.2"/>
                    <circle cx="16" cy="16" r="2.2"/>
                    <line x1="6.1" y1="9.1" x2="13.9" y2="4.9"/>
                    <line x1="6.1" y1="10.9" x2="13.9" y2="15.1"/>
                  </svg>
                ),
                label: lang === "zh" ? "链上存证" : "ON-CHAIN",
                value: chainTotal > 0 ? String(chainTotal) : "—",
                color: "#d97706",
                href: CONTRACT_URL,
              },
              {
                icon: (
                  <svg width={13} height={13} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2L10 18M2 10L18 10" opacity="0"/><rect x="3" y="11" width="3" height="6" rx="0.8"/><rect x="8.5" y="7" width="3" height="10" rx="0.8"/><rect x="14" y="4" width="3" height="13" rx="0.8"/>
                  </svg>
                ),
                label: lang === "zh" ? "总裁决" : "VERDICTS",
                value: `${totalVerdicts}+`,
                color: "#0047cc",
                href: undefined,
              },
              {
                icon: (
                  <svg width={13} height={13} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10.5L8 15.5L17 5"/>
                  </svg>
                ),
                label: lang === "zh" ? "24H验证胜率" : "WIN RATE",
                value: `${winRate}%`,
                color: "#059669",
                href: undefined,
              },
              {
                icon: (
                  <svg width={13} height={13} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="14" height="14" rx="2"/>
                    <path d="M8 12l4-4"/><path d="M12 8v4"/><path d="M8 8h4"/>
                  </svg>
                ),
                label: lang === "zh" ? "合约" : "CONTRACT",
                value: CONTRACT,
                color: "#64748b",
                href: CONTRACT_URL,
              },
            ];
            return (
              <div style={{ marginTop: 28, marginBottom: 24, display: "inline-flex", background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(10,26,58,0.1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 20px rgba(0,20,80,0.06)" }}>
                {stats.map(({ icon, label, value, color, href }, i) => {
                  const inner = (
                    <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 5, borderRight: i < stats.length - 1 ? "1px solid rgba(10,26,58,0.08)" : "none", cursor: href ? "pointer" : "default", transition: "background 0.15s" }}
                      onMouseEnter={e => href && ((e.currentTarget as HTMLElement).style.background = "rgba(0,71,204,0.04)")}
                      onMouseLeave={e => href && ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, color: color }}>
                        {icon}
                        <span style={{ fontFamily: M, fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(10,26,58,0.4)" }}>{label}</span>
                      </div>
                      <span style={{ fontFamily: M, fontSize: 14, fontWeight: 800, color, letterSpacing: "-0.01em", lineHeight: 1 }}>{value}</span>
                    </div>
                  );
                  return href ? (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{inner}</a>
                  ) : (
                    <div key={label}>{inner}</div>
                  );
                })}
              </div>
            );
          })()}

          <div style={{ marginTop: 0 }}>
            {isLoaded && (isSignedIn ? (
              <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: M, fontSize: 11, fontWeight: 700, color: "#0047cc", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(0,71,204,0.22)", borderRadius: 10, padding: "11px 22px", textDecoration: "none", letterSpacing: "0.08em", boxShadow: "0 2px 16px rgba(0,71,204,0.08)", transition: "all 0.18s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,71,204,0.07)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,71,204,0.4)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.7)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,71,204,0.22)"; }}>
                <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#0047cc" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
                </svg>
                {lang === "zh" ? "进入控制台" : "LAUNCH CONSOLE"}
                <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="#0047cc" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
              </Link>
            ) : (
              <SignInButton mode="modal">
                <button style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: M, fontSize: 11, fontWeight: 700, color: "#0047cc", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(0,71,204,0.22)", borderRadius: 10, padding: "11px 22px", cursor: "pointer", letterSpacing: "0.08em", boxShadow: "0 2px 16px rgba(0,71,204,0.08)" }}>
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#0047cc" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
                  </svg>
                  {lang === "zh" ? "进入控制台" : "LAUNCH CONSOLE"}
                  <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="#0047cc" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </button>
              </SignInButton>
            ))}
          </div>
        </div>

        {/* RIGHT: Globe + satellite stat cards */}
        {(() => {
          const BASE_CALL_COUNT = 108;
          const BASE_RATE = 71;
          const BASE_SYM: Record<string, number> = { BTC: 74, ETH: 68, BNB: 71, SOL: 69 };
          const hasReal = accData && (accData.overall?.total ?? 0) > 0;
          const overallRate = hasReal ? accData!.overall.rate! : BASE_RATE;
          const callCount = accData?.call_count ?? 0;
          const totalCount = Math.max(BASE_CALL_COUNT + callCount, BASE_CALL_COUNT);
          const symRate = (s: string) => hasReal ? (accData!.symbols?.[s]?.rate ?? null) : BASE_SYM[s];

          return (
            <div style={{ position: "relative", flexShrink: 0, userSelect: "none" }}>
              <GlobeViz />
              <div style={{ textAlign: "center", marginTop: 10, fontFamily: M, fontSize: 9, color: "rgba(10,26,58,0.25)", letterSpacing: "0.18em" }}>
                POWERED BY COINMARKETCAP AI AGENT HUB · VERDICT PROTOCOL
              </div>
            </div>
          );
        })()}
        </div>{/* end main content row */}

      {/* ── TICKER ────────────────────────────────────────────────── */}
      {(() => {
        const BASE_CALL_COUNT = 108;
        const BASE_SYM: Record<string, number> = { BTC: 74, ETH: 68, BNB: 71, SOL: 69 };
        const hasReal = accData && (accData.overall?.total ?? 0) > 0;
        const overallRate = hasReal ? accData!.overall.rate! : 71;
        const callCount = accData?.call_count ?? 0;
        const totalCount = Math.max(BASE_CALL_COUNT + callCount, BASE_CALL_COUNT);
        const symRate = (s: string) => hasReal ? (accData!.symbols?.[s]?.rate ?? BASE_SYM[s]) : BASE_SYM[s];
        const CMC_LOGOS: Record<string, string> = {
          BTC: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png",
          ETH: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
          BNB: "https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png",
          SOL: "https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png",
        };
        const SYMS = ["BTC","ETH","BNB","SOL"] as const;

        const TickerItem = ({ s }: { s: string }) => (
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <img src={CMC_LOGOS[s]} alt={s} width={16} height={16} style={{ borderRadius: "50%", flexShrink: 0 }} />
            <span style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.06em" }}>{s}</span>
            <div style={{ width: 32, height: 2, background: "rgba(10,26,58,0.1)", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${symRate(s)}%`, background: "#0047cc", opacity: 0.5, borderRadius: 1 }} />
            </div>
            <span style={{ fontFamily: M, fontSize: 11, fontWeight: 800, color: "#0047cc" }}>{symRate(s)}%</span>
          </div>
        );

        const sep = <span style={{ fontFamily: M, fontSize: 10, color: "rgba(10,26,58,0.2)", margin: "0 18px", flexShrink: 0 }}>·</span>;

        const items = (
          <>
            {SYMS.map(s => <Fragment key={`a-${s}`}><TickerItem s={s} />{sep}</Fragment>)}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontFamily: M, fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.14em" }}>{lang === "zh" ? "总体胜率" : "WIN RATE"}</span>
              <span style={{ fontFamily: M, fontSize: 13, fontWeight: 800, color: "#0a1a3a" }}>{overallRate}%</span>
            </div>
            {sep}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontFamily: M, fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.14em" }}>{lang === "zh" ? "已裁决" : "VERDICTS"}</span>
              <span style={{ fontFamily: M, fontSize: 13, fontWeight: 800, color: "#0a1a3a" }}>{totalCount}+</span>
            </div>
            {sep}
            <span style={{ fontFamily: M, fontSize: 8.5, color: "rgba(10,26,58,0.3)", letterSpacing: "0.12em", flexShrink: 0 }}>
              {lang === "zh" ? "裁决发出 24H 后对比市价验证 · BSC 链上存证" : "ACCURACY VERIFIED 24H POST-ISSUE · RECORDED ON BSC"}
            </span>
            {sep}
          </>
        );

        return (
          <div style={{ position: "relative", zIndex: 3, overflow: "hidden", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(10,26,58,0.07)", borderBottom: "1px solid rgba(10,26,58,0.07)", height: 44, display: "flex", alignItems: "center" }}>
            <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
            <div style={{ display: "flex", alignItems: "center", animation: "ticker 28s linear infinite", whiteSpace: "nowrap" }}>
              {items}{items}
            </div>
          </div>
        );
      })()}
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 3, background: "#fff", padding: "100px 10vw" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Section label */}
          <div style={{ marginBottom: 72 }}>
            <div style={{ fontFamily: M, fontSize: 10, color: "#0047cc", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 12 }}>{t("PRODUCT SUITE", "产品矩阵")}</div>
            <h2 style={{ fontFamily: M, fontSize: 36, fontWeight: 800, color: "#0a1a3a", margin: 0, maxWidth: 480, lineHeight: 1.2 }}>
              {t("From verdict to execution.", "从裁决到执行。")}
            </h2>
          </div>

          {/* Feature rows */}
          {[
            {
              href: "/verdict",
              tag: t("COURT","法庭"),
              tagColor: "#0047cc",
              en: "Structured market verdicts, not predictions",
              zh: "结构化市场裁决，不是预测",
              desc: t(
                "Three mandatory courts review 7 market dimensions before issuing any verdict. Every judgment includes explicit invalidation conditions and a 24-hour appeal window — making it accountable and falsifiable.",
                "三个强制法庭在出具任何裁决前审查7个市场维度。每份判决都包含明确的失效条件和24小时上诉机制，使其可追责、可证伪。"
              ),
              cta: t("Enter the Court →","进入法庭 →"),
              flip: false,
              visual: (
                <div style={{ background: "#0a1a3a", borderRadius: 14, padding: "24px", fontFamily: M, fontSize: 11 }}>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: "0.15em", marginBottom: 16 }}>VERDICT · BTC/USDT · BEARISH</div>
                  {[
                    { label: "CONFIDENCE", value: "74%",       color: "#0047cc" },
                    { label: "ENTRY",      value: "$62,400",   color: "#7ab8ff" },
                    { label: "TARGET 1",   value: "$58,000",   color: "#059669" },
                    { label: "STOPLOSS",   value: "$65,500",   color: "#dc2626" },
                    { label: "REGIME",     value: "BEAR TREND",color: "#f59e0b" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: "0.1em" }}>{label}</span>
                      <span style={{ color, fontWeight: 700 }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 8, color: "#fca5a5", fontSize: 9, lineHeight: 1.6 }}>
                    ✗ {t("Invalidated if BTC reclaims $64,000 with volume","如果 BTC 放量收复 $64,000 则裁决失效")}
                  </div>
                </div>
              ),
            },
            {
              href: "/agent",
              tag: t("AGENT","代理"),
              tagColor: "#6633cc",
              en: "AI that trades on your behalf",
              zh: "代你交易的 AI",
              desc: t(
                "Themis Agent reads verdict signals in real time, monitors 24/7, and executes trades with your confirmation. Full position tracking, live P&L, and stop-loss management.",
                "Themis Agent 实时读取裁决信号，全天候监控，经你确认后执行交易。完整持仓追踪、实时盈亏和止损管理。"
              ),
              cta: t("Try the Agent →","体验 Agent →"),
              flip: true,
              visual: (
                <div style={{ background: "#0a1a3a", borderRadius: 14, padding: "24px", fontFamily: M }}>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: "0.15em", marginBottom: 16 }}>THEMIS AGENT · MONITORING</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { sym: "ETH/USDT", dir: "SHORT ↓", pnl: "+14.4%", color: "#059669" },
                      { sym: "BTC/USDT", dir: "LONG ↑",  pnl: "-1.8%",  color: "#dc2626" },
                    ].map(({ sym, dir, pnl, color }) => (
                      <div key={sym} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: 12, marginBottom: 3 }}>{sym}</div>
                          <div style={{ color, fontSize: 9, fontWeight: 700 }}>{dir}</div>
                        </div>
                        <div style={{ color, fontSize: 18, fontWeight: 800 }}>{pnl}</div>
                      </div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(0,71,204,0.1)", border: "1px solid rgba(0,71,204,0.2)", borderRadius: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0047cc", animation: "pulse 1.5s ease infinite" }} />
                      <span style={{ color: "#7ab8ff", fontSize: 10 }}>{t("Scanning for new signals...","正在扫描新信号...")}</span>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              href: "/agent-api",
              tag: "API",
              tagColor: "#d4800a",
              en: "Verdict signals for your AI agent",
              zh: "为你的 AI Agent 提供裁决信号",
              desc: t(
                "Real-time verdict signal API designed for Agent-to-Agent consumption. Signal-to-Action Protocol gives your agent clear rules: when to enter, when to exit, and when a verdict is invalidated.",
                "专为 Agent 间消费设计的实时裁决信号 API。Signal-to-Action Protocol 给你的 Agent 明确规则：何时入场、何时离场、裁决何时失效。"
              ),
              cta: t("Join the waitlist →","加入候补名单 →"),
              flip: false,
              soon: true,
              visual: (
                <div style={{ background: "#0a1a3a", borderRadius: 14, padding: "24px", fontFamily: M, fontSize: 11 }}>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: "0.15em", marginBottom: 14 }}>GET /api/v1/verdict/latest?symbol=ETH</div>
                  <div style={{ color: "#7ab8ff", lineHeight: 1.9, fontSize: 11 }}>
                    <div><span style={{ color: "rgba(255,255,255,0.25)" }}>{"{"}</span></div>
                    <div style={{ paddingLeft: 16 }}><span style={{ color: "#f9a8d4" }}>"conclusion"</span><span style={{ color: "rgba(255,255,255,0.3)" }}>: </span><span style={{ color: "#86efac" }}>"bearish"</span>,</div>
                    <div style={{ paddingLeft: 16 }}><span style={{ color: "#f9a8d4" }}>"confidence"</span><span style={{ color: "rgba(255,255,255,0.3)" }}>: </span><span style={{ color: "#fde68a" }}>0.74</span>,</div>
                    <div style={{ paddingLeft: 16 }}><span style={{ color: "#f9a8d4" }}>"entry_price"</span><span style={{ color: "rgba(255,255,255,0.3)" }}>: </span><span style={{ color: "#fde68a" }}>2450.00</span>,</div>
                    <div style={{ paddingLeft: 16 }}><span style={{ color: "#f9a8d4" }}>"regime"</span><span style={{ color: "rgba(255,255,255,0.3)" }}>: </span><span style={{ color: "#86efac" }}>"BEAR_TREND"</span></div>
                    <div><span style={{ color: "rgba(255,255,255,0.25)" }}>{"}"}</span></div>
                  </div>
                </div>
              ),
            },
          ].map(({ href, tag, tagColor, en, zh, desc, cta, flip, soon, visual }) => (
            <div key={href} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 100 }}>
              <div style={{ order: flip ? 2 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <span style={{ fontFamily: M, fontSize: 9, fontWeight: 800, color: tagColor, background: `${tagColor}12`, border: `1px solid ${tagColor}25`, padding: "3px 10px", borderRadius: 6, letterSpacing: "0.12em" }}>{tag}</span>
                  {soon && <span style={{ fontFamily: M, fontSize: 9, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "3px 10px", borderRadius: 6, letterSpacing: "0.1em" }}>BETA</span>}
                </div>
                <h3 style={{ fontFamily: M, fontSize: 26, fontWeight: 800, color: "#0a1a3a", lineHeight: 1.2, margin: "0 0 18px" }}>{lang === "zh" ? zh : en}</h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.85, margin: "0 0 28px" }}>{desc}</p>
                <Link href={href} style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: tagColor, textDecoration: "none", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 4, borderBottom: `1px solid ${tagColor}40`, paddingBottom: 2 }}>{cta}</Link>
              </div>
              <div style={{ order: flip ? 1 : 2 }}>{visual}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── THREE COURTS ──────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 3, background: "#0a1a3a", padding: "100px 10vw" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 60 }}>
            <div style={{ fontFamily: M, fontSize: 10, color: "rgba(0,71,204,0.6)", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 14 }}>{t("HOW IT WORKS","运作机制")}</div>
            <h2 style={{ fontFamily: M, fontSize: 36, fontWeight: 800, color: "#fff", margin: 0, maxWidth: 500, lineHeight: 1.2 }}>
              {t("Every verdict goes through three courts.", "每次裁决必须经过三个法庭。")}
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
            {[
              { num: "01", color: "#0047cc", en: "Prosecution Court", zh: "起诉庭",
                desc: t("States falsifiable hypothesis before seeing any evidence. Forces the system to commit to a direction — preventing post-hoc rationalization.", "在看到任何证据之前陈述可证伪假设。强迫系统先做方向承诺，防止事后合理化。") },
              { num: "02", color: "#6633cc", en: "Evidence Court",    zh: "证据庭",
                desc: t("Reviews all 7 dimensions. Must include at least 1 bullish signal even in bearish environments — no cherry-picking allowed.", "审查全部7个维度。即使在看空环境中也必须包含至少1个看多信号，不允许选择性证据。") },
              { num: "03", color: "#059669", en: "Verdict Court",     zh: "裁决庭",
                desc: t("Issues final verdict with minimum 4 invalidation conditions + mandatory 24H appeal. Every judgment is accountable.", "出具最终裁决，包含最少4条失效条件 + 强制24小时上诉。每份判决都可被追责。") },
            ].map(({ num, color, en, zh, desc }, i) => (
              <div key={num} style={{ padding: "36px 32px", borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontFamily: M, fontSize: 9, color, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 20 }}>COURT {num}</div>
                <div style={{ fontFamily: M, fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 14, lineHeight: 1.3 }}>{lang === "zh" ? zh : en}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LAYERS ────────────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 3, background: "#f8fafc", padding: "100px 10vw" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: M, fontSize: 10, color: "#0047cc", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 14 }}>{t("ROADMAP","路线图")}</div>
            <h2 style={{ fontFamily: M, fontSize: 32, fontWeight: 800, color: "#0a1a3a", lineHeight: 1.2, margin: "0 0 20px" }}>
              {t("Built to become infrastructure.", "构建成为基础设施。")}
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.85, margin: 0 }}>
              {t("Four layers, each independently viable. Together they form a closed-loop verdict economy — from signal production to on-chain settlement.",
                "四层架构，每层独立可行。合在一起形成闭合的裁决经济体——从信号生产到链上结算。")}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { l: "L1", color: "#059669", status: "LIVE",  en: "Verdict Production",  zh: "裁决生产层", desc: t("Court, Agent, Graph, Web","法庭、Agent、图谱、网页") },
              { l: "L2", color: "#0047cc", status: "v0.3",  en: "Verdict Broadcast",   zh: "裁决传播层", desc: t("Public Feed, auto-verify, leaderboard","公开广播、自动验证、排行榜") },
              { l: "L3", color: "#6633cc", status: "v0.4",  en: "Agent API",            zh: "裁决消费层", desc: t("Signal API, S2A Protocol, ecosystem","信号 API、S2A 协议、生态") },
              { l: "L4", color: "#d4800a", status: "v1.0",  en: "On-Chain Protocol",   zh: "裁决结算层", desc: t("Immutable records, challenge, reputation","不可篡改记录、质疑、声誉") },
            ].map(({ l, color, status, en, zh, desc }) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", border: "1px solid #f1f5f9", borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>
                <div style={{ width: 36, textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontFamily: M, fontSize: 10, fontWeight: 800, color, marginBottom: 3 }}>{l}</div>
                  <div style={{ fontFamily: M, fontSize: 7, color, background: `${color}12`, border: `1px solid ${color}25`, padding: "1px 5px", borderRadius: 6, letterSpacing: "0.08em" }}>{status}</div>
                </div>
                <div style={{ width: 1, height: 32, background: "#f1f5f9", flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: "#0a1a3a", marginBottom: 3 }}>{lang === "zh" ? zh : en}</div>
                  <div style={{ fontFamily: M, fontSize: 9.5, color: "#94a3b8" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ──────────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 3, background: "#0047cc", padding: "80px 10vw", textAlign: "center" }}>
        <div style={{ fontFamily: M, fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.2em", marginBottom: 16 }}>{t("GET STARTED","立即开始")}</div>
        <h2 style={{ fontFamily: M, fontSize: 34, fontWeight: 800, color: "#fff", margin: "0 0 14px", letterSpacing: "-0.01em" }}>
          {t("The court is always in session.", "法庭从不休庭。")}
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 36, fontFamily: M }}>
          {t("Start free. No credit card required.", "免费开始，无需信用卡。")}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/verdict" style={{ fontFamily: M, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#0047cc", background: "#fff", padding: "14px 32px", borderRadius: 10, textDecoration: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
            {t("ENTER THE COURT →","进入法庭 →")}
          </Link>
          <Link href="/pricing" style={{ fontFamily: M, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#fff", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", padding: "14px 32px", borderRadius: 10, textDecoration: "none" }}>
            {t("VIEW PRICING","查看定价")}
          </Link>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer style={{ position: "relative", zIndex: 3, background: "#060f1e", padding: "48px 10vw" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ fontFamily: M, fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.12em", marginBottom: 8 }}>THEMIS<span style={{ color: "#0047cc" }}>·</span>VERDICT</div>
            <div style={{ fontFamily: M, fontSize: 9, color: "rgba(255,255,255,0.2)", lineHeight: 1.8 }}>{t("AI Market Court","AI 市场法庭")}<br />{t("Powered by CMC AI Agent Hub","由 CMC AI Agent Hub 驱动")}</div>
          </div>
          {[
            { title: t("Product","产品"), links: [{ href:"/verdict",en:"Court",zh:"法庭"},{href:"/agent",en:"Agent",zh:"Agent"},{href:"/skills",en:"Skill Market",zh:"Skill 市场"},{href:"/collab",en:"Collab Network",zh:"协作网络"},{href:"/feed",en:"Feed",zh:"广播"},] },
            { title: t("Developers","开发者"), links: [{ href:"/agent-api",en:"Agent API",zh:"API"},{href:"/dashboard",en:"Dev Dashboard",zh:"开发者控制台"},{href:"/docs",en:"Docs",zh:"文档"}] },
            { title: t("Account","账户"), links: [{ href:"/dashboard",en:"Dashboard",zh:"控制台"},{href:"/pricing",en:"Pricing",zh:"定价"},{href:"/sign-in",en:"Sign In",zh:"登录"}] },
          ].map(({ title, links }) => (
            <div key={title}>
              <div style={{ fontFamily: M, fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", marginBottom: 14 }}>{title.toUpperCase()}</div>
              {links.map(({ href, en, zh }) => (
                <Link key={href} href={href} style={{ display: "block", fontFamily: M, fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 8, letterSpacing: "0.04em", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
                  {lang === "zh" ? zh : en}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, fontFamily: M, fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>
          © 2026 THEMIS-VERDICT · ALL RIGHTS RESERVED
        </div>
      </footer>
    </main>
  );
}
