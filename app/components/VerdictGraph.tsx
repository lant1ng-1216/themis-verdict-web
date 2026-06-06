"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import Link from "next/link";

interface VerdictNode {
  id: string;
  symbol: string;
  conclusion: "bearish" | "bullish" | "neutral";
  confidence: number;
  regime: string;
  regime_color: string;
  intensity: number;
  timestamp: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  depth?: number;
}

interface VerdictEdge {
  id: string;
  source: string | VerdictNode;
  target: string | VerdictNode;
  relation: "同向" | "反向" | "联动" | "diverge";
  strength: number;
  label: string;
  labelZh: string;
  color: string;
}

const SYMBOL_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  BNB: "#f3ba2f",
  SOL: "#9945ff",
};

const CMC_IDS: Record<string, number> = {
  BTC: 1,
  ETH: 1027,
  BNB: 1839,
  SOL: 5426,
};

const CONCLUSION_COLORS = {
  bearish: "#e8193c",
  bullish: "#00954a",
  neutral: "#d4800a",
};

function generateMockData(): { nodes: VerdictNode[]; edges: VerdictEdge[] } {
  const symbols = ["BTC", "ETH", "BNB", "SOL"];
  const conclusions: Array<"bearish" | "bullish" | "neutral"> = ["bearish", "bullish", "neutral"];
  const regimes = [
    { label: "PANIC SELLOFF", color: "red" },
    { label: "BEAR TREND", color: "red" },
    { label: "ACCUMULATION", color: "yellow" },
    { label: "RECOVERY", color: "green" },
    { label: "BULL TREND", color: "green" },
  ];
  const nodes: VerdictNode[] = [];
  const now = new Date();
  for (let round = 0; round < 3; round++) {
    for (const sym of symbols) {
      const conclusion = conclusions[Math.floor(Math.random() * conclusions.length)];
      const regime = regimes[Math.floor(Math.random() * regimes.length)];
      const ts = new Date(now.getTime() - (2 - round) * 3600 * 1000);
      nodes.push({
        id: `node_${round}_${sym}`,
        symbol: sym,
        conclusion,
        confidence: Math.round(40 + Math.random() * 50),
        regime: regime.label,
        regime_color: regime.color,
        intensity: Math.round(20 + Math.random() * 60),
        timestamp: ts.toISOString(),
        depth: Math.random(),
      });
    }
  }
  const edges: VerdictEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const timeDiff = Math.abs(new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (timeDiff > 7200000 && a.symbol !== b.symbol) continue;
      if (Math.random() > 0.4) continue;
      const sameDir = a.conclusion === b.conclusion;
      const sameSym = a.symbol === b.symbol;
      const strength = Math.round((a.confidence + b.confidence) / 200 * 100) / 100;
      let relation: VerdictEdge["relation"];
      let color: string;
      let label: string;
      let labelZh: string;
      if (sameSym) {
        relation = sameDir ? "同向" : "反向";
        color = sameDir ? "#00954a" : "#e8193c";
        label = sameDir ? `${a.symbol} sustained ${a.conclusion}` : `${a.symbol} signal reversal`;
        labelZh = sameDir ? `${a.symbol}持续${a.conclusion === "bearish" ? "看空" : "看多"}` : `${a.symbol}信号反转`;
      } else if (sameDir) {
        relation = "联动";
        color = "#0047cc";
        label = `${a.symbol}/${b.symbol} co-movement`;
        labelZh = `${a.symbol}与${b.symbol}联动`;
      } else {
        relation = "diverge";
        color = "#9945ff";
        label = `${a.symbol}/${b.symbol} divergence`;
        labelZh = `${a.symbol}/${b.symbol}分歧`;
      }
      edges.push({ id: `edge_${i}_${j}`, source: a.id, target: b.id, relation, strength, label, labelZh, color });
    }
  }
  return { nodes, edges };
}

