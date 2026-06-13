"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:8000";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "themis-admin-dev-key";
const M = "JetBrains Mono, monospace";

const adminFetch = (path: string) =>
  fetch(`${API}${path}`, { headers: { "X-Admin-Key": ADMIN_KEY } }).then(r => r.json());

const ACTION: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  grant_plan:     { label: "补发套餐", color: "#185FA5", bg: "#eff4ff",  icon: "ti-gift" },
  reset_quota:    { label: "重置配额", color: "#534AB7", bg: "#f0effe",  icon: "ti-refresh" },
  ban_user:       { label: "封禁用户", color: "#dc2626", bg: "#fff1f2",  icon: "ti-ban" },
  unban_user:     { label: "解封用户", color: "#059669", bg: "#f0fdf4",  icon: "ti-circle-check" },
  record_revenue: { label: "记录收入", color: "#0F6E56", bg: "#ecfdf5",  icon: "ti-coin" },
};

const DEFAULT_ACTION = { label: "操作", color: "#6b7280", bg: "#f3f4f6", icon: "ti-activity" };

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = () => {
    setLoading(true);
    adminFetch("/api/admin/logs?limit=200")
      .then(d => { setLogs(d.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? logs : logs.filter((l: any) => l.action === filter);
  const actionTypes = Array.from(new Set(logs.map((l: any) => l.action)));

  const ts = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch { return iso || "—"; }
  };

  return (
    <div>
      {/* Filter tabs + refresh */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center", flexWrap: "wrap" as const }}>
        <button onClick={() => setFilter("all")}
          style={{ padding: "5px 12px", borderRadius: 6, border: filter === "all" ? "1px solid #1a56db" : "1px solid rgba(0,0,0,0.1)", background: filter === "all" ? "#eff4ff" : "#fff", color: filter === "all" ? "#1a56db" : "#6b7280", fontSize: 11, fontFamily: M, cursor: "pointer", fontWeight: filter === "all" ? 700 : 400 }}>
          全部
        </button>
        {actionTypes.map(a => {
          const cfg = ACTION[a] || DEFAULT_ACTION;
          return (
            <button key={a} onClick={() => setFilter(a)}
              style={{ padding: "5px 12px", borderRadius: 6, border: filter === a ? `1px solid ${cfg.color}` : "1px solid rgba(0,0,0,0.1)", background: filter === a ? cfg.bg : "#fff", color: filter === a ? cfg.color : "#6b7280", fontSize: 11, fontFamily: M, cursor: "pointer", fontWeight: filter === a ? 700 : 400 }}>
              {cfg.label}
            </button>
          );
        })}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: M }}>{filtered.length} 条</span>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 11, fontFamily: M, cursor: "pointer", color: "#6b7280" }}>
            <i className="ti ti-refresh" style={{ fontSize: 12 }} /> 刷新
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "150px 110px 1.5fr 2fr", padding: "9px 16px", background: "#f9fafb", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          {["时间", "操作类型", "目标用户", "备注"].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.06em", fontFamily: M }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 12, fontFamily: M }}>加载中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 12, fontFamily: M }}>暂无日志</div>
        ) : filtered.map((log: any, i: number) => {
          const cfg = ACTION[log.action] || DEFAULT_ACTION;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "150px 110px 1.5fr 2fr", padding: "11px 16px", borderBottom: i < filtered.length - 1 ? "1px solid #f3f4f6" : "none", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: M }}>{ts(log.ts || log.timestamp)}</span>
              <span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: "3px 9px", borderRadius: 5, fontFamily: M }}>
                  <i className={`ti ${cfg.icon}`} style={{ fontSize: 11 }} />
                  {cfg.label}
                </span>
              </span>
              <div style={{ fontSize: 11, color: "#0d1117", fontFamily: M, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                {log.target_user_id || log.user_id || "—"}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", fontFamily: M, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                {log.note || log.detail || log.plan || "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
