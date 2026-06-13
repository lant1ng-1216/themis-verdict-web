"use client";
import { useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { SiteNav } from "../page";

const M = "JetBrains Mono, monospace";

const PLANS = [
  {
    key: "free", label: "FREE", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0",
    price: "$0", subEn: "Free forever", subZh: "永久免费",
    descEn: "Try Themis Agent with no commitment.",
    descZh: "零门槛体验 Themis Agent。",
    tokenLimitEn: "25K tokens / mo", tokenLimitZh: "2.5万 token / 月",
    conversationsEn: "~5 conversations", conversationsZh: "约 5 次对话",
    featuresEn: [
      "Agent 25K tokens / month",
      "Requires login to use Agent",
      "Verdict feed access",
      "Market regime signals",
      "Community support",
    ],
    featuresZh: [
      "Agent 2.5万 token / 月",
      "需登录后使用 Agent",
      "裁决广播访问",
      "市场格局信号",
      "社区支持",
    ],
    missingEn: ["Real-time verdict streaming", "Signal monitoring", "Webhook push", "API access"],
    missingZh: ["实时裁决流推送", "信号监控", "Webhook 推送", "API 访问"],
    ctaEn: "Get Started Free", ctaZh: "免费开始", ctaHref: "/sign-up",
    badge: null,
  },
  {
    key: "standard", label: "STANDARD", color: "#0047cc", bg: "#eef2ff", border: "#c7d3f8",
    price: "$29", subEn: "/month", subZh: "/月",
    descEn: "For individual traders who want real-time signals and Agent access.",
    descZh: "适合想要实时信号与 Agent 体验的个人交易者。",
    tokenLimitEn: "1M tokens / mo", tokenLimitZh: "100万 token / 月",
    conversationsEn: "~250 conversations", conversationsZh: "约 250 次对话",
    featuresEn: [
      "Agent 1M tokens / month",
      "Real-time verdict signals",
      "verdict/latest endpoint",
      "verdict/history endpoint",
      "Market regime signals",
      "Email support",
    ],
    featuresZh: [
      "Agent 100万 token / 月",
      "实时裁决信号",
      "verdict/latest 接口",
      "verdict/history 接口",
      "市场格局信号",
      "邮件支持",
    ],
    missingEn: ["verdict/stream (SSE)", "Signal monitoring", "Webhook push"],
    missingZh: ["verdict/stream (SSE)", "信号监控", "Webhook 推送"],
    ctaEn: "Start Standard", ctaZh: "订阅 Standard", ctaHref: "/dashboard",
    badge: null,
  },
  {
    key: "pro", label: "PRO", color: "#6633cc", bg: "#f5f3ff", border: "#d8b4fe",
    price: "$99", subEn: "/month", subZh: "/月",
    descEn: "For professional traders who need deep Agent usage and live streaming.",
    descZh: "适合需要深度 Agent 使用与实时流推送的专业交易者。",
    tokenLimitEn: "5M tokens / mo", tokenLimitZh: "500万 token / 月",
    conversationsEn: "~1,250 conversations", conversationsZh: "约 1,250 次对话",
    featuresEn: [
      "Agent 5M tokens / month",
      "All Standard features",
      "verdict/stream (SSE)",
      "Signal monitoring",
      "graph/edges endpoint",
      "Usage analytics",
      "Priority support",
    ],
    featuresZh: [
      "Agent 500万 token / 月",
      "包含 Standard 所有功能",
      "verdict/stream (SSE) 流推送",
      "信号监控",
      "graph/edges 接口",
      "用量分析",
      "优先支持",
    ],
    missingEn: ["Webhook push", "SLA guarantee"],
    missingZh: ["Webhook 推送", "SLA 保障"],
    ctaEn: "Start Pro", ctaZh: "订阅 Pro", ctaHref: "/dashboard",
    badge: "MOST POPULAR",
  },
  {
    key: "agent", label: "AGENT", color: "#059669", bg: "#ecfdf5", border: "#6ee7b7",
    price: "$299", subEn: "/month", subZh: "/月",
    descEn: "For power users and teams running automated strategies around the clock.",
    descZh: "适合全天候运行自动化策略的重度用户与团队。",
    tokenLimitEn: "70M tokens / mo", tokenLimitZh: "7000万 token / 月",
    conversationsEn: "~17,500 conversations", conversationsZh: "约 17,500 次对话",
    featuresEn: [
      "Agent 70M tokens / month",
      "All Pro features",
      "Webhook push",
      "SLA guarantee",
      "Dedicated support",
      "Custom integrations",
    ],
    featuresZh: [
      "Agent 7000万 token / 月",
      "包含 Pro 所有功能",
      "Webhook 推送",
      "SLA 保障",
      "专属支持",
      "定制集成",
    ],
    missingEn: [],
    missingZh: [],
    ctaEn: "Contact Us", ctaZh: "联系我们", ctaHref: "https://t.me/lant1ng",
    badge: null,
  },
];

const API_PRICING = [
  { typeEn: "Input tokens",  typeZh: "输入 token",  rate: "$0.003", unitEn: "per 1K tokens", unitZh: "每千 token", noteEn: "Prompts, context, history", noteZh: "提示词、上下文、历史记录" },
  { typeEn: "Output tokens", typeZh: "输出 token", rate: "$0.012", unitEn: "per 1K tokens", unitZh: "每千 token", noteEn: "Agent responses, analysis", noteZh: "Agent 回复、分析报告" },
];

const API_ENDPOINTS = [
  "verdict/latest", "verdict/history", "verdict/stream (SSE)",
  "regime/current", "accuracy/stats", "graph/edges",
];

const FAQS = [
  {
    en: "What counts as an Agent token?",
    zh: "什么算作 Agent token？",
    ansEn: "Every prompt token and completion token consumed across all ReAct loop steps in a single Agent conversation. This includes tool calls, context history, and the final response.",
    ansZh: "Agent 对话中所有 ReAct 推理步骤消耗的 prompt token 和 completion token 之和，包括工具调用、上下文历史和最终回复。",
  },
  {
    en: "How is API token billing separate from the subscription?",
    zh: "API token 计费和订阅有什么区别？",
    ansEn: "Your monthly subscription covers Agent usage (the ReAct loop). Direct API calls to verdict/regime/stream endpoints are billed separately per token — like OpenAI or Anthropic. You only pay for what you use.",
    ansZh: "月度订阅涵盖 Agent 使用（ReAct 推理循环）。直接调用 verdict/regime/stream 等接口按 token 单独计费，类似 OpenAI / Anthropic 的方式，按用量付费。",
  },
  {
    en: "Can I upgrade or downgrade at any time?",
    zh: "我可以随时升级或降级吗？",
    ansEn: "Yes. Plan changes take effect immediately. Downgrades are prorated.",
    ansZh: "可以。套餐变更立即生效，降级按比例计算费用。",
  },
  {
    en: "What happens when I run out of Agent tokens?",
    zh: "Agent token 用完了怎么办？",
    ansEn: "Agent will return a quota-exceeded message and prompt you to upgrade. Unused API endpoint access is not affected. Quota resets on the 1st of each month.",
    ansZh: "Agent 将返回配额超限提示并引导你升级。直接 API 接口访问不受影响。配额每月 1 日重置。",
  },
  {
    en: "Is the accuracy rate guaranteed?",
    zh: "准确率有保证吗？",
    ansEn: "No. Themis provides structured signal analysis, not financial advice. Past accuracy does not guarantee future performance.",
    ansZh: "不保证。Themis 提供结构化信号分析，而非财务建议。历史准确率不代表未来表现。",
  },
];

const PAYMENT_WALLET = "0xB0088d6Eb46c3C15D878b54900ce1d5AEad54bD7";
const PLAN_PRICES_MAP: Record<string, number> = { standard: 29, pro: 99, agent: 299 };
const API_BASE = process.env.NEXT_PUBLIC_AGENT_API || "https://api.themisverdict.xyz";

export default function PricingPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [lang, setLang] = useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("themis_lang") || "en";
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [chain, setChain] = useState<"bsc" | "polygon">("bsc");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [payResult, setPayResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const handleLang = (l: string) => { setLang(l); localStorage.setItem("themis_lang", l); };

  const openModal = (planKey: string) => {
    setModal(planKey); setTxHash(""); setPayResult(null); setChain("bsc");
  };

  const copyAddr = () => {
    navigator.clipboard.writeText(PAYMENT_WALLET);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const verify = async () => {
    if (!txHash.trim() || !modal) return;
    setVerifying(true); setPayResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/payment/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_hash: txHash.trim(), plan: modal, chain, user_id: user?.id || "" }),
      });
      const d = await r.json();
      if (r.ok) {
        const exp = new Date(d.expires_at).toLocaleDateString();
        setPayResult({ ok: true, msg: t(`${modal.toUpperCase()} activated · expires ${exp}`, `${modal.toUpperCase()} 已激活 · 有效期至 ${exp}`) });
        setTimeout(() => { setModal(null); window.location.href = "/dashboard"; }, 2000);
      } else {
        setPayResult({ ok: false, msg: d.detail || t("Verification failed", "验证失败") });
      }
    } catch { setPayResult({ ok: false, msg: t("Network error", "网络错误") }); }
    setVerifying(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: M }}>
      <SiteNav lang={lang} onLangChange={handleLang} />

      <div style={{ paddingTop: 56 }}>

        {/* ── HERO ── */}
        <section style={{ background: "#0a1a3a", padding: "80px 10vw 72px", textAlign: "center" }}>
          <div style={{ fontFamily: M, fontSize: 10, color: "rgba(0,71,204,0.7)", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 16 }}>PRICING</div>
          <h1 style={{ fontFamily: M, fontSize: 40, fontWeight: 800, color: "#fff", margin: "0 0 14px", letterSpacing: "-0.01em" }}>
            {t("Themis Agent Plans", "Themis Agent 订阅套餐")}
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", fontFamily: M, margin: "0 0 8px" }}>
            {t("Subscribe for Agent access. API calls billed separately by token.", "订阅解锁 Agent · API 调用按 token 单独计费")}
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: M, margin: 0 }}>
            {t("No credit card required · Pay with USDT · Cancel anytime", "无需信用卡 · USDT 付款 · 随时取消")}
          </p>
        </section>

        {/* ── PLAN CARDS ── */}
        <section style={{ padding: "0 6vw", marginTop: -1 }}>
          <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: -36, position: "relative" as const, zIndex: 10 }}>
            {PLANS.map((plan) => {
              const { key, label, color, price, badge } = plan;
              const sub = t(plan.subEn, plan.subZh);
              const desc = t(plan.descEn, plan.descZh);
              const tokenLimit = t(plan.tokenLimitEn, plan.tokenLimitZh);
              const conversations = t(plan.conversationsEn, plan.conversationsZh);
              const features = lang === "zh" ? plan.featuresZh : plan.featuresEn;
              const missing = lang === "zh" ? plan.missingZh : plan.missingEn;
              const cta = t(plan.ctaEn, plan.ctaZh);
              const ctaHref = plan.ctaHref;
              const isHovered = hoveredPlan === key;
              const isPro = key === "pro";
              return (
                <div key={key}
                  onMouseEnter={() => setHoveredPlan(key)}
                  onMouseLeave={() => setHoveredPlan(null)}
                  style={{
                    padding: "28px 24px 24px",
                    background: "#fff",
                    border: `1.5px solid ${isPro ? color : isHovered ? color : "#f1f5f9"}`,
                    borderRadius: 16,
                    boxShadow: isPro
                      ? `0 20px 60px ${color}28, 0 4px 16px rgba(0,20,80,0.10)`
                      : isHovered ? `0 16px 48px ${color}22, 0 4px 16px rgba(0,20,80,0.08)` : "0 4px 16px rgba(0,20,80,0.06)",
                    transform: isPro ? "translateY(-8px)" : isHovered ? "translateY(-4px)" : "translateY(0)",
                    transition: "all 0.22s ease",
                    position: "relative" as const,
                    overflow: "hidden",
                  }}>

                  {/* 顶部色条 */}
                  <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: 3, background: isPro || isHovered ? color : "transparent", transition: "background 0.22s ease", borderRadius: "16px 16px 0 0" }} />

                  {/* Badge */}
                  {badge && (
                    <div style={{ position: "absolute" as const, top: 14, right: 14, fontFamily: M, fontSize: 8, fontWeight: 800, color, background: `${color}15`, border: `1px solid ${color}30`, padding: "3px 8px", borderRadius: 20, letterSpacing: "0.12em" }}>{badge}</div>
                  )}

                  <div style={{ marginBottom: 16, marginTop: 6 }}>
                    <div style={{ fontFamily: M, fontSize: 10, fontWeight: 800, color, letterSpacing: "0.12em", marginBottom: 8 }}>{label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                      <span style={{ fontFamily: M, fontSize: 32, fontWeight: 800, color: "#0a1a3a" }}>{price}</span>
                      <span style={{ fontFamily: M, fontSize: 11, color: "#94a3b8" }}>{sub}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6, margin: "0 0 12px", minHeight: 32 }}>{desc}</p>

                    {/* Token quota pill */}
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 8, padding: "5px 10px" }}>
                      <svg width={10} height={10} viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke={color} strokeWidth={1.5}/><path d="M5 3v2l1.2 1.2" stroke={color} strokeWidth={1.2} strokeLinecap="round"/></svg>
                      <span style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color }}>{tokenLimit}</span>
                    </div>
                  </div>

                  {isLoaded && (
                    ctaHref.startsWith("mailto") ? (
                      <a href={ctaHref} style={{ display: "block", fontFamily: M, fontSize: 10, fontWeight: 700, color: "#fff", background: color, border: "none", borderRadius: 8, padding: "10px", textAlign: "center" as const, textDecoration: "none", letterSpacing: "0.06em", marginBottom: 20 }}>{t(cta, cta)}</a>
                    ) : key === "free" ? (
                      isSignedIn
                        ? <Link href="/agent" style={{ display: "block", fontFamily: M, fontSize: 10, fontWeight: 700, color, background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 8, padding: "10px", textAlign: "center" as const, textDecoration: "none", letterSpacing: "0.06em", marginBottom: 20 }}>{t("Try Agent →", "体验 Agent →")}</Link>
                        : <SignInButton mode="modal"><button style={{ display: "block", width: "100%", fontFamily: M, fontSize: 10, fontWeight: 700, color, background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 8, padding: "10px", cursor: "pointer", letterSpacing: "0.06em", marginBottom: 20 }}>{t(cta, cta)}</button></SignInButton>
                    ) : key === "agent" ? (
                      <a href={ctaHref} target="_blank" rel="noreferrer" style={{ display: "block", fontFamily: M, fontSize: 10, fontWeight: 700, color: "#fff", background: color, border: "none", borderRadius: 8, padding: "10px", textAlign: "center" as const, textDecoration: "none", letterSpacing: "0.06em", marginBottom: 20 }}>{t(cta, cta)}</a>
                    ) : isSignedIn ? (
                      <button onClick={() => openModal(key)} style={{ display: "block", width: "100%", fontFamily: M, fontSize: 10, fontWeight: 700, color: "#fff", background: isPro || isHovered ? color : `${color}cc`, border: "none", borderRadius: 8, padding: "10px", cursor: "pointer", letterSpacing: "0.06em", marginBottom: 20, transition: "background 0.2s" }}>
                        {t(`Pay ${PLAN_PRICES_MAP[key]} USDT`, `支付 ${PLAN_PRICES_MAP[key]} USDT`)}
                      </button>
                    ) : (
                      <SignInButton mode="modal">
                        <button style={{ display: "block", width: "100%", fontFamily: M, fontSize: 10, fontWeight: 700, color, background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 8, padding: "10px", cursor: "pointer", letterSpacing: "0.06em", marginBottom: 20 }}>{t(cta, cta)}</button>
                      </SignInButton>
                    )
                  )}

                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                    {features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
                        <span style={{ color, fontSize: 10, flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span style={{ fontFamily: M, fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                    {missing.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7, opacity: 0.3 }}>
                        <span style={{ color: "#94a3b8", fontSize: 10, flexShrink: 0, marginTop: 1 }}>—</span>
                        <span style={{ fontFamily: M, fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── API TOKEN PRICING ── */}
        <section style={{ padding: "72px 6vw 0" }}>
          <div style={{ maxWidth: 1160, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 48, background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, padding: "36px 40px", boxShadow: "0 1px 4px rgba(0,20,80,0.04)" }}>

              {/* Left: title */}
              <div style={{ flexShrink: 0, maxWidth: 280 }}>
                <div style={{ fontFamily: M, fontSize: 10, color: "#0047cc", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 10 }}>API PRICING</div>
                <h2 style={{ fontFamily: M, fontSize: 20, fontWeight: 800, color: "#0a1a3a", margin: "0 0 10px" }}>
                  {t("API calls billed by token", "API 调用按 token 计费")}
                </h2>
                <p style={{ fontFamily: M, fontSize: 11, color: "#64748b", lineHeight: 1.7, margin: "0 0 16px" }}>
                  {t("Independent of your Agent subscription. Pay only for what you call.", "独立于 Agent 订阅，按实际用量付费。")}
                </p>
                <div style={{ fontFamily: M, fontSize: 10, color: "#94a3b8", lineHeight: 1.7 }}>
                  {t("Applies to endpoints:", "适用接口：")}
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {API_ENDPOINTS.map(ep => (
                      <span key={ep} style={{ fontFamily: M, fontSize: 9, color: "#0047cc", background: "#eef2ff", border: "1px solid #c7d3f8", padding: "2px 8px", borderRadius: 5 }}>{ep}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: 1, background: "#f1f5f9", alignSelf: "stretch" }} />

              {/* Right: pricing table */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {API_PRICING.map((ap) => (
                    <div key={ap.typeEn} style={{ padding: "20px 22px", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 12 }}>
                      <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", letterSpacing: "0.12em", marginBottom: 8 }}>{t(ap.typeEn, ap.typeZh).toUpperCase()}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                        <span style={{ fontFamily: M, fontSize: 28, fontWeight: 800, color: "#0a1a3a" }}>{ap.rate}</span>
                        <span style={{ fontFamily: M, fontSize: 10, color: "#94a3b8" }}>{t(ap.unitEn, ap.unitZh)}</span>
                      </div>
                      <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8" }}>{t(ap.noteEn, ap.noteZh)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>⚡</span>
                  <div style={{ fontFamily: M, fontSize: 10, color: "#92400e", lineHeight: 1.6 }}>
                    {t("Agent subscription token quota is separate from API billing. Tokens consumed by the Agent ReAct loop count against your monthly quota, not the per-token API rate.", "Agent 订阅 token 配额与 API 计费独立。Agent ReAct 推理消耗的 token 计入月度配额，不走 API 单价。")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ padding: "72px 6vw 100px" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ fontFamily: M, fontSize: 10, color: "#0047cc", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 12 }}>FAQ</div>
            <h2 style={{ fontFamily: M, fontSize: 28, fontWeight: 800, color: "#0a1a3a", margin: "0 0 36px" }}>{t("Common questions", "常见问题")}</h2>
            {FAQS.map(({ en, zh, ansEn, ansZh }, i) => (
              <div key={i} style={{ borderTop: "1px solid #f1f5f9", padding: "18px 0" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" as const }}>
                  <span style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: "#0a1a3a" }}>{t(en, zh)}</span>
                  <span style={{ fontFamily: M, fontSize: 14, color: "#94a3b8", flexShrink: 0, marginLeft: 16, transition: "transform 0.2s", display: "inline-block", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ fontFamily: M, fontSize: 11, color: "#64748b", lineHeight: 1.8, marginTop: 12 }}>{t(ansEn, ansZh)}</div>
                )}
              </div>
            ))}
            <div style={{ borderTop: "1px solid #f1f5f9" }} />
          </div>
        </section>

      </div>

      {/* 支付 Modal */}
      {modal && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(10,26,58,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px", width: 440, maxWidth: "92vw", boxShadow: "0 24px 64px rgba(0,20,80,0.2)", fontFamily: M }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0a1a3a", marginBottom: 4 }}>
              {t(`Upgrade to ${modal.toUpperCase()}`, `升级到 ${modal.toUpperCase()}`)}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 24 }}>
              {PLAN_PRICES_MAP[modal]} USDT · 30 {t("days", "天")}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 8 }}>{t("SELECT CHAIN", "选择链")}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["bsc", "polygon"] as const).map(c => (
                  <button key={c} onClick={() => setChain(c)}
                    style={{ flex: 1, fontSize: 10, fontWeight: 700, padding: "8px", borderRadius: 8, border: chain === c ? "1.5px solid #0047cc" : "1.5px solid #e2e8f0", background: chain === c ? "#eef2ff" : "#fff", color: chain === c ? "#0047cc" : "#64748b", cursor: "pointer", fontFamily: M }}>
                    {c === "bsc" ? "BNB Chain" : "Polygon"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 8 }}>{t("SEND TO", "转账到")}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, fontSize: 9, color: "#0a1a3a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", wordBreak: "break-all" as const }}>
                  {PAYMENT_WALLET}
                </div>
                <button onClick={copyAddr} style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, color: copied ? "#059669" : "#0047cc", background: copied ? "#f0fdf4" : "#eef2ff", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontFamily: M }}>
                  {copied ? "✓" : t("Copy", "复制")}
                </button>
              </div>
              <div style={{ fontSize: 9, color: "#f59e0b", marginTop: 8 }}>
                ⚠️ {t(`Send USDT on ${chain === "bsc" ? "BNB Chain (BEP-20)" : "Polygon"} only`, `仅发送 ${chain === "bsc" ? "BNB Chain (BEP-20)" : "Polygon"} 上的 USDT`)}
              </div>
            </div>

            <div style={{ textAlign: "center" as const, marginBottom: 20 }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${PAYMENT_WALLET}`} alt="QR" style={{ width: 100, height: 100, borderRadius: 8, border: "1px solid #e2e8f0" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", marginBottom: 8 }}>{t("TRANSACTION HASH", "交易哈希")}</div>
              <input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="0x..."
                style={{ width: "100%", fontFamily: M, fontSize: 10, color: "#0a1a3a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", outline: "none", boxSizing: "border-box" as const }} />
            </div>

            {payResult && (
              <div style={{ fontSize: 10, color: payResult.ok ? "#059669" : "#dc2626", background: payResult.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${payResult.ok ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                {payResult.ok ? "✓ " : "✗ "}{payResult.msg}
              </div>
            )}

            <button onClick={verify} disabled={verifying || !txHash.trim()}
              style={{ width: "100%", fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: verifying ? "#94a3b8" : "#0047cc", border: "none", borderRadius: 8, padding: "12px", cursor: verifying ? "not-allowed" : "pointer" }}>
              {verifying ? t("Verifying...", "验证中...") : t("Verify Payment", "验证付款")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
