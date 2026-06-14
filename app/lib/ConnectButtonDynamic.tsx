"use client";
import dynamic from "next/dynamic";

export const ConnectButtonDynamic = dynamic(
  () => import("@rainbow-me/rainbowkit").then(m => m.ConnectButton),
  { ssr: false, loading: () => <button style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 11, fontWeight: 700, color: "#fff", background: "#0047cc", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "wait", opacity: 0.6 }}>Loading…</button> }
);
