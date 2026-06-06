"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";

const CMC_IDS: Record<string, number> = {
  BTC: 1, ETH: 1027, BNB: 1839, SOL: 5426,
  PEPE: 24478, DOGE: 74, ARB: 11841, OP: 11840,
  AVAX: 5805, MATIC: 3890, LINK: 1975, UNI: 7083,
  ADA: 2010, DOT: 6636, ATOM: 3794, APT: 21794,
  SUI: 20947, SEI: 23149, TIA: 22861, INJ: 7226,
};

const SYMBOL_COLORS: Record<string, string> = {
  BTC: "#f7931a", ETH: "#627eea", BNB: "#f3ba2f", SOL: "#9945ff",
  PEPE: "#00cc44", DOGE: "#c2a633", ARB: "#28a0f0", OP: "#ff0420",
  AVAX: "#e84142", MATIC: "#8247e5", LINK: "#375bd2", UNI: "#ff007a",
  ADA: "#0033ad", DOT: "#e6007a", ATOM: "#2e3148", APT: "#00d4b8",
};

interface NodeDatum {
  id: string;
  symbol: string;
  hour?: number;
  isRoot?: boolean;
  isDayRoot?: boolean;
  change24h?: number;
  change1h?: number;
  correlation?: number;
  direction?: "same" | "diverge";
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  r: number;
}

interface LinkDatum {
  source: string | NodeDatum;
  target: string | NodeDatum;
  correlation?: number;
  direction?: "same" | "diverge";
  isHourLink?: boolean;
}

interface TooltipInfo {
  x: number; y: number;
  title: string;
  lines: string[];
}

function buildData(symbols: string[]): { nodes: NodeDatum[]; links: LinkDatum[] } {
  const currentHour = new Date().getHours();
  const W = typeof window !== "undefined" ? window.innerWidth : 1400;
  const H = typeof window !== "undefined" ? window.innerHeight : 800;
  const nodes: NodeDatum[] = [];
  const links: LinkDatum[] = [];

  nodes.push({ id: "dayroot", symbol: "THEMIS", isDayRoot: true, r: 28, x: W / 2, y: 80, fx: W / 2, fy: 80 });

  const hourCount = currentHour + 1;
  for (let h = 0; h <= currentHour; h++) {
    const changes: Record<string, number> = {};
    symbols.forEach(s => { changes[s] = (Math.random() - 0.48) * 10; });
    const dominant = symbols.reduce((a, b) => Math.abs(changes[a]) > Math.abs(changes[b]) ? a : b);
    const hourId = `h${h}`;
    const hx = (W * 0.05) + (h / Math.max(hourCount - 1, 1)) * (W * 3.2);

    nodes.push({
      id: hourId, symbol: dominant, hour: h, isRoot: true,
      change24h: changes[dominant], change1h: (Math.random() - 0.48) * 2,
      r: 28, x: hx, y: 380,
    });
    links.push({ source: "dayroot", target: hourId, isHourLink: true, direction: "same", correlation: 1 });

    const childSymbols = symbols.filter(s => s !== dominant);
    childSymbols.forEach((sym, si) => {
      const diff = Math.abs(changes[sym] - changes[dominant]);
      const total = Math.abs(changes[dominant]) + Math.abs(changes[sym]) + 0.001;
      const corr = Math.max(0.15, Math.min(1, 1 - diff / total + (Math.random() - 0.5) * 0.1));
      const dir = Math.sign(changes[sym]) === Math.sign(changes[dominant]) ? "same" as const : "diverge" as const;
      const cid = `h${h}-c${si}`;
      const spread = childSymbols.length === 1 ? 0 : (si / (childSymbols.length - 1) - 0.5) * 300;
      nodes.push({
        id: cid, symbol: sym, hour: h,
        change24h: changes[sym], change1h: (Math.random() - 0.48) * 2,
        correlation: corr, direction: dir,
        r: 18 + corr * 8, x: hx + spread, y: 820,
      });
      links.push({ source: hourId, target: cid, correlation: corr, direction: dir });
    });
  }
  return { nodes, links };
}

