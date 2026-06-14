"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { SiteNav } from "../page";
import { useUser, SignInButton } from "@clerk/nextjs";

const M = "JetBrains Mono, monospace";
const API = process.env.NEXT_PUBLIC_AGENT_API || process.env.NEXT_PUBLIC_API_URL || "https://api.themisverdict.xyz";

// ── Chain config ──────────────────────────────────────────────────────────────
const BSC_TESTNET_CHAIN_ID = "0x61"; // 97
const CHALLENGE_CONTRACT   = "0x461C0F80AB3aC18401b0BdaBfa343750c30038fa";
const MIN_STAKE_BNB        = 0.01;

// ABI minimal for stake + getPool
const CHALLENGE_ABI = [
  "function stake(bytes32 verdictId, uint8 side) payable",
  "function claim(bytes32 verdictId)",
  "function getPool(bytes32 verdictId) view returns (uint256 totalSupport, uint256 totalChallenge, uint256 deadline, uint8 outcome, bool resolved)",
  "function getStake(bytes32 verdictId, address user) view returns (uint256 amount, uint8 side, bool claimed, uint256 expectedPayout)",
];

// ── Types ─────────────────────────────────────────────────────────────────────
type VerdictStatus = "ACTIVE" | "VERIFIED" | "INVALIDATED";
type Direction = "BULLISH" | "BEARISH";
type PostType = "verdict" | "user";
type PoolOutcome = "PENDING" | "SUPPORT_WIN" | "CHALLENGE_WIN" | "DRAW";

interface Dimension { name: string; signal: "bullish"|"bearish"|"neutral"; weight: number; note: string; }
interface Comment { id: string; author: string; initials: string; color: string; imageUrl?: string; walletAddress?: string; text: string; timestamp: number; likes: number; liked: boolean; }

interface PoolState {
  totalSupportBnb: number;
  totalChallengeBnb: number;
  totalBnb: number;
  supportPct: number;
  challengePct: number;
  deadline: number;        // unix seconds
  outcome: PoolOutcome;
  resolved: boolean;
  supporterCount: number;
  challengerCount: number;
}

interface Post {
  id: string; type: PostType;
  symbol?: string; direction?: Direction; confidence?: number;
  entry?: number; target1?: number; target2?: number; stoploss?: number;
  regime?: string; status?: VerdictStatus; pnl?: number;
  invalidation?: string[]; dimensions?: Dimension[];
  betFor?: number; betAgainst?: number; betCount?: number;
  author?: string; initials?: string; avatarColor?: string; imageUrl?: string; walletAddress?: string;
  text?: string; likes?: number; liked?: boolean;
  linkedVerdictId?: string;
  timestamp: number; comments: Comment[];
  txHash?: string; bscscanUrl?: string; chainNetwork?: string; chainResolved?: boolean; chainOutcome?: string;
  pool?: PoolState;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function walletGradient(addr: string): string {
  const h1 = addr.slice(2, 8); const h2 = addr.slice(8, 14);
  return `linear-gradient(135deg, #${h1}, #${h2})`;
}

function Avatar({ label, color, size = 38, imageUrl, walletAddress }: {
  label: string; color: string; size?: number; imageUrl?: string; walletAddress?: string;
}) {
  if (imageUrl) return <img src={imageUrl} alt={label} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  if (walletAddress && walletAddress.startsWith("0x") && walletAddress.length >= 14)
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: walletGradient(walletAddress), flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: M, fontSize: size * 0.26, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>{walletAddress.slice(2, 4).toUpperCase()}</span>
      </div>
    );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontFamily: M, fontSize: size * 0.32, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{label}</span>
    </div>
  );
}

function timeAgo(ts: number, lang: string) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60)   return lang === "zh" ? `${d}秒前` : `${d}s ago`;
  if (d < 3600) return lang === "zh" ? `${Math.floor(d/60)}分钟前` : `${Math.floor(d/60)}m ago`;
  return              lang === "zh" ? `${Math.floor(d/3600)}小时前` : `${Math.floor(d/3600)}h ago`;
}

function countdown(deadline: number, lang: string): string {
  const now  = Math.floor(Date.now() / 1000);
  const left = deadline - now;
  if (left <= 0) return lang === "zh" ? "已截止" : "Closed";
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function fmtBnb(v: number) { return v === 0 ? "0" : v.toFixed(4); }

const ST: Record<VerdictStatus, { color: string; bg: string; en: string; zh: string }> = {
  ACTIVE:      { color: "#0047cc", bg: "rgba(0,71,204,0.10)",  en: "ACTIVE",      zh: "进行中" },
  VERIFIED:    { color: "#059669", bg: "rgba(5,150,105,0.10)", en: "VERIFIED ✓",  zh: "已验证 ✓" },
  INVALIDATED: { color: "#dc2626", bg: "rgba(220,38,38,0.10)", en: "INVALIDATED", zh: "已失效" },
};

const OUTCOME_LABEL: Record<PoolOutcome, { en: string; zh: string; color: string }> = {
  PENDING:       { en: "PENDING",       zh: "待结算",  color: "#94a3b8" },
  SUPPORT_WIN:   { en: "SUPPORT WIN ✓", zh: "支持方赢 ✓", color: "#059669" },
  CHALLENGE_WIN: { en: "CHALLENGE WIN", zh: "质疑方赢", color: "#dc2626" },
  DRAW:          { en: "DRAW",          zh: "平局退款", color: "#f59e0b" },
};

// ── Wallet utils ──────────────────────────────────────────────────────────────
async function ensureBscTestnet(): Promise<boolean> {
  const eth = (window as any).ethereum;
  if (!eth) return false;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC_TESTNET_CHAIN_ID }] });
    return true;
  } catch (e: any) {
    if (e.code === 4902) {
      try {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: BSC_TESTNET_CHAIN_ID, chainName: "BSC Testnet", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"], blockExplorerUrls: ["https://testnet.bscscan.com/"] }],
        });
        return true;
      } catch { return false; }
    }
    return false;
  }
}

async function connectWallet(): Promise<string | null> {
  const eth = (window as any).ethereum;
  if (!eth) return null;
  try {
    const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
    return accounts[0] || null;
  } catch { return null; }
}

async function sendStakeTx(verdictId: string, side: 1 | 2, amountBnb: number): Promise<string> {
  const { ethers } = await import("ethers");
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer   = await provider.getSigner();
  const contract = new ethers.Contract(CHALLENGE_CONTRACT, CHALLENGE_ABI, signer);

  const vidBytes = ethers.encodeBytes32String(verdictId.slice(0, 31));
  const value    = ethers.parseEther(String(amountBnb));
  const tx       = await contract.stake(vidBytes, side, { value });
  const receipt  = await tx.wait();
  return receipt.hash;
}

