"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_AGENT_API || "https://api.themisverdict.xyz";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "themis-admin-dev-key";
const M = "JetBrains Mono, monospace";

const adminFetch = (path: string, opts?: RequestInit) =>
  fetch(`${API}${path}`, { ...opts, headers: { "X-Admin-Key": ADMIN_KEY, "Content-Type": "application/json", ...(opts?.headers || {}) } }).then(r => r.json());

const PLAN: Record<string, { color: string; bg: string; border: string }> = {
  free:     { color: "#6b7280", bg: "#f3f4f6",  border: "#e5e7eb" },
  standard: { color: "#185FA5", bg: "#eff4ff",  border: "#c3d9f8" },
  pro:      { color: "#534AB7", bg: "#f0effe",  border: "#c4bef8" },
  agent:    { color: "#0F6E56", bg: "#ecfdf5",  border: "#6ee7b7" },
};

export default function AdminSubscriptions() {
  const [userId, setUserId] = useState("");
  const [userInfo, setUserInfo] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const [plan, setPlan] = useState("pro");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const search = async () => {
    if (!userId.trim()) return;
    setSearching(true); setSearchErr(""); setUserInfo(null); setResult(null);
    const d = await adminFetch(`/api/admin/users/${userId.trim()}`).catch(() => null);
    setSearching(false);
    if (!d || d.detail) { setSearchErr("未找到该用户，请确认 User ID 正确"); return; }
    setUserInfo(d);
    setPlan(d.plan === "free" ? "standard" : d.plan);
  };

  const submit = async () => {
    if (!userInfo) return;
    setSaving(true); setResult(null);
    const planRes = await adminFetch(`/api/admin/users/${userInfo.id}/plan`, {
      method: "POST", body: JSON.stringify({ plan, note: note || `手动补单 $${amount}`, admin_id: "admin" }),
    });
    if (amount && parseFloat(amount) > 0) {
      await adminFetch("/api/admin/revenue", {
        method: "POST", body: JSON.stringify({ user_id: userInfo.id, amount_usd: parseFloat(amount), plan, note, admin_id: "admin" }),
      });
    }
    setSaving(false);
    if (planRes.ok) { setResult({ ok: true, msg: `✓ 已为 ${userInfo.email} 补发 ${plan.toUpperCase()}` }); setUserInfo({ ...userInfo, plan }); }
    else setResult({ ok: false, msg: `✕ 操作失败: ${planRes.detail || "请检查后端"}` });
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: M, marginBottom: 22, lineHeight: 1.7 }}>
        当用户付款成功但未能自动到账时，在此手动补发订阅权限。操作将记录在日志中。
      </div>

      {/* Step 1 */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#c9d0db", letterSpacing: "0.12em", fontFamily: M, marginBottom: 14 }}>STEP 1 · 查找用户</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af" }} />
            <input value={userId} onChange={e => setUserId(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
              placeholder="输入 Clerk User ID，如 user_2abc..."
              style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, fontSize: 12, fontFamily: M, boxSizing: "border-box" as const }} />
          </div>
          <button onClick={search} disabled={searching}
            style={{ padding: "9px 20px", borderRadius: 8, background: "#0d1117", color: "#fff", border: "none", fontSize: 12, fontFamily: M, cursor: "pointer", fontWeight: 700, opacity: searching ? 0.7 : 1, whiteSpace: "nowrap" as const }}>
            {searching ? "查询中..." : "查找"}
          </button>
        </div>
        {searchErr && <div style={{ fontSize: 11, color: "#dc2626", fontFamily: M, marginTop: 8 }}>{searchErr}</div>}

        {userInfo && (
          <div style={{ marginTop: 12, padding: "12px 14px", background: "#f9fafb", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#eff4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#1a56db", flexShrink: 0 }}>
              {(userInfo.first_name || userInfo.email)?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0d1117", fontFamily: M }}>{userInfo.first_name} {userInfo.last_name}</div>
              <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: M }}>{userInfo.email}</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: PLAN[userInfo.plan]?.color, background: PLAN[userInfo.plan]?.bg, padding: "3px 10px", borderRadius: 4, fontFamily: M }}>
              当前: {userInfo.plan.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Step 2 */}
      {userInfo && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#c9d0db", letterSpacing: "0.12em", fontFamily: M, marginBottom: 14 }}>STEP 2 · 选择套餐</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {["free", "standard", "pro", "agent"].map(p => {
              const pc = PLAN[p];
              return (
                <button key={p} onClick={() => setPlan(p)}
                  style={{ padding: "10px 8px", borderRadius: 8, border: plan === p ? `2px solid ${pc.color}` : "1px solid rgba(0,0,0,0.1)", background: plan === p ? pc.bg : "#fff", color: plan === p ? pc.color : "#6b7280", fontSize: 11, fontWeight: 700, fontFamily: M, cursor: "pointer" }}>
                  {p.toUpperCase()}
                </button>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: "#6b7280", fontFamily: M, marginBottom: 6, fontWeight: 600 }}>实收金额（USD）</div>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="如：29.9"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, fontSize: 12, fontFamily: M, boxSizing: "border-box" as const }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#6b7280", fontFamily: M, marginBottom: 6, fontWeight: 600 }}>备注 / 订单号</div>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="如：支付宝 2026061200001"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, fontSize: 12, fontFamily: M, boxSizing: "border-box" as const }} />
            </div>
          </div>
          {result && (
            <div style={{ padding: "10px 14px", background: result.ok ? "#f0fdf4" : "#fff1f2", border: `1px solid ${result.ok ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, fontSize: 12, color: result.ok ? "#059669" : "#dc2626", fontFamily: M, marginBottom: 12 }}>
              {result.msg}
            </div>
          )}
          <button onClick={submit} disabled={saving}
            style={{ width: "100%", padding: "12px", borderRadius: 10, background: "#1a56db", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, fontFamily: M, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "处理中..." : `确认补发 ${plan.toUpperCase()} 套餐`}
          </button>
        </div>
      )}

      <div style={{ fontSize: 10, color: "#c9d0db", fontFamily: M, lineHeight: 1.8 }}>
        · 所有操作自动记录到操作日志<br />
        · 填写金额会同步记录到财务流水，留空则仅更新套餐
      </div>
    </div>
  );
}
