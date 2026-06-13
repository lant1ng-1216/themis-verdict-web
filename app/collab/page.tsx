"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

const M = "JetBrains Mono, monospace";
const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CollabNode {
  user_id: string;
  specializations: string[];
  skills: string[];
  mode: string;
  evolution_level?: number;
  strategy_bias?: string;
  risk_preference?: string;
  avatar_url?: string;
  stats?: { requests_total: number; requests_today: number; accuracy_rate?: number };
}
interface GridNode extends CollabNode {
  phi: number;   // polar angle (0..π), random, not grid-snapped
  theta: number; // azimuthal angle (0..2π), random
}

const LAT_LINES = 18;  // latitude grid lines (~10° spacing)
const LON_LINES = 36;  // longitude grid lines (~10° spacing)
const LAT_STEP = Math.PI / (LAT_LINES + 1);
const LON_STEP = (2 * Math.PI) / LON_LINES;
const PAIRS = ["BTC", "ETH", "BNB", "SOL", "DOGE", "XRP"];

function shortId(id: string) { return id.replace(/^user_/, "").slice(0, 6).toUpperCase(); }
function strategyColor(bias?: string) {
  if (bias === "technical") return "#3b82f6";
  if (bias === "onchain")   return "#a78bfa";
  if (bias === "macro")     return "#34d399";
  return "#64748b";
}
function strategyLabel(bias?: string, lang = "zh") {
  const m: Record<string, [string, string]> = { technical: ["技术派","Technical"], onchain: ["链上派","On-chain"], macro: ["宏观派","Macro"] };
  const p = m[bias||""] || ["综合","General"];
  return lang === "zh" ? p[0] : p[1];
}

const DEMO_NODES: CollabNode[] = [
  { user_id:"user_btc001", specializations:["BTC","ETH"], skills:["趋势跟踪"],  mode:"public", evolution_level:3, strategy_bias:"technical",  risk_preference:"moderate",     stats:{requests_total:42,  requests_today:3,  accuracy_rate:0.76} },
  { user_id:"user_chn02",  specializations:["ETH","SOL"], skills:["链上监控"],  mode:"public", evolution_level:2, strategy_bias:"onchain",    risk_preference:"conservative", stats:{requests_total:28,  requests_today:1,  accuracy_rate:0.81} },
  { user_id:"user_mac03",  specializations:["BTC","DOGE"],skills:["宏观研判"],  mode:"public", evolution_level:4, strategy_bias:"macro",      risk_preference:"aggressive",   stats:{requests_total:95,  requests_today:7,  accuracy_rate:0.69} },
  { user_id:"user_sol04",  specializations:["SOL","BNB"], skills:["动量策略"],  mode:"public", evolution_level:1, strategy_bias:"technical",  risk_preference:"moderate",     stats:{requests_total:11,  requests_today:0,  accuracy_rate:0.73} },
  { user_id:"user_arb05",  specializations:["XRP","BTC"], skills:["套利策略"],  mode:"public", evolution_level:2, strategy_bias:"onchain",    risk_preference:"conservative", stats:{requests_total:33,  requests_today:2,  accuracy_rate:0.78} },
  { user_id:"user_eth06",  specializations:["ETH","BTC"], skills:["均值回归"],  mode:"public", evolution_level:5, strategy_bias:"macro",      risk_preference:"moderate",     stats:{requests_total:156, requests_today:12, accuracy_rate:0.83} },
  { user_id:"user_bnb07",  specializations:["BNB","SOL"], skills:["波动率"],    mode:"public", evolution_level:3, strategy_bias:"technical",  risk_preference:"aggressive",   stats:{requests_total:67,  requests_today:5,  accuracy_rate:0.71} },
  { user_id:"user_dge08",  specializations:["DOGE","XRP"],skills:["情绪分析"],  mode:"public", evolution_level:2, strategy_bias:"onchain",    risk_preference:"aggressive",   stats:{requests_total:19,  requests_today:1,  accuracy_rate:0.65} },
];

