"use client";
import { useRouter, usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";

const NAV = [
  { id: "overview",      label: "概览",    icon: "ti-layout-dashboard", href: "/admin" },
  { id: "users",         label: "用户管理", icon: "ti-users",            href: "/admin/users" },
  { id: "subscriptions", label: "订阅补单", icon: "ti-receipt",          href: "/admin/subscriptions" },
  { id: "finance",       label: "财务中心",  icon: "ti-chart-line",       href: "/admin/finance" },
  { id: "developers",    label: "开发者管理", icon: "ti-code",            href: "/admin/developers" },
  { id: "logs",          label: "操作日志",  icon: "ti-list-details",     href: "/admin/logs" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();

  const displayName = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "Admin";
  const initials = displayName[0]?.toUpperCase() || "A";

  const activeLabel = NAV.find(n => pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href)))?.label || "概览";

  return (
    <div style={{ height: "100vh", display: "flex", fontFamily: "JetBrains Mono, monospace", background: "var(--bg)", overflow: "hidden" }}>
      <style>{`
        :root {
          --bg: #f5f6f8;
          --sidebar-bg: #ffffff;
          --border: rgba(0,0,0,0.07);
          --text-primary: #0d1117;
          --text-secondary: #6b7280;
          --text-tertiary: #9ca3af;
          --active-bg: #eff4ff;
          --active-color: #1a56db;
          --card-bg: #ffffff;
          --hover-bg: #f3f4f6;
        }
        .nav-btn { transition: background 0.12s; }
        .nav-btn:hover { background: var(--hover-bg) !important; }
        .nav-btn.active { background: var(--active-bg) !important; }
        .icon-btn:hover { background: var(--hover-bg) !important; }
        input, select { outline: none; }
        input:focus { border-color: #1a56db !important; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 216, background: "var(--sidebar-bg)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* Brand */}
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/themis-logo.png" alt="Themis" style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.06em" }}>THEMIS</div>
              <div style={{ fontSize: 9, color: "var(--text-tertiary)", letterSpacing: "0.04em" }}>Admin Console</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)", letterSpacing: "0.14em", padding: "0 8px", marginBottom: 6 }}>MAIN</div>
          {NAV.map(({ id, label, icon, href }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <button key={id} onClick={() => router.push(href)}
                className={`nav-btn${active ? " active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", background: active ? "var(--active-bg)" : "none", color: active ? "var(--active-color)" : "var(--text-secondary)", fontSize: 12, fontWeight: active ? 600 : 400, fontFamily: "JetBrains Mono, monospace", cursor: "pointer", textAlign: "left", marginBottom: 2 }}>
                <i className={`ti ${icon}`} style={{ fontSize: 15, width: 16, textAlign: "center", flexShrink: 0, color: active ? "var(--active-color)" : "var(--text-tertiary)" }} />
                {label}
                {active && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "var(--active-color)", flexShrink: 0 }} />}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#eff4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#1a56db", flexShrink: 0 }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
              <div style={{ fontSize: 9, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.primaryEmailAddress?.emailAddress}</div>
            </div>
          </div>
          <button onClick={() => router.push("/dashboard")}
            className="icon-btn"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer", fontFamily: "JetBrains Mono, monospace", padding: "4px 6px", borderRadius: 6, width: "100%", marginBottom: 2 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 13 }} />
            返回控制台
          </button>
          <button onClick={() => signOut(() => router.push("/"))}
            className="icon-btn"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer", fontFamily: "JetBrains Mono, monospace", padding: "4px 6px", borderRadius: 6, width: "100%" }}>
            <i className="ti ti-logout" style={{ fontSize: 13 }} />
            退出登录
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
        <div style={{ height: 50, background: "#fff", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{activeLabel}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#1a56db", background: "#eff4ff", border: "1px solid #c3d9f8", padding: "2px 8px", borderRadius: 4, letterSpacing: "0.06em" }}>ADMIN</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{displayName}</span>
          </div>
        </div>
        <div style={{ flex: 1, padding: "24px 28px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