async function sendClaimTx(verdictId: string): Promise<string> {
  const { ethers } = await import("ethers");
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer   = await provider.getSigner();
  const contract = new ethers.Contract(CHALLENGE_CONTRACT, CHALLENGE_ABI, signer);
  const vidBytes = ethers.encodeBytes32String(verdictId.slice(0, 31));
  const tx       = await contract.claim(vidBytes);
  const receipt  = await tx.wait();
  return receipt.hash;
}

// ── Stake Modal ───────────────────────────────────────────────────────────────
function StakeModal({ post, side, onClose, onSuccess, lang }: {
  post: Post; side: "support" | "challenge"; onClose: () => void;
  onSuccess: (txHash: string, amountBnb: number) => void; lang: string;
}) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const [amount, setAmount] = useState("0.01");
  const [step, setStep]     = useState<"input" | "confirm" | "pending" | "done" | "error">("input");
  const [txHash, setTxHash] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [wallet, setWallet] = useState<string | null>(null);

  const isSup      = side === "support";
  const dirColor   = isSup ? "#059669" : "#dc2626";
  const sideLabel  = isSup ? t("SUPPORT", "支持裁决") : t("CHALLENGE", "质疑裁决");
  const sideNum    = isSup ? 1 : 2;
  const amountNum  = parseFloat(amount) || 0;
  const valid      = amountNum >= MIN_STAKE_BNB;

  const pool = post.pool;
  const totalAfter     = (pool?.totalBnb || 0) + amountNum;
  const mySharePct     = totalAfter > 0 ? Math.round(amountNum / totalAfter * 100) : 0;
  const potentialWin   = pool ? (() => {
    const loserPool = isSup ? pool.totalChallengeBnb : pool.totalSupportBnb;
    const winnerPool = (isSup ? pool.totalSupportBnb : pool.totalChallengeBnb) + amountNum;
    const net = (pool.totalBnb + amountNum) * 0.95;
    return winnerPool > 0 ? Math.round(amountNum / winnerPool * net * 10000) / 10000 : amountNum;
  })() : amountNum;

  async function handleStake() {
    setStep("confirm");
    const addr = await connectWallet();
    if (!addr) { setErrMsg(t("MetaMask not found or rejected", "未找到 MetaMask 或用户拒绝")); setStep("error"); return; }
    setWallet(addr);
    const ok = await ensureBscTestnet();
    if (!ok) { setErrMsg(t("Please switch to BSC Testnet", "请切换到 BSC Testnet")); setStep("error"); return; }
    setStep("pending");
    try {
      const hash = await sendStakeTx(post.id, sideNum, amountNum);
      setTxHash(hash);
      // Sync to backend
      await fetch(`${API}/api/challenge/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict_id: post.id, user_address: addr, side, amount_bnb: amountNum, tx_hash: hash }),
      }).catch(() => {});
      setStep("done");
      onSuccess(hash, amountNum);
    } catch (e: any) {
      setErrMsg(e?.reason || e?.message || "Transaction failed");
      setStep("error");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,26,58,0.55)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={step !== "pending" ? onClose : undefined}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "32px 28px", width: 420, maxWidth: "94vw", boxShadow: "0 32px 80px rgba(0,20,80,0.18)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: M, fontSize: 16, fontWeight: 800, color: "#0a1a3a", marginBottom: 4 }}>
              {sideLabel}
            </div>
            <div style={{ fontFamily: M, fontSize: 10, color: "#94a3b8" }}>
              {post.symbol} · {t("Verdict Challenge", "裁决质押")}
            </div>
          </div>
          <div style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: dirColor, background: `${dirColor}12`, border: `1.5px solid ${dirColor}28`, padding: "5px 12px", borderRadius: 20 }}>
            {isSup ? "↑" : "↓"} {post.direction}
          </div>
        </div>

        {step === "input" && (
          <>
            {/* Pool preview */}
            {pool && (
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", marginBottom: 20, border: "1px solid #f0f2f6" }}>
                <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 10 }}>{t("CURRENT POOL", "当前质押池")}</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", marginBottom: 3 }}>{t("SUPPORT", "支持")}</div>
                    <div style={{ fontFamily: M, fontSize: 14, fontWeight: 800, color: "#059669" }}>{fmtBnb(pool.totalSupportBnb)} BNB</div>
                    <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8" }}>{pool.supporterCount} {t("stakers", "人")}</div>
                  </div>
                  <div style={{ width: 1, background: "#f0f2f6" }} />
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", marginBottom: 3 }}>{t("CHALLENGE", "质疑")}</div>
                    <div style={{ fontFamily: M, fontSize: 14, fontWeight: 800, color: "#dc2626" }}>{fmtBnb(pool.totalChallengeBnb)} BNB</div>
                    <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8" }}>{pool.challengerCount} {t("stakers", "人")}</div>
                  </div>
                </div>
                {pool.deadline > 0 && (
                  <div style={{ fontFamily: M, fontSize: 8, color: "#f59e0b", textAlign: "center" }}>
                    ⏱ {t("Closes in", "质押截止")} {countdown(pool.deadline, lang)}
                  </div>
                )}
              </div>
            )}

            {/* Amount input */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 8 }}>{t("STAKE AMOUNT (BNB)", "质押金额 (BNB)")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: `1.5px solid ${valid ? "#0047cc" : "#edf0f4"}`, borderRadius: 10, padding: "10px 14px" }}>
                <input
                  type="number" min="0.01" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ flex: 1, fontFamily: M, fontSize: 18, fontWeight: 800, color: "#0a1a3a", background: "none", border: "none", outline: "none" }} />
                <span style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>BNB</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[0.01, 0.05, 0.1, 0.5].map(v => (
                  <button key={v} onClick={() => setAmount(String(v))}
                    style={{ flex: 1, fontFamily: M, fontSize: 9, fontWeight: 700, color: amount === String(v) ? "#fff" : "#64748b", background: amount === String(v) ? "#0047cc" : "#f1f5f9", border: "none", borderRadius: 6, padding: "6px 0", cursor: "pointer" }}>
                    {v}
                  </button>
                ))}
              </div>
              {!valid && amountNum > 0 && (
                <div style={{ fontFamily: M, fontSize: 9, color: "#dc2626", marginTop: 6 }}>
                  {t(`Minimum stake is ${MIN_STAKE_BNB} BNB`, `最低质押 ${MIN_STAKE_BNB} BNB`)}
                </div>
              )}
            </div>

            {/* Payout preview */}
            {valid && (
              <div style={{ background: `${dirColor}08`, border: `1px solid ${dirColor}20`, borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: M, fontSize: 9, color: "#94a3b8" }}>{t("Pool share (if you win)", "预计奖池占比（若赢）")}</span>
                  <span style={{ fontFamily: M, fontSize: 11, fontWeight: 700, color: "#0a1a3a" }}>{mySharePct}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: M, fontSize: 9, color: "#94a3b8" }}>{t("Est. payout (if you win)", "预计收益（若赢）")}</span>
                  <span style={{ fontFamily: M, fontSize: 11, fontWeight: 800, color: dirColor }}>≈ {fmtBnb(potentialWin)} BNB</span>
                </div>
                <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", marginTop: 8, borderTop: "1px solid #f0f2f6", paddingTop: 8 }}>
                  {t("Platform fee: 5%. Settlement: 24H after verdict.", "平台手续费 5%，裁决生成后 24H 自动结算。")}
                </div>
              </div>
            )}

            <button onClick={handleStake} disabled={!valid}
              style={{ width: "100%", fontFamily: M, fontSize: 12, fontWeight: 700, color: "#fff", background: valid ? dirColor : "#cbd5e1", border: "none", borderRadius: 10, padding: "13px", cursor: valid ? "pointer" : "not-allowed", marginBottom: 8 }}>
              {isSup ? t("↑ Confirm Support", "↑ 确认支持") : t("↓ Confirm Challenge", "↓ 确认质疑")}
            </button>
            <button onClick={onClose}
              style={{ width: "100%", fontFamily: M, fontSize: 11, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: "6px" }}>
              {t("Cancel", "取消")}
            </button>
          </>
        )}

        {step === "confirm" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontFamily: M, fontSize: 13, color: "#0a1a3a", marginBottom: 8 }}>{t("Connecting wallet…", "连接钱包中…")}</div>
            <div style={{ fontFamily: M, fontSize: 10, color: "#94a3b8" }}>{t("Please approve in MetaMask", "请在 MetaMask 中确认")}</div>
          </div>
        )}

        {step === "pending" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 48, height: 48, border: `4px solid ${dirColor}20`, borderTop: `4px solid ${dirColor}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: "#0a1a3a", marginBottom: 8 }}>
              {t("Transaction pending…", "交易进行中…")}
            </div>
            <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8" }}>
              {t("Please wait for BSC confirmation", "等待 BSC 网络确认，请勿关闭")}
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none"><polyline points="4,12 9,17 20,6" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontFamily: M, fontSize: 15, fontWeight: 800, color: "#0a1a3a", marginBottom: 8 }}>
              {t("Staked successfully!", "质押成功！")}
            </div>
            <div style={{ fontFamily: M, fontSize: 10, color: "#94a3b8", marginBottom: 20 }}>
              {amountNum} BNB · {t("Settlement in 24H", "24H 后自动结算")}
            </div>
            <a href={`https://testnet.bscscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: M, fontSize: 9, color: "#f59e0b", textDecoration: "none", display: "block", marginBottom: 16 }}>
              ⬡ {t("View on BscScan →", "在 BscScan 查看 →")}
            </a>
            <button onClick={onClose}
              style={{ width: "100%", fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: "#0047cc", border: "none", borderRadius: 9, padding: "11px", cursor: "pointer" }}>
              {t("Done", "完成")}
            </button>
          </div>
        )}

        {step === "error" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none"><line x1="6" y1="6" x2="18" y2="18" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/><line x1="18" y1="6" x2="6" y2="18" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/></svg>
            </div>
            <div style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>{t("Transaction failed", "交易失败")}</div>
            <div style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", marginBottom: 20, lineHeight: 1.6 }}>{errMsg}</div>
            <button onClick={() => setStep("input")}
              style={{ width: "100%", fontFamily: M, fontSize: 11, fontWeight: 700, color: "#fff", background: "#dc2626", border: "none", borderRadius: 9, padding: "11px", cursor: "pointer" }}>
              {t("Try again", "重试")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compose Box ───────────────────────────────────────────────────────────────
function ComposeBox({ onSubmit, isSignedIn, lang, userImageUrl, userWallet, userHandle }: {
  onSubmit: (p: Post) => void; isSignedIn: boolean; lang: string;
  userImageUrl?: string; userWallet?: string; userHandle: string;
}) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const [text, setText] = useState("");
  const [sym, setSym]   = useState("");
  const [dir, setDir]   = useState<Direction | "">("");
  const [open, setOpen] = useState(false);

  function submit() {
    if (!text.trim()) return;
    onSubmit({ id: `u-${Date.now()}`, type: "user", author: userHandle, initials: userHandle.slice(0, 2).toUpperCase(), avatarColor: "#0047cc", imageUrl: userImageUrl, walletAddress: userWallet, text: text.trim(), symbol: sym || undefined, direction: (dir || undefined) as Direction | undefined, timestamp: Date.now(), likes: 0, liked: false, comments: [] });
    setText(""); setSym(""); setDir(""); setOpen(false);
  }

  if (!isSignedIn) return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid #f0f2f6" }}>
      <Avatar label="?" color="#cbd5e1" />
      <SignInButton mode="modal">
        <div style={{ flex: 1, fontFamily: M, fontSize: 12, color: "#94a3b8", cursor: "pointer", padding: "10px 16px", background: "#f8fafc", border: "1px solid #edf0f4", borderRadius: 24 }}>
          {t("Sign in to share your analysis…", "登录后分享你的市场分析…")}
        </div>
      </SignInButton>
    </div>
  );

  return (
    <div style={{ borderBottom: "1px solid #f0f2f6", padding: "14px 16px" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar label={userHandle.slice(0, 2).toUpperCase()} color="#0047cc" imageUrl={userImageUrl} walletAddress={userWallet} />
        <div style={{ flex: 1 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} onFocus={() => setOpen(true)}
            placeholder={t("Share your market analysis…", "分享你的市场分析…")}
            style={{ width: "100%", fontFamily: M, fontSize: 13, color: "#0a1a3a", background: "none", border: "none", outline: "none", resize: "none", lineHeight: 1.7, minHeight: open ? 80 : 42, paddingTop: 6, boxSizing: "border-box" }} />
          {open && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, paddingTop: 10, borderTop: "1px solid #f0f2f6" }}>
              <select value={sym} onChange={e => setSym(e.target.value)} style={{ fontFamily: M, fontSize: 9, color: "#64748b", background: "#f8fafc", border: "1px solid #edf0f4", borderRadius: 6, padding: "5px 10px", outline: "none" }}>
                <option value="">{t("Symbol", "币种")}</option>
                {["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={dir} onChange={e => setDir(e.target.value as Direction | "")} style={{ fontFamily: M, fontSize: 9, color: "#64748b", background: "#f8fafc", border: "1px solid #edf0f4", borderRadius: 6, padding: "5px 10px", outline: "none" }}>
                <option value="">{t("Direction", "方向")}</option>
                <option value="BULLISH">↑ BULLISH</option>
                <option value="BEARISH">↓ BEARISH</option>
              </select>
              <div style={{ flex: 1 }} />
              <button onClick={() => { setOpen(false); setText(""); }} style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>{t("Cancel", "取消")}</button>
              <button onClick={submit} disabled={!text.trim()} style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "#fff", background: text.trim() ? "#0047cc" : "#cbd5e1", border: "none", borderRadius: 20, padding: "7px 20px", cursor: text.trim() ? "pointer" : "not-allowed" }}>{t("POST", "发布")}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Comment input ─────────────────────────────────────────────────────────────
function CommentInput({ onSubmit, lang, userImageUrl, userWallet, userHandle }: {
  onSubmit: (text: string) => void; lang: string;
  userImageUrl?: string; userWallet?: string; userHandle: string;
}) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
      <Avatar label={userHandle.slice(0, 2).toUpperCase()} color="#0047cc" imageUrl={userImageUrl} walletAddress={userWallet} size={28} />
      <input value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onSubmit(val); setVal(""); } }}
        placeholder={t("Reply…", "回复…")}
        style={{ flex: 1, fontFamily: M, fontSize: 12, color: "#0a1a3a", background: "#f8fafc", border: "1px solid #edf0f4", borderRadius: 20, padding: "8px 16px", outline: "none" }} />
    </div>
  );
}

// ── Verdict Post ──────────────────────────────────────────────────────────────
function VerdictPost({ post, expanded, onToggle, onStake, onClaim, onComment, isSignedIn, lang, userImageUrl, userWallet, userHandle }: {
  post: Post; expanded: boolean; onToggle: () => void;
  onStake: (id: string, side: "support" | "challenge") => void;
  onClaim: (id: string) => void;
  onComment: (id: string, text: string) => void;
  isSignedIn: boolean; lang: string;
  userImageUrl?: string; userWallet?: string; userHandle: string;
}) {
  const t   = (en: string, zh: string) => lang === "zh" ? zh : en;
  const st  = ST[post.status!];
  const dc  = post.direction === "BULLISH" ? "#059669" : "#dc2626";
  const [showComments, setShowComments] = useState(false);
  const [tick, setTick] = useState(0);

  // Countdown re-render every 30s
  useEffect(() => {
    if (!post.pool?.deadline) return;
    const id = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(id);
  }, [post.pool?.deadline]);

  const pool        = post.pool;
  const hasPool     = pool && pool.totalBnb > 0;
  const isActive    = post.status === "ACTIVE";
  const isResolved  = pool?.resolved;
  const outcome     = pool?.outcome || "PENDING";
  const outcomeInfo = OUTCOME_LABEL[outcome];

  return (
    <article style={{ borderBottom: "1px solid #f0f2f6", padding: "16px 16px" }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0a1a3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>⚖</span>
          </div>
          {(expanded || showComments) && post.comments.length > 0 &&
            <div style={{ width: 2, flex: 1, background: "#f0f2f6", marginTop: 6, borderRadius: 1 }} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: M, fontSize: 13, fontWeight: 800, color: "#0a1a3a" }}>Themis</span>
            <span style={{ fontFamily: M, fontSize: 11, color: "#94a3b8" }}>@themis_official</span>
            <span style={{ color: "#d1d5db" }}>·</span>
            <span style={{ fontFamily: M, fontSize: 11, color: "#94a3b8" }}>{timeAgo(post.timestamp, lang)}</span>
            <div style={{ fontFamily: M, fontSize: 8, fontWeight: 800, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.18)", padding: "2px 8px", borderRadius: 4, letterSpacing: "0.12em", marginLeft: 4 }}>
              {t("OFFICIAL", "官方")}
            </div>
            {post.txHash && (
              <a href={post.bscscanUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                style={{ fontFamily: M, fontSize: 8, fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", padding: "2px 7px", borderRadius: 4, letterSpacing: "0.1em", textDecoration: "none" }}>
                ⬡ ON-CHAIN
              </a>
            )}
          </div>

          {/* Card */}
          <div onClick={onToggle} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: M, fontSize: 18, fontWeight: 800, color: "#0a1a3a", letterSpacing: "-0.02em" }}>{post.symbol}</span>
              <span style={{ fontFamily: M, fontSize: 10, fontWeight: 800, color: dc, background: `${dc}12`, border: `1.5px solid ${dc}28`, padding: "3px 10px", borderRadius: 5 }}>
                {post.direction === "BULLISH" ? "↑" : "↓"} {lang === "zh" ? (post.direction === "BULLISH" ? "看多" : "看空") : post.direction}
              </span>
              <span style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, padding: "3px 9px", borderRadius: 5 }}>
                {t(st.en, st.zh)}
              </span>
              {isResolved && (
                <span style={{ fontFamily: M, fontSize: 9, fontWeight: 800, color: outcomeInfo.color, background: `${outcomeInfo.color}12`, border: `1px solid ${outcomeInfo.color}28`, padding: "2px 8px", borderRadius: 4 }}>
                  {t(outcomeInfo.en, outcomeInfo.zh)}
                </span>
              )}
              {post.pnl !== undefined && (
                <span style={{ fontFamily: M, fontSize: 12, fontWeight: 800, color: post.pnl >= 0 ? "#059669" : "#dc2626", marginLeft: "auto" }}>
                  {post.pnl >= 0 ? "+" : ""}{post.pnl}%
                </span>
              )}
            </div>

            {/* Confidence */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", letterSpacing: "0.1em" }}>{t("CONFIDENCE", "置信度")}</span>
                <span style={{ fontFamily: M, fontSize: 11, fontWeight: 800, color: post.confidence! >= 70 ? "#059669" : "#f59e0b" }}>{post.confidence}%</span>
              </div>
              <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${post.confidence}%`, background: post.confidence! >= 70 ? "linear-gradient(90deg,#059669,#10b981)" : "linear-gradient(90deg,#f59e0b,#fbbf24)", borderRadius: 2 }} />
              </div>
            </div>

            {/* Price grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
              {[
                { l: t("ENTRY", "入场"),   v: `$${Number(post.entry).toLocaleString()}`,   c: "#475569" },
                { l: t("TARGET", "目标"),  v: `$${Number(post.target1).toLocaleString()}`, c: "#059669" },
                { l: t("STOP", "止损"),    v: `$${Number(post.stoploss).toLocaleString()}`, c: "#dc2626" },
                { l: t("REGIME", "状态"),  v: post.regime || "—",                           c: "#f59e0b" },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px", border: "1px solid #f0f2f6" }}>
                  <div style={{ fontFamily: M, fontSize: 7, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 3 }}>{l}</div>
                  <div style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: c, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Expanded details */}
          {expanded && post.dimensions && post.dimensions.length > 0 && (
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px", marginBottom: 12, border: "1px solid #f0f2f6" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 10 }}>{t("7-DIMENSION EVIDENCE", "7维度证据")}</div>
                  {post.dimensions.map(d => {
                    const dc2 = d.signal === "bullish" ? "#059669" : d.signal === "bearish" ? "#dc2626" : "#94a3b8";
                    return (
                      <div key={d.name} style={{ marginBottom: 9 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: dc2, flexShrink: 0 }} />
                            <span style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#0a1a3a" }}>{d.name}</span>
                          </div>
                          <span style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: dc2 }}>{(d.weight * 100).toFixed(0)}%</span>
                        </div>
                        <div style={{ height: 3, background: "#edf0f4", borderRadius: 2, marginLeft: 12 }}>
                          <div style={{ height: "100%", width: `${d.weight * 100}%`, background: dc2, borderRadius: 2 }} />
                        </div>
                        <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", marginLeft: 12, marginTop: 2 }}>{d.note}</div>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 10 }}>{t("INVALIDATION CONDITIONS", "失效条件")}</div>
                  {(post.invalidation || []).map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, padding: "8px 10px", background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.12)", borderRadius: 7 }}>
                      <span style={{ color: "#dc2626", fontSize: 9, flexShrink: 0, marginTop: 1 }}>✗</span>
                      <span style={{ fontFamily: M, fontSize: 9, color: "#64748b", lineHeight: 1.6 }}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stake pool bar */}
          <div style={{ marginBottom: 10 }}>
            {hasPool ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", letterSpacing: "0.08em" }}>{t("STAKE POOL", "质押池")}</span>
                  <span style={{ fontFamily: M, fontSize: 8, color: "#94a3b8" }}>
                    {fmtBnb(pool!.totalBnb)} BNB · {pool!.supporterCount + pool!.challengerCount} {t("stakers", "人")}
                    {pool!.deadline > 0 && !pool!.resolved && ` · ⏱ ${countdown(pool!.deadline, lang)}`}
                  </span>
                </div>
                <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${pool!.supportPct}%`, background: "linear-gradient(90deg,#059669,#10b981)", transition: "width 0.4s" }} />
                  <div style={{ flex: 1, background: "#fecaca" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontFamily: M, fontSize: 8, color: "#059669", fontWeight: 700 }}>↑ {t("Support", "支持")} {fmtBnb(pool!.totalSupportBnb)} BNB ({pool!.supportPct}%)</span>
                  <span style={{ fontFamily: M, fontSize: 8, color: "#dc2626", fontWeight: 700 }}>{fmtBnb(pool!.totalChallengeBnb)} BNB ({pool!.challengePct}%) {t("Challenge", "质疑")} ↓</span>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${post.betFor || 50}%`, background: "linear-gradient(90deg,#059669,#10b981)" }} />
                  <div style={{ flex: 1, background: "#fecaca" }} />
                </div>
                <span style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#059669", minWidth: 36 }}>↑{post.betFor || 50}%</span>
                <span style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#dc2626", minWidth: 36 }}>↓{post.betAgainst || 50}%</span>
                <span style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", whiteSpace: "nowrap" }}>{post.betCount || 0} {t("votes", "票")}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {isActive && !isResolved && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {isSignedIn ? (
                <>
                  <button onClick={() => onStake(post.id, "support")}
                    style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#059669", background: "rgba(5,150,105,0.06)", border: "1.5px solid rgba(5,150,105,0.22)", borderRadius: 20, padding: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    ↑ {t("SUPPORT", "支持裁决")}
                  </button>
                  <button onClick={() => onStake(post.id, "challenge")}
                    style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: "#dc2626", background: "rgba(220,38,38,0.06)", border: "1.5px solid rgba(220,38,38,0.22)", borderRadius: 20, padding: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    ↓ {t("CHALLENGE", "质疑裁决")}
                  </button>
                </>
              ) : (
                <SignInButton mode="modal">
                  <button style={{ gridColumn: "span 2", fontFamily: M, fontSize: 9, fontWeight: 700, color: "#94a3b8", background: "#f8fafc", border: "1px solid #edf0f4", borderRadius: 20, padding: "10px", cursor: "pointer", width: "100%" }}>
                    {t("Sign in to stake on-chain", "登录后参与链上质押")}
                  </button>
                </SignInButton>
              )}
            </div>
          )}

          {/* Claim button (resolved) */}
          {isResolved && outcome !== "PENDING" && isSignedIn && (
            <div style={{ marginBottom: 12 }}>
              <button onClick={() => onClaim(post.id)}
                style={{ width: "100%", fontFamily: M, fontSize: 10, fontWeight: 700, color: "#fff", background: outcome === "DRAW" ? "#f59e0b" : "#059669", border: "none", borderRadius: 20, padding: "10px", cursor: "pointer" }}>
                {outcome === "DRAW" ? t("↩ Claim Refund", "↩ 领取退款") : t("🏆 Claim Reward", "🏆 领取奖励")}
              </button>
            </div>
          )}

          {/* Action row */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <button onClick={() => setShowComments(v => !v)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontFamily: M, fontSize: 11, color: showComments ? "#0047cc" : "#94a3b8", padding: 0 }}>
              <span style={{ fontSize: 14 }}>💬</span> {post.comments.length}
            </button>
            <button onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontFamily: M, fontSize: 10, color: expanded ? "#0047cc" : "#94a3b8", padding: 0 }}>
              {expanded ? t("▲ Collapse", "▲ 收起") : t("▼ Details", "▼ 详情")}
            </button>
          </div>

          {/* Comments */}
          {showComments && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0f2f6" }}>
              {post.comments.map(c => (
                <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <Avatar label={c.initials} color={c.color} imageUrl={c.imageUrl} walletAddress={c.walletAddress} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "#0a1a3a" }}>{c.author}</span>
                      <span style={{ fontFamily: M, fontSize: 9, color: "#94a3b8" }}>{timeAgo(c.timestamp, lang)}</span>
                    </div>
                    <p style={{ fontFamily: M, fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.6 }}>{c.text}</p>
                  </div>
                </div>
              ))}
              {isSignedIn && <CommentInput onSubmit={text => onComment(post.id, text)} lang={lang} userImageUrl={userImageUrl} userWallet={userWallet} userHandle={userHandle} />}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ── User Post ─────────────────────────────────────────────────────────────────