// strip markdown symbols from AI output
function stripMd(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/`{1,3}/g, "")
    .replace(/\*+/g, "");
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CollabPage() {
  const { user } = useUser();
  const [lang, setLang] = useState<"zh"|"en">("en");
  const t = (zh:string,en:string) => lang==="zh"?zh:en;

  // Sync lang with main site via localStorage
  useEffect(() => {
    const saved = localStorage.getItem("themis_lang") as "zh"|"en"|null;
    if (saved) setLang(saved);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "themis_lang" && e.newValue) setLang(e.newValue as "zh"|"en");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const animRef     = useRef<number>(0);

  // Scene state (refs for animation loop access)
  const panX        = useRef(0);
  const panY        = useRef(0);
  const sphereScale = useRef(2.2);        // default: zoomed in, seeing ~1/4 of sphere
  const rotY        = useRef(0);
  const rotX        = useRef(0.72);       // ~41° tilt, globe-on-its-side
  const autoRot     = useRef(true);
  const isDrag      = useRef(false);
  const lastMouse   = useRef({x:0,y:0});
  const isPinch     = useRef(false);
  const lastPinch   = useRef(0);

  const [nodes, setNodes] = useState<GridNode[]>([]);
  const [search, setSearch] = useState("");
  const [filterPair, setFilterPair] = useState<string|null>(null);
  const nodesRef = useRef<GridNode[]>([]);

  const [selectedNode, setSelectedNode] = useState<GridNode|null>(null);
  const [popupPos, setPopupPos]         = useState({x:0,y:0});

  const [collabActive,  setCollabActive]  = useState(false);
  const [collabNode,    setCollabNode]    = useState<CollabNode|null>(null);
  const [collabQuestion,setCollabQuestion] = useState("");
  const [collabStarted, setCollabStarted] = useState(false);
  const [myText,        setMyText]        = useState("");
  const [theirText,     setTheirText]     = useState("");
  const [myTokens,      setMyTokens]      = useState(0);
  const [collabDone,    setCollabDone]    = useState(false);
  const [priceAlerts,   setPriceAlerts]   = useState<{symbol:string;message:string;at:string}[]>([]);

  // Fetch pending price-alert notifications on load
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    fetch(`${AGENT_API}/api/agent/notifications?user_id=${encodeURIComponent(uid)}`)
      .then(r=>r.json())
      .then(d => { if (d.notifications?.length) setPriceAlerts(d.notifications); })
      .catch(()=>{});
  }, [user?.id]);

  // Place nodes on grid intersections
  useEffect(() => {
    fetch(`${AGENT_API}/api/collab/pool?limit=100`)
      .then(r=>r.json()).then(d=>place(d.nodes?.length?d.nodes:DEMO_NODES))
      .catch(()=>place(DEMO_NODES));
  }, []);

  function hashId(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function place(raw: CollabNode[]) {
    // Pre-sort all grid cells by distance from equator (latIdx closest to center first)
    // so early nodes land near the equator and spread outward as more join
    const equator = (LAT_LINES - 1) / 2;
    const cellsByDist = Array.from({ length: LAT_LINES * LON_LINES }, (_, i) => i)
      .sort((a, b) => {
        const distA = Math.abs(Math.floor(a / LON_LINES) - equator);
        const distB = Math.abs(Math.floor(b / LON_LINES) - equator);
        return distA !== distB ? distA - distB : a - b;
      });

    // Each node picks from equator-priority slots using its hash.
    // First node always gets slot 0 (closest equatorial cell) so it's guaranteed visible.
    const used = new Set<number>();
    const placed: GridNode[] = raw.map((n, i) => {
      // First node: pin to first equatorial slot; rest: hash-based within equatorial band
      const bandSize = Math.min(LON_LINES * 4, cellsByDist.length); // equatorial ±2 lat rows
      let slotIdx = i === 0 ? 0 : (hashId(n.user_id) % bandSize);
      while (used.has(slotIdx)) slotIdx = (slotIdx + 1) % cellsByDist.length;
      used.add(slotIdx);
      const idx = cellsByDist[slotIdx];
      const latIdx = Math.floor(idx / LON_LINES);
      const lonIdx = idx % LON_LINES;
      return { ...n, latIdx, lonIdx, phi: (latIdx + 1) * LAT_STEP, theta: lonIdx * LON_STEP };
    });
    setNodes(placed);
    nodesRef.current = placed;

    // Align rotY so the first (equatorial) node faces front on load.
    // rotX stays fixed at globe-tilt value — only longitude matters here.
    if (placed.length > 0) {
      const theta_t = placed[0].lonIdx * LON_STEP;
      rotY.current = theta_t - Math.PI / 2;
    }
  }

  const filteredNodes = nodes.filter(n => {
    const mp = !filterPair || n.specializations.includes(filterPair);
    const ms = !search || n.user_id.toLowerCase().includes(search.toLowerCase()) || n.specializations.some(s=>s.toLowerCase().includes(search.toLowerCase())) || strategyLabel(n.strategy_bias,"zh").includes(search);
    return mp && ms;
  });
  const filteredRef = useRef<GridNode[]>([]);
  filteredRef.current = filteredNodes;

  // ── Canvas loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let W = 0, H = 0;
    function resize() {
      const dpr = window.devicePixelRatio||1;
      W = canvas!.offsetWidth; H = canvas!.offsetHeight;
      canvas!.width  = W*dpr; canvas!.height = H*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    resize();
    window.addEventListener("resize", resize);

    // Stars (generated once)
    const STARS = Array.from({length:260},()=>({
      x: (Math.random()-.5)*4000, y: (Math.random()-.5)*4000,
      r: Math.random()*1.3, a: Math.random()*0.5+0.1,
    }));

    function rotate3D(x:number,y:number,z:number) {
      const rx=rotX.current, ry=rotY.current;
      const y2=y*Math.cos(rx)-z*Math.sin(rx);
      const z2=y*Math.sin(rx)+z*Math.cos(rx);
      const x2=x*Math.cos(ry)+z2*Math.sin(ry);
      const z3=-x*Math.sin(ry)+z2*Math.cos(ry);
      return {x:x2,y:y2,z:z3};
    }

    function project(p:{x:number,y:number,z:number}, R:number) {
      const FOV = 2400;
      const s = FOV/(FOV+p.z*0.3);
      const cx = W/2+panX.current, cy = H/2+panY.current;
      return {sx:cx+p.x*s, sy:cy-p.y*s, scale:s, depth:p.z, R};
    }

    function spherePt(theta:number, phi:number, R:number) {
      const x=R*Math.sin(phi)*Math.cos(theta);
      const y=R*Math.cos(phi);
      const z=R*Math.sin(phi)*Math.sin(theta);
      return rotate3D(x,y,z);
    }

    const TILT = 0.72; // ~41° axial tilt — globe-on-its-side feel
    let autoT = 0;    // internal time for tilt animation

    function draw() {
      if (autoRot.current) {
        autoT += 0.0025;
        rotY.current += 0.0025;
        // Tilt axis oscillates: rotX bobs gently around the fixed tilt angle
        if (!isDrag.current) rotX.current = TILT + Math.sin(autoT * 0.3) * 0.08;
      }
      ctx.clearRect(0,0,W,H);

      // ── Background ──
      ctx.fillStyle = "#030912";
      ctx.fillRect(0,0,W,H);

      // Infinite dot grid (canvas background)
      const DOT_SPACING = 48;
      const ox = ((W/2+panX.current) % DOT_SPACING + DOT_SPACING) % DOT_SPACING;
      const oy = ((H/2+panY.current) % DOT_SPACING + DOT_SPACING) % DOT_SPACING;
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      for (let gx = ox - DOT_SPACING; gx < W + DOT_SPACING; gx += DOT_SPACING) {
        for (let gy = oy - DOT_SPACING; gy < H + DOT_SPACING; gy += DOT_SPACING) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1.2, 0, Math.PI*2);
          ctx.fill();
        }
      }

      // Stars (pan with view, far away)
      STARS.forEach(s=>{
        const sx = W/2 + panX.current*0.05 + s.x;
        const sy = H/2 + panY.current*0.05 + s.y;
        if(sx<-50||sx>W+50||sy<-50||sy>H+50) return;
        ctx.beginPath();
        ctx.arc(sx,sy,s.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${s.a})`;
        ctx.fill();
      });

      const R = Math.min(W,H) * 0.46 * sphereScale.current;
      const cx = W/2+panX.current, cy = H/2+panY.current;

      // Sphere ambient glow
      const glow = ctx.createRadialGradient(cx,cy,R*0.3,cx,cy,R*1.6);
      glow.addColorStop(0,"rgba(30,100,255,0.06)");
      glow.addColorStop(0.5,"rgba(10,50,180,0.03)");
      glow.addColorStop(1,"transparent");
      ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);

      const STEPS = 100;

      // ── Latitude grid lines ──
      for (let li=1; li<=LAT_LINES; li++) {
        const phi = li * LAT_STEP;
        const isEquator = Math.abs(phi - Math.PI/2) < LAT_STEP * 0.6;
        ctx.beginPath();
        for (let j=0; j<=STEPS; j++) {
          const theta=(j/STEPS)*Math.PI*2;
          const p3=spherePt(theta,phi,R);
          const {sx,sy}=project(p3,R);
          if(j===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
        }
        ctx.closePath();
        ctx.strokeStyle = isEquator ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.28)";
        ctx.lineWidth   = isEquator ? 1.5 : 0.8;
        ctx.stroke();
      }

      // ── Longitude grid lines ──
      for (let li=0; li<LON_LINES; li++) {
        const theta = li * LON_STEP;
        ctx.beginPath();
        for (let j=0; j<=STEPS; j++) {
          const phi=(j/STEPS)*Math.PI;
          const p3=spherePt(theta,phi,R);
          const {sx,sy}=project(p3,R);
          if(j===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth   = 0.8;
        ctx.stroke();
      }

      // ── Compute projected nodes ──
      const fnodes = filteredRef.current;
      type ProjNode = {node:GridNode;sx:number;sy:number;scale:number;depth:number};
      const projected: ProjNode[] = fnodes.map(n=>{
        const theta = n.lonIdx*LON_STEP;
        const phi   = (n.latIdx+1)*LAT_STEP;
        const p3=spherePt(theta,phi,R);
        const pr=project(p3,R);
        return {node:n,...pr};
      });
      projected.sort((a,b)=>a.depth-b.depth);

      // Connection lines — subtle, only between close front-facing nodes
      for(let i=0;i<projected.length;i++){
        for(let j=i+1;j<projected.length;j++){
          const a=projected[i],b=projected[j];
          if((a.depth+b.depth)<0) continue; // both must be on front half
          const dx=a.sx-b.sx,dy=a.sy-b.sy;
          const dist=Math.sqrt(dx*dx+dy*dy);
          const threshold=R*0.35;
          if(dist<threshold){
            const alpha=(1-dist/threshold)*0.1;
            ctx.beginPath();
            ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy);
            ctx.strokeStyle=`rgba(255,255,255,${alpha})`;
            ctx.lineWidth=0.5;
            ctx.stroke();
          }
        }
      }

      // ── Draw nodes — white glowing dots only, no labels ──
      projected.forEach(({node,sx,sy,scale,depth})=>{
        const depthNorm=(depth+R)/(2*R);   // 0=back, 1=front
        if(depthNorm<0.15) return;         // skip far-back nodes

        const dotR = 5.5 * scale;
        const alpha = 0.4 + depthNorm * 0.6;

        // Wide soft glow
        const glowR = dotR + 16 * depthNorm;
        const glow = ctx.createRadialGradient(sx,sy,dotR*0.2,sx,sy,glowR);
        glow.addColorStop(0, `rgba(180,220,255,${alpha*0.5})`);
        glow.addColorStop(0.4, `rgba(140,200,255,${alpha*0.2})`);
        glow.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(sx,sy,glowR,0,Math.PI*2);
        ctx.fillStyle=glow; ctx.fill();

        // Core bright dot — distinct from grid
        ctx.beginPath(); ctx.arc(sx,sy,dotR,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${alpha})`;
        ctx.fill();

        // Sharp inner highlight
        ctx.beginPath(); ctx.arc(sx-dotR*0.25,sy-dotR*0.25,dotR*0.35,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${alpha*0.6})`;
        ctx.fill();
      });

      animRef.current=requestAnimationFrame(draw);
    }

    animRef.current=requestAnimationFrame(draw);
    return ()=>{cancelAnimationFrame(animRef.current);window.removeEventListener("resize",resize);};
  }, [nodes]);

  // ── Mouse / touch events ──────────────────────────────────────────────────
  const onMouseDown = useCallback((e:React.MouseEvent)=>{
    isDrag.current=true; autoRot.current=false;
    lastMouse.current={x:e.clientX,y:e.clientY};
  },[]);

  const onMouseMove = useCallback((e:React.MouseEvent)=>{
    if(!isDrag.current) return;
    const dx=e.clientX-lastMouse.current.x;
    const dy=e.clientY-lastMouse.current.y;
    lastMouse.current={x:e.clientX,y:e.clientY};
    // Rotate when dragging on sphere center, pan when far
    rotY.current += dx*0.004;
    rotX.current = Math.max(-Math.PI/3, Math.min(Math.PI/3, rotX.current+dy*0.004));
  },[]);

  const onMouseUp = useCallback(()=>{
    isDrag.current=false;
    setTimeout(()=>{autoRot.current=true;},2500);
  },[]);

  const onWheel = useCallback((e:React.WheelEvent)=>{
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.04 : 0.04;
    sphereScale.current = Math.max(0.3, Math.min(4.0, sphereScale.current+delta));
  },[]);

  // Click to select node
  const onCanvasClick = useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const W=canvas.offsetWidth, H=canvas.offsetHeight;
    const R=Math.min(W,H)*0.46*sphereScale.current;

    let best:GridNode|null=null, bestDist=45;
    filteredRef.current.forEach(n=>{
      const theta=n.lonIdx*LON_STEP, phi=(n.latIdx+1)*LAT_STEP;
      const ox=R*Math.sin(phi)*Math.cos(theta);
      const oy=R*Math.cos(phi);
      const oz=R*Math.sin(phi)*Math.sin(theta);
      const rx=rotX.current,ry=rotY.current;
      const y2=oy*Math.cos(rx)-oz*Math.sin(rx);
      const z2=oy*Math.sin(rx)+oz*Math.cos(rx);
      const x2=ox*Math.cos(ry)+z2*Math.sin(ry);
      const z3=-ox*Math.sin(ry)+z2*Math.cos(ry);
      const FOV=2400, s=FOV/(FOV+z3*0.3);
      const sx=W/2+panX.current+x2*s;
      const sy=H/2+panY.current-y2*s;
      const dist=Math.sqrt((mx-sx)**2+(my-sy)**2);
      if(dist<bestDist){bestDist=dist;best=n;}
    });

    if(best){
      setSelectedNode(best);
      setPopupPos({x:Math.min(e.clientX-rect.left+16,W-288),y:Math.max(60,e.clientY-rect.top-180)});
    } else {
      setSelectedNode(null);
    }
  },[]);

  function startCollab(node:CollabNode){
    setSelectedNode(null);setCollabNode(node);setCollabActive(true);
    setCollabStarted(false);setMyText("");setTheirText("");setCollabDone(false);setMyTokens(0);
  }

  async function runCollab(question: string){
    if(!collabNode||!question.trim()) return;
    setCollabStarted(true);setMyText("");setTheirText("");setCollabDone(false);setMyTokens(0);

    const myNodeData = {
      user_id: user?.id||"me",
      specializations:["BTC","ETH"], skills:["核心策略引擎"],
      mode:"public", evolution_level:2, strategy_bias:"technical",
      risk_preference:"moderate", stats:{requests_total:12,requests_today:1,accuracy_rate:0.74},
    };

    const body = {
      user_id: user?.id||"me",
      peer_user_id: collabNode.user_id,
      question,
      lang,
      my_node: myNodeData,
      peer_node: collabNode,
    };

    let myDone = false, theirDone = false;

    // Parallel SSE streams
    async function streamFrom(endpoint: string, setter: React.Dispatch<React.SetStateAction<string>>, tokenSetter?: React.Dispatch<React.SetStateAction<number>>) {
      const res = await fetch(`${AGENT_API}/api/collab/${endpoint}`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while(true){
        const {done, value} = await reader.read();
        if(done) break;
        buf += decoder.decode(value, {stream:true});
        const parts = buf.split("\n\n");
        buf = parts.pop()!;
        for(const part of parts){
          if(!part.startsWith("data:")) continue;
          const raw = part.slice(5).trim();
          if(raw==="[DONE]") break;
          try{
            const ev = JSON.parse(raw);
            if(ev.type==="chunk") setter(p => p + stripMd(ev.text));
            if(ev.type==="done" && tokenSetter && ev.tokens) tokenSetter(ev.tokens);
          } catch{}
        }
      }
    }

    Promise.all([
      streamFrom("analyze", setMyText, setMyTokens).then(()=>{ myDone=true; if(theirDone) onBothDone(); }),
      streamFrom("analyze/peer", setTheirText).then(()=>{ theirDone=true; if(myDone) onBothDone(); }),
    ]);

    function onBothDone() {
      setCollabDone(true);
      // Optimistically update the peer node's stats in local state (backend already incremented via analyze endpoints)
      setNodes(prev => prev.map(n =>
        n.user_id === collabNode!.user_id
          ? { ...n, stats: { ...n.stats!, requests_total: (n.stats?.requests_total??0)+1, requests_today: (n.stats?.requests_today??0)+1 } }
          : n
      ));
    }
  }

  // Detect verdict from free text
  const myBull  = myText.includes("看多")||myText.toLowerCase().includes("bullish");
  const thBull  = theirText.includes("看多")||theirText.toLowerCase().includes("bullish");
  const myBear  = myText.includes("看空")||myText.toLowerCase().includes("bearish");
  const thBear  = theirText.includes("看空")||theirText.toLowerCase().includes("bearish");
  const consensus = collabDone && myText.length > 20 && theirText.length > 20;

  return (
    <div style={{width:"100vw",height:"100vh",overflow:"hidden",background:"#030912",display:"flex",flexDirection:"column",position:"relative"}}>

      {/* Top bar */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:54,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",zIndex:200,background:"linear-gradient(to bottom,rgba(3,9,18,0.92) 70%,transparent)"}}>
        <div style={{display:"flex",alignItems:"center",gap:18}}>
          <Link href="/" style={{fontFamily:M,fontSize:13,fontWeight:800,color:"#fff",textDecoration:"none",letterSpacing:"0.12em"}}>THEMIS</Link>
          <span style={{color:"rgba(255,255,255,0.1)"}}>·</span>
          <span style={{fontFamily:M,fontSize:10,fontWeight:700,color:"rgba(60,160,255,0.75)",letterSpacing:"0.18em"}}>{t("协作节点网络","COLLAB NETWORK")}</span>
          <span style={{fontFamily:M,fontSize:9,color:"rgba(255,255,255,0.2)"}}>{filteredNodes.length} {t("节点","nodes")}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Zoom controls */}
          <div style={{display:"flex",gap:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,overflow:"hidden"}}>
            <button onClick={()=>{sphereScale.current=Math.min(4.0,sphereScale.current+0.4);}} style={{fontFamily:M,fontSize:14,color:"rgba(255,255,255,0.5)",background:"none",border:"none",padding:"4px 12px",cursor:"pointer",lineHeight:1}}>+</button>
            <div style={{width:1,background:"rgba(255,255,255,0.08)"}}/>
            <button onClick={()=>{sphereScale.current=Math.max(0.3,sphereScale.current-0.4);}} style={{fontFamily:M,fontSize:14,color:"rgba(255,255,255,0.5)",background:"none",border:"none",padding:"4px 12px",cursor:"pointer",lineHeight:1}}>−</button>
          </div>
          <Link href="/agent" style={{fontFamily:M,fontSize:10,fontWeight:700,color:"#fff",background:"#0047cc",border:"none",borderRadius:8,padding:"7px 16px",textDecoration:"none",letterSpacing:"0.08em"}}>
            {t("我的 Agent","My Agent")}
          </Link>
        </div>
      </div>

      {/* Search bar — floating */}
      <div style={{position:"absolute",top:66,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:8,zIndex:200,background:"rgba(3,10,24,0.82)",backdropFilter:"blur(18px)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"7px 12px",whiteSpace:"nowrap"}}>
        <span style={{fontSize:13,color:"rgba(255,255,255,0.2)"}}>⌕</span>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={t("搜索节点…","Search…")}
          style={{fontFamily:M,fontSize:10,background:"transparent",border:"none",color:"#fff",outline:"none",width:160,letterSpacing:"0.04em"}}/>
        <div style={{width:1,height:14,background:"rgba(255,255,255,0.1)"}}/>
        {PAIRS.map(p=>(
          <button key={p} onClick={()=>setFilterPair(filterPair===p?null:p)}
            style={{fontFamily:M,fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:filterPair===p?"#fff":"rgba(255,255,255,0.3)",background:filterPair===p?"#0047cc":"transparent",border:filterPair===p?"1px solid #0047cc":"1px solid transparent",borderRadius:5,padding:"3px 8px",cursor:"pointer"}}>
            {p}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onWheel={onWheel} onClick={onCanvasClick}
        style={{width:"100%",height:"100%",display:"block",cursor:"grab"}}/>

      {/* Hint */}
      <div style={{position:"absolute",bottom:collabActive?368:20,left:"50%",transform:"translateX(-50%)",fontFamily:M,fontSize:8,color:"rgba(255,255,255,0.16)",letterSpacing:"0.14em",pointerEvents:"none",whiteSpace:"nowrap",transition:"bottom 0.3s"}}>
        {t("拖拽旋转 · 滚轮缩放 · 点击节点查看详情","DRAG TO ROTATE · SCROLL TO ZOOM · CLICK NODE")}
      </div>

      {/* Node popup */}
      {selectedNode&&(
        <NodePopup node={selectedNode} pos={popupPos} lang={lang}
          onClose={()=>setSelectedNode(null)} onCollab={()=>startCollab(selectedNode)}/>
      )}

      {/* Collab drawer */}
      {collabActive&&collabNode&&(
        <CollabDrawer
          myNode={{user_id:user?.id||"me",specializations:["BTC","ETH"],skills:["核心策略引擎"],mode:"public",evolution_level:2,strategy_bias:"technical",risk_preference:"moderate",stats:{requests_total:12,requests_today:1,accuracy_rate:0.74},avatar_url:user?.imageUrl}}
          theirNode={collabNode}
          question={collabQuestion} onQuestionChange={setCollabQuestion}
          onRun={runCollab} onClose={()=>{setCollabActive(false);setCollabStarted(false);}}
          started={collabStarted} myText={myText} theirText={theirText} myTokens={myTokens}
          collabDone={collabDone} consensusMatch={consensus}
          consensusBull={myBull&&thBull} consensusMix={(myBull||myBear)&&(thBull||thBear)&&myBull!==thBull} lang={lang}
          priceAlerts={priceAlerts} onDismissAlert={(i)=>setPriceAlerts(a=>a.filter((_,idx)=>idx!==i))}/>
      )}
    </div>
  );
}

// ── Node Popup ────────────────────────────────────────────────────────────────
function NodePopup({node,pos,lang,onClose,onCollab}:{node:GridNode;pos:{x:number;y:number};lang:string;onClose:()=>void;onCollab:()=>void}){
  const t=(zh:string,en:string)=>lang==="zh"?zh:en;
  const color=strategyColor(node.strategy_bias);
  const acc=node.stats?.accuracy_rate??0;
  return(
    <div style={{position:"absolute",left:pos.x,top:pos.y,width:268,zIndex:400,background:"rgba(4,10,28,0.97)",border:`1px solid ${color}55`,borderRadius:16,padding:"18px",boxShadow:`0 0 40px ${color}22,0 16px 48px rgba(0,0,0,0.8)`,backdropFilter:"blur(24px)"}}>
      <button onClick={onClose} style={{position:"absolute",top:12,right:12,background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:14}}>✕</button>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${color}99,${color}22)`,border:`2px solid ${color}88`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:M,fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>
          {shortId(node.user_id).slice(0,2)}
        </div>
        <div>
          <div style={{fontFamily:M,fontSize:11,fontWeight:700,color:"#fff",letterSpacing:"0.06em"}}>{shortId(node.user_id)}</div>
          <div style={{display:"flex",gap:3,marginTop:4}}>
            {Array.from({length:5}).map((_,i)=>(
              <div key={i} style={{width:6,height:6,borderRadius:"50%",background:i<(node.evolution_level||1)?color:"rgba(255,255,255,0.1)"}}/>
            ))}
            <span style={{fontFamily:M,fontSize:8,color:"rgba(255,255,255,0.35)",marginLeft:3}}>Lv.{node.evolution_level||1}</span>
          </div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
        {([
          [t("策略风格","Strategy"), strategyLabel(node.strategy_bias,lang), color],
          [t("风险偏好","Risk"), node.risk_preference==="aggressive"?t("激进","Aggressive"):node.risk_preference==="conservative"?t("保守","Conservative"):t("稳健","Moderate"), undefined],
          [t("专注方向","Focus"), (node.specializations||[]).join(" · "), undefined],
          [t("累计协作","Collabs"), `${node.stats?.requests_total??0} ${t("次","")}`, undefined],
          ...(acc>0?[[t("历史准确率","Accuracy"),`${(acc*100).toFixed(0)}%`,"#34d399"]]:[] as any),
        ] as [string,string,string|undefined][]).map(([label,value,c])=>(
          <div key={label} style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontFamily:M,fontSize:9,color:"rgba(255,255,255,0.3)"}}>{label}</span>
            <span style={{fontFamily:M,fontSize:9,fontWeight:600,color:c||"rgba(255,255,255,0.75)"}}>{value}</span>
          </div>
        ))}
      </div>
      {(node.skills||[]).length>0&&(
        <div style={{marginBottom:14}}>
          <div style={{fontFamily:M,fontSize:8,color:"rgba(255,255,255,0.25)",letterSpacing:"0.12em",marginBottom:5}}>SKILLS</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {node.skills.map(s=>(
              <span key={s} style={{fontFamily:M,fontSize:8,color:"#a78bfa",background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:5,padding:"2px 7px"}}>{s}</span>
            ))}
          </div>
        </div>
      )}
      <button onClick={onCollab} style={{width:"100%",fontFamily:M,fontSize:11,fontWeight:800,color:"#fff",background:`linear-gradient(135deg,${color}dd,${color}88)`,border:"none",borderRadius:10,padding:"11px",cursor:"pointer",letterSpacing:"0.1em",boxShadow:`0 4px 20px ${color}44`}}>
        {t("▶ 发起协作","▶ START COLLAB")}
      </button>
    </div>
  );
}

// ── Collab Drawer ─────────────────────────────────────────────────────────────
function CollabDrawer({myNode,theirNode,question,onQuestionChange,onRun,onClose,started,myText,theirText,myTokens,collabDone,consensusMatch,consensusBull,consensusMix,lang,priceAlerts,onDismissAlert}:{
  myNode:CollabNode;theirNode:CollabNode;
  question:string;onQuestionChange:(q:string)=>void;
  onRun:(q:string)=>void;onClose:()=>void;
  started:boolean;myText:string;theirText:string;myTokens:number;
  collabDone:boolean;consensusMatch:boolean;consensusBull:boolean;consensusMix:boolean;lang:string;
  priceAlerts?:{symbol:string;message:string;at:string}[];
  onDismissAlert?:(i:number)=>void;
}){
  const t=(zh:string,en:string)=>lang==="zh"?zh:en;
  const myC=strategyColor(myNode.strategy_bias), thC=strategyColor(theirNode.strategy_bias);
  const mRef=useRef<HTMLDivElement>(null), tRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{mRef.current?.scrollTo(0,9999);},[myText]);
  useEffect(()=>{tRef.current?.scrollTo(0,9999);},[theirText]);

  const QUICK = lang==="zh"
    ? ["现在适合建仓吗？","多空双方力量对比？","主要风险在哪里？","短期支撑位和压力位？"]
    : ["Good time to enter a position?","Bull vs bear strength right now?","Key risk factors?","Key support and resistance levels?"];

  return(
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:520,background:"rgba(2,7,20,0.98)",borderTop:"1px solid rgba(60,150,255,0.15)",backdropFilter:"blur(24px)",zIndex:500,display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <div style={{height:42,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 8px #34d399"}}/>
          <span style={{fontFamily:M,fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.7)",letterSpacing:"0.12em"}}>{t("协作会话","COLLAB SESSION")}</span>
          <span style={{fontFamily:M,fontSize:9,color:"rgba(255,255,255,0.18)"}}>{shortId(myNode.user_id)} × {shortId(theirNode.user_id)}</span>
          {myTokens>0&&<span style={{fontFamily:M,fontSize:8,color:"#f59e0b",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.18)",borderRadius:5,padding:"2px 8px"}}>{myTokens} tokens</span>}
        </div>
        <button onClick={onClose} style={{fontFamily:M,fontSize:10,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:7,padding:"5px 14px",cursor:"pointer"}}>{t("关闭","Close")}</button>
      </div>

      {/* Price alert banners */}
      {priceAlerts&&priceAlerts.length>0&&(
        <div style={{padding:"6px 16px",display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
          {priceAlerts.map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,background:"rgba(245,158,11,0.10)",border:"1px solid rgba(245,158,11,0.28)",borderRadius:8,padding:"7px 12px"}}>
              <span style={{fontSize:14,flexShrink:0}}>⚡</span>
              <span style={{fontFamily:M,fontSize:10,color:"rgba(255,220,100,0.9)",flex:1,lineHeight:1.7,whiteSpace:"pre-line"}}>{a.message}</span>
              <button onClick={()=>onDismissAlert?.(i)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",cursor:"pointer",fontSize:13,flexShrink:0,padding:0,marginTop:1}}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{padding:"9px 20px 8px",borderBottom:"1px solid rgba(255,255,255,0.04)",flexShrink:0}}>
        <div style={{display:"flex",gap:8,marginBottom:6}}>
          <div style={{flex:1,display:"flex",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"9px 16px",alignItems:"center"}}>
            <input
              value={question} onChange={e=>onQuestionChange(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&((e.nativeEvent as any).isComposing))return; if(e.key==="Enter"&&!question.trim())return; if(e.key==="Enter"&&(!started||collabDone))onRun(question);}}
              placeholder={t("用自然语言描述你的分析需求，例如：BTC 现在适合建仓吗？","Ask anything — e.g. Is now a good time to buy BTC?")}
              disabled={started&&!collabDone}
              style={{flex:1,fontFamily:"system-ui,sans-serif",fontSize:13,background:"transparent",border:"none",color:"rgba(255,255,255,0.85)",outline:"none"}}/>
          </div>
          <button
            onClick={()=>{if(!started||collabDone)onRun(question);}}
            disabled={(started&&!collabDone)||!question.trim()}
            style={{fontFamily:M,fontSize:10,fontWeight:800,color:"#fff",background:started&&!collabDone?"rgba(255,255,255,0.06)":"#0047cc",border:"none",borderRadius:10,padding:"0 22px",cursor:(started&&!collabDone)||!question.trim()?"not-allowed":"pointer",letterSpacing:"0.08em",boxShadow:started&&!collabDone?"none":"0 2px 14px rgba(0,71,204,0.5)",opacity:(started&&!collabDone)||!question.trim()?0.45:1,whiteSpace:"nowrap",transition:"all 0.15s"}}>
            {started&&!collabDone?t("分析中…","Analyzing…"):collabDone?t("▶ 继续提问","▶ Ask Again"):t("▶ 发起协作","▶ Collaborate")}
          </button>
        </div>
        {(!started||collabDone)&&<div style={{display:"flex",gap:5,flexWrap:"wrap" as const}}>
          {QUICK.map(q=>(
            <button key={q} onClick={()=>onQuestionChange(q)}
              style={{fontFamily:"system-ui,sans-serif",fontSize:11,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:6,padding:"3px 10px",cursor:"pointer"}}>
              {q}
            </button>
          ))}
        </div>}
      </div>

      {/* Dual panels */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 28px 1fr",overflow:"hidden"}}>
        <AgentPanel node={myNode} label={t("我的 Agent","My Agent")} color={myC} text={myText} started={started} lang={lang} ref={mRef} isMe/>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderLeft:"1px solid rgba(255,255,255,0.04)",borderRight:"1px solid rgba(255,255,255,0.04)"}}>
          <div style={{width:1,flex:1,background:"linear-gradient(to bottom,transparent,rgba(60,150,255,0.25),transparent)"}}/>
          <span style={{fontFamily:M,fontSize:6,color:"rgba(60,150,255,0.3)",writingMode:"vertical-rl",letterSpacing:"0.2em"}}>SYNC</span>
          <div style={{width:1,flex:1,background:"linear-gradient(to bottom,transparent,rgba(60,150,255,0.25),transparent)"}}/>
        </div>
        <AgentPanel node={theirNode} label={t("协作节点","Collab Node")} color={thC} text={theirText} started={started} lang={lang} ref={tRef}/>
      </div>

      {/* Consensus */}
      {consensusMatch&&(
        <div style={{height:34,flexShrink:0,borderTop:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",gap:14,background:consensusMix?"rgba(245,158,11,0.05)":consensusBull?"rgba(52,211,153,0.05)":"rgba(248,113,113,0.05)"}}>
          <span style={{fontFamily:M,fontSize:8,color:"rgba(255,255,255,0.2)",letterSpacing:"0.14em"}}>{t("网络共识","NETWORK CONSENSUS")}</span>
          <span style={{fontFamily:M,fontSize:11,fontWeight:800,color:consensusMix?"#f59e0b":consensusBull?"#34d399":"#f87171"}}>
            {consensusMix?t("⚡ 双节点信号分歧，建议观望","⚡ DIVERGENT — WAIT & OBSERVE"):consensusBull?t("▲ 双节点一致看多","▲ BOTH BULLISH — ALIGNED"):t("▼ 双节点一致看空","▼ BOTH BEARISH — ALIGNED")}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Radar Chart ───────────────────────────────────────────────────────────────
function buildRadarValues(node: CollabNode, confidenceOverride?: number): number[] {
  const bias = node.strategy_bias || "technical";
  const risk = node.risk_preference || "moderate";
  const evLv = node.evolution_level || 1;
  const acc  = node.stats?.accuracy_rate ?? 0.7;

  // axes: [trend, momentum, riskAppetite, confidence, signalClarity]
  const base = {
    technical: [0.82, 0.75, 0.55, acc, 0.78],
    onchain:   [0.55, 0.60, 0.45, acc, 0.88],
    macro:     [0.70, 0.50, 0.65, acc, 0.72],
  }[bias] || [0.65, 0.60, 0.55, acc, 0.70];

  const riskMod = risk === "aggressive" ? 0.18 : risk === "conservative" ? -0.12 : 0;
  const evBoost = (evLv - 1) * 0.04;

  const vals = base.map((v, i) => {
    let x = v + evBoost;
    if (i === 2) x += riskMod; // riskAppetite axis
    if (i === 3 && confidenceOverride !== undefined) x = confidenceOverride / 100;
    return Math.min(0.97, Math.max(0.18, x));
  });
  return vals;
}

function RadarChart({ node, color, confidenceOverride, animate, lang }: {
  node: CollabNode; color: string; confidenceOverride?: number; animate: boolean; lang: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const progressRef = useRef(0);

  const labels = lang === "zh"
    ? ["趋势", "动能", "风险", "准确率", "信号"]
    : ["Trend", "Mom.", "Risk", "Acc.", "Signal"];
  const values = buildRadarValues(node, confidenceOverride);
  const SIZE   = 110;
  const CX = SIZE / 2, CY = SIZE / 2 + 4;
  const R  = 40;
  const AXES = 5;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const ratio = window.devicePixelRatio || 1;
    canvas.width  = SIZE * ratio;
    canvas.height = SIZE * ratio;
    canvas.style.width  = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    ctx.scale(ratio, ratio);

    const draw = (progress: number) => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // grid rings
      for (let ring = 1; ring <= 4; ring++) {
        const r = (R * ring) / 4;
        ctx.beginPath();
        for (let a = 0; a < AXES; a++) {
          const angle = (a / AXES) * Math.PI * 2 - Math.PI / 2;
          const x = CX + r * Math.cos(angle);
          const y = CY + r * Math.sin(angle);
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = ring === 4 ? `${color}30` : "rgba(255,255,255,0.06)";
        ctx.lineWidth = ring === 4 ? 0.8 : 0.5;
        ctx.stroke();
      }

      // axis spokes
      for (let a = 0; a < AXES; a++) {
        const angle = (a / AXES) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(CX + R * Math.cos(angle), CY + R * Math.sin(angle));
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // data polygon
      const pts = values.map((v, a) => {
        const angle = (a / AXES) * Math.PI * 2 - Math.PI / 2;
        const r = R * v * progress;
        return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)] as [number, number];
      });

      ctx.beginPath();
      pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.closePath();
      const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, R);
      grad.addColorStop(0, `${color}55`);
      grad.addColorStop(1, `${color}18`);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = `${color}cc`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // dots
      pts.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

      // labels
      ctx.font = `500 7px ${M}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      values.forEach((_, a) => {
        const angle = (a / AXES) * Math.PI * 2 - Math.PI / 2;
        const lx = CX + (R + 11) * Math.cos(angle);
        const ly = CY + (R + 11) * Math.sin(angle);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillText(labels[a], lx, ly);
      });
    };

    if (!animate) { draw(1); return; }

    progressRef.current = 0;
    const step = () => {
      progressRef.current = Math.min(1, progressRef.current + 0.04);
      draw(progressRef.current);
      if (progressRef.current < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [animate, color, confidenceOverride, lang]);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

// ── Agent Panel with terminal boot sequence ───────────────────────────────────
const AgentPanel=React.forwardRef<HTMLDivElement,{node:CollabNode;label:string;color:string;text:string;started:boolean;lang:string;isMe?:boolean;}>(
  function AgentPanel({node,label,color,text,started,lang,isMe},ref){
    const t=(zh:string,en:string)=>lang==="zh"?zh:en;
    const acc=node.stats?.accuracy_rate??0;
    const evLv=node.evolution_level||1;

    // extract confidence % from AI output, e.g. "置信度 73%" or "Confidence 73%"
    const confidenceMatch = text.match(/置信度\s*(\d+)%|[Cc]onfidence\s*(\d+)%/);
    const confidenceVal = confidenceMatch
      ? parseInt(confidenceMatch[1] || confidenceMatch[2])
      : undefined;

    // extract verdict for color hint
    const isBull = /看多|[Bb]ullish/.test(text);
    const isBear = /看空|[Bb]earish/.test(text);
    const verdictColor = isBull ? "#34d399" : isBear ? "#f87171" : "#f59e0b";

    // split text into body + last verdict line
    const lines = text.trimEnd().split("\n");
    const lastLine = lines[lines.length - 1] || "";
    const isVerdictLine = /核心判断|[Cc]ore verdict/.test(lastLine);
    const bodyText = isVerdictLine ? lines.slice(0, -1).join("\n") : text;
    const verdictLine = isVerdictLine ? lastLine : "";

    // Boot sequence lines
    const bootLines = lang==="zh"
      ? [
          `▸ 初始化协作会话...`,
          `▸ 载入 Agent [${strategyLabel(node.strategy_bias,"zh")} · Lv.${evLv}]`,
          `▸ 注入进化状态 [${(evLv/5*100).toFixed(0)}%]`,
          acc>0?`▸ 历史准确率 ${(acc*100).toFixed(0)}% · ${node.stats?.requests_total??0} 次协作`:`▸ 新节点，首次协作`,
          `▸ 连接协作网络... OK`,
          `▸ 开始分析...`,
          `─`.repeat(36),
        ]
      : [
          `▸ init collab session...`,
          `▸ loading agent [${strategyLabel(node.strategy_bias,"en")} · Lv.${evLv}]`,
          `▸ injecting evolution state [${(evLv/5*100).toFixed(0)}%]`,
          acc>0?`▸ accuracy ${(acc*100).toFixed(0)}% · ${node.stats?.requests_total??0} sessions`:`▸ new node, first collab`,
          `▸ connecting to collab network... OK`,
          `▸ starting analysis...`,
          `─`.repeat(36),
        ];

    const [visibleBoot, setVisibleBoot] = useState<string[]>([]);
    const [bootDone, setBootDone] = useState(false);
    const bootRef = useRef(false);

    useEffect(()=>{
      if(!started){ setVisibleBoot([]); setBootDone(false); bootRef.current=false; return; }
      if(bootRef.current) return;
      bootRef.current=true;
      setVisibleBoot([]); setBootDone(false);
      let i=0;
      const interval=setInterval(()=>{
        if(i<bootLines.length){ setVisibleBoot(p=>[...p,bootLines[i]]); i++; }
        else{ clearInterval(interval); setBootDone(true); }
      }, 180);
      return ()=>clearInterval(interval);
    },[started]);

    return(
      <div style={{display:"flex",flexDirection:"column",overflow:"hidden",padding:"10px 14px"}}>
        {/* Panel header */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexShrink:0}}>
          {isMe&&node.avatar_url
            ?<img src={node.avatar_url} style={{width:22,height:22,borderRadius:"50%",border:`1.5px solid ${color}`,objectFit:"cover"}} alt=""/>
            :<div style={{width:22,height:22,borderRadius:"50%",background:`linear-gradient(135deg,${color}88,${color}22)`,border:`1.5px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:M,fontSize:7,fontWeight:800,color:"#fff"}}>{shortId(node.user_id).slice(0,2)}</div>
          }
          <span style={{fontFamily:M,fontSize:10,fontWeight:700,color,letterSpacing:"0.07em"}}>{label}</span>
          <span style={{fontFamily:M,fontSize:8,color:"rgba(255,255,255,0.2)"}}>{strategyLabel(node.strategy_bias,lang)} · Lv.{evLv}{acc>0?` · ${(acc*100).toFixed(0)}%`:""}</span>
          {isMe&&<span style={{marginLeft:"auto",fontFamily:M,fontSize:7,color,background:`${color}12`,border:`1px solid ${color}28`,borderRadius:4,padding:"2px 6px",letterSpacing:"0.1em"}}>LOCAL</span>}
        </div>

        {/* Radar + terminal side by side */}
        <div style={{display:"flex",gap:10,marginBottom:6,flexShrink:0}}>
          {/* Radar chart */}
          <div style={{flexShrink:0,background:"rgba(0,0,0,0.3)",borderRadius:8,border:`1px solid ${color}18`,padding:"4px",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <RadarChart node={node} color={color} confidenceOverride={confidenceVal} animate={bootDone} lang={lang}/>
          </div>
          {/* Boot log */}
          <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
            {started&&visibleBoot.map((line,i)=>(
              <div key={i} style={{fontFamily:M,fontSize:8,lineHeight:1.8,color:line.startsWith("─")?`${color}40`:i===visibleBoot.length-1&&!bootDone?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.25)",letterSpacing:"0.05em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {line}
              </div>
            ))}
            {!started&&(
              <span style={{fontFamily:M,fontSize:8,color:"rgba(255,255,255,0.1)"}}>{t("等待协作指令…","awaiting task…")}</span>
            )}
          </div>
        </div>

        {/* AI text output */}
        <div ref={ref} style={{flex:1,overflow:"auto",background:"rgba(0,0,0,0.35)",borderRadius:8,border:`1px solid ${color}14`,padding:"10px 13px",scrollbarWidth:"none"}}>
          {bootDone&&(
            <>
              {bodyText?(
                <p style={{fontFamily:"system-ui,-apple-system,sans-serif",fontSize:12,color:"rgba(255,255,255,0.82)",lineHeight:1.85,margin:"0 0 8px",whiteSpace:"pre-wrap",letterSpacing:"0.01em"}}>
                  {bodyText}
                  {!verdictLine&&<span style={{color,opacity:0.6}}>▌</span>}
                </p>
              ):(
                <span style={{fontFamily:M,fontSize:8,color:"rgba(255,255,255,0.18)"}}>{t("生成中…","generating…")}</span>
              )}
              {/* Verdict highlight */}
              {verdictLine&&(
                <div style={{marginTop:4,padding:"7px 12px",borderRadius:7,background:`${verdictColor}12`,border:`1px solid ${verdictColor}35`,fontFamily:M,fontSize:10,fontWeight:700,color:verdictColor,letterSpacing:"0.05em"}}>
                  {verdictLine}
                </div>
              )}
            </>
          )}
          {!bootDone&&started&&(
            <span style={{fontFamily:M,fontSize:8,color:"rgba(255,255,255,0.1)"}}>{t("初始化中…","initializing…")}</span>
          )}
        </div>
      </div>
    );
  }
);
