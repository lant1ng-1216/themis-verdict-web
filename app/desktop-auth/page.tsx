"use client";
import { useEffect } from "react";
import { useUser, SignIn } from "@clerk/nextjs";

const M = "JetBrains Mono, monospace";

export default function DesktopAuthPage() {
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    // 已登录 → 获取 Clerk JWT token 然后跳回桌面端
    const redirect = async () => {
      try {
        // @ts-ignore — clerk session token
        const token = await (window as any).Clerk?.session?.getToken();
        const params = new URLSearchParams({
          token:  token || "",
          userId: user.id,
          email:  user.primaryEmailAddress?.emailAddress || "",
        });
        // 跳转回 Electron 自定义协议
        window.location.href = `themis://auth?${params.toString()}`;
      } catch (e) {
        console.error("desktop-auth redirect error:", e);
      }
    };

    // 短暂延迟确保 Clerk session 完全就绪
    const t = setTimeout(redirect, 800);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, user]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f0f4fb",
      backgroundImage: "linear-gradient(rgba(226,232,244,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,244,0.5) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: M, gap: 28,
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/themis-logo.png" alt="Themis" style={{ width: 32, height: 32, objectFit: "contain" }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: "#0a1a3a", letterSpacing: "0.15em" }}>
          THEMIS<span style={{ color: "#0047cc" }}>·</span>AGENT
        </span>
      </div>

      {isSignedIn ? (
        /* 已登录 — 显示跳转中 */
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, border: "3px solid #0047cc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 11, color: "rgba(10,26,58,0.5)", letterSpacing: "0.06em" }}>
            正在返回桌面端...
          </p>
        </div>
      ) : (
        /* 未登录 — 显示登录框 */
        <SignIn
          appearance={{
            variables: { colorPrimary: "#0047cc", fontFamily: M, borderRadius: "12px" },
            elements: {
              card: { boxShadow: "0 8px 40px rgba(0,20,80,0.10)", border: "1px solid rgba(0,71,204,0.1)" },
            },
          }}
          afterSignInUrl="/desktop-auth"
          signUpUrl="/sign-up"
        />
      )}

      <p style={{ fontSize: 9, color: "rgba(10,26,58,0.25)", letterSpacing: "0.08em" }}>
        登录后此页面会自动关闭并返回桌面端
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