function UserPost({ post, onLike, onComment, isSignedIn, lang, userImageUrl, userWallet, userHandle }: {
  post: Post; onLike: (id: string) => void; onComment: (id: string, text: string) => void;
  isSignedIn: boolean; lang: string; userImageUrl?: string; userWallet?: string; userHandle: string;
}) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const dirColor = post.direction === "BULLISH" ? "#059669" : post.direction === "BEARISH" ? "#dc2626" : undefined;
  const [showComments, setShowComments] = useState(false);

  return (
    <article style={{ borderBottom: "1px solid #f0f2f6", padding: "16px 16px" }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Avatar label={post.initials || "??"} color={post.avatarColor || "#94a3b8"} imageUrl={post.imageUrl} walletAddress={post.walletAddress} />
          {showComments && post.comments.length > 0 && <div style={{ width: 2, flex: 1, background: "#f0f2f6", marginTop: 6, borderRadius: 1 }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: M, fontSize: 13, fontWeight: 800, color: "#0a1a3a" }}>{post.author}</span>
            <span style={{ fontFamily: M, fontSize: 11, color: "#94a3b8" }}>@{post.author?.replace(/\s/g, "_").toLowerCase()}</span>
            <span style={{ color: "#d1d5db" }}>·</span>
            <span style={{ fontFamily: M, fontSize: 11, color: "#94a3b8" }}>{timeAgo(post.timestamp, lang)}</span>
            {post.symbol && <span style={{ fontFamily: M, fontSize: 8, color: "#64748b", background: "#f1f5f9", padding: "2px 7px", borderRadius: 4, marginLeft: 4 }}>{post.symbol}</span>}
            {dirColor && post.direction && <span style={{ fontFamily: M, fontSize: 8, fontWeight: 700, color: dirColor, background: `${dirColor}10`, padding: "2px 7px", borderRadius: 4 }}>{post.direction === "BULLISH" ? "↑" : "↓"} {post.direction}</span>}
            {post.linkedVerdictId && <span style={{ fontFamily: M, fontSize: 8, color: "#0047cc", background: "rgba(0,71,204,0.06)", border: "1px solid rgba(0,71,204,0.15)", padding: "2px 7px", borderRadius: 4 }}>↗ {t("verdict", "关联裁决")}</span>}
          </div>
          <p style={{ fontFamily: M, fontSize: 13, color: "#334155", lineHeight: 1.75, margin: "0 0 12px" }}>{post.text}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <button onClick={() => setShowComments(v => !v)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontFamily: M, fontSize: 11, color: showComments ? "#0047cc" : "#94a3b8", padding: 0 }}>
              <span style={{ fontSize: 14 }}>💬</span> {post.comments.length}
            </button>
            <button onClick={() => onLike(post.id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontFamily: M, fontSize: 11, color: post.liked ? "#dc2626" : "#94a3b8", fontWeight: post.liked ? 700 : 400, padding: 0 }}>
              <span style={{ fontSize: 14 }}>{post.liked ? "♥" : "♡"}</span> {post.likes}
            </button>
          </div>
          {showComments && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0f2f6" }}>
              {post.comments.map(c => (
                <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <Avatar label={c.initials} color={c.color} imageUrl={c.imageUrl} walletAddress={c.walletAddress} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "#0a1a3a" }}>{c.author}</span>
                      <span style={{ fontFamily: M, fontSize: 9, color: "#94a3b8" }}>{timeAgo(c.timestamp, lang)}</span>
                    </div>
                    <p style={{ fontFamily: M, fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.6 }}>{c.text}</p>
                  </div>
                </div>
              ))}
              {isSignedIn && <CommentInput onSubmit={text => onComment(post.id, text)} lang={lang} userImageUrl={userImageUrl} userWallet={userWallet} userHandle={userHandle} />}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Sidebars ──────────────────────────────────────────────────────────────────
