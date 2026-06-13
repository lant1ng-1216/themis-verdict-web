"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:8000";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "themis-admin-dev-key";

const adminFetch = (path: string) =>
  fetch(`${API}${path}`, { headers: { "X-Admin-Key": ADMIN_KEY } }).then(r => r.json());

const M = "JetBrains Mono, monospace";
const PLAN_COLOR: Record<string, { bar: string; text: string; pct: number }> = {
  free:     { bar: "#9ca3af", text: "#6b7280", pct: 60 },
  standard: { bar: "#378ADD", text: "#185FA5", pct: 30 },
  pro:      { bar: "#7F77DD", text: "#534AB7", pct: 20 },
  agent:    { bar: "#1D9E75", text: "#0F6E56", pct: 8 },
};

function MetricCard({ label, value, sub, valueColor = "var(--text-primary)" }: any) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.08em", fontFamily: M, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: valueColor, fontFamily: M, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: M, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/api/admin/stats").then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
    const t = setInterval(() => adminFetch("/api/admin/stats").then(setStats).catch(() => {}), 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div style={{ color: "#9ca3af", fontFamily: M, fontSize: 12 }}>加载中...</div>;
  if (!stats) return <div style={{ color: "#ef4444", fontFamily: M, fontSize: 12 }}>无法连接后端，请确认 Agent 已启动</div>;

  const pColor = (v: number) => v >= 0 ? "#059669" : "#dc2626";

  const planCounts = stats.plan_counts || {};
  const planTotal = Object.values(planCounts).reduce((a: any, b: any) => a + b, 0) || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Metric row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
        <MetricCard label="总注册用户" value={stats.total_users ?? "—"} sub={`今日新增 +${stats.new_today ?? 0}`} />
        <MetricCard label="付费用户" value={stats.paid_users ?? "—"} sub={`付费率 ${stats.paid_rate ?? 0}%`} valueColor="#185FA5" />
        <MetricCard label="本月 Token 用量" value={`${((stats.total_tokens_month || 0) / 1_000_000).toFixed(1)}M`} sub="本月累计" valueColor="#534AB7" />
        <MetricCard label="本月净利润" value={`$${(stats.month_profit || 0).toFixed(2)}`} sub={`毛利率 ${stats.month_revenue > 0 ? ((stats.month_profit / stats.month_revenue) * 100).toFixed(1) : 0}%`} valueColor={pColor(stats.month_profit)} />
      </div>

      {/* Middle row: plan dist + finance */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Plan distribution */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.1em", fontFamily: M, marginBottom: 16 }}>套餐分布</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {["free", "standard", "pro", "agent"].map(p => {
              const count = planCounts[p] || 0;
              const pct = Math.round((count / (planTotal as number)) * 100);
              const cfg = PLAN_COLOR[p];
              return (
                <div key={p}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.text, fontFamily: M }}>{p.toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: M }}>{count} 用户 · {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: cfg.bar, borderRadius: 3, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Finance summary */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.1em", fontFamily: M, marginBottom: 16 }}>财务概况</div>

          {/* Today */}
          <div style={{ fontSize: 9, color: "#c9d0db", letterSpacing: "0.1em", fontFamily: M, marginBottom: 8 }}>今日</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 14 }}>
            {[
              { icon: "ti-arrow-up", label: "收入", value: `$${(stats.today_revenue || 0).toFixed(2)}`, color: "#059669" },
              { icon: "ti-arrow-down", label: "成本", value: `$${(stats.today_cost || 0).toFixed(2)}`, color: "#dc2626" },
              { icon: "ti-trending-up", label: "净利润", value: `$${(stats.today_profit || 0).toFixed(2)}`, color: pColor(stats.today_profit) },
            ].map(({ icon, label, value, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <i className={`ti ${icon}`} style={{ fontSize: 13, color }} />
                  <span style={{ fontSize: 12, color: "#6b7280", fontFamily: M }}>{label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: M }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Month */}
          <div style={{ fontSize: 9, color: "#c9d0db", letterSpacing: "0.1em", fontFamily: M, marginBottom: 8 }}>本月</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { label: "收入", value: `$${(stats.month_revenue || 0).toFixed(2)}`, color: "#059669" },
              { label: "成本", value: `$${(stats.month_cost || 0).toFixed(2)}`, color: "#dc2626" },
              { label: "净利润", value: `$${(stats.month_profit || 0).toFixed(2)}`, color: pColor(stats.month_profit) },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 12, color: "#6b7280", fontFamily: M }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: M }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div style={{ fontSize: 10, color: "#c9d0db", fontFamily: M }}>每 30 秒自动刷新 · 成本基于 DeepSeek $0.21/1M tokens 估算</div>
    </div>
  );
}