export default function VerdictGraph({ symbols: symbolsProp, lang: langProp, setLang: setLangProp }: { symbols?: string[]; lang?: string; setLang?: (l: string) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<VerdictNode[]>([]);
  const [edges, setEdges] = useState<VerdictEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<VerdictNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<VerdictEdge | null>(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [isLive, setIsLive] = useState(true);
  const simulationRef = useRef<d3.Simulation<VerdictNode, VerdictEdge> | null>(null);
  const nodesRef = useRef<VerdictNode[]>([]);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const [langInternal, setLangInternal] = useState("en");
  const lang = langProp ?? langInternal;
  const setLang = setLangProp ?? setLangInternal;

  useEffect(() => {
    const stored = localStorage.getItem("themis_lang") || "en";
    setLang(stored);
  }, []);

  const t = useCallback((en: string, zh: string) => lang === "zh" ? zh : en, [lang]);

  useEffect(() => {
    const { nodes: n, edges: e } = generateMockData(symbolsProp && symbolsProp.length >= 2 ? symbolsProp : ["BTC","ETH","BNB","SOL"]);
    setNodes(n);
    setEdges(e);
    setLastUpdate(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    if (!isLive) return;
    const symbols = symbolsProp && symbolsProp.length >= 2 ? symbolsProp : ["BTC", "ETH", "BNB", "SOL"];
    const conclusions: Array<"bearish" | "bullish" | "neutral"> = ["bearish", "bullish", "neutral"];
    const regimes = [
      { label: "PANIC SELLOFF", color: "red" },
      { label: "BEAR TREND", color: "red" },
      { label: "ACCUMULATION", color: "yellow" },
      { label: "BULL TREND", color: "green" },
    ];
    const interval = setInterval(() => {
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      const conclusion = conclusions[Math.floor(Math.random() * conclusions.length)];
      const regime = regimes[Math.floor(Math.random() * regimes.length)];
      const newNode: VerdictNode = {
        id: `node_live_${Date.now()}`,
        symbol: sym,
        conclusion,
        confidence: Math.round(40 + Math.random() * 50),
        regime: regime.label,
        regime_color: regime.color,
        intensity: Math.round(20 + Math.random() * 60),
        timestamp: new Date().toISOString(),
        depth: Math.random(),
      };
      setNodes(prev => {
        const newEdges: VerdictEdge[] = [];
        prev.slice(-6).forEach((ex, i) => {
          if (Math.random() > 0.5) return;
          const sameDir = ex.conclusion === newNode.conclusion;
          const sameSym = ex.symbol === newNode.symbol;
          newEdges.push({
            id: `edge_live_${Date.now()}_${i}`,
            source: ex.id,
            target: newNode.id,
            relation: sameSym ? (sameDir ? "同向" : "反向") : (sameDir ? "联动" : "diverge"),
            strength: Math.round((ex.confidence + newNode.confidence) / 200 * 100) / 100,
            label: sameSym ? (sameDir ? `${newNode.symbol} sustained` : `${newNode.symbol} reversal`) : (sameDir ? `${ex.symbol}/${newNode.symbol} co-move` : `${ex.symbol}/${newNode.symbol} diverge`),
            labelZh: sameSym ? (sameDir ? `${newNode.symbol}持续信号` : `${newNode.symbol}信号反转`) : (sameDir ? `${ex.symbol}/${newNode.symbol}联动` : `${ex.symbol}/${newNode.symbol}分歧`),
            color: sameSym ? (sameDir ? "#00954a" : "#e8193c") : (sameDir ? "#0047cc" : "#9945ff"),
          });
        });
        setEdges(e => [...e, ...newEdges]);
        return [...prev, newNode];
      });
      setLastUpdate(new Date().toLocaleTimeString());
    }, 8000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Mouse tilt for 2.5D effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      setTilt({ x: dy * 6, y: -dx * 6 });

      // Right-drag 3D rotation
      if (rightDragRef.current.dragging) {
        const deltaX = e.clientX - rightDragRef.current.lastX;
        const deltaY = e.clientY - rightDragRef.current.lastY;
        rightDragRef.current.lastX = e.clientX;
        rightDragRef.current.lastY = e.clientY;
        setRotation(prev => ({
          x: Math.max(-45, Math.min(45, prev.x - deltaY * 0.4)),
          y: Math.max(-60, Math.min(60, prev.y + deltaX * 0.4)),
        }));
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
        rightDragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
        if (e.shiftKey) e.preventDefault();
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 0) rightDragRef.current.dragging = false;
    };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // D3
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return undefined;
    const w = svgRef.current.clientWidth || 900;
    const h = svgRef.current.clientHeight || 600;
    d3.select(svgRef.current).selectAll("*").remove();
    const svg = d3.select(svgRef.current);

    // Defs
    const defs = svg.append("defs");

    // Glow filter
    const glow = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
    const feMerge = glow.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Strong glow
    const glow2 = defs.append("filter").attr("id", "glow2").attr("x", "-100%").attr("y", "-100%").attr("width", "300%").attr("height", "300%");
    glow2.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "coloredBlur");
    const feMerge2 = glow2.append("feMerge");
    feMerge2.append("feMergeNode").attr("in", "coloredBlur");
    feMerge2.append("feMergeNode").attr("in", "SourceGraphic");

    // Radial gradients for each symbol
    Object.entries(SYMBOL_COLORS).forEach(([sym, color]) => {
      const grad = defs.append("radialGradient")
        .attr("id", `grad-${sym}`)
        .attr("cx", "35%").attr("cy", "35%").attr("r", "65%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", "#ffffff").attr("stop-opacity", 0.9);
      grad.append("stop").attr("offset", "40%").attr("stop-color", color).attr("stop-opacity", 0.8);
      grad.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0.3);
    });

    // Drop shadow
    const shadow = defs.append("filter").attr("id", "shadow");
    shadow.append("feDropShadow")
      .attr("dx", "2").attr("dy", "4").attr("stdDeviation", "4")
      .attr("flood-color", "rgba(0,40,120,0.2)");

    // Arrow markers
    ["#00954a", "#e8193c", "#0047cc", "#9945ff"].forEach(color => {
      const id = color.replace("#", "");
      defs.append("marker")
        .attr("id", `arrow-${id}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 32).attr("refY", 0)
        .attr("markerWidth", 5).attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path").attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color).attr("opacity", 0.8);
    });

    // Clip circles for images
    nodes.forEach(n => {
      defs.append("clipPath").attr("id", `clip-${n.id}`)
        .append("circle").attr("r", 16);
    });

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", e => container.attr("transform", e.transform));
    svg.call(zoom);

    const container = svg.append("g");
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Links
    const validEdges = edges.filter(e => {
      const s = typeof e.source === "string" ? e.source : (e.source as VerdictNode).id;
      const t = typeof e.target === "string" ? e.target : (e.target as VerdictNode).id;
      return nodeMap.has(s) && nodeMap.has(t);
    });

    const link = container.append("g").selectAll("line")
      .data(validEdges).enter().append("line")
      .attr("stroke", d => d.color)
      .attr("stroke-width", d => Math.max(0.8, d.strength * 3))
      .attr("stroke-opacity", 0.35)
      .attr("stroke-dasharray", d => d.relation === "diverge" ? "4,3" : "none")
      .attr("marker-end", d => `url(#arrow-${d.color.replace("#", "")})`)
      .attr("filter", "url(#glow)")
      .style("cursor", "pointer")
      .on("mouseenter", function(_, d) {
        d3.select(this).attr("stroke-opacity", 1).attr("stroke-width", d.strength * 5 + 2);
        setHoveredEdge(d);
      })
      .on("mouseleave", function(_, d) {
        d3.select(this).attr("stroke-opacity", 0.35).attr("stroke-width", Math.max(0.8, d.strength * 3));
        setHoveredEdge(null);
      });

    // Nodes
    const node = container.append("g").selectAll("g")
      .data(nodes).enter().append("g")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, VerdictNode>()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); /* keep fx/fy to pin node */ })
      )
      .on("click", (e, d) => { e.stopPropagation(); setSelectedNode(p => p?.id === d.id ? null : d); });

    // Depth shadow (3D feel)
    node.append("ellipse")
      .attr("rx", 22).attr("ry", 8)
      .attr("cy", 30)
      .attr("fill", "rgba(0,40,120,0.08)")
      .attr("filter", "url(#shadow)");

    // Outer glow ring
    node.append("circle")
      .attr("r", d => 26 + (d.depth || 0) * 4)
      .attr("fill", "none")
      .attr("stroke", d => CONCLUSION_COLORS[d.conclusion])
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.25)
      .attr("filter", "url(#glow2)");

    // Main sphere
    node.append("circle")
      .attr("r", d => 22 + (d.depth || 0) * 3)
      .attr("fill", d => `url(#grad-${d.symbol})`)
      .attr("filter", "url(#shadow)")
      .attr("stroke", d => SYMBOL_COLORS[d.symbol])
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6);

    // Confidence arc (progress ring)
    node.append("circle")
      .attr("r", d => 22 + (d.depth || 0) * 3)
      .attr("fill", "none")
      .attr("stroke", d => CONCLUSION_COLORS[d.conclusion])
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", d => {
        const r = 22 + (d.depth || 0) * 3;
        const circ = 2 * Math.PI * r;
        return `${d.confidence / 100 * circ} ${circ}`;
      })
      .attr("stroke-linecap", "round")
      .attr("transform", "rotate(-90)")
      .attr("opacity", 0.9);

    // Specular highlight (3D sphere feel)
    node.append("ellipse")
      .attr("rx", 7).attr("ry", 5)
      .attr("cx", -6).attr("cy", -8)
      .attr("fill", "rgba(255,255,255,0.5)")
      .attr("opacity", 0.7);

    // Token image
    node.append("image")
      .attr("href", d => `https://s2.coinmarketcap.com/static/img/coins/64x64/${CMC_IDS[d.symbol]}.png`)
      .attr("x", -12).attr("y", -12)
      .attr("width", 24).attr("height", 24)
      .attr("clip-path", d => `url(#clip-${d.id})`)
      .attr("opacity", 0.95);

    // Conclusion badge
    node.append("circle")
      .attr("r", 8)
      .attr("cx", 14).attr("cy", -14)
      .attr("fill", d => CONCLUSION_COLORS[d.conclusion])
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .attr("filter", "url(#glow)");

    node.append("text")
      .attr("text-anchor", "middle")
      .attr("x", 14).attr("y", -10)
      .attr("font-size", "8px")
      .attr("fill", "white")
      .attr("font-weight", "700")
      .text(d => d.conclusion === "bearish" ? "↓" : d.conclusion === "bullish" ? "↑" : "→");

    // Confidence label
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "37px")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "9px")
      .attr("fill", "rgba(10,26,58,0.5)")
      .text(d => `${d.confidence}%`);

    // Time label
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "48px")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "8px")
      .attr("fill", "rgba(10,26,58,0.3)")
      .text(d => new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

    const sim = d3.forceSimulation<VerdictNode>(nodes)
      .force("link", d3.forceLink<VerdictNode, VerdictEdge>(validEdges).id(d => d.id).distance(d => 130 + (1 - d.strength) * 80).strength(0.25))
      .force("charge", d3.forceManyBody().strength(-320))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide(55))
      .on("tick", () => {
        link
          .attr("x1", d => (d.source as VerdictNode).x || 0)
          .attr("y1", d => (d.source as VerdictNode).y || 0)
          .attr("x2", d => (d.target as VerdictNode).x || 0)
          .attr("y2", d => (d.target as VerdictNode).y || 0);
        node.attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
      });

    simulationRef.current = sim;
    nodesRef.current = nodes;
    svg.on("click", () => setSelectedNode(null));
    return () => { sim.stop(); };
  }, [nodes, edges]);

  const resetLayout = () => {
    nodesRef.current.forEach(n => { n.fx = null; n.fy = null; });
    if (simulationRef.current) {
      simulationRef.current.alpha(0.6).restart();
    }
  };

  const stats = {
    bearish: nodes.filter(n => n.conclusion === "bearish").length,
    bullish: nodes.filter(n => n.conclusion === "bullish").length,
    neutral: nodes.filter(n => n.conclusion === "neutral").length,
    edges: edges.length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4fb", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(226,232,244,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,244,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      {/* Header */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0047cc", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "5px 12px", borderRadius: 8, textDecoration: "none" }}>← {t("Back", "返回")}</Link>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "#0a1a3a", letterSpacing: "0.15em" }}>VERDICT GRAPH</span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(10,26,58,0.4)", letterSpacing: "0.12em" }}>{t("LIVE RELATION MAP", "实时关系图谱")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
            <span style={{ color: "#e8193c" }}>↓ {stats.bearish}</span>
            <span style={{ color: "#00954a" }}>↑ {stats.bullish}</span>
            <span style={{ color: "#d4800a" }}>→ {stats.neutral}</span>
            <span style={{ color: "rgba(10,26,58,0.4)" }}>{stats.edges} {t("edges", "连线")}</span>
          </div>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(10,26,58,0.4)" }}>{t("Updated", "更新于")} {lastUpdate}</span>
          <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 6, padding: 2 }}>
            {["EN", "ZH"].map(l => (
              <button key={l} onClick={() => { setLang(l.toLowerCase()); localStorage.setItem("themis_lang", l.toLowerCase()); }}
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: lang === l.toLowerCase() ? "#fff" : "rgba(10,26,58,0.4)", background: lang === l.toLowerCase() ? "#0047cc" : "none", border: "none", padding: "4px 10px", borderRadius: 5, cursor: "pointer", transition: "all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => setIsLive(v => !v)}
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: isLive ? "#00954a" : "rgba(10,26,58,0.4)", background: isLive ? "rgba(0,149,74,0.08)" : "rgba(0,0,0,0.04)", border: `1px solid ${isLive ? "rgba(0,149,74,0.3)" : "rgba(0,0,0,0.1)"}`, padding: "4px 12px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? "#00954a" : "rgba(10,26,58,0.3)", animation: isLive ? "pulse 2s ease infinite" : "none" }} />
            {isLive ? t("LIVE", "实时") : t("PAUSED", "暂停")}
          </button>
          <button onClick={resetLayout}
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "rgba(10,26,58,0.5)", background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 12px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            ↺ {t("Reset", "重置")}
          </button>
        </div>
      </header>

      {/* Left sidebar */}
      <div style={{ position: "fixed", top: 52, left: 0, bottom: 0, width: 260, zIndex: 50, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", borderRight: "1px solid rgba(255,255,255,0.5)", overflowY: "auto", padding: "20px 18px" }}>

        {/* About section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 10 }}>{t("ABOUT THIS GRAPH", "关于此图谱")}</div>
          <p style={{ fontSize: 12, color: "rgba(10,26,58,0.65)", lineHeight: 1.7, marginBottom: 10 }}>
            {t(
              "Verdict Graph is a live relation map that visualizes how market verdicts across BTC, ETH, BNB, and SOL are connected over time.",
              "裁决图谱是一个实时关系地图，展示 BTC、ETH、BNB、SOL 的市场裁决之间随时间演变的关联关系。"
            )}
          </p>
          <p style={{ fontSize: 12, color: "rgba(10,26,58,0.65)", lineHeight: 1.7 }}>
            {t(
              "Each node represents a single verdict event. When a new verdict appears, AI analyzes its relationship with all existing nodes and draws connecting lines in real time.",
              "每个节点代表一次裁决事件。当新裁决出现时，AI 实时分析它与已有节点的关系，并即时连线。"
            )}
          </p>
        </div>

        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", marginBottom: 20 }} />

        {/* How it works */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 10 }}>{t("HOW IT WORKS", "工作原理")}</div>
          {[
            { step: "01", en: "Every hour, Themis runs verdicts on BTC/ETH/BNB/SOL using live CoinMarketCap data.", zh: "每小时，Themis 使用实时 CMC 数据对四大币种运行裁决。" },
            { step: "02", en: "Each new verdict becomes a node on the canvas, colored by asset and marked with direction.", zh: "每次新裁决在画布上生成一个节点，颜色代表币种，箭头代表方向。" },
            { step: "03", en: "AI immediately analyzes the new node's relationship with all previous nodes and draws edges.", zh: "AI 立即分析新节点与所有已有节点的关系，实时连线。" },
            { step: "04", en: "The graph resets every 24 hours, revealing a new day's pattern from scratch.", zh: "图谱每24小时刷新一次，每天从零开始生长出新的模式。" },
          ].map(({ step, en, zh }) => (
            <div key={step} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#0047cc", background: "rgba(0,71,204,0.08)", width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{step}</div>
              <p style={{ fontSize: 11, color: "rgba(10,26,58,0.6)", lineHeight: 1.6, margin: 0 }}>{t(en, zh)}</p>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", marginBottom: 20 }} />

        {/* Edge legend */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 10 }}>{t("EDGE TYPES", "连线类型")}</div>
          {[
            { color: "#00954a", label: t("Co-directional bullish", "同向看多"), desc: t("Both nodes agree on upward movement", "两节点同时看多") },
            { color: "#e8193c", label: t("Co-directional bearish / Reversal", "同向看空/反转"), desc: t("Sustained bearish or signal flip", "持续看空或信号反转") },
            { color: "#0047cc", label: t("Cross-asset co-movement", "跨币联动"), desc: t("Different assets moving together", "不同币种同向运动") },
            { color: "#9945ff", label: t("Divergence", "信号分歧"), desc: t("Assets moving in opposite directions", "资产走势分歧"), dashed: true },
          ].map(({ color, label, desc, dashed }) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <div style={{ width: 24, height: 2, background: dashed ? "none" : color, borderRadius: 1, flexShrink: 0, borderTop: dashed ? `2px dashed ${color}` : "none" }} />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color }}>{label}</span>
              </div>
              <p style={{ fontSize: 10, color: "rgba(10,26,58,0.4)", margin: "0 0 0 32px", lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", marginBottom: 20 }} />

        {/* Node legend */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 10 }}>{t("NODE GUIDE", "节点说明")}</div>
          <div style={{ fontSize: 11, color: "rgba(10,26,58,0.5)", lineHeight: 1.7 }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: "rgba(10,26,58,0.7)" }}>{t("Ring arc", "弧线圈")}</span>
              {t(" = confidence level (0–100%)", " = 置信度（0–100%）")}
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: "rgba(10,26,58,0.7)" }}>{t("Badge color", "徽章颜色")}</span>
              {t(" = verdict direction (red/green/orange)", " = 裁决方向（红/绿/橙）")}
            </div>
            <div>
              <span style={{ fontWeight: 600, color: "rgba(10,26,58,0.7)" }}>{t("Node size", "节点大小")}</span>
              {t(" = depth (visual 3D layer)", " = 景深层级（视觉3D效果）")}
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", marginBottom: 20 }} />

        {/* Symbol colors */}
        <div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 10 }}>{t("ASSETS", "资产")}</div>
          {Object.entries(SYMBOL_COLORS).map(([sym, color]) => (
            <div key={sym} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <img src={`https://s2.coinmarketcap.com/static/img/coins/32x32/${CMC_IDS[sym]}.png`} style={{ width: 18, height: 18, borderRadius: "50%" }} alt={sym} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "rgba(10,26,58,0.7)" }}>{sym}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Canvas with 2.5D tilt */}
      <svg
        ref={svgRef}
        style={{
          position: "fixed",
          top: 52, left: 260, right: 0, bottom: 0,
          width: "calc(100% - 260px)",
          height: "calc(100% - 52px)",
          zIndex: 5,
          transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 0.1s ease-out",
          transformOrigin: "center center",
        }}
      />

      {/* Instructions */}
      <div style={{ position: "fixed", top: 64, left: "50%", transform: "translateX(-50%)", zIndex: 100, fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(10,26,58,0.25)", letterSpacing: "0.1em", pointerEvents: "none" }}>
        {t("DRAG · SCROLL TO ZOOM · CLICK NODE FOR DETAILS", "拖拽 · 滚轮缩放 · 点击节点查看详情")}
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <div style={{ position: "fixed", top: 72, right: 24, zIndex: 100, width: 240, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", border: `1px solid ${SYMBOL_COLORS[selectedNode.symbol]}44`, borderRadius: 14, padding: "16px 18px", boxShadow: "0 8px 32px rgba(0,40,120,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src={`https://s2.coinmarketcap.com/static/img/coins/32x32/${CMC_IDS[selectedNode.symbol]}.png`} style={{ width: 20, height: 20, borderRadius: "50%" }} alt={selectedNode.symbol} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "#0a1a3a" }}>{selectedNode.symbol}</span>
            </div>
            <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(10,26,58,0.3)" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              { label: t("VERDICT", "裁决"), value: t(selectedNode.conclusion.toUpperCase(), selectedNode.conclusion === "bearish" ? "看空" : selectedNode.conclusion === "bullish" ? "看多" : "中立"), color: CONCLUSION_COLORS[selectedNode.conclusion] },
              { label: t("CONFIDENCE", "置信度"), value: `${selectedNode.confidence}%`, color: CONCLUSION_COLORS[selectedNode.conclusion] },
              { label: t("INTENSITY", "强度"), value: `${selectedNode.intensity}/100`, color: "rgba(10,26,58,0.7)" },
              { label: t("TIME", "时间"), value: new Date(selectedNode.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), color: "rgba(10,26,58,0.5)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "rgba(0,40,120,0.03)", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(10,26,58,0.35)", letterSpacing: "0.1em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 10px", background: "rgba(0,40,120,0.03)", borderRadius: 8, marginBottom: 10 }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(10,26,58,0.35)", letterSpacing: "0.1em", marginBottom: 3 }}>{t("REGIME", "市场状态")}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: selectedNode.regime_color === "red" ? "#e8193c" : selectedNode.regime_color === "green" ? "#00954a" : "#d4800a" }}>{selectedNode.regime}</div>
          </div>
          <div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(10,26,58,0.35)", letterSpacing: "0.1em", marginBottom: 6 }}>{t("CONNECTIONS", "关联")}</div>
            {edges.filter(e => {
              const s = typeof e.source === "string" ? e.source : (e.source as VerdictNode).id;
              const t2 = typeof e.target === "string" ? e.target : (e.target as VerdictNode).id;
              return s === selectedNode.id || t2 === selectedNode.id;
            }).slice(0, 4).map(e => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ width: 6, height: 2, background: e.color, borderRadius: 1, flexShrink: 0 }} />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "rgba(10,26,58,0.5)", lineHeight: 1.4 }}>{lang === "zh" ? e.labelZh : e.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edge tooltip */}
      {hoveredEdge && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", border: `1px solid ${hoveredEdge.color}44`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,40,120,0.1)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "rgba(10,26,58,0.4)", marginBottom: 3 }}>{t("RELATION", "关系类型")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: hoveredEdge.color }}>{hoveredEdge.relation}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(10,26,58,0.6)", marginTop: 3 }}>{lang === "zh" ? hoveredEdge.labelZh : hoveredEdge.label}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "rgba(10,26,58,0.3)", marginTop: 3 }}>{t("strength", "强度")}: {hoveredEdge.strength}</div>
        </div>
      )}
    </div>
  );
}