function LeftPanel({ filterSym, filterDir, onSym, onDir, lang }: { filterSym: string; filterDir: string; onSym: (s: string) => void; onDir: (d: string) => void; lang: string }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #edf0f4", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f2f6" }}>
          <span style={{ fontFamily: M, fontSize: 11, fontWeight: 800, color: "#0a1a3a", letterSpacing: "0.08em" }}>{t("FILTER", "筛选")}</span>
        </div>
        <div style={{ padding: "10px 12px" }}>
          <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 6, paddingLeft: 4 }}>{t("SYMBOL", "币种")}</div>
          {["ALL", "BTC", "ETH", "BNB", "SOL"].map(sym => (
            <button key={sym} onClick={() => onSym(sym)}
              style={{ display: "block", width: "100%", textAlign: "left", fontFamily: M, fontSize: 12, fontWeight: filterSym === sym ? 800 : 400, color: filterSym === sym ? "#0047cc" : "#475569", background: filterSym === sym ? "rgba(0,71,204,0.07)" : "none", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", marginBottom: 2 }}>
              {filterSym === sym ? "● " : "○ "}{sym === "ALL" ? t("ALL", "全部") : sym}
            </button>
          ))}
          <div style={{ height: 1, background: "#f0f2f6", margin: "10px 4px" }} />
          <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 6, paddingLeft: 4 }}>{t("DIRECTION", "方向")}</div>
          {[{ v: "ALL", en: "All", zh: "全部" }, { v: "BULLISH", en: "↑ Bullish", zh: "↑ 看多" }, { v: "BEARISH", en: "↓ Bearish", zh: "↓ 看空" }].map(({ v, en, zh }) => (
            <button key={v} onClick={() => onDir(v)}
              style={{ display: "block", width: "100%", textAlign: "left", fontFamily: M, fontSize: 12, fontWeight: filterDir === v ? 800 : 400, color: filterDir === v ? (v === "BULLISH" ? "#059669" : v === "BEARISH" ? "#dc2626" : "#0047cc") : "#475569", background: filterDir === v ? "rgba(0,71,204,0.07)" : "none", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", marginBottom: 2 }}>
              {filterDir === v ? "● " : "○ "}{t(en, zh)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #edf0f4", padding: "14px 16px" }}>
        <div style={{ fontFamily: M, fontSize: 10, fontWeight: 800, color: "#0a1a3a", letterSpacing: "0.08em", marginBottom: 12 }}>{t("HOW IT WORKS", "玩法说明")}</div>
        {[
          { icon: "⚖", en: "Themis broadcasts hourly verdicts",    zh: "Themis 每小时广播裁决" },
          { icon: "↑↓", en: "Support or Challenge on-chain",       zh: "链上质押支持或质疑" },
          { icon: "⏱", en: "24H price verification",               zh: "24H 价格自动验证" },
          { icon: "🏆", en: "Winners share the loser pool (−5%)",  zh: "赢家瓜分输家池（抽水5%）" },
        ].map(({ icon, en, zh }) => (
          <div key={en} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 9 }}>
            <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            <span style={{ fontFamily: M, fontSize: 10, color: "#475569", lineHeight: 1.5 }}>{t(en, zh)}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8 }}>
          <span style={{ fontFamily: M, fontSize: 8, color: "#f59e0b" }}>⚠ {t("BSC Testnet only. Min stake: 0.01 BNB", "BSC 测试网，最低质押 0.01 BNB")}</span>
        </div>
      </div>
    </div>
  );
}

function RightPanel({ posts, lang }: { posts: Post[]; lang: string }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const verdicts = posts.filter(p => p.type === "verdict");
  const [stats, setStats] = useState<{ total: number; correct: number; rate: number | null; call_count: number } | null>(null);

  useEffect(() => {
    fetch(`${API}/api/accuracy/stats`).then(r => r.json()).then(d => {
      setStats({ total: d.overall?.total ?? 0, correct: d.overall?.correct ?? 0, rate: d.overall?.rate ?? null, call_count: d.call_count ?? 0 });
    }).catch(() => {});
  }, []);

  const accuracy   = stats?.rate ?? 0;
  const totalCount = stats?.call_count ?? verdicts.length;
  const totalBnbStaked = posts.filter(p => p.pool).reduce((s, p) => s + (p.pool?.totalBnb || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #edf0f4", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f2f6", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#059669", animation: "pulse 2s ease infinite" }} />
          <span style={{ fontFamily: M, fontSize: 11, fontWeight: 800, color: "#0a1a3a", letterSpacing: "0.08em" }}>{t("LIVE STATS", "实时数据")}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {[
            { l: t("Verdicts", "总裁决"),     v: totalCount,                                   c: "#0a1a3a" },
            { l: t("Verified", "已验证"),      v: stats?.correct ?? 0,                          c: "#059669" },
            { l: t("Win Rate", "胜率"),        v: accuracy != null ? `${accuracy}%` : "—",     c: Number(accuracy) >= 60 ? "#059669" : "#f59e0b" },
            { l: t("BNB Staked", "质押总量"),  v: `${fmtBnb(totalBnbStaked)} BNB`,             c: "#0047cc" },
          ].map(({ l, v, c }, i) => (
            <div key={l} style={{ padding: "14px 16px", borderRight: i % 2 === 0 ? "1px solid #f0f2f6" : "none", borderBottom: i < 2 ? "1px solid #f0f2f6" : "none" }}>
              <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 5 }}>{l.toUpperCase()}</div>
              <div style={{ fontFamily: M, fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #edf0f4", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f2f6" }}>
          <span style={{ fontFamily: M, fontSize: 11, fontWeight: 800, color: "#0a1a3a", letterSpacing: "0.08em" }}>{t("ACTIVE POOLS", "活跃质押池")}</span>
        </div>
        {verdicts.filter(v => v.pool && v.pool.totalBnb > 0).slice(0, 4).map((v, i, arr) => {
          const dc = v.direction === "BULLISH" ? "#059669" : "#dc2626";
          return (
            <div key={v.id} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #f0f2f6" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: M, fontSize: 12, fontWeight: 800, color: "#0a1a3a" }}>{v.symbol?.replace("/USDT", "")}</span>
                  <span style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: dc }}>{v.direction === "BULLISH" ? "↑" : "↓"}</span>
                </div>
                <span style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "#0047cc" }}>{fmtBnb(v.pool!.totalBnb)} BNB</span>
              </div>
              <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${v.pool!.supportPct}%`, background: "#059669" }} />
                <div style={{ flex: 1, background: "#fecaca" }} />
              </div>
            </div>
          );
        })}
        {verdicts.filter(v => v.pool && v.pool.totalBnb > 0).length === 0 && (
          <div style={{ padding: "20px 16px", fontFamily: M, fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
            {t("No active pools yet", "暂无活跃质押池")}
          </div>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #edf0f4", padding: "14px 16px" }}>
        <div style={{ fontFamily: M, fontSize: 10, fontWeight: 800, color: "#0a1a3a", letterSpacing: "0.08em", marginBottom: 10 }}>{t("CONTRACT", "合约信息")}</div>
        <div style={{ fontFamily: M, fontSize: 8, color: "#94a3b8", marginBottom: 4 }}>VerdictChallenge · BSC Testnet</div>
        <a href={`https://testnet.bscscan.com/address/${CHALLENGE_CONTRACT}`} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: M, fontSize: 8, color: "#f59e0b", textDecoration: "none", wordBreak: "break-all" }}>
          {CHALLENGE_CONTRACT}
        </a>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const { isSignedIn = false, user } = useUser();
  const [lang, setLang] = useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("themis_lang") || "en";
  });
  const handleLang = (l: string) => { setLang(l); localStorage.setItem("themis_lang", l); };

  const userImageUrl = user?.imageUrl || undefined;
  const userWallet   = (user?.web3Wallets?.[0]?.web3Wallet) || undefined;
  const userHandle   = user?.username || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "You";

  const [posts, setPosts]       = useState<Post[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterSym, setFilterSym] = useState("ALL");
  const [filterDir, setFilterDir] = useState("ALL");
  const [stakeModal, setStakeModal] = useState<{ postId: string; side: "support" | "challenge" } | null>(null);

  const fetchVerdicts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/accuracy/feed?limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      const verdicts: any[] = data.verdicts || data || [];
      if (!verdicts.length) return;

      const live: Post[] = verdicts.map((v: any, i: number) => {
        const dir    = (v.conclusion || v.direction || "BULLISH").toUpperCase();
        const mapped: Direction = dir === "SHORT" || dir === "BEARISH" ? "BEARISH" : "BULLISH";
        const status: VerdictStatus = v.outcome === "hit" ? "VERIFIED" : v.outcome === "miss" ? "INVALIDATED" : "ACTIVE";
        return {
          id: v.verdict_id || `v-${i}`,
          type: "verdict" as const,
          symbol: (v.symbol || "BTC").replace("/USDT", "") + "/USDT",
          direction: mapped,
          confidence: v.confidence || 0,
          entry: v.entry_price || v.price || 0,
          target1: v.target1 || 0,
          target2: v.target2 || 0,
          stoploss: v.stop_loss || v.stoploss || 0,
          regime: v.market_regime || v.regime || "",
          status,
          pnl: v.pnl,
          invalidation: v.invalidation_conditions || [],
          dimensions: (v.dimensions || []).map((d: any) => ({
            name: d.name || d.dimension, signal: (d.signal || "neutral").toLowerCase(),
            weight: d.weight || d.score || 0.5, note: d.note || d.reason || "",
          })),
          betFor: v.bet_for_pct ?? 50,
          betAgainst: v.bet_against_pct ?? 50,
          betCount: v.bet_count ?? 0,
          timestamp: v.timestamp ? new Date(v.timestamp).getTime() : Date.now() - i * 3600000,
          comments: [],
          txHash: v.tx_hash || undefined,
          bscscanUrl: v.tx_hash ? `https://testnet.bscscan.com/tx/${v.tx_hash}` : undefined,
          chainNetwork: v.chain_network || undefined,
          chainResolved: v.chain_resolved || false,
          chainOutcome: v.chain_outcome || undefined,
        };
      });

      setPosts(prev => {
        const userPosts = prev.filter(x => x.type === "user");
        // Preserve pool state from existing posts
        const poolMap = new Map(prev.filter(x => x.pool).map(x => [x.id, x.pool!]));
        return [...live.map(p => poolMap.has(p.id) ? { ...p, pool: poolMap.get(p.id)! } : p), ...userPosts].slice(0, 60);
      });
    } catch {}
  }, []);

  // Fetch pool state for all verdict posts
  const fetchPools = useCallback(async (postList: Post[]) => {
    const vPosts = postList.filter(p => p.type === "verdict");
    await Promise.allSettled(vPosts.map(async post => {
      try {
        const res = await fetch(`${API}/api/challenge/${post.id}/pool`);
        if (!res.ok) return;
        const data = await res.json();
        const pool: PoolState = {
          totalSupportBnb:   data.total_support_bnb   || 0,
          totalChallengeBnb: data.total_challenge_bnb || 0,
          totalBnb:          data.total_bnb           || 0,
          supportPct:        data.support_pct         || 0,
          challengePct:      data.challenge_pct       || 0,
          deadline:          data.deadline            || 0,
          outcome:           (data.outcome as PoolOutcome) || "PENDING",
          resolved:          data.resolved            || false,
          supporterCount:    data.supporter_count     || 0,
          challengerCount:   data.challenger_count    || 0,
        };
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, pool } : p));
      } catch {}
    }));
  }, []);

  useEffect(() => {
    fetchVerdicts();
    const id = setInterval(fetchVerdicts, 60000);
    return () => clearInterval(id);
  }, [fetchVerdicts]);

  useEffect(() => {
    if (posts.length > 0) fetchPools(posts);
  }, [posts.length, fetchPools]);

  function addPost(p: Post) { setPosts(prev => [p, ...prev]); }

  function handleLike(id: string) {
    setPosts(prev => prev.map(p => p.id !== id ? p : { ...p, liked: !p.liked, likes: (p.likes || 0) + (p.liked ? -1 : 1) }));
  }

  function handleComment(id: string, text: string) {
    const comment: Comment = { id: `c-${Date.now()}`, author: userHandle, initials: userHandle.slice(0, 2).toUpperCase(), color: "#0047cc", imageUrl: userImageUrl, walletAddress: userWallet, text, timestamp: Date.now(), likes: 0, liked: false };
    setPosts(prev => prev.map(p => p.id !== id ? p : { ...p, comments: [...p.comments, comment] }));
  }

  function handleStakeSuccess(postId: string, txHash: string, amountBnb: number) {
    const side = stakeModal?.side || "support";
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const pool = p.pool || { totalSupportBnb: 0, totalChallengeBnb: 0, totalBnb: 0, supportPct: 0, challengePct: 0, deadline: 0, outcome: "PENDING" as PoolOutcome, resolved: false, supporterCount: 0, challengerCount: 0 };
      const newPool = { ...pool };
      if (side === "support") { newPool.totalSupportBnb += amountBnb; newPool.supporterCount += 1; }
      else { newPool.totalChallengeBnb += amountBnb; newPool.challengerCount += 1; }
      newPool.totalBnb = newPool.totalSupportBnb + newPool.totalChallengeBnb;
      newPool.supportPct   = newPool.totalBnb > 0 ? Math.round(newPool.totalSupportBnb / newPool.totalBnb * 100) : 0;
      newPool.challengePct = 100 - newPool.supportPct;
      return { ...p, pool: newPool };
    }));
    setStakeModal(null);
    // Re-fetch pool after 5s to get onchain state
    setTimeout(() => fetchPools(posts), 5000);
  }

  async function handleClaim(postId: string) {
    try {
      const addr = await connectWallet();
      if (!addr) { alert("Please connect MetaMask"); return; }
      const ok = await ensureBscTestnet();
      if (!ok) { alert("Please switch to BSC Testnet"); return; }
      const hash = await sendClaimTx(postId);
      alert(`Claimed! Tx: ${hash}`);
      setTimeout(() => fetchPools(posts), 5000);
    } catch (e: any) {
      alert(e?.reason || e?.message || "Claim failed");
    }
  }

  const filtered = posts.filter(p => {
    if (filterSym !== "ALL" && p.symbol && !p.symbol.startsWith(filterSym)) return false;
    if (filterDir !== "ALL" && p.direction && p.direction !== filterDir) return false;
    return true;
  });

  const stakePost = stakeModal ? posts.find(p => p.id === stakeModal.postId) : null;
  const sharedProps = { isSignedIn, lang, userImageUrl, userWallet, userHandle };
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: M }}>
      <SiteNav lang={lang} onLangChange={handleLang} />

      {/* Stake modal */}
      {stakeModal && stakePost && (
        <StakeModal
          post={stakePost}
          side={stakeModal.side}
          lang={lang}
          onClose={() => setStakeModal(null)}
          onSuccess={(txHash, amountBnb) => handleStakeSuccess(stakeModal.postId, txHash, amountBnb)}
        />
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "72px 20px 60px", display: "grid", gridTemplateColumns: "220px 1fr 268px", gap: 0, boxSizing: "border-box" }}>
        {/* Left */}
        <div style={{ paddingRight: 16 }}>
          <div style={{ position: "sticky", top: 72 }}>
            <LeftPanel filterSym={filterSym} filterDir={filterDir} onSym={setFilterSym} onDir={setFilterDir} lang={lang} />
          </div>
        </div>

        {/* Feed */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #edf0f4", overflow: "hidden", minHeight: 600 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f2f6", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#059669", animation: "pulse 2s ease infinite" }} />
            <span style={{ fontFamily: M, fontSize: 11, fontWeight: 800, color: "#0a1a3a", letterSpacing: "0.08em" }}>{t("VERDICT FEED", "裁决广播")}</span>
            <span style={{ fontFamily: M, fontSize: 9, color: "#94a3b8", marginLeft: "auto" }}>
              {t("Stake BNB on BSC Testnet · 24H settlement", "BSC 测试网质押 · 24H 自动结算")}
            </span>
          </div>
          <ComposeBox onSubmit={addPost} {...sharedProps} />
          {filtered.length === 0 && (
            <div style={{ padding: "60px 24px", textAlign: "center", fontFamily: M, fontSize: 11, color: "#94a3b8" }}>
              {t("Loading verdicts…", "加载裁决中…")}
            </div>
          )}
          {filtered.map(post =>
            post.type === "verdict"
              ? <VerdictPost key={post.id} post={post} expanded={expanded === post.id}
                  onToggle={() => setExpanded(expanded === post.id ? null : post.id)}
                  onStake={(id, side) => setStakeModal({ postId: id, side })}
                  onClaim={handleClaim}
                  onComment={handleComment} {...sharedProps} />
              : <UserPost key={post.id} post={post} onLike={handleLike} onComment={handleComment} {...sharedProps} />
          )}
        </div>

        {/* Right */}
        <div style={{ paddingLeft: 16 }}>
          <div style={{ position: "sticky", top: 72 }}>
            <RightPanel posts={posts} lang={lang} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
