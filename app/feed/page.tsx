"use client";
import { useState, useEffect, useCallback } from "react";
import { SiteNav } from "../page";
import { useUser, SignInButton } from "@clerk/nextjs";

const M = "JetBrains Mono, monospace";
const API = process.env.NEXT_PUBLIC_AGENT_API || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type VerdictStatus = "ACTIVE" | "VERIFIED" | "INVALIDATED";
type Direction = "BULLISH" | "BEARISH";
type PostType = "verdict" | "user";

interface Dimension { name: string; signal: "bullish"|"bearish"|"neutral"; weight: number; note: string; }
interface Comment { id: string; author: string; initials: string; color: string; imageUrl?: string; walletAddress?: string; text: string; timestamp: number; likes: number; liked: boolean; }
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
  // on-chain fields
  txHash?: string; bscscanUrl?: string; chainNetwork?: string; chainResolved?: boolean; chainOutcome?: string;
}

// ── Avatar helpers ────────────────────────────────────────────────────────────
function walletGradient(addr: string): string {
  const h1 = addr.slice(2, 8);
  const h2 = addr.slice(8, 14);
  return `linear-gradient(135deg, #${h1}, #${h2})`;
}

function Avatar({ label, color, size = 38, imageUrl, walletAddress }: {
  label: string; color: string; size?: number; imageUrl?: string; walletAddress?: string;
}) {
  if (imageUrl) {
    return (
      <img src={imageUrl} alt={label}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }} />
    );
  }
  if (walletAddress && walletAddress.startsWith("0x") && walletAddress.length >= 14) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: walletGradient(walletAddress), flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: M, fontSize: size * 0.26, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>
          {walletAddress.slice(2, 4).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontFamily: M, fontSize: size * 0.32, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{label}</span>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const PALETTE = ["#0047cc","#059669","#dc2626","#f59e0b","#6633cc","#0891b2","#be185d"];

const DIMS: Dimension[] = [
  { name: "Price Action",  signal: "bearish", weight: 0.82, note: "Lower highs on D1" },
  { name: "Volume",        signal: "bearish", weight: 0.71, note: "Distribution pattern" },
  { name: "Momentum",      signal: "bearish", weight: 0.68, note: "MACD declining" },
  { name: "Market Regime", signal: "bearish", weight: 0.90, note: "Bear trend confirmed" },
  { name: "On-Chain",      signal: "neutral", weight: 0.51, note: "Mixed whale signals" },
  { name: "Macro",         signal: "bearish", weight: 0.63, note: "Risk-off sentiment" },
  { name: "Sentiment",     signal: "bullish", weight: 0.44, note: "Extreme fear — contrarian" },
];

const INITIAL: Post[] = [
  {
    id:"v-001", type:"verdict", symbol:"BTC/USDT", direction:"BEARISH", confidence:74,
    entry:67400, target1:63000, target2:59500, stoploss:70200,
    regime:"BEAR_TREND", status:"VERIFIED", pnl:4.2,
    timestamp:Date.now()-1000*60*38,
    invalidation:["BTC reclaims $70,000 with volume >2x avg","RSI divergence on 4H","Regime shifts to BULL_TREND"],
    dimensions:DIMS, betFor:68, betAgainst:32, betCount:142,
    comments:[
      {id:"c1",author:"quant_alpha",initials:"QA",color:"#0047cc",text:"Exactly what I was seeing on the 4H. Volume distribution is a clear signal.",timestamp:Date.now()-1000*60*30,likes:12,liked:false},
      {id:"c2",author:"trader_x8",initials:"TX",color:"#059669",text:"Stoploss at 70.2k feels tight. Anyone think there's a wick hunt before drop?",timestamp:Date.now()-1000*60*22,likes:7,liked:false},
    ],
  },
  {
    id:"u-001", type:"user", author:"crypto_monk", initials:"CM", avatarColor:"#6633cc",
    text:"IMO BTC will retest 65k before any recovery. Macro just isn't ready for another leg up. DXY still showing strength.",
    symbol:"BTC/USDT", direction:"BEARISH",
    timestamp:Date.now()-1000*60*29, likes:23, liked:false,
    linkedVerdictId:"v-001",
    comments:[
      {id:"c3",author:"bull_run_99",initials:"BR",color:"#f59e0b",text:"Disagree. Fed pivot narrative is gaining traction again.",timestamp:Date.now()-1000*60*18,likes:5,liked:false},
    ],
  },
  {
    id:"v-002", type:"verdict", symbol:"SOL/USDT", direction:"BULLISH", confidence:82,
    entry:148, target1:172, target2:195, stoploss:135,
    regime:"BULL_TREND", status:"ACTIVE",
    timestamp:Date.now()-1000*60*12,
    invalidation:["SOL loses $140 support on D1 close","BTC drops >8%","On-chain activity drops >30%"],
    dimensions:[
      {name:"Price Action", signal:"bullish",weight:0.88,note:"Clean breakout from 3-week base"},
      {name:"Volume",       signal:"bullish",weight:0.85,note:"2.3x average on breakout"},
      {name:"Momentum",     signal:"bullish",weight:0.79,note:"MACD bullish cross confirmed"},
      {name:"Market Regime",signal:"bullish",weight:0.91,note:"Bull trend, strong momentum"},
      {name:"On-Chain",     signal:"bullish",weight:0.83,note:"DEX volume surging +140%"},
      {name:"Macro",        signal:"bullish",weight:0.72,note:"Risk-on rotation into alts"},
      {name:"Sentiment",    signal:"bearish",weight:0.38,note:"Retail FOMO risk — caution"},
    ],
    betFor:79, betAgainst:21, betCount:87, comments:[],
  },
  {
    id:"u-002", type:"user", author:"sol_watcher", initials:"SW", avatarColor:"#0891b2",
    text:"SOL ecosystem TVL just hit ATH. This breakout is backed by fundamentals, not just speculation.",
    symbol:"SOL/USDT", direction:"BULLISH",
    timestamp:Date.now()-1000*60*8, likes:34, liked:false,
    linkedVerdictId:"v-002", comments:[],
  },
  {
    id:"v-003", type:"verdict", symbol:"ETH/USDT", direction:"BULLISH", confidence:61,
    entry:3240, target1:3580, stoploss:3050,
    regime:"RECOVERY", status:"ACTIVE",
    timestamp:Date.now()-1000*60*5,
    invalidation:["ETH closes below $3,000 on D1","BTC drops >8%"],
    dimensions:[
      {name:"Price Action", signal:"bullish",weight:0.73,note:"Double bottom on 4H"},
      {name:"Volume",       signal:"bullish",weight:0.69,note:"Accumulation phase"},
      {name:"Momentum",     signal:"neutral",weight:0.52,note:"RSI recovering from oversold"},
      {name:"Market Regime",signal:"bullish",weight:0.65,note:"Recovery regime"},
      {name:"On-Chain",     signal:"bullish",weight:0.71,note:"Net inflow to staking"},
      {name:"Macro",        signal:"neutral",weight:0.50,note:"Awaiting Fed decision"},
      {name:"Sentiment",    signal:"bullish",weight:0.58,note:"Fear index recovering"},
    ],
    betFor:55, betAgainst:45, betCount:63, comments:[],
  },
  {
    id:"u-003", type:"user", author:"defi_hawk", initials:"DH", avatarColor:"#be185d",
    text:"Been watching ETH gas fees creeping up — usually a leading indicator of on-chain activity uptick. Aligns with the current Themis read.",
    timestamp:Date.now()-1000*60*3, likes:11, liked:false, comments:[],
  },
];

function timeAgo(ts: number, lang: string) {
  const d = Math.floor((Date.now()-ts)/1000);
  if (d < 60)   return lang === "zh" ? `${d}秒` : `${d}s`;
  if (d < 3600) return lang === "zh" ? `${Math.floor(d/60)}分钟` : `${Math.floor(d/60)}m`;
  return              lang === "zh" ? `${Math.floor(d/3600)}小时` : `${Math.floor(d/3600)}h`;
}

const ST: Record<VerdictStatus,{color:string;bg:string;en:string;zh:string}> = {
  ACTIVE:      {color:"#0047cc", bg:"rgba(0,71,204,0.10)",  en:"ACTIVE",       zh:"进行中"},
  VERIFIED:    {color:"#059669", bg:"rgba(5,150,105,0.10)", en:"VERIFIED ✓",   zh:"已验证 ✓"},
  INVALIDATED: {color:"#dc2626", bg:"rgba(220,38,38,0.10)", en:"INVALIDATED",  zh:"已失效"},
};

// ── Compose ───────────────────────────────────────────────────────────────────
function ComposeBox({ onSubmit, isSignedIn, lang, userImageUrl, userWallet, userHandle }: {
  onSubmit: (p: Post) => void; isSignedIn: boolean; lang: string;
  userImageUrl?: string; userWallet?: string; userHandle: string;
}) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const [text, setText] = useState("");
  const [sym, setSym]   = useState("");
  const [dir, setDir]   = useState<Direction|"">("");
  const [open, setOpen] = useState(false);

  function submit() {
    if (!text.trim()) return;
    onSubmit({
      id: `u-${Date.now()}`, type: "user",
      author: userHandle, initials: userHandle.slice(0,2).toUpperCase(),
      avatarColor: "#0047cc", imageUrl: userImageUrl, walletAddress: userWallet,
      text: text.trim(), symbol: sym||undefined,
      direction: (dir||undefined) as Direction|undefined,
      timestamp: Date.now(), likes: 0, liked: false, comments: [],
    });
    setText(""); setSym(""); setDir(""); setOpen(false);
  }

  if (!isSignedIn) return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:"1px solid #f0f2f6"}}>
      <Avatar label="?" color="#cbd5e1"/>
      <SignInButton mode="modal">
        <div style={{flex:1,fontFamily:M,fontSize:12,color:"#94a3b8",cursor:"pointer",padding:"10px 16px",background:"#f8fafc",border:"1px solid #edf0f4",borderRadius:24}}>
          {t("Sign in to share your analysis…","登录后分享你的市场分析…")}
        </div>
      </SignInButton>
    </div>
  );

  return (
    <div style={{borderBottom:"1px solid #f0f2f6",padding:"14px 16px"}}>
      <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        <Avatar label={userHandle.slice(0,2).toUpperCase()} color="#0047cc" imageUrl={userImageUrl} walletAddress={userWallet}/>
        <div style={{flex:1}}>
          <textarea value={text} onChange={e=>setText(e.target.value)} onFocus={()=>setOpen(true)}
            placeholder={t("Share your market analysis…","分享你的市场分析…")}
            style={{width:"100%",fontFamily:M,fontSize:13,color:"#0a1a3a",background:"none",border:"none",outline:"none",resize:"none",lineHeight:1.7,minHeight:open?80:42,paddingTop:6,boxSizing:"border-box"}}/>
          {open && (
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6,paddingTop:10,borderTop:"1px solid #f0f2f6"}}>
              <select value={sym} onChange={e=>setSym(e.target.value)}
                style={{fontFamily:M,fontSize:9,color:"#64748b",background:"#f8fafc",border:"1px solid #edf0f4",borderRadius:6,padding:"5px 10px",outline:"none"}}>
                <option value="">{t("Symbol","币种")}</option>
                {["BTC/USDT","ETH/USDT","BNB/USDT","SOL/USDT"].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <select value={dir} onChange={e=>setDir(e.target.value as Direction|"")}
                style={{fontFamily:M,fontSize:9,color:"#64748b",background:"#f8fafc",border:"1px solid #edf0f4",borderRadius:6,padding:"5px 10px",outline:"none"}}>
                <option value="">{t("Direction","方向")}</option>
                <option value="BULLISH">↑ BULLISH</option>
                <option value="BEARISH">↓ BEARISH</option>
              </select>
              <div style={{flex:1}}/>
              <button onClick={()=>{setOpen(false);setText("");}} style={{fontFamily:M,fontSize:9,color:"#94a3b8",background:"none",border:"none",cursor:"pointer"}}>{t("Cancel","取消")}</button>
              <button onClick={submit} disabled={!text.trim()}
                style={{fontFamily:M,fontSize:10,fontWeight:700,color:"#fff",background:text.trim()?"#0047cc":"#cbd5e1",border:"none",borderRadius:20,padding:"7px 20px",cursor:text.trim()?"pointer":"not-allowed"}}>
                {t("POST","发布")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Comment input row ─────────────────────────────────────────────────────────
function CommentInput({ onSubmit, lang, userImageUrl, userWallet, userHandle }: {
  onSubmit: (text: string) => void; lang: string;
  userImageUrl?: string; userWallet?: string; userHandle: string;
}) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const [val, setVal] = useState("");
  return (
    <div style={{display:"flex",gap:10,alignItems:"center",marginTop:8}}>
      <Avatar label={userHandle.slice(0,2).toUpperCase()} color="#0047cc" imageUrl={userImageUrl} walletAddress={userWallet} size={28}/>
      <input value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"&&val.trim()){onSubmit(val);setVal("");}}}
        placeholder={t("Reply…","回复…")}
        style={{flex:1,fontFamily:M,fontSize:12,color:"#0a1a3a",background:"#f8fafc",border:"1px solid #edf0f4",borderRadius:20,padding:"8px 16px",outline:"none"}}/>
    </div>
  );
}

// ── Verdict Post ──────────────────────────────────────────────────────────────
function VerdictPost({ post, expanded, onToggle, onBet, onComment, isSignedIn, lang, userImageUrl, userWallet, userHandle }: {
  post: Post; expanded: boolean; onToggle: ()=>void;
  onBet: (id:string, side:"for"|"against")=>void;
  onComment: (id:string, text:string)=>void;
  isSignedIn: boolean; lang: string;
  userImageUrl?: string; userWallet?: string; userHandle: string;
}) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const st = ST[post.status!];
  const dirColor = post.direction==="BULLISH" ? "#059669" : "#dc2626";
  const [showComments, setShowComments] = useState(false);

  return (
    <article style={{borderBottom:"1px solid #f0f2f6",padding:"16px 16px"}}>
      <div style={{display:"flex",gap:12}}>
        {/* Avatar column with thread line */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:"#0a1a3a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:18,lineHeight:1}}>⚖</span>
          </div>
          {(expanded||showComments)&&post.comments.length>0&&
            <div style={{width:2,flex:1,background:"#f0f2f6",marginTop:6,borderRadius:1}}/>}
        </div>

        <div style={{flex:1,minWidth:0}}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{fontFamily:M,fontSize:13,fontWeight:800,color:"#0a1a3a"}}>Themis</span>
            <span style={{fontFamily:M,fontSize:11,color:"#94a3b8"}}>@themis_official</span>
            <span style={{color:"#d1d5db"}}>·</span>
            <span style={{fontFamily:M,fontSize:11,color:"#94a3b8"}}>{timeAgo(post.timestamp, lang)}</span>
            <div style={{fontFamily:M,fontSize:8,fontWeight:800,color:"#0047cc",background:"rgba(0,71,204,0.08)",border:"1px solid rgba(0,71,204,0.18)",padding:"2px 8px",borderRadius:4,letterSpacing:"0.12em",marginLeft:4}}>
              {t("OFFICIAL","官方")}
            </div>
          </div>

          {/* Card — click to expand */}
          <div onClick={onToggle} style={{cursor:"pointer"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              <span style={{fontFamily:M,fontSize:18,fontWeight:800,color:"#0a1a3a",letterSpacing:"-0.02em"}}>{post.symbol}</span>
              <span style={{fontFamily:M,fontSize:10,fontWeight:800,color:dirColor,background:`${dirColor}12`,border:`1.5px solid ${dirColor}28`,padding:"3px 10px",borderRadius:5}}>
                {post.direction==="BULLISH"?"↑":"↓"} {t(post.direction||"","")|| (post.direction==="BULLISH"?"看多":"看空")}
              </span>
              <span style={{fontFamily:M,fontSize:10,fontWeight:700,color:st.color,background:st.bg,padding:"3px 9px",borderRadius:5}}>
                {t(st.en,st.zh)}
              </span>
              {post.txHash && (
                <a href={post.bscscanUrl} target="_blank" rel="noopener noreferrer"
                  onClick={e=>e.stopPropagation()}
                  style={{fontFamily:M,fontSize:8,fontWeight:800,color:"#f59e0b",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",padding:"2px 7px",borderRadius:4,letterSpacing:"0.1em",textDecoration:"none",display:"flex",alignItems:"center",gap:3}}>
                  ⬡ {t("ON-CHAIN","链上验证")}
                </a>
              )}
              {post.pnl!==undefined&&
                <span style={{fontFamily:M,fontSize:12,fontWeight:800,color:post.pnl>=0?"#059669":"#dc2626",marginLeft:"auto"}}>{post.pnl>=0?"+":""}{post.pnl}%</span>}
            </div>

            {/* Confidence */}
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontFamily:M,fontSize:8,color:"#94a3b8",letterSpacing:"0.1em"}}>{t("CONFIDENCE","置信度")}</span>
                <span style={{fontFamily:M,fontSize:11,fontWeight:800,color:post.confidence!>=70?"#059669":"#f59e0b"}}>{post.confidence}%</span>
              </div>
              <div style={{height:4,background:"#f1f5f9",borderRadius:2}}>
                <div style={{height:"100%",width:`${post.confidence}%`,background:post.confidence!>=70?"linear-gradient(90deg,#059669,#10b981)":"linear-gradient(90deg,#f59e0b,#fbbf24)",borderRadius:2,transition:"width 0.4s"}}/>
              </div>
            </div>

            {/* Price grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12}}>
              {[
                {l:t("ENTRY","入场"),  v:`$${post.entry!.toLocaleString()}`,    c:"#475569"},
                {l:t("TARGET","目标"), v:`$${post.target1!.toLocaleString()}`,  c:"#059669"},
                {l:t("STOP","止损"),   v:`$${post.stoploss!.toLocaleString()}`, c:"#dc2626"},
                {l:t("REGIME","状态"), v:post.regime!,                           c:"#f59e0b"},
              ].map(({l,v,c})=>(
                <div key={l} style={{background:"#f8fafc",borderRadius:8,padding:"8px 10px",border:"1px solid #f0f2f6"}}>
                  <div style={{fontFamily:M,fontSize:7,color:"#94a3b8",letterSpacing:"0.1em",marginBottom:3}}>{l}</div>
                  <div style={{fontFamily:M,fontSize:10,fontWeight:700,color:c,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Expanded details */}
          {expanded && (
            <div style={{background:"#f8fafc",borderRadius:10,padding:"16px",marginBottom:12,border:"1px solid #f0f2f6"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                <div>
                  <div style={{fontFamily:M,fontSize:8,color:"#94a3b8",letterSpacing:"0.1em",marginBottom:10}}>
                    {t("7-DIMENSION EVIDENCE","7维度证据")}
                  </div>
                  {post.dimensions!.map(d=>{
                    const dc = d.signal==="bullish"?"#059669":d.signal==="bearish"?"#dc2626":"#94a3b8";
                    return (
                      <div key={d.name} style={{marginBottom:9}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:dc,flexShrink:0}}/>
                            <span style={{fontFamily:M,fontSize:9,fontWeight:700,color:"#0a1a3a"}}>{d.name}</span>
                          </div>
                          <span style={{fontFamily:M,fontSize:9,fontWeight:700,color:dc}}>{(d.weight*100).toFixed(0)}%</span>
                        </div>
                        <div style={{height:3,background:"#edf0f4",borderRadius:2,marginLeft:12}}>
                          <div style={{height:"100%",width:`${d.weight*100}%`,background:dc,borderRadius:2}}/>
                        </div>
                        <div style={{fontFamily:M,fontSize:8,color:"#94a3b8",marginLeft:12,marginTop:2}}>{d.note}</div>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <div style={{fontFamily:M,fontSize:8,color:"#94a3b8",letterSpacing:"0.1em",marginBottom:10}}>
                    {t("INVALIDATION","失效条件")}
                  </div>
                  {post.invalidation!.map((c,i)=>(
                    <div key={i} style={{display:"flex",gap:8,marginBottom:7,padding:"8px 10px",background:"rgba(220,38,38,0.04)",border:"1px solid rgba(220,38,38,0.12)",borderRadius:7}}>
                      <span style={{color:"#dc2626",fontSize:9,flexShrink:0,marginTop:1}}>✗</span>
                      <span style={{fontFamily:M,fontSize:9,color:"#64748b",lineHeight:1.6}}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stake bar */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{flex:1,height:5,background:"#f1f5f9",borderRadius:3,overflow:"hidden",display:"flex"}}>
              <div style={{width:`${post.betFor}%`,background:"linear-gradient(90deg,#059669,#10b981)",transition:"width 0.4s"}}/>
              <div style={{flex:1,background:"#fecaca"}}/>
            </div>
            <span style={{fontFamily:M,fontSize:9,fontWeight:700,color:"#059669",minWidth:36}}>↑{post.betFor}%</span>
            <span style={{fontFamily:M,fontSize:9,fontWeight:700,color:"#dc2626",minWidth:36}}>↓{post.betAgainst}%</span>
            <span style={{fontFamily:M,fontSize:8,color:"#94a3b8",whiteSpace:"nowrap"}}>{post.betCount} {t("staked","人质押")}</span>
          </div>

          {/* Stake buttons */}
          {post.status==="ACTIVE" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {isSignedIn ? (
                <>
                  <button onClick={()=>onBet(post.id,"for")} style={{fontFamily:M,fontSize:9,fontWeight:700,color:"#059669",background:"rgba(5,150,105,0.06)",border:"1.5px solid rgba(5,150,105,0.22)",borderRadius:20,padding:"9px",cursor:"pointer"}}>
                    ↑ {t("SUPPORT","支持裁决")}
                  </button>
                  <button onClick={()=>onBet(post.id,"against")} style={{fontFamily:M,fontSize:9,fontWeight:700,color:"#dc2626",background:"rgba(220,38,38,0.06)",border:"1.5px solid rgba(220,38,38,0.22)",borderRadius:20,padding:"9px",cursor:"pointer"}}>
                    ↓ {t("CHALLENGE","质疑裁决")}
                  </button>
                </>
              ) : (
                <SignInButton mode="modal">
                  <button style={{gridColumn:"span 2",fontFamily:M,fontSize:9,fontWeight:700,color:"#94a3b8",background:"#f8fafc",border:"1px solid #edf0f4",borderRadius:20,padding:"9px",cursor:"pointer",width:"100%"}}>
                    {t("Sign in to stake","登录后参与质押")}
                  </button>
                </SignInButton>
              )}
            </div>
          )}

          {/* Action bar */}
          <div style={{display:"flex",alignItems:"center",gap:18}}>
            <button onClick={()=>setShowComments(v=>!v)} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",fontFamily:M,fontSize:11,color:showComments?"#0047cc":"#94a3b8",padding:0}}>
              <span style={{fontSize:14}}>💬</span> {post.comments.length}
            </button>
            <button onClick={onToggle} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",fontFamily:M,fontSize:10,color:expanded?"#0047cc":"#94a3b8",padding:0}}>
              {expanded ? t("▲ 收起","▲ 收起") : t("▼ Details","▼ 详情")}
            </button>
          </div>

          {/* Comments */}
          {showComments && (
            <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #f0f2f6"}}>
              {post.comments.map(c=>(
                <div key={c.id} style={{display:"flex",gap:10,marginBottom:14}}>
                  <Avatar label={c.initials} color={c.color} imageUrl={c.imageUrl} walletAddress={c.walletAddress} size={28}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontFamily:M,fontSize:10,fontWeight:700,color:"#0a1a3a"}}>{c.author}</span>
                      <span style={{fontFamily:M,fontSize:9,color:"#94a3b8"}}>{timeAgo(c.timestamp,lang)}</span>
                    </div>
                    <p style={{fontFamily:M,fontSize:12,color:"#475569",margin:0,lineHeight:1.6}}>{c.text}</p>
                  </div>
                </div>
              ))}
              {isSignedIn && (
                <CommentInput onSubmit={text=>onComment(post.id,text)} lang={lang}
                  userImageUrl={userImageUrl} userWallet={userWallet} userHandle={userHandle}/>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ── User Post ─────────────────────────────────────────────────────────────────
function UserPost({ post, onLike, onComment, isSignedIn, lang, userImageUrl, userWallet, userHandle }: {
  post: Post; onLike:(id:string)=>void; onComment:(id:string,text:string)=>void;
  isSignedIn: boolean; lang: string;
  userImageUrl?: string; userWallet?: string; userHandle: string;
}) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const dirColor = post.direction==="BULLISH"?"#059669":post.direction==="BEARISH"?"#dc2626":undefined;
  const [showComments, setShowComments] = useState(false);

  return (
    <article style={{borderBottom:"1px solid #f0f2f6",padding:"16px 16px"}}>
      <div style={{display:"flex",gap:12}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <Avatar label={post.initials||"??"} color={post.avatarColor||"#94a3b8"} imageUrl={post.imageUrl} walletAddress={post.walletAddress}/>
          {showComments&&post.comments.length>0&&
            <div style={{width:2,flex:1,background:"#f0f2f6",marginTop:6,borderRadius:1}}/>}
        </div>

        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{fontFamily:M,fontSize:13,fontWeight:800,color:"#0a1a3a"}}>{post.author}</span>
            <span style={{fontFamily:M,fontSize:11,color:"#94a3b8"}}>@{post.author?.replace(/\s/g,"_").toLowerCase()}</span>
            <span style={{color:"#d1d5db"}}>·</span>
            <span style={{fontFamily:M,fontSize:11,color:"#94a3b8"}}>{timeAgo(post.timestamp,lang)}</span>
            {post.symbol&&<span style={{fontFamily:M,fontSize:8,color:"#64748b",background:"#f1f5f9",padding:"2px 7px",borderRadius:4,marginLeft:4}}>{post.symbol}</span>}
            {dirColor&&post.direction&&<span style={{fontFamily:M,fontSize:8,fontWeight:700,color:dirColor,background:`${dirColor}10`,padding:"2px 7px",borderRadius:4}}>{post.direction==="BULLISH"?"↑":"↓"} {post.direction}</span>}
            {post.linkedVerdictId&&<span style={{fontFamily:M,fontSize:8,color:"#0047cc",background:"rgba(0,71,204,0.06)",border:"1px solid rgba(0,71,204,0.15)",padding:"2px 7px",borderRadius:4}}>↗ {t("verdict","关联裁决")}</span>}
          </div>

          <p style={{fontFamily:M,fontSize:13,color:"#334155",lineHeight:1.75,margin:"0 0 12px"}}>{post.text}</p>

          <div style={{display:"flex",alignItems:"center",gap:18}}>
            <button onClick={()=>setShowComments(v=>!v)} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",fontFamily:M,fontSize:11,color:showComments?"#0047cc":"#94a3b8",padding:0}}>
              <span style={{fontSize:14}}>💬</span> {post.comments.length}
            </button>
            <button onClick={()=>onLike(post.id)} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",fontFamily:M,fontSize:11,color:post.liked?"#dc2626":"#94a3b8",fontWeight:post.liked?700:400,padding:0}}>
              <span style={{fontSize:14}}>{post.liked?"♥":"♡"}</span> {post.likes}
            </button>
          </div>

          {showComments && (
            <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #f0f2f6"}}>
              {post.comments.map(c=>(
                <div key={c.id} style={{display:"flex",gap:10,marginBottom:14}}>
                  <Avatar label={c.initials} color={c.color} imageUrl={c.imageUrl} walletAddress={c.walletAddress} size={28}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontFamily:M,fontSize:10,fontWeight:700,color:"#0a1a3a"}}>{c.author}</span>
                      <span style={{fontFamily:M,fontSize:9,color:"#94a3b8"}}>{timeAgo(c.timestamp,lang)}</span>
                    </div>
                    <p style={{fontFamily:M,fontSize:12,color:"#475569",margin:0,lineHeight:1.6}}>{c.text}</p>
                  </div>
                </div>
              ))}
              {isSignedIn && (
                <CommentInput onSubmit={text=>onComment(post.id,text)} lang={lang}
                  userImageUrl={userImageUrl} userWallet={userWallet} userHandle={userHandle}/>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Left Panel ────────────────────────────────────────────────────────────────
function LeftPanel({ filterSym, filterDir, onSym, onDir, lang }: {
  filterSym:string; filterDir:string; onSym:(s:string)=>void; onDir:(d:string)=>void; lang:string;
}) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #edf0f4",overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f2f6"}}>
          <span style={{fontFamily:M,fontSize:11,fontWeight:800,color:"#0a1a3a",letterSpacing:"0.08em"}}>{t("FILTER","筛选")}</span>
        </div>
        <div style={{padding:"10px 12px"}}>
          <div style={{fontFamily:M,fontSize:8,color:"#94a3b8",letterSpacing:"0.1em",marginBottom:6,paddingLeft:4}}>{t("SYMBOL","币种")}</div>
          {["ALL","BTC","ETH","BNB","SOL"].map(sym=>(
            <button key={sym} onClick={()=>onSym(sym)}
              style={{display:"block",width:"100%",textAlign:"left",fontFamily:M,fontSize:12,fontWeight:filterSym===sym?800:400,color:filterSym===sym?"#0047cc":"#475569",background:filterSym===sym?"rgba(0,71,204,0.07)":"none",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",marginBottom:2}}>
              {filterSym===sym?"● ":"○ "}{sym === "ALL" ? t("ALL","全部") : sym}
            </button>
          ))}
          <div style={{height:1,background:"#f0f2f6",margin:"10px 4px"}}/>
          <div style={{fontFamily:M,fontSize:8,color:"#94a3b8",letterSpacing:"0.1em",marginBottom:6,paddingLeft:4}}>{t("DIRECTION","方向")}</div>
          {[{v:"ALL",en:"All",zh:"全部"},{v:"BULLISH",en:"↑ Bullish",zh:"↑ 看多"},{v:"BEARISH",en:"↓ Bearish",zh:"↓ 看空"}].map(({v,en,zh})=>(
            <button key={v} onClick={()=>onDir(v)}
              style={{display:"block",width:"100%",textAlign:"left",fontFamily:M,fontSize:12,fontWeight:filterDir===v?800:400,color:filterDir===v?(v==="BULLISH"?"#059669":v==="BEARISH"?"#dc2626":"#0047cc"):"#475569",background:filterDir===v?"rgba(0,71,204,0.07)":"none",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",marginBottom:2}}>
              {filterDir===v?"● ":"○ "}{t(en,zh)}
            </button>
          ))}
        </div>
      </div>

      <div style={{background:"#fff",borderRadius:14,border:"1px solid #edf0f4",padding:"12px 16px"}}>
        <div style={{fontFamily:M,fontSize:11,fontWeight:800,color:"#0a1a3a",letterSpacing:"0.08em",marginBottom:10}}>{t("FEED","动态")}</div>
        {[
          {icon:"⚖", en:"Official verdicts",    zh:"官方裁决"},
          {icon:"🧑‍💻",en:"Community posts",      zh:"社区帖子"},
          {icon:"💬", en:"Comments & replies",   zh:"评论与回复"},
          {icon:"📊", en:"Stake activity",        zh:"质押活动"},
        ].map(({icon,en,zh})=>(
          <div key={en} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:13}}>{icon}</span>
            <span style={{fontFamily:M,fontSize:10,color:"#475569"}}>{t(en,zh)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Right Panel ───────────────────────────────────────────────────────────────
function RightPanel({ posts, lang }: { posts: Post[]; lang: string }) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const verdicts = posts.filter(p=>p.type==="verdict");
  const active   = verdicts.filter(p=>p.status==="ACTIVE");
  const verified = verdicts.filter(p=>p.status==="VERIFIED");

  const [stats, setStats] = useState<{total:number;correct:number;rate:number|null;call_count:number}|null>(null);
  useEffect(()=>{
    fetch(`${API}/api/accuracy/stats`).then(r=>r.json()).then(d=>{
      setStats({
        total: d.overall?.total ?? 0,
        correct: d.overall?.correct ?? 0,
        rate: d.overall?.rate ?? null,
        call_count: d.call_count ?? 0,
      });
    }).catch(()=>{});
  },[]);

  const accuracy = stats?.rate ?? (verdicts.filter(p=>p.status!=="ACTIVE").length
    ? Math.round(verified.length/verdicts.filter(p=>p.status!=="ACTIVE").length*100) : 0);
  const totalCount = stats?.call_count ?? verdicts.length;

  const topStakers = [
    {name:"quant_alpha",initials:"QA",color:"#0047cc",count:24,pnl:"+12.4%"},
    {name:"sol_watcher", initials:"SW",color:"#0891b2",count:18,pnl:"+8.1%"},
    {name:"crypto_monk", initials:"CM",color:"#6633cc",count:15,pnl:"+5.7%"},
    {name:"defi_hawk",   initials:"DH",color:"#be185d",count:9, pnl:"-2.3%"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Live stats */}
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #edf0f4",overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f2f6",display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#059669",animation:"pulse 2s ease infinite"}}/>
          <span style={{fontFamily:M,fontSize:11,fontWeight:800,color:"#0a1a3a",letterSpacing:"0.08em"}}>{t("LIVE STATS","实时数据")}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
          {[
            {l:t("Total","总裁决"),    v:totalCount,      c:"#0a1a3a"},
            {l:t("Active","进行中"),   v:active.length,   c:"#0047cc"},
            {l:t("Verified","已验证"), v:stats?.correct ?? verified.length, c:"#059669"},
            {l:t("Accuracy","准确率"), v:accuracy!=null?`${accuracy}%`:"—",  c:Number(accuracy)>=60?"#059669":"#f59e0b"},
          ].map(({l,v,c},i)=>(
            <div key={l} style={{padding:"14px 16px",borderRight:i%2===0?"1px solid #f0f2f6":"none",borderBottom:i<2?"1px solid #f0f2f6":"none"}}>
              <div style={{fontFamily:M,fontSize:8,color:"#94a3b8",letterSpacing:"0.1em",marginBottom:5}}>{l.toUpperCase()}</div>
              <div style={{fontFamily:M,fontSize:20,fontWeight:800,color:c}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hot verdicts */}
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #edf0f4",overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f2f6"}}>
          <span style={{fontFamily:M,fontSize:11,fontWeight:800,color:"#0a1a3a",letterSpacing:"0.08em"}}>{t("HOT VERDICTS","热门裁决")}</span>
        </div>
        {verdicts.slice(0,3).map((v,i)=>{
          const dc = v.direction==="BULLISH"?"#059669":"#dc2626";
          const s  = ST[v.status!];
          return (
            <div key={v.id} style={{padding:"12px 16px",borderBottom:i<2?"1px solid #f0f2f6":"none",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontFamily:M,fontSize:12,color:"#d1d5db",fontWeight:700,width:18,flexShrink:0}}>{i+1}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontFamily:M,fontSize:12,fontWeight:800,color:"#0a1a3a"}}>{v.symbol}</span>
                  <span style={{fontFamily:M,fontSize:9,fontWeight:700,color:dc}}>{v.direction==="BULLISH"?"↑":"↓"}</span>
                </div>
                <span style={{fontFamily:M,fontSize:8,fontWeight:700,color:s.color}}>{t(s.en,s.zh)}</span>
              </div>
              <span style={{fontFamily:M,fontSize:11,fontWeight:800,color:v.confidence!>=70?"#059669":"#f59e0b"}}>{v.confidence}%</span>
            </div>
          );
        })}
      </div>

      {/* Top stakers */}
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #edf0f4",overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f2f6"}}>
          <span style={{fontFamily:M,fontSize:11,fontWeight:800,color:"#0a1a3a",letterSpacing:"0.08em"}}>{t("TOP STAKERS","质押排行")}</span>
        </div>
        {topStakers.map((s,i)=>(
          <div key={s.name} style={{padding:"11px 16px",borderBottom:i<topStakers.length-1?"1px solid #f0f2f6":"none",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontFamily:M,fontSize:11,color:"#d1d5db",fontWeight:700,width:18,flexShrink:0}}>{i+1}</span>
            <Avatar label={s.initials} color={s.color} size={30}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:M,fontSize:11,fontWeight:700,color:"#0a1a3a"}}>{s.name}</div>
              <div style={{fontFamily:M,fontSize:8,color:"#94a3b8"}}>{s.count} {t("stakes","次质押")}</div>
            </div>
            <span style={{fontFamily:M,fontSize:11,fontWeight:700,color:s.pnl.startsWith("+")?"#059669":"#dc2626"}}>{s.pnl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const { isSignedIn = false, user } = useUser();
  const [lang, setLang] = useState<string>(()=>{
    if (typeof window==="undefined") return "en";
    return localStorage.getItem("themis_lang")||"en";
  });
  const handleLang = (l: string) => { setLang(l); localStorage.setItem("themis_lang",l); };

  // Derive user identity for avatar / post authoring
  const userImageUrl   = user?.imageUrl || undefined;
  // Web3 wallet: Clerk external accounts may include a blockchain address
  const userWallet     = (user?.web3Wallets?.[0]?.web3Wallet) || undefined;
  const userHandle     = user?.username || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "You";

  const [posts, setPosts]         = useState<Post[]>(INITIAL);
  const [expanded, setExpanded]   = useState<string|null>(null);
  const [filterSym, setFilterSym] = useState("ALL");
  const [filterDir, setFilterDir] = useState("ALL");
  const [betaModal, setBetaModal] = useState(true);

  const fetchVerdicts = useCallback(async()=>{
    try {
      // Fetch real verdicts from public feed endpoint (no API key needed)
      const res = await fetch(`${API}/api/accuracy/feed?limit=20`);
      if (!res.ok) throw new Error("verdict history unavailable");
      const data = await res.json();
      const verdicts: any[] = data.verdicts || data || [];
      if (!verdicts.length) return;

      const live: Post[] = verdicts.map((v: any, i: number) => {
        const dir = (v.conclusion || v.direction || "HOLD").toUpperCase();
        const mapped: Direction = dir === "SHORT" || dir === "BEARISH" ? "BEARISH" : dir === "LONG" || dir === "BULLISH" ? "BULLISH" : "BULLISH";
        const status: VerdictStatus = v.outcome === "hit" ? "VERIFIED" : v.outcome === "miss" ? "INVALIDATED" : "ACTIVE";
        return {
          id: v.verdict_id || `v-${i}`,
          type: "verdict" as const,
          symbol: (v.symbol || "BTC").replace("/USDT","") + "/USDT",
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
            name: d.name || d.dimension,
            signal: (d.signal || "neutral").toLowerCase(),
            weight: d.weight || d.score || 0.5,
            note: d.note || d.reason || "",
          })),
          betFor: 50 + Math.floor(Math.sin(i * 3) * 20),
          betAgainst: 50 - Math.floor(Math.sin(i * 3) * 20),
          betCount: 0,
          timestamp: v.timestamp ? new Date(v.timestamp).getTime() : Date.now() - i * 60000 * 30,
          comments: [],
          // on-chain
          txHash: v.tx_hash || undefined,
          bscscanUrl: v.tx_hash ? `https://testnet.bscscan.com/tx/${v.tx_hash}` : undefined,
          chainNetwork: v.chain_network || undefined,
          chainResolved: v.chain_resolved || false,
          chainOutcome: v.chain_outcome || undefined,
        };
      });

      setPosts(prev => {
        const ids = new Set(prev.filter(x => x.type === "user").map(x => x.id));
        const userPosts = prev.filter(x => x.type === "user");
        return [...live, ...userPosts.filter(x => !ids.has(x.id))].slice(0, 60);
      });
    } catch {
      // Fallback: keep INITIAL mock data silently
    }
  },[]);

  useEffect(()=>{ fetchVerdicts(); const id=setInterval(fetchVerdicts,60000); return()=>clearInterval(id); },[fetchVerdicts]);

  function addPost(p: Post) { setPosts(prev=>[p,...prev]); }

  function handleBet(id: string, side: "for"|"against") {
    setPosts(prev=>prev.map(p=>p.id!==id?p:{
      ...p,
      betFor:     side==="for"    ?Math.min((p.betFor ||50)+2,99):Math.max((p.betFor ||50)-2,1),
      betAgainst: side==="against"?Math.min((p.betAgainst||50)+2,99):Math.max((p.betAgainst||50)-2,1),
      betCount:(p.betCount||0)+1,
    }));
  }

  function handleLike(id: string) {
    setPosts(prev=>prev.map(p=>p.id!==id?p:{...p,liked:!p.liked,likes:(p.likes||0)+(p.liked?-1:1)}));
  }

  function handleComment(id: string, text: string) {
    const comment: Comment = {
      id:`c-${Date.now()}`,
      author: userHandle,
      initials: userHandle.slice(0,2).toUpperCase(),
      color: "#0047cc",
      imageUrl: userImageUrl,
      walletAddress: userWallet,
      text,
      timestamp: Date.now(),
      likes: 0,
      liked: false,
    };
    setPosts(prev=>prev.map(p=>p.id!==id?p:{...p,comments:[...p.comments,comment]}));
  }

  const filtered = posts.filter(p=>{
    if (filterSym!=="ALL"&&p.symbol&&!p.symbol.startsWith(filterSym)) return false;
    if (filterDir!=="ALL"&&p.direction&&p.direction!==filterDir) return false;
    return true;
  });

  const sharedProps = { isSignedIn, lang, userImageUrl, userWallet, userHandle };

  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  return (
    <div style={{minHeight:"100vh",background:"#f4f6f9",fontFamily:M}}>
      <SiteNav lang={lang} onLangChange={handleLang}/>

      {/* Beta notice modal */}
      {betaModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(10,26,58,0.5)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setBetaModal(false)}>
          <div style={{ background:"#fff", borderRadius:16, padding:"36px 32px", width:440, maxWidth:"92vw", boxShadow:"0 24px 64px rgba(0,20,80,0.18)", position:"relative" }}
            onClick={e => e.stopPropagation()}>
            {/* Badge */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:20, padding:"4px 12px", marginBottom:20 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#f59e0b" }} />
              <span style={{ fontFamily:M, fontSize:9, fontWeight:700, color:"#f59e0b", letterSpacing:"0.15em" }}>
                {t("BETA", "内测中")}
              </span>
            </div>

            <h2 style={{ fontFamily:M, fontSize:18, fontWeight:800, color:"#0a1a3a", margin:"0 0 10px", lineHeight:1.3 }}>
              {t("Verdict Feed is in Beta", "裁决广播内测中")}
            </h2>
            <p style={{ fontFamily:M, fontSize:11, color:"#64748b", lineHeight:1.8, margin:"0 0 24px" }}>
              {t(
                "This feature is currently in early access. Verdicts, signals, and community posts are live — but the bet & reward mechanism is still under development.",
                "此功能目前处于早期内测阶段。裁决信号与社区帖子已上线，但 Bet 下注与奖惩机制仍在开发中。"
              )}
            </p>

            <div style={{ background:"#f8fafc", border:"1px solid #f1f5f9", borderRadius:10, padding:"14px 16px", marginBottom:24 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { done:true,  en:"Live verdict signals",      zh:"实时裁决信号" },
                  { done:true,  en:"Community posts & comments", zh:"社区发帖与评论" },
                  { done:false, en:"Bet & reward mechanism",     zh:"Bet 下注与奖惩机制" },
                  { done:false, en:"On-chain settlement",        zh:"链上结算" },
                ].map(({ done, en, zh }) => (
                  <div key={en} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${done?"#059669":"#e2e8f0"}`, background:done?"#059669":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {done && <svg width={8} height={8} viewBox="0 0 8 8" fill="none"><polyline points="1.5,4 3,5.5 6.5,2" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontFamily:M, fontSize:10, color: done?"#64748b":"#94a3b8", textDecoration: done?"line-through":"none", opacity: done?0.7:1 }}>
                      {lang==="zh" ? zh : en}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setBetaModal(false)}
              style={{ width:"100%", fontFamily:M, fontSize:11, fontWeight:700, color:"#fff", background:"#0047cc", border:"none", borderRadius:9, padding:"12px", cursor:"pointer" }}>
              {t("Got it, enter Feed →", "知道了，进入广播 →")}
            </button>
          </div>
        </div>
      )}

      <div style={{paddingTop:56,display:"grid",gridTemplateColumns:"220px 1fr 268px",gap:0,maxWidth:1400,margin:"0 auto",padding:"72px 20px 60px",boxSizing:"border-box"}}>

        {/* Left sidebar */}
        <div style={{paddingRight:16}}>
          <div style={{position:"sticky",top:72}}>
            <LeftPanel filterSym={filterSym} filterDir={filterDir} onSym={setFilterSym} onDir={setFilterDir} lang={lang}/>
          </div>
        </div>

        {/* Main feed */}
        <div style={{background:"#fff",borderRadius:14,border:"1px solid #edf0f4",overflow:"hidden",minHeight:600}}>
          <ComposeBox onSubmit={addPost} {...sharedProps}/>
          {filtered.length===0&&(
            <div style={{padding:"60px 24px",textAlign:"center",fontFamily:M,fontSize:11,color:"#94a3b8"}}>
              {lang==="zh"?"暂无符合筛选条件的帖子。":"No posts match your filters."}
            </div>
          )}
          {filtered.map(post=>
            post.type==="verdict"
              ? <VerdictPost key={post.id} post={post} expanded={expanded===post.id}
                  onToggle={()=>setExpanded(expanded===post.id?null:post.id)}
                  onBet={handleBet} onComment={handleComment} {...sharedProps}/>
              : <UserPost key={post.id} post={post} onLike={handleLike} onComment={handleComment} {...sharedProps}/>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{paddingLeft:16}}>
          <div style={{position:"sticky",top:72}}>
            <RightPanel posts={posts} lang={lang}/>
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}
