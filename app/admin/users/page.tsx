"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_AGENT_API || "https://api.themisverdict.xyz";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "themis-admin-dev-key";
const M = "JetBrains Mono, monospace";

const adminFetch = (path: string, opts?: RequestInit) =>
  fetch(`${API}${path}`, { ...opts, headers: { "X-Admin-Key": ADMIN_KEY, "Content-Type": "application/json", ...(opts?.headers || {}) } }).then(r => r.json());

const PLAN: Record<string, { color: string; bg: string }> = {
  free:     { color: "#6b7280", bg: "#f3f4f6" },
  standard: { color: "#185FA5", bg: "#eff4ff" },
  pro:      { color: "#534AB7", bg: "#f0effe" },
  agent:    { color: "#0F6E56", bg: "#ecfdf5" },
};

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ user: any; type: "plan" | "ban" } | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    adminFetch(`/api/admin/users?page=${page}&limit=50${search ? `&search=${search}` : ""}`)
      .then(d => { setUsers(d.users || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search]);

  const savePlan = async () => {
    if (!modal) return;
    setSaving(true);
    const res = await adminFetch(`/api/admin/users/${modal.user.id}/plan`, {
      method: "POST", body: JSON.stringify({ plan: newPlan, note, admin_id: "admin" }),
    });
    setSaving(false);
    if (res.ok) { setMsg(`✓ 已更新为 ${newPlan.toUpperCase()}`); load(); setTimeout(() => setModal(null), 1000); }
    else setMsg(`✕ ${res.detail || "操作失败"}`);
  };

  const resetQuota = async (uid: string, email: string) => {
    if (!confirm(`确认重置 ${email} 的本月配额？`)) return;
    await adminFetch(`/api/admin/users/${uid}/reset-quota`, { method: "POST", body: JSON.stringify({ admin_id: "admin" }) });
    load();
  };

  const toggleBan = async (u: any) => {
    if (!confirm(`确认${u.banned ? "解封" : "封禁"} ${u.email}？`)) return;
    await adminFetch(`/api/admin/users/${u.id}/ban`, { method: "POST", body: JSON.stringify({ ban: !u.banned, admin_id: "admin" }) });
    load();
  };

  const ts = (ms: number) => ms ? new Date(ms).toLocaleDateString("zh-CN") : "—";

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
          <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af" }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜索邮箱..."
            style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, fontSize: 12, fontFamily: M, background: "#fff", boxSizing: "border-box" as const }} />
        </div>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 11, fontFamily: M, cursor: "pointer", color: "#6b7280" }}>
          <i className="ti ti-refresh" style={{ fontSize: 13 }} /> 刷新
        </button>
        <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: M }}>{users.length} 条</span>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 90px 1.2fr 80px 200px", padding: "10px 16px", background: "#f9fafb", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          {["用户", "注册时间", "套餐", "Token 用量", "状态", "操作"].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.08em", fontFamily: M }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 12, fontFamily: M }}>加载中...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 12, fontFamily: M }}>暂无数据</div>
        ) : users.map((u, i) => {
          const pc = PLAN[u.plan] || PLAN.free;
          return (
            <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 90px 1.2fr 80px 200px", padding: "12px 16px", borderBottom: i < users.length - 1 ? "1px solid #f3f4f6" : "none", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0d1117", fontFamily: M }}>{u.first_name || ""} {u.last_name || ""}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: M, marginTop: 1 }}>{u.email}</div>
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: M }}>{ts(u.created_at)}</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: pc.color, background: pc.bg, padding: "3px 8px", borderRadius: 4, fontFamily: M, whiteSpace: "nowrap" as const, width: "fit-content" }}>
                {u.plan.toUpperCase()}
              </span>
              <div>
                <div style={{ height: 4, background: "#f3f4f6", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", width: `${Math.min(u.tokens_pct || 0, 100)}%`, background: (u.tokens_pct || 0) > 90 ? "#ef4444" : "#378ADD", borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 9, color: "#9ca3af", fontFamily: M }}>{((u.tokens_used || 0) / 1000).toFixed(0)}K / {((u.tokens_limit || 0) / 1000).toFixed(0)}K</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: u.banned ? "#dc2626" : "#059669", fontFamily: M }}>{u.banned ? "已封禁" : "正常"}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setModal({ user: u, type: "plan" }); setNewPlan(u.plan); setNote(""); setMsg(""); }}
                  style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #c3d9f8", background: "#eff4ff", color: "#185FA5", fontSize: 10, fontFamily: M, cursor: "pointer", fontWeight: 600 }}>
                  改套餐
                </button>
                <button onClick={() => resetQuota(u.id, u.email)}
                  style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", background: "#f9fafb", color: "#6b7280", fontSize: 10, fontFamily: M, cursor: "pointer" }}>
                  重置
                </button>
                <button onClick={() => toggleBan(u)}
                  style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${u.banned ? "#bbf7d0" : "#fecaca"}`, background: u.banned ? "#f0fdf4" : "#fff1f2", color: u.banned ? "#059669" : "#dc2626", fontSize: 10, fontFamily: M, cursor: "pointer" }}>
                  {u.banned ? "解封" : "封禁"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center" }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 11, fontFamily: M, cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? 0.4 : 1, color: "#6b7280" }}>← 上一页</button>
        <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: M, alignSelf: "center" }}>第 {page} 页</span>
        <button onClick={() => setPage(p => p + 1)} disabled={users.length < 50}
          style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 11, fontFamily: M, cursor: users.length < 50 ? "default" : "pointer", opacity: users.length < 50 ? 0.4 : 1, color: "#6b7280" }}>下一页 →</button>
      </div>

      {/* Plan modal */}
      {modal?.type === "plan" && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0d1117", fontFamily: M, marginBottom: 2 }}>修改套餐</div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: M, marginBottom: 18 }}>{modal.user.email}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {["free", "standard", "pro", "agent"].map(p => {
                const pc = PLAN[p];
                return (
                  <button key={p} onClick={() => setNewPlan(p)}
                    style={{ padding: "10px", borderRadius: 8, border: newPlan === p ? `2px solid ${pc.color}` : "1px solid rgba(0,0,0,0.1)", background: newPlan === p ? pc.bg : "#fff", color: newPlan === p ? pc.color : "#6b7280", fontSize: 11, fontWeight: 700, fontFamily: M, cursor: "pointer" }}>
                    {p.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="备注（订单号等）"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, fontSize: 12, fontFamily: M, marginBottom: 14, boxSizing: "border-box" as const }} />
            {msg && <div style={{ fontSize: 11, color: msg.startsWith("✓") ? "#059669" : "#dc2626", fontFamily: M, marginBottom: 10 }}>{msg}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 12, fontFamily: M, cursor: "pointer", color: "#6b7280" }}>取消</button>
              <button onClick={savePlan} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "#1a56db", color: "#fff", fontSize: 12, fontFamily: M, cursor: "pointer", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? "保存中..." : "确认修改"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
