"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_AGENT_API || "https://api.themisverdict.xyz";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "themis-admin-dev-key";
const M = "JetBrains Mono, monospace";

const adminFetch = (path: string, opts?: RequestInit) =>
  fetch(`${API}${path}`, { ...opts, headers: { "X-Admin-Key": ADMIN_KEY, "Content-Type": "application/json", ...(opts?.headers || {}) } }).then(r => r.json());

export default function AdminDevelopers() {
  const [devs, setDevs]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [detail, setDetail]         = useState<any | null>(null);
  const [detailSkills, setDetailSkills] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [grantModal, setGrantModal] = useState(false);
  const [grantId, setGrantId]       = useState("");
  const [grantNote, setGrantNote]   = useState("");
  const [grantMsg, setGrantMsg]     = useState("");
  const [granting, setGranting]     = useState(false);
  const [revoking, setRevoking]     = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminFetch("/api/admin/developers")
      .then(d => { setDevs(d.developers || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (dev: any) => {
    setDetail(dev);
    setDetailLoading(true);
    const d = await adminFetch(`/api/admin/developers/${dev.user_id}/skills`);
    setDetailSkills(d.skills || []);
    setDetailLoading(false);
  };

  const revoke = async (userId: string, name: string) => {
    if (!confirm(`确认撤销 ${name} 的开发者身份？此操作将立即生效。`)) return;
    setRevoking(userId);
    await adminFetch(`/api/admin/developers/${userId}/revoke`, {
      method: "POST", body: JSON.stringify({ admin_id: "admin", note: "Admin revoke" }),
    });
    setRevoking(null);
    if (detail?.user_id === userId) setDetail(null);
    load();
  };

  const grant = async () => {
    if (!grantId.trim()) return;
    setGranting(true); setGrantMsg("");
    const res = await adminFetch(`/api/admin/developers/${grantId.trim()}/grant`, {
      method: "POST", body: JSON.stringify({ admin_id: "admin", note: grantNote }),
    });
    setGranting(false);
    if (res.ok) {
      setGrantMsg("✓ 授权成功");
      load();
      setTimeout(() => { setGrantModal(false); setGrantId(""); setGrantNote(""); setGrantMsg(""); }, 1500);
    } else {
      setGrantMsg(`✕ ${res.detail || "操作失败"}`);
    }
  };

  const totalRevenue = devs.reduce((s, d) => s + (d.total_revenue || 0), 0);
  const totalSkills  = devs.reduce((s, d) => s + (d.skill_count || 0), 0);
  const totalCalls   = devs.reduce((s, d) => s + (d.total_calls || 0), 0);

  return (
    <div style={{ fontFamily: M }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0d1117", marginBottom: 4 }}>开发者管理</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>管理平台开发者入驻状态与 Skill 数据</div>
        </div>
        <button onClick={() => setGrantModal(true)}
          style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: "#7c3aed", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer" }}>
          + 手动授权开发者
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { l: "开发者总数",   v: String(devs.length),          c: "#7c3aed" },
          { l: "平台 Skill 数", v: String(totalSkills),          c: "#0047cc" },
          { l: "累计调用次数", v: String(totalCalls),            c: "#059669" },
          { l: "平台抽佣",     v: "$0.00",                       c: "#94a3b8", sub: "早期不抽佣" },
        ].map(({ l, v, c, sub }) => (
          <div key={l} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8ecf4", padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,20,60,0.05)" }}>
            <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: "0.12em", marginBottom: 8 }}>{l.toUpperCase()}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c }}>{loading ? "—" : v}</div>
            {sub && <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 4 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf4", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,20,60,0.05)" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0d1117" }}>开发者列表</span>
          <span style={{ fontSize: 10, color: "#9ca3af" }}>{devs.length} 人</span>
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 100px 120px 100px", padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #f0f2f8" }}>
          {["开发者", "入驻时间", "Skill数", "调用量", "销售量", "总收入(USDT)", "操作"].map(h => (
            <span key={h} style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.12em" }}>{h.toUpperCase()}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>加载中…</div>
        ) : devs.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, opacity: 0.1, marginBottom: 12 }}>⚖</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>暂无入驻开发者</div>
          </div>
        ) : devs.map((dev, i) => (
          <div key={dev.user_id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 100px 120px 100px", padding: "14px 20px", borderBottom: i < devs.length - 1 ? "1px solid #f4f6f8" : "none", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0d1117" }}>{dev.name}</div>
              <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>{dev.email}</div>
              <div style={{ fontSize: 8, color: "#9ca3af", marginTop: 1 }}>ID: {dev.user_id.slice(0, 16)}…</div>
            </div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>
              {dev.enrolled_at ? new Date(dev.enrolled_at).toLocaleDateString("zh-CN") : "—"}
              {dev.chain === "manual" && (
                <span style={{ marginLeft: 6, fontSize: 8, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #d8b4fe", borderRadius: 4, padding: "1px 5px" }}>手动授权</span>
              )}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0d1117" }}>{dev.skill_count}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0d1117" }}>{dev.total_calls}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0d1117" }}>{dev.total_sales}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>${(dev.total_revenue || 0).toFixed(2)}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => openDetail(dev)}
                style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#0047cc", background: "#eef2ff", border: "1px solid #c7d3f8", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
                详情
              </button>
              <button onClick={() => revoke(dev.user_id, dev.name)} disabled={revoking === dev.user_id}
                style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "5px 10px", cursor: "pointer", opacity: revoking === dev.user_id ? 0.5 : 1 }}>
                {revoking === dev.user_id ? "…" : "撤销"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 手动授权 Modal */}
      {grantModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,26,58,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setGrantModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px", width: 420, maxWidth: "92vw", boxShadow: "0 24px 64px rgba(0,20,80,0.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: M, fontSize: 14, fontWeight: 800, color: "#0d1117", marginBottom: 4 }}>手动授权开发者</div>
            <div style={{ fontFamily: M, fontSize: 11, color: "#9ca3af", marginBottom: 24 }}>跳过支付流程，直接赋予开发者身份</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: M, fontSize: 9, color: "#9ca3af", letterSpacing: "0.15em", marginBottom: 8 }}>CLERK USER ID</div>
              <input value={grantId} onChange={e => setGrantId(e.target.value)} placeholder="user_xxxxxxxxxx"
                style={{ width: "100%", fontFamily: M, fontSize: 10, color: "#0d1117", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: M, fontSize: 9, color: "#9ca3af", letterSpacing: "0.15em", marginBottom: 8 }}>备注</div>
              <input value={grantNote} onChange={e => setGrantNote(e.target.value)} placeholder="可选，例如：合作开发者"
                style={{ width: "100%", fontFamily: M, fontSize: 10, color: "#0d1117", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", outline: "none", boxSizing: "border-box" }} />
            </div>
            {grantMsg && (
              <div style={{ fontFamily: M, fontSize: 10, color: grantMsg.startsWith("✓") ? "#059669" : "#dc2626", background: grantMsg.startsWith("✓") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${grantMsg.startsWith("✓") ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                {grantMsg}
              </div>
            )}
            <button onClick={grant} disabled={granting || !grantId.trim()}
              style={{ width: "100%", fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: granting ? "#94a3b8" : "#7c3aed", border: "none", borderRadius: 8, padding: "12px", cursor: granting ? "not-allowed" : "pointer" }}>
              {granting ? "授权中…" : "确认授权"}
            </button>
          </div>
        </div>
      )}

      {/* 详情抽屉 */}
      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,26,58,0.4)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }} onClick={() => setDetail(null)}>
          <div style={{ width: 480, maxWidth: "90vw", background: "#fff", height: "100vh", overflow: "auto", padding: "28px 24px", boxShadow: "-8px 0 32px rgba(0,20,80,0.12)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: M, fontSize: 14, fontWeight: 800, color: "#0d1117" }}>开发者详情</div>
              <button onClick={() => setDetail(null)} style={{ fontFamily: M, fontSize: 18, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>×</button>
            </div>

            {/* 基本信息 */}
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px", marginBottom: 20 }}>
              <div style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: "#0d1117", marginBottom: 4 }}>{detail.name}</div>
              <div style={{ fontFamily: M, fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{detail.email}</div>
              <div style={{ fontFamily: M, fontSize: 9, color: "#9ca3af" }}>ID: {detail.user_id}</div>
            </div>

            {/* 统计 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { l: "入驻时间",    v: detail.enrolled_at ? new Date(detail.enrolled_at).toLocaleDateString("zh-CN") : "—" },
                { l: "入驻方式",    v: detail.chain === "manual" ? "手动授权" : detail.chain === "bsc" ? "BNB Chain" : detail.chain || "—" },
                { l: "Skill 数",    v: String(detail.skill_count) },
                { l: "累计调用",    v: String(detail.total_calls) },
                { l: "累计销售",    v: String(detail.total_sales) },
                { l: "累计收入",    v: `$${(detail.total_revenue || 0).toFixed(2)}` },
                { l: "平台抽佣",    v: "$0.00（早期特权）" },
                { l: "入驻费",      v: `$${detail.fee_usdt || 30}` },
              ].map(({ l, v }) => (
                <div key={l} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontFamily: M, fontSize: 8, color: "#9ca3af", marginBottom: 4 }}>{l}</div>
                  <div style={{ fontFamily: M, fontSize: 11, fontWeight: 600, color: "#0d1117" }}>{v}</div>
                </div>
              ))}
            </div>

            {/* TxHash */}
            {detail.tx_hash && detail.tx_hash !== "admin-granted" && (
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", marginBottom: 20 }}>
                <div style={{ fontFamily: M, fontSize: 8, color: "#9ca3af", marginBottom: 4 }}>入驻 TX HASH</div>
                <div style={{ fontFamily: M, fontSize: 9, color: "#0d1117", wordBreak: "break-all" }}>{detail.tx_hash}</div>
              </div>
            )}

            {/* Skill 列表 */}
            <div style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#0d1117", marginBottom: 12 }}>发布的 Skills</div>
            {detailLoading ? (
              <div style={{ fontFamily: M, fontSize: 11, color: "#9ca3af" }}>加载中…</div>
            ) : detailSkills.length === 0 ? (
              <div style={{ fontFamily: M, fontSize: 11, color: "#9ca3af" }}>暂无发布的 Skill</div>
            ) : detailSkills.map((sk: any) => (
              <div key={sk.id} style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: "#0d1117" }}>{sk.name}</span>
                  <span style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#059669" }}>${(sk.total_revenue || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontFamily: M, fontSize: 9, color: "#9ca3af" }}>调用 {sk.call_count || 0} 次</span>
                  <span style={{ fontFamily: M, fontSize: 9, color: "#9ca3af" }}>销售 {sk.sales_count || 0} 笔</span>
                  <span style={{ fontFamily: M, fontSize: 9, color: "#9ca3af" }}>售价 {sk.price_usdt === 0 ? "FREE" : `$${sk.price_usdt}`}</span>
                </div>
              </div>
            ))}

            {/* 撤销按钮 */}
            <button onClick={() => revoke(detail.user_id, detail.name)} disabled={revoking === detail.user_id}
              style={{ width: "100%", marginTop: 24, fontFamily: M, fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "11px", cursor: "pointer", opacity: revoking === detail.user_id ? 0.5 : 1 }}>
              {revoking === detail.user_id ? "撤销中…" : "撤销开发者身份"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