// Orthogonal (right-angle) path between two points
function orthogonalPath(x1: number, y1: number, x2: number, y2: number): string {
  const mid = (y1 + y2) / 2;
  return `M${x1},${y1} L${x1},${mid} L${x2},${mid} L${x2},${y2}`;
}

interface Props {
  symbols: string[];
  lang?: string;
}

export default function VerdictTree({ symbols, lang = "en" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<NodeDatum, LinkDatum> | null>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const t = useCallback((en: string, zh: string) => lang === "zh" ? zh : en, [lang]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const W = containerRef.current.clientWidth;
    const H = containerRef.current.clientHeight;

    const { nodes, links } = buildData(symbols);
    const nodeIndexMap = new Map(nodes.map((n, i) => [n.id, i]));

    const svg = d3.select(svgRef.current).attr("width", W).attr("height", H);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");

    // Grid
    const gp = defs.append("pattern").attr("id", "vtg5").attr("width", 36).attr("height", 36).attr("patternUnits", "userSpaceOnUse");
    gp.append("path").attr("d", "M 36 0 L 0 0 0 36").attr("fill", "none").attr("stroke", "rgba(226,232,244,0.65)").attr("stroke-width", 0.6);

    // Gold glow
    const gf = defs.append("filter").attr("id", "gg5").attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%");
    gf.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "2").attr("result", "blur");
    const gfm = gf.append("feMerge");
    gfm.append("feMergeNode").attr("in", "blur");
    gfm.append("feMergeNode").attr("in", "SourceGraphic");

    svg.append("rect").attr("width", W).attr("height", H).attr("fill", "#f0f4fb");
    svg.append("rect").attr("width", W).attr("height", H).attr("fill", "url(#vtg5)");

    // Clip paths
    nodes.forEach((n, i) => {
      defs.append("clipPath").attr("id", `vtc5-${i}`)
        .append("circle").attr("cx", 0).attr("cy", 0).attr("r", n.r);
    });

    // Zoom & pan
    const mainG = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", e => mainG.attr("transform", e.transform));
    svg.call(zoom);
    svg.on("dblclick.zoom", () => {
      svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.translate(0, 20).scale(0.75));
    });
    svg.call(zoom.transform, d3.zoomIdentity.translate(W * 0.05, 20).scale(0.55));

    const linkG = mainG.append("g");
    const nodeG = mainG.append("g");

    // Links — orthogonal paths
    const linkSel = linkG.selectAll("path")
      .data(links).enter().append("path")
      .attr("fill", "none")
      .attr("stroke", d => d.direction === "diverge" ? "#1a1a1a" : "#FFD700")
      .attr("stroke-width", d => {
        if (d.isHourLink) return 2.5;
        const c = d.correlation || 0.5;
        return 1.5 + c * 4.5;
      })
      .attr("stroke-dasharray", d => d.direction === "diverge" ? "6,4" : "none")
      .attr("stroke-opacity", d => d.direction === "diverge" ? 0.7 : 0.95)
      .attr("stroke-linejoin", "round")
      .attr("filter", d => d.direction !== "diverge" ? "url(#gg5)" : "none")
      .style("cursor", "pointer")
      .on("mouseenter", function(event, d) {
        d3.select(this).attr("stroke-width", (d.isHourLink ? 2.5 : 1.5 + (d.correlation || 0.5) * 4.5) + 2).attr("stroke-opacity", 1);
        if (!d.isHourLink) {
          const src = typeof d.source === "object" ? d.source as NodeDatum : nodes.find(n => n.id === d.source);
          const tgt = typeof d.target === "object" ? d.target as NodeDatum : nodes.find(n => n.id === d.target);
          const rect = svgRef.current!.getBoundingClientRect();
          setTooltip({
            x: event.clientX - rect.left, y: event.clientY - rect.top,
            title: `${src?.symbol} → ${tgt?.symbol}`,
            lines: [
              t(`Relation: ${d.direction === "same" ? "Co-movement" : "Divergence"}`, `关系: ${d.direction === "same" ? "同向联动" : "方向背离"}`),
              t(`Correlation: ${((d.correlation || 0) * 100).toFixed(1)}%`, `相关性: ${((d.correlation || 0) * 100).toFixed(1)}%`),
              t(`Hour: ${String((tgt as NodeDatum)?.hour ?? 0).padStart(2, "0")}:00`, `时段: ${String((tgt as NodeDatum)?.hour ?? 0).padStart(2, "0")}:00`),
            ],
          });
        }
      })
      .on("mouseleave", function(_, d) {
        d3.select(this).attr("stroke-width", d.isHourLink ? 2.5 : 1.5 + (d.correlation || 0.5) * 4.5).attr("stroke-opacity", d.direction === "diverge" ? 0.7 : 0.95);
        setTooltip(null);
      });

    // Nodes
    const nodeSel = nodeG.selectAll("g")
      .data(nodes).enter().append("g")
      .style("cursor", "grab")
      .call(
        d3.drag<SVGGElement, NodeDatum>()
          .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.1).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); })
      )
      .on("dblclick", (_, d) => { if (!d.isDayRoot) { d.fx = null; d.fy = null; sim.alpha(0.3).restart(); } })
      .on("mouseenter", function(event, d) {
        const rect = svgRef.current!.getBoundingClientRect();
        const lines: string[] = [];
        if (d.isDayRoot) {
          lines.push(t("Today's verdict tree root", "今日裁决树根节点"));
          lines.push(t(`Active hours: ${nodes.filter(n => n.isRoot).length}`, `已生长时段: ${nodes.filter(n => n.isRoot).length}`));
        } else if (d.isRoot) {
          lines.push(t(`Hour: ${String(d.hour).padStart(2, "0")}:00`, `时段: ${String(d.hour).padStart(2, "0")}:00`));
          lines.push(t("Role: Dominant mover", "角色: 主导币种"));
          lines.push(t(`24H: ${(d.change24h || 0) >= 0 ? "+" : ""}${(d.change24h || 0).toFixed(2)}%`, `24H: ${(d.change24h || 0) >= 0 ? "+" : ""}${(d.change24h || 0).toFixed(2)}%`));
          lines.push(t(`1H: ${(d.change1h || 0) >= 0 ? "+" : ""}${(d.change1h || 0).toFixed(2)}%`, `1H: ${(d.change1h || 0) >= 0 ? "+" : ""}${(d.change1h || 0).toFixed(2)}%`));
        } else {
          lines.push(t(`Hour: ${String(d.hour).padStart(2, "0")}:00`, `时段: ${String(d.hour).padStart(2, "0")}:00`));
          lines.push(t(`Direction: ${d.direction === "same" ? "Co-movement" : "Divergence"}`, `方向: ${d.direction === "same" ? "同向" : "背离"}`));
          lines.push(t(`Correlation: ${((d.correlation || 0) * 100).toFixed(1)}%`, `相关性: ${((d.correlation || 0) * 100).toFixed(1)}%`));
          lines.push(t(`24H: ${(d.change24h || 0) >= 0 ? "+" : ""}${(d.change24h || 0).toFixed(2)}%`, `24H: ${(d.change24h || 0) >= 0 ? "+" : ""}${(d.change24h || 0).toFixed(2)}%`));
        }
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, title: d.isDayRoot ? "THEMIS" : `${d.symbol}${d.isRoot ? ` ${String(d.hour).padStart(2,"0")}h` : ""}`, lines });
      })
      .on("mouseleave", () => setTooltip(null));

    // Pulse ring for hour roots
    nodeSel.filter(d => !!d.isRoot || !!d.isDayRoot)
      .append("circle")
      .attr("r", d => d.r + 7)
      .attr("fill", "none")
      .attr("stroke", d => d.isDayRoot ? "rgba(0,71,204,0.25)" : `${SYMBOL_COLORS[d.symbol] || "#FFD700"}40`)
      .attr("stroke-width", 1.5);

    // White background circle
    nodeSel.append("circle")
      .attr("r", d => d.r)
      .attr("fill", "white")
      .attr("stroke", d => d.isDayRoot ? "#0047cc" : SYMBOL_COLORS[d.symbol] || "#ccc")
      .attr("stroke-width", d => d.isRoot || d.isDayRoot ? 2 : 1.5)
      .attr("stroke-opacity", 0.6);

    // Token image
    nodeSel.filter(d => !d.isDayRoot && !!CMC_IDS[d.symbol])
      .append("image")
      .attr("href", d => `https://s2.coinmarketcap.com/static/img/coins/64x64/${CMC_IDS[d.symbol]}.png`)
      .attr("x", d => -d.r).attr("y", d => -d.r)
      .attr("width", d => d.r * 2).attr("height", d => d.r * 2)
      .attr("clip-path", d => `url(#vtc5-${nodeIndexMap.get(d.id)})`);

    // Day root T label
    nodeSel.filter(d => !!d.isDayRoot)
      .append("text")
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "14px").attr("font-weight", "700").attr("fill", "#0047cc")
      .text("T");

    // Node labels
    nodeSel.filter(d => !d.isDayRoot)
      .append("text")
      .attr("y", d => d.r + 14)
      .attr("text-anchor", "middle")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", d => d.isRoot ? "11px" : "10px")
      .attr("font-weight", d => d.isRoot ? "700" : "400")
      .attr("fill", d => d.isRoot ? "rgba(10,26,58,0.75)" : "rgba(10,26,58,0.5)")
      .text(d => d.isRoot ? `${d.symbol} ${String(d.hour).padStart(2, "0")}h` : d.symbol);

    // Force simulation — gentle, mostly for keeping layout
    const sim = d3.forceSimulation<NodeDatum>(nodes)
      .force("link", d3.forceLink<NodeDatum, LinkDatum>(links)
        .id(d => d.id)
        .distance(d => (d as LinkDatum).isHourLink ? 400 : 300 + (1 - ((d as LinkDatum).correlation || 0.5)) * 120)
        .strength(d => (d as LinkDatum).isHourLink ? 0.6 : 0.5)
      )
      .force("charge", d3.forceManyBody().strength(d => d.isDayRoot ? -3000 : d.isRoot ? -2400 : -1200))
      .force("collision", d3.forceCollide<NodeDatum>().radius(d => d.r + 110))
      .force("y", d3.forceY<NodeDatum>()
        .y(d => d.isDayRoot ? 80 : d.isRoot ? 380 : 820)
        .strength(d => d.isDayRoot ? 1 : d.isRoot ? 0.55 : 0.35)
      )
      .force("x", d3.forceX<NodeDatum>(W / 2).strength(0.01))
      .alphaDecay(0.01)
      .on("tick", () => {
        linkSel.attr("d", d => {
          const s = d.source as NodeDatum;
          const t2 = d.target as NodeDatum;
          const x1 = s.x || 0, y1 = s.y || 0;
          const x2 = t2.x || 0, y2 = t2.y || 0;
          return orthogonalPath(x1, y1 + (s.r || 16), x2, y2 - (t2.r || 16));
        });
        nodeSel.attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
      });

    simRef.current = sim;
    return () => { sim.stop(); };
  }, [symbols, t]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg width="28" height="6"><line x1="0" y1="3" x2="28" y2="3" stroke="#FFD700" strokeWidth="3.5" /></svg>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.55)" }}>{t("Co-movement", "同向联动")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg width="28" height="6"><line x1="0" y1="3" x2="28" y2="3" stroke="#1a1a1a" strokeWidth="2" strokeDasharray="5,3" /></svg>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.55)" }}>{t("Divergence", "方向背离")}</span>
        </div>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.3)" }}>
          {t("Drag · Scroll to zoom · Dbl-click canvas to reset · Dbl-click node to release",
            "拖动 · 滚轮缩放 · 双击画布重置 · 双击节点释放")}
        </span>
      </div>
      <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />
        {tooltip && (
          <div style={{ position: "absolute", left: Math.min(tooltip.x + 14, (containerRef.current?.clientWidth || 800) - 210), top: Math.max(tooltip.y - 10, 8), zIndex: 200, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(16px)", border: "1px solid rgba(0,71,204,0.12)", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,40,120,0.1)", pointerEvents: "none", minWidth: 160 }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: "#0a1a3a", marginBottom: 5 }}>{tooltip.title}</div>
            {tooltip.lines.map((l, i) => <div key={i} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.6)", lineHeight: 1.7 }}>{l}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
