"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_AGENT_API || "https://api.themisverdict.xyz";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "themis-admin-dev-key";
const M = "JetBrains Mono, monospace";

const adminFetch = (path: string) =>
  fetch(`${API}${path}`, { headers: { "X-Admin-Key": ADMIN_KEY } }).then(r => r.json());

export default function AdminFinance() {
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminFetch("/api/admin/finance?days=30"),
      adminFetch("/api/admin/stats"),
    ]).then(([f, s]) => { setData(f); setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "#9ca3af", fontFamily: M, fontSize: 12 }}>加载中...</div>;
  if (!data) return <div style={{ color: "#ef4444", fontFamily: M, fontSize: 12 }}>无法连接后端</div>;

  const days: any[] = Array.isArray(data.days) ? data.days : [];
  const maxRev = Math.max(...days.map((d: any) => d.revenue || 0), 0.01);

  const pColor = (v: number) => v >= 0 ? "#059669" : "#dc2626";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Summary cards */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
          {[
            { label: "本月累计收入", value: `$${(stats.month_revenue || 0).toFixed(2)}`, color: "#059669" },
            { label: "本月 API 成本", value: `$${(stats.month_cost || 0).toFixed(2)}`, color: "#dc2626" },
            { label: "本月净利润",   value: `$${(stats.month_profit || 0).toFixed(2)}`, color: pColor(stats.month_profit) },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.08em", fontFamily: M, marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 600, color, fontFamily: M, lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Area chart */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.1em", fontFamily: M }}>30 天收入趋势</div>
          <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: M }}>
            ${days.reduce((s: number, d: any) => s + (d.revenue || 0), 0).toFixed(2)} 合计
          </span>
        </div>
        {days.length === 0 ? (
          <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#c9d0db", fontSize: 11, fontFamily: M }}>暂无数据</div>
        ) : (
          <div style={{ position: "relative" }}>
            {/* Y axis labels */}
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {[maxRev, maxRev / 2, 0].map(v => (
                <span key={v} style={{ fontSize: 9, color: "#c9d0db", fontFamily: M }}>${v.toFixed(0)}</span>
              ))}
            </div>
            <div style={{ marginLeft: 32 }}>
              <svg width="100%" height="100" viewBox={`0 0 ${days.length * 14} 80`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#378ADD" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#378ADD" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const pts = days.map((d: any, i: number) => {
                    const x = i * 14 + 7;
                    const y = 72 - ((d.revenue || 0) / maxRev) * 64;
                    return `${x},${y}`;
                  });
                  const linePts = pts.join(" ");
                  const areaPts = `${days[0] ? 7 : 0},72 ${linePts} ${(days.length - 1) * 14 + 7},72`;
                  return (
                    <>
                      <polygon points={areaPts} fill="url(#areaGrad)" />
                      <polyline points={linePts} fill="none" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      {days.map((d: any, i: number) => {
                        const x = i * 14 + 7;
                        const y = 72 - ((d.revenue || 0) / maxRev) * 64;
                        return (d.revenue || 0) > 0 ? <circle key={i} cx={x} cy={y} r="2" fill="#378ADD" /> : null;
                      })}
                    </>
                  );
                })()}
              </svg>
              {/* X labels - show every 5 */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                {days.filter((_: any, i: number) => i % 5 === 0 || i === days.length - 1).map((d: any) => (
                  <span key={d.date} style={{ fontSize: 9, color: "#c9d0db", fontFamily: M }}>{d.date?.slice(4) || ""}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Daily breakdown */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.07)", fontSize: 10, color: "#9ca3af", letterSpacing: "0.1em", fontFamily: M }}>每日明细</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 80px", padding: "8px 18px", background: "#f9fafb", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          {["日期", "收入", "成本", "净利润", "毛利率"].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.06em", fontFamily: M }}>{h}</span>
          ))}
        </div>
        {days.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: 12, fontFamily: M }}>暂无数据</div>
        ) : [...days].reverse().map((d: any, i: number) => {
          const profit = (d.revenue || 0) - (d.cost || 0);
          const margin = d.revenue > 0 ? ((profit / d.revenue) * 100).toFixed(1) : "—";
          return (
            <div key={d.date} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 80px", padding: "10px 18px", borderBottom: i < days.length - 1 ? "1px solid #f3f4f6" : "none", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#0d1117", fontFamily: M }}>{d.date}</span>
              <span style={{ fontSize: 11, color: "#059669", fontFamily: M, fontWeight: 600 }}>+${(d.revenue || 0).toFixed(2)}</span>
              <span style={{ fontSize: 11, color: "#dc2626", fontFamily: M }}>-${(d.cost || 0).toFixed(2)}</span>
              <span style={{ fontSize: 11, color: pColor(profit), fontFamily: M, fontWeight: 600 }}>${profit.toFixed(2)}</span>
              <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: M }}>{margin}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
