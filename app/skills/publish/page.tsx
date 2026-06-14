"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.themisverdict.xyz";
const M = "JetBrains Mono, monospace";

export default function PublishSkillPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [lang, setLang] = useState(() => typeof window !== "undefined" ? (localStorage.getItem("themis_lang") || "zh") : "zh");
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const [isDev, setIsDev] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", description_en: "", version: "v1",
    tags: "", supported_pairs: "BTC,ETH,BNB",
    price_usdt: "0",
    price_bnb: "0",
    developer_wallet: "",
    developer_name: "",
    prompt_template: "", example_input: "", example_output: "",
    visibility: "public",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLang(localStorage.getItem("lang") || "zh");
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch(`${API_BASE}/api/payment/developer-status?user_id=${user.id}`)
      .then(r => r.json())
      .then(d => {
        setIsDev(d.is_developer);
        if (!d.is_developer) router.replace("/dashboard");
      })
      .catch(() => setIsDev(false));
  }, [isLoaded, user]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const templateVars = Array.from(
    new Set((form.prompt_template.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/[{}]/g, "")))
  );

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.name || !form.description) { setMsg(t("Name and description are required.", "名称和描述必填。")); return; }
    setSubmitting(true); setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/skills/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          name: form.name,
          description: form.description,
          description_en: form.description_en,
          version: form.version,
          tags: form.tags.split(",").map(s => s.trim()).filter(Boolean),
          supported_pairs: form.supported_pairs.split(",").map(s => s.trim()).filter(Boolean),
          price_usdt: parseFloat(form.price_usdt) || 0,
          price_bnb: parseFloat(form.price_bnb) || 0,
          developer_wallet: form.developer_wallet || "",
          developer_name: form.developer_name || user.fullName || "",
          prompt_template: form.prompt_template,
          example_input: form.example_input,
          example_output: form.example_output,
          visibility: form.visibility,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Publish failed");
      setMsg(t(`✓ Skill published! ID: ${d.skill_id}`, `✓ Skill 发布成功！ID: ${d.skill_id}`));
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      setMsg("✗ " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded || isDev === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: M, fontSize: 12, color: "#94a3b8" }}>
        {t("Loading…", "加载中…")}
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    fontFamily: M, fontSize: 11, color: "#0a1a3a",
    background: "#f8fafc", border: "1px solid #e2e8f0",
    borderRadius: 7, padding: "9px 12px", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: M, fontSize: 9, fontWeight: 700, color: "#7c3aed",
    letterSpacing: "0.12em", display: "block", marginBottom: 5,
  };
  const sectionTitle = (s: string) => (
    <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.15em", marginBottom: 14, marginTop: 28 }}>{s}</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "40px 20px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/dashboard" style={{ fontFamily: M, fontSize: 10, color: "#94a3b8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            ← {t("Back to Dashboard", "返回控制台")}
          </Link>
          <h1 style={{ fontFamily: M, fontSize: 24, fontWeight: 800, color: "#0a1a3a", margin: "0 0 6px" }}>
            {t("Publish a Skill", "发布 Skill")}
          </h1>
          <p style={{ fontFamily: M, fontSize: 11, color: "#94a3b8", margin: 0 }}>
            {t("Create and sell your AI prompt templates in the Skill Market.", "创建并在 Skill 市场出售你的 AI Prompt 模板。")}
          </p>
        </div>

        <div style={{ padding: "10px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, fontFamily: M, fontSize: 10, color: "#166534", marginBottom: 28 }}>
          ✓ {t("Early access: publishing is free. Your skill goes live immediately after submission.", "早期特权：发布完全免费，提交后立即上架。")}
        </div>

        <form onSubmit={publish} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "32px 36px", boxShadow: "0 2px 8px rgba(0,20,80,0.06)" }}>
          {sectionTitle(t("BASIC INFO", "基础信息"))}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>{t("SKILL NAME *", "Skill 名称 *")}</label>
              <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder={t("e.g. BTC Trend Signal", "如：BTC 趋势信号")} required />
            </div>
            <div>
              <label style={labelStyle}>{t("VERSION", "版本号")}</label>
              <input style={inputStyle} value={form.version} onChange={e => set("version", e.target.value)} placeholder="v1" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>描述（中文）*</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="描述这个 Skill 的功能和目标用户。" required />
            </div>
            <div>
              <label style={labelStyle}>Description (English) *</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.description_en} onChange={e => set("description_en", e.target.value)} placeholder="Describe what this skill does and who it's for." required />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>{t("TAGS", "标签（逗号分隔）")}</label>
              <input style={inputStyle} value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="trend, BTC, signal" />
            </div>
            <div>
              <label style={labelStyle}>{t("SUPPORTED PAIRS", "支持的交易对")}</label>
              <input style={inputStyle} value={form.supported_pairs} onChange={e => set("supported_pairs", e.target.value)} placeholder="BTC,ETH,BNB" />
            </div>
          </div>

          {sectionTitle(t("PROMPT TEMPLATE", "Prompt 模板"))}
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>{t("TEMPLATE CONTENT (use {{variable}} to define variables)", "模板内容（使用 {{变量名}} 定义变量）")}</label>
            <textarea
              style={{ ...inputStyle, minHeight: 140, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              value={form.prompt_template}
              onChange={e => set("prompt_template", e.target.value)}
              placeholder={t(
                "You are a crypto analyst. Analyze {{pair}} with RSI={{rsi}} and MACD={{macd}}. Give a verdict.",
                "你是一名加密货币分析师。分析 {{pair}}，RSI={{rsi}}，MACD={{macd}}，给出裁决。"
              )}
            />
          </div>
          {templateVars.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              <span style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", marginRight: 4, alignSelf: "center" }}>{t("Detected vars:", "检测到变量：")}</span>
              {templateVars.map(v => (
                <span key={v} style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "2px 8px", borderRadius: 12 }}>
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>{t("EXAMPLE INPUT", "输入示例")}</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.example_input} onChange={e => set("example_input", e.target.value)} placeholder="pair=BTC, rsi=65, macd=0.02" />
            </div>
            <div>
              <label style={labelStyle}>{t("EXAMPLE OUTPUT", "输出示例")}</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.example_output} onChange={e => set("example_output", e.target.value)} placeholder={t("BTC shows bullish momentum. Verdict: LONG.", "BTC 显示看涨动能，裁决：做多。")} />
            </div>
          </div>

          {sectionTitle(t("PRICING & PUBLISHING", "定价与发布设置"))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
            <div>
              <label style={labelStyle}>{t("PRICE (USDT/CALL)", "单次调用价格（USDT）")}</label>
              <input style={inputStyle} type="number" min="0" step="0.01" value={form.price_usdt} onChange={e => set("price_usdt", e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>{t("ERC-8183 PRICE (BNB)", "链上付费价格（BNB）")}</label>
              <input style={inputStyle} type="number" min="0" step="0.0001" value={form.price_bnb} onChange={e => set("price_bnb", e.target.value)} placeholder="0.001" />
              <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", marginTop: 4, letterSpacing: "0.03em" }}>
                {t("> 0 enables paid on-chain calls via ERC-8183 commerce", "大于 0 时开启 ERC-8183 链上付费调用")}
              </div>
            </div>
            <div>
              <label style={labelStyle}>{t("PAYOUT WALLET (BNB CHAIN)", "收款钱包地址（BNB Chain）")}</label>
              <input style={inputStyle} value={form.developer_wallet} onChange={e => set("developer_wallet", e.target.value)} placeholder="0x..." />
            </div>
            <div>
              <label style={labelStyle}>{t("DISPLAY NAME", "开发者显示名称")}</label>
              <input style={inputStyle} value={form.developer_name} onChange={e => set("developer_name", e.target.value)} placeholder={t("Dev Team", "你的名称")} />
            </div>
            <div>
              <label style={labelStyle}>{t("VISIBILITY", "可见性")}</label>
              <select style={inputStyle} value={form.visibility} onChange={e => set("visibility", e.target.value)}>
                <option value="public">{t("Public — Skills Market", "公开 — 市场展示")}</option>
                <option value="private">{t("Private — link only", "私有 — 仅链接访问")}</option>
              </select>
            </div>
          </div>

          {msg && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: msg.startsWith("✓") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.startsWith("✓") ? "#bbf7d0" : "#fecaca"}`, fontFamily: M, fontSize: 11, color: msg.startsWith("✓") ? "#166534" : "#dc2626", marginBottom: 16 }}>
              {msg}
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/dashboard" style={{ flex: 1, fontFamily: M, fontSize: 11, fontWeight: 700, color: "#64748b", background: "#f1f5f9", border: "none", borderRadius: 9, padding: "13px", cursor: "pointer", textDecoration: "none", textAlign: "center", display: "block" }}>
              {t("Cancel", "取消")}
            </Link>
            <button type="submit" disabled={submitting} style={{ flex: 3, fontFamily: M, fontSize: 12, fontWeight: 700, color: "#fff", background: submitting ? "#94a3b8" : "#7c3aed", border: "none", borderRadius: 9, padding: "13px", cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? t("Publishing…", "发布中…") : t("Publish Skill →", "立即发布 Skill →")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
