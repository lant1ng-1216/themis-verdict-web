"use client";
import { useState } from "react";
import { SiteNav } from "../page";

const SECTIONS = [
  { id: "introduction", en: "Introduction", zh: "简介", children: [] },
  {
    id: "architecture", en: "Architecture", zh: "系统架构", children: [
      { id: "arch-overview", en: "Overview", zh: "总览" },
      { id: "arch-evidence", en: "Evidence Engine", zh: "证据引擎" },
      { id: "arch-regime", en: "Regime Classifier", zh: "状态分类器" },
      { id: "arch-court", en: "Verdict Court", zh: "裁决法庭" },
    ],
  },
  {
    id: "skill", en: "Strategy Skill", zh: "策略技能", children: [
      { id: "skill-overview", en: "Overview", zh: "概述" },
      { id: "skill-workflow", en: "7-Step Workflow", zh: "7步工作流" },
      { id: "skill-example", en: "Example Output", zh: "示例输出" },
    ],
  },
  {
    id: "agent-api", en: "Agent API", zh: "Agent API", children: [
      { id: "api-endpoints", en: "Endpoints", zh: "接口列表" },
      { id: "api-auth", en: "Authentication", zh: "鉴权方式" },
      { id: "api-quickstart", en: "Quickstart", zh: "快速接入" },
    ],
  },
  { id: "roadmap", en: "Roadmap", zh: "路线图", children: [] },
];

const EarlyBadge = ({ lang }: { lang: string }) => (
  <span style={{ fontSize: 12, color: "#d4800a", marginLeft: 8 }}>🔬 {lang === "zh" ? "早期版本 · 持续更新中" : "Early Version · Continuously Updated"}</span>
);

const SoonBadge = ({ lang }: { lang: string }) => (
  <span style={{ fontSize: 12, color: "#6633cc", marginLeft: 8 }}>🚧 {lang === "zh" ? "即将推出" : "Coming Soon"}</span>
);

const SoonBlock = ({ lang }: { lang: string }) => (
  <div style={{ textAlign: "center", padding: "60px 0" }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>🚧</div>
    <h3 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 16, fontWeight: 700, color: "#0a1a3a", marginBottom: 8 }}>
      {lang === "zh" ? "即将推出" : "Coming Soon"}
    </h3>
    <p style={{ fontSize: 13, color: "rgba(10,26,58,0.45)" }}>
      {lang === "zh" ? "此章节正在撰写中，敬请期待。" : "This section is under construction. Stay tuned."}
    </p>
  </div>
);

export default function DocsPage() {
  const [lang, setLang] = useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("themis_lang") || "en";
  });
  const [active, setActive] = useState("introduction");
  const [expanded, setExpanded] = useState<string[]>(["architecture", "skill", "agent-api"]);

  const handleLang = (l: string) => { setLang(l); localStorage.setItem("themis_lang", l); };
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  const toggle = (id: string) => setExpanded(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const content: Record<string, React.ReactNode> = {

    introduction: (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 26, fontWeight: 700, color: "#0a1a3a" }}>Themis-Verdict</h1>
          <EarlyBadge lang={lang} />
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0047cc", letterSpacing: "0.15em", marginBottom: 24 }}>JUDICIAL FRAMEWORK FOR MARKET INTELLIGENCE</div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 16 }}>
          {t("Themis-Verdict is a judicial-framework AI agent that transforms raw market data into structured, falsifiable trading verdicts. Instead of predicting markets, it acts as a Chief Market Verdict Officer — examining evidence, classifying market regimes, and delivering formal verdicts with explicit invalidation conditions and appeal mechanisms.",
            "Themis-Verdict 是一个基于司法框架的 AI 智能体，将原始市场数据转化为结构化、可证伪的交易裁决。它不预测市场，而是作为首席市场裁决官——审查证据、分类市场状态，并出具包含明确失效条件和上诉机制的正式裁决。")}
        </p>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 28 }}>
          {t("Built on CoinMarketCap's AI Agent Hub, Themis operates across four layers: a terminal analysis system, a public web interface, an Agent subscription API, and an on-chain verdict protocol — forming a complete verdict economy.",
            "基于 CoinMarketCap AI Agent Hub 构建，Themis 运营于四个层次：终端分析系统、公开网页界面、Agent 订阅 API 以及链上裁决协议——形成完整的裁决经济体。")}
        </p>
        <div style={{ background: "rgba(0,71,204,0.04)", border: "1px solid rgba(0,71,204,0.12)", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#0047cc", letterSpacing: "0.15em", marginBottom: 10 }}>{t("CORE PHILOSOPHY", "核心理念")}</div>
          <p style={{ fontSize: 14, color: "rgba(10,26,58,0.7)", lineHeight: 1.8, fontStyle: "italic" }}>
            {t('"Most strategy tools ask: What will the market do next? Themis asks: Who is making a collective mistake right now, and what is the evidence?"',
              '"大多数策略工具问的是：市场接下来会怎样？Themis 问的是：现在谁正在犯集体性错误，证据是什么？"')}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { icon: "⚖", title: t("Three-Court Framework", "三庭裁决框架"), desc: t("Claim → Evidence → Verdict", "起诉庭 → 证据庭 → 裁决庭") },
            { icon: "📊", title: t("7 Evidence Dimensions", "7维度证据体系"), desc: t("CMC real-time data only", "仅使用 CMC 实时数据") },
            { icon: "🔵", title: t("5 Market Regimes", "5种市场状态"), desc: t("Scored classification system", "评分制状态分类") },
            { icon: "🔗", title: t("Self-Calibrating Weights", "自校准权重"), desc: t("Bayesian accuracy updates", "贝叶斯准确率更新") },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 10, padding: "16px" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: "#0a1a3a", marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: "rgba(10,26,58,0.5)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),

    "arch-overview": (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#0a1a3a" }}>{t("Architecture Overview", "系统架构总览")}</h2>
          <EarlyBadge lang={lang} />
        </div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 24 }}>
          {t("Themis operates across four independent layers. Each layer is self-contained and can be used independently, while data flows upward from raw market signals to structured verdicts.",
            "Themis 运行于四个独立层次。每层均可单独使用，数据从原始市场信号向上流动，最终形成结构化裁决。")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 28 }}>
          {[
            { layer: "L4", label: t("On-Chain Protocol", "链上协议"), color: "#6633cc", icon: "🔗", desc: t("Verdict NFTs, staking, and on-chain accuracy registry. Future layer.", "裁决 NFT、质押机制与链上准确率登记。未来层级。"), status: t("Planned", "规划中") },
            { layer: "L3", label: t("Agent Subscription API", "Agent 订阅 API"), color: "#0047cc", icon: "🔌", desc: t("REST + SSE endpoints delivering pre-computed verdict signals to external agents and developers.", "REST + SSE 接口，向外部 Agent 和开发者提供预计算裁决信号。"), status: t("Building", "建设中") },
            { layer: "L2", label: t("Web Interface", "网页界面"), color: "#00954a", icon: "🖥", desc: t("Public dashboard: real-time verdict feed, regime monitor, position management, and developer portal.", "公开看板：实时裁决 Feed、状态监控、持仓管理与开发者门户。"), status: t("Live", "上线") },
            { layer: "L1", label: t("Terminal Analysis System", "终端分析系统"), color: "#d4800a", icon: "⚙", desc: t("Core AI agent running the 7-step workflow. Fetches live CMC data, runs Three-Court process, stores verdicts in Redis.", "核心 AI Agent 运行7步工作流。实时获取 CMC 数据，运行三庭流程，将裁决存储至 Redis。"), status: t("Live", "上线") },
          ].map(({ layer, label, color, icon, desc, status }) => (
            <div key={layer} style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32 }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color, background: `${color}12`, width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{layer}</div>
                {layer !== "L1" && <div style={{ width: 1, flex: 1, background: "rgba(0,0,0,0.08)", margin: "3px 0" }} />}
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.7)", border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "14px 18px", marginBottom: layer !== "L1" ? 0 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 15 }}>{icon}</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: "#0a1a3a" }}>{label}</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color, background: `${color}10`, padding: "2px 7px", borderRadius: 4, marginLeft: "auto" }}>{status}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(10,26,58,0.55)", lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(0,71,204,0.04)", border: "1px solid rgba(0,71,204,0.12)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#0047cc", letterSpacing: "0.1em", marginBottom: 10 }}>{t("DATA FLOW", "数据流向")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "rgba(10,26,58,0.6)", lineHeight: 2 }}>
            CMC Live Data → Evidence Engine (7 dims)<br/>
            → Regime Classifier → Three-Court Process<br/>
            → Verdict (Redis) → Web Feed / Agent API<br/>
            → Bayesian Weight Update (24H loop)
          </div>
        </div>
      </div>
    ),

    "arch-evidence": (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#0a1a3a" }}>{t("Evidence Engine", "证据引擎")}</h2>
          <EarlyBadge lang={lang} />
        </div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 24 }}>
          {t("The Evidence Engine collects real-time data across 7 dimensions using CoinMarketCap's AI Agent Hub. All data is fetched live — no training data prices are ever used in verdicts.",
            "证据引擎通过 CoinMarketCap AI Agent Hub 实时采集7个维度的数据。所有数据均为实时获取，裁决中从不使用训练数据中的价格信息。")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { num: "01", name: t("Price Momentum", "价格动能"), tool: "get_crypto_quotes_latest", desc: t("1H/24H/7D/30D changes + volume confirmation. Bearish when all timeframes negative and accelerating.", "1H/24H/7D/30D涨跌幅 + 成交量确认。所有时间框架均为负且加速下跌时为看空信号。"), weight: "HIGH" },
            { num: "02", name: t("Market Sentiment", "市场情绪"), tool: "get_global_metrics_latest", desc: t("Fear & Greed Index (0-100). Critical rule: Extreme Fear alone is NOT a buy signal — must combine with decelerating momentum.", "恐惧贪婪指数（0-100）。重要规则：极度恐惧单独出现不是买入信号，必须与动能减速结合判断。"), weight: "MEDIUM" },
            { num: "03", name: t("Market Breadth", "市场宽度"), tool: "get_crypto_listings_latest", desc: t("Top 10 declining count + average 24H change. 9-10 declining = Broad Decline. 0-1 declining = Broad Rally.", "Top10下跌数量 + 平均24H涨跌幅。9-10只下跌 = 全面下跌，0-1只下跌 = 全面上涨。"), weight: "HIGH" },
            { num: "04", name: t("Derivatives Activity", "衍生品活动"), tool: "get_global_metrics_latest", desc: t("Volume change rate — NOT market cap change. >+20% during decline = panic deleveraging. <-10% during decline = stabilization signal.", "交易量变化率——不是市值变化。下跌时>+20%=恐慌去杠杆，下跌时<-10%=潜在企稳信号。"), weight: "MEDIUM" },
            { num: "05", name: t("BTC Dominance Flow", "BTC主导率流向"), tool: "get_global_metrics_latest", desc: t("24H dominance change. Rising >+0.3% = capital fleeing altcoins (bearish for non-BTC). Falling <-0.3% = risk-on rotation.", "24H主导率变化。上升>+0.3%=资本逃离山寨币（非BTC看空），下降<-0.3%=风险偏好回归。"), weight: "MEDIUM" },
            { num: "06", name: t("Sector Rotation", "板块轮动"), tool: "get_crypto_categories", desc: t("Top 3 gaining/losing sectors filtered by market cap >$500M. AI, NFT, DeFi all losing = bearish breadth.", "按市值>5亿美元筛选的前3涨/跌板块。AI、NFT、DeFi均下跌=看空广度信号。"), weight: "LOW" },
            { num: "07", name: t("Stablecoin Flow", "稳定币流向"), tool: "get_global_metrics_latest", desc: t("Volume change rate — NOT market cap change. >+15% = heavy safe-haven demand (bearish). <-5% = capital deploying into risk (bullish).", "交易量变化率——不是市值变化。>+15%=大量避险需求（看空），<-5%=资金部署入风险资产（看多）。"), weight: "HIGH" },
          ].map(({ num, name, tool, desc, weight }) => (
            <div key={num} style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 10, padding: "14px 18px", display: "flex", gap: 14 }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: "#0047cc", background: "rgba(0,71,204,0.08)", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{num}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: "#0a1a3a" }}>{name}</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: weight === "HIGH" ? "#e8193c" : weight === "MEDIUM" ? "#d4800a" : "#8899bb", background: weight === "HIGH" ? "rgba(232,25,60,0.08)" : weight === "MEDIUM" ? "rgba(212,128,10,0.08)" : "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: 4 }}>{weight}</span>
                </div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#6633cc", marginBottom: 6 }}>{tool}</div>
                <div style={{ fontSize: 12, color: "rgba(10,26,58,0.55)", lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),

    "arch-regime": (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#0a1a3a" }}>{t("Regime Classifier", "市场状态分类器")}</h2>
          <EarlyBadge lang={lang} />
        </div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 12 }}>
          {t("The Regime Classifier scores 5 market states using weighted signals. The state with the highest score is selected. Confidence = regime score / total score × 100%.",
            "状态分类器使用加权信号对5种市场状态打分。得分最高的状态被选定。置信度 = 该状态得分 / 总得分 × 100%。")}
        </p>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 24 }}>
          {t("A Bull/Bear Intensity Score (0-100) is also computed from 6 CMC data fields in real time, providing a continuous market strength reading independent of regime classification.",
            "同时从6个 CMC 数据字段实时计算多空强度分（0-100），提供独立于状态分类的连续市场强度读数。")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {[
            { regime: "PANIC SELLOFF", color: "#e8193c", icon: "🔴", desc: t("Extreme fear — collective mistakes occurring, contrarian opportunity building. Key triggers: F&G <20 (+3pts), derivatives surge >+20% (+2pts), 9+ of Top10 declining (+2pts).", "极度恐慌——集体性错误正在发生。关键触发：恐贪<20(+3分)，衍生品量>+20%(+2分)，Top10中9+下跌(+2分)。"), bias: t("Watch for reversal signals while protecting against continuation", "关注反转信号，同时防范延续下跌") },
            { regime: "BEAR TREND", color: "#e8193c", icon: "🔻", desc: t("Trending lower — bears dominant. F&G 21-35, market cap 24H change -1% to -3%, 7-8 of Top10 declining.", "趋势性下跌——空头主导。恐贪21-35，市值24H变化-1%至-3%，Top10中7-8只下跌。"), bias: t("Trend-following short, wait for reversal confirmation", "顺势做空，等待反转确认") },
            { regime: "ACCUMULATION", color: "#d4800a", icon: "🟡", desc: t("Depressed prices with declining momentum. F&G <20 + decelerating decline, 30D change <-25%. Derivatives volume declining.", "价格低迷，动能减弱。恐贪<20+下跌减速，30D跌幅<-25%，衍生品交易量下降。"), bias: t("Light long positions with strict risk control", "轻仓做多，严格风控") },
            { regime: "RECOVERY", color: "#00954a", icon: "🟢", desc: t("Recovering from lows. F&G 61-80, market cap 24H >0%, BTC dominance falling, 3 or fewer of Top10 declining.", "从低点回升。恐贪61-80，市值24H>0%，BTC主导率下降，Top10中3只或以下下跌。"), bias: t("Trend-following long, take profits at resistance", "顺势做多，在阻力位获利了结") },
            { regime: "BULL TREND", color: "#00954a", icon: "🚀", desc: t("Strong uptrend. F&G >75, market cap 24H >+2%, 2 or fewer of Top10 declining, target 7D change >+10%.", "强劲上涨趋势。恐贪>75，市值24H>+2%，Top10中2只或以下下跌，目标币7D涨幅>+10%。"), bias: t("Trend-following long, add on dips", "顺势做多，逢低加仓") },
          ].map(({ regime, color, icon, desc, bias }) => (
            <div key={regime} style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color }}>{regime}</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(10,26,58,0.6)", marginBottom: 8, lineHeight: 1.6 }}>{desc}</div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color, background: `${color}08`, padding: "3px 8px", borderRadius: 4, display: "inline-block" }}>
                {t("Signal bias: ", "信号偏向：")} {bias}
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(0,71,204,0.04)", border: "1px solid rgba(0,71,204,0.12)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#0047cc", letterSpacing: "0.1em", marginBottom: 8 }}>{t("BULL/BEAR INTENSITY FORMULA", "多空强度计算公式")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(10,26,58,0.6)", lineHeight: 1.8 }}>
            Base: 50<br/>
            + (Fear&Greed - 50) × 0.3<br/>
            - 15 if derivatives_change &gt; 20%<br/>
            - 12 if stablecoin_volume_change &gt; 15%<br/>
            - (btc_dominance_change × 10)<br/>
            - (declining_top10 - 5) × 3<br/>
            + target_24h_change × 2<br/>
            → Clamped to [0, 100]
          </div>
        </div>
      </div>
    ),

    "arch-court": (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#0a1a3a" }}>{t("Verdict Court", "裁决法庭")}</h2>
          <EarlyBadge lang={lang} />
        </div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 24 }}>
          {t("The Three-Court process ensures every judgment is falsifiable. The claim must be stated BEFORE all evidence is reviewed — preventing post-hoc rationalization.",
            "三庭流程确保每次判断均可证伪。主张必须在审查所有证据之前陈述——防止事后合理化。")}
        </p>
        {[
          {
            court: t("COURT I — Claim Court", "庭一 — 起诉庭"), color: "#0047cc",
            desc: t("Before examining any data, state a specific falsifiable claim.", "在检查任何数据之前，陈述一个具体的可证伪主张。"),
            rules: [
              t("State the claim BEFORE reviewing all 7 dimensions", "在审查全部7个维度前陈述主张"),
              t("Must include a specific price target (not just 'go up')", "必须包含具体价格目标（不能只说'上涨'）"),
              t("Define exactly 3 falsification conditions with measurable thresholds", "定义恰好3个带可测量阈值的证伪条件"),
              t("The claim is a hypothesis — verdict may differ if evidence contradicts it", "主张是假设——若证据相悖，裁决结果可能不同"),
            ]
          },
          {
            court: t("COURT II — Evidence Court", "庭二 — 证据庭"), color: "#6633cc",
            desc: t("Review all 7 dimensions with both supporting AND opposing evidence.", "审查全部7个维度，包括支持和反对的证据。"),
            rules: [
              t("Assign HIGH / MEDIUM / LOW weight per dimension based on rules", "按规则为每个维度分配高/中/低权重"),
              t("Required: at least 1 BULLISH or NEUTRAL signal even in bearish environments", "要求：即使在看空环境中也至少有1个看多或中立信号"),
              t("7/7 bearish alignment → reduce confidence by 10-15% (crowded trade risk)", "7/7全看空 → 降低置信度10-15%（过度拥挤风险）"),
              t("stablecoin/derivatives fields measure VOLUME change, not market cap change", "稳定币/衍生品字段衡量交易量变化，不是市值变化"),
            ]
          },
          {
            court: t("COURT III — Verdict Court", "庭三 — 裁决庭"), color: "#00954a",
            desc: t("Synthesize evidence into the final judgment with full strategy specification.", "将证据综合为最终裁决，附完整策略规格。"),
            rules: [
              t("Output BEARISH / BULLISH / NEUTRAL with confidence score 0-100%", "输出看空/看多/中立，附0-100%置信度"),
              t("Provide market context, 3 rationale points, risk level classification", "提供市场背景、3条理由、风险等级分类"),
              t("Include entry, target1, target2, stop loss, valid window (48H max)", "包含入场价、目标1、目标2、止损位、有效期（最长48小时）"),
              t("Minimum 4 invalidation conditions + mandatory 24H appeal mechanism", "最少4条失效条件 + 强制性24H上诉机制"),
            ]
          },
        ].map(({ court, color, desc, rules }) => (
          <div key={court} style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${color}22`, borderTop: `3px solid ${color}`, borderRadius: 10, padding: "18px 20px", marginBottom: 12 }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>{court}</div>
            <div style={{ fontSize: 13, color: "rgba(10,26,58,0.55)", marginBottom: 12 }}>{desc}</div>
            {rules.map(r => (
              <div key={r} style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(10,26,58,0.65)", padding: "4px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ color, flexShrink: 0 }}>→</span>{r}
              </div>
            ))}
          </div>
        ))}
      </div>
    ),

    "skill-overview": (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#0a1a3a" }}>{t("Strategy Skill Overview", "策略技能概述")}</h2>
          <EarlyBadge lang={lang} />
        </div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 20 }}>
          {t("Themis-Verdict is published as a reusable Strategy Skill for CoinMarketCap's AI Agent Hub. Any AI agent can follow the Skill specification to generate structured market verdicts using live CMC data.",
            "Themis-Verdict 作为 CoinMarketCap AI Agent Hub 的可复用策略技能发布。任何 AI Agent 都可以遵循 Skill 规范，使用实时 CMC 数据生成结构化市场裁决。")}
        </p>
        <div style={{ background: "rgba(0,71,204,0.04)", border: "1px solid rgba(0,71,204,0.12)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#0047cc", letterSpacing: "0.15em", marginBottom: 10 }}>{t("SKILL FILE", "技能文件")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#0a1a3a", marginBottom: 4 }}>THEMIS_VERDICT_SKILL.md</div>
          <div style={{ fontSize: 12, color: "rgba(10,26,58,0.5)", marginBottom: 12 }}>{t("Full specification available in the GitHub repository", "完整规范见 GitHub 仓库")}</div>
          <a href="https://github.com/lant1ng-1216/themis-verdict" target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#0047cc", textDecoration: "none", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "6px 14px", borderRadius: 6, display: "inline-block" }}>
            {t("View on GitHub →", "在 GitHub 查看 →")}
          </a>
        </div>
        <div style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 14 }}>{t("SKILL vs API — KEY DIFFERENCE", "技能 vs API — 核心区别")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#0047cc", marginBottom: 8 }}>📘 Skill Markdown</div>
              <div style={{ fontSize: 12, color: "rgba(10,26,58,0.6)", lineHeight: 1.7 }}>{t("Teaches agents HOW to run the analysis. Agents call CMC directly and run their own verdicts using the methodology.", "教会 Agent 如何运行分析。Agent 自行调用 CMC，使用此方法论运行自己的裁决。")}</div>
            </div>
            <div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#6633cc", marginBottom: 8 }}>🔌 Agent API</div>
              <div style={{ fontSize: 12, color: "rgba(10,26,58,0.6)", lineHeight: 1.7 }}>{t("Gives agents ready-made RESULTS. Agents subscribe and receive pre-computed verdict signals from Themis directly.", "直接给 Agent 现成结果。Agent 订阅并直接从 Themis 接收预计算的裁决信号。")}</div>
            </div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(10,26,58,0.4)", letterSpacing: "0.15em", marginBottom: 12 }}>{t("CMC TOOLS USED", "使用的 CMC 工具")}</div>
          {[
            { tool: "get_crypto_quotes_latest", dims: t("Price Momentum, Asset Resolution", "价格动能、资产解析") },
            { tool: "get_global_metrics_latest", dims: t("Sentiment, Derivatives, BTC Dominance, Stablecoin Flow", "情绪、衍生品、BTC主导率、稳定币流向") },
            { tool: "get_crypto_listings_latest", dims: t("Market Breadth (Top 10)", "市场宽度（Top 10）") },
            { tool: "get_crypto_categories", dims: t("Sector Rotation (20+ sectors)", "板块轮动（20+板块）") },
            { tool: "search_cryptos", dims: t("Dynamic asset ID resolution for any token", "任意代币动态ID解析") },
          ].map(({ tool, dims }) => (
            <div key={tool} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", alignItems: "flex-start" }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#6633cc", flexShrink: 0, minWidth: 200 }}>{tool}</span>
              <span style={{ fontSize: 12, color: "rgba(10,26,58,0.55)" }}>{dims}</span>
            </div>
          ))}
        </div>
      </div>
    ),

    "skill-workflow": (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#0a1a3a" }}>{t("7-Step Workflow", "7步工作流")}</h2>
          <EarlyBadge lang={lang} />
        </div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 24 }}>
          {t("The complete workflow for generating a Themis verdict. Each step must be completed in order.", "生成 Themis 裁决的完整工作流。每个步骤必须按顺序完成。")}
        </p>
        {[
          { step: "01", title: t("Resolve Target Asset", "解析目标资产"), desc: t("Call search_cryptos or get_crypto_quotes_latest to identify the asset. Get CMC ID, current price, and rank. For any non-major token, dynamically resolve the ID by selecting the highest-ranked active result.", "调用 search_cryptos 或 get_crypto_quotes_latest 识别资产。获取 CMC ID、当前价格和排名。对于非主流代币，通过选择排名最高的活跃结果动态解析 ID。") },
          { step: "02", title: t("Collect 7-Dimension Evidence", "采集7维度证据"), desc: t("Call all required CMC endpoints in parallel. Extract specific data fields for each dimension. Note: stablecoin_24h_percentage_change and derivatives_24h_percentage_change measure VOLUME change, not price or market cap.", "并行调用所有必需的 CMC 接口。提取每个维度的特定数据字段。注意：稳定币和衍生品的24H百分比变化字段衡量的是交易量变化，不是价格或市值。") },
          { step: "03", title: t("Classify Market Regime", "分类市场状态"), desc: t("Score all 5 regimes using the weighted signal rules. Select the highest-scoring regime. Compute confidence as (regime score / total score) × 100%. Also compute the Bull/Bear Intensity Score (0-100).", "使用加权信号规则对全部5种状态打分。选择得分最高的状态。计算置信度 = 该状态得分/总得分×100%。同时计算多空强度分（0-100）。") },
          { step: "04", title: t("Run Three-Court Process", "运行三庭流程"), desc: t("Court I: State the claim before reviewing all evidence. Court II: Review 7 dimensions with both supporting and opposing signals. Court III: Synthesize into final verdict with strategy specification.", "庭一：在审查所有证据前陈述主张。庭二：审查7个维度，包含支持和反对信号。庭三：综合得出最终裁决和策略规格。") },
          { step: "05", title: t("Compute Intensity Score", "计算强度分"), desc: t("Apply the Bull/Bear Intensity formula using 6 real-time CMC fields. Clamp result to [0, 100]. Score 0-40 = Bears dominant, 41-59 = Balanced, 60-100 = Bulls dominant.", "使用6个实时 CMC 字段应用多空强度公式。结果限制在[0, 100]范围内。0-40=空头主导，41-59=平衡，60-100=多头主导。") },
          { step: "06", title: t("Check Macro Events", "检查宏观事件"), desc: t("Query economic calendar for high-impact US events within the 48-hour verdict window (FOMC, NFP, CPI, GDP). If events exist, add macro warning and note potential override of technical signals.", "查询未来48小时内的高影响美国宏观事件（FOMC、非农、CPI、GDP）。若存在事件，添加宏观警告并说明可能覆盖技术信号。") },
          { step: "07", title: t("Archive & Verify", "存档与验证"), desc: t("Store verdict with full data snapshot. After 24+ hours, verify outcome: correct (>2% in predicted direction), incorrect (>2% against), or inconclusive (within ±2%). Update Bayesian signal weights: +0.05 correct, -0.05 incorrect.", "存储裁决及完整数据快照。24小时后验证结果：正确（预测方向>2%）、错误（反向>2%）或不确定（±2%以内）。更新贝叶斯信号权重：正确+0.05，错误-0.05。") },
        ].map(({ step, title, desc }) => (
          <div key={step} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: "#0047cc", background: "rgba(0,71,204,0.08)", width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{step}</div>
            <div style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 10, padding: "14px 18px", flex: 1 }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: "#0a1a3a", marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 13, color: "rgba(10,26,58,0.6)", lineHeight: 1.7 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    ),

    "skill-example": (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#0a1a3a" }}>{t("Example Output", "示例输出")}</h2>
          <EarlyBadge lang={lang} />
        </div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 20 }}>
          {t("A sample Themis verdict for BTC in a Panic Selloff regime. All prices from live CMC data.", "BTC 在恐慌抛售状态下的 Themis 裁决示例。所有价格来自实时 CMC 数据。")}
        </p>
        <div style={{ background: "#0a1a3a", borderRadius: 12, padding: "20px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, lineHeight: 1.9, color: "rgba(255,255,255,0.7)", overflowX: "auto" }}>
          <div style={{ color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>── VERDICT PROTOCOL · MARKET VERDICT ──────────────────</div>
          <div><span style={{ color: "#7ab8ff" }}>Asset:</span> BTC &nbsp;&nbsp;<span style={{ color: "#7ab8ff" }}>Time:</span> 2026-06-05 01:15:00 UTC</div>
          <div><span style={{ color: "#7ab8ff" }}>Regime:</span> <span style={{ color: "#e8193c" }}>PANIC SELLOFF</span> &nbsp;<span style={{ color: "#7ab8ff" }}>Confidence:</span> 53.8%</div>
          <div><span style={{ color: "#7ab8ff" }}>Intensity:</span> 28/100 — <span style={{ color: "#e8193c" }}>Bears Dominant</span></div>
          <div style={{ margin: "12px 0", color: "rgba(255,255,255,0.3)" }}>────────────────────────────────────────────────────────</div>
          <div style={{ color: "#ffcc00" }}>⚡ BTC bearish 75% — extreme fear + derivatives surge signal continuation</div>
          <div style={{ margin: "12px 0", color: "rgba(255,255,255,0.3)" }}>── COURT I ──────────────────────────────────────────────</div>
          <div><span style={{ color: "#00cc66" }}>Claim:</span> BTC will decline to $60,000 within 48h from $63,400</div>
          <div style={{ color: "rgba(255,255,255,0.5)", paddingLeft: 16 }}>Falsification: breaks $65,500 / F&G rises above 30 / derivatives contracts</div>
          <div style={{ margin: "12px 0", color: "rgba(255,255,255,0.3)" }}>── COURT II ─────────────────────────────────────────────</div>
          {[
            { n: "1/7", dim: "Price Momentum  ", sig: "BEARISH ⬇", wt: "HIGH", d: "1H:-0.9% 24H:-3.2% 7D:-14.1% 30D:-22.4%" },
            { n: "2/7", dim: "Market Sentiment", sig: "BEARISH ⬇", wt: "MED ", d: "F&G: 19 (Extreme Fear)" },
            { n: "3/7", dim: "Market Breadth  ", sig: "BEARISH ⬇", wt: "HIGH", d: "9/10 Top10 declining, avg -2.8%" },
            { n: "4/7", dim: "Derivatives Vol ", sig: "BEARISH ⬇", wt: "MED ", d: "Volume +22.6% — panic deleveraging" },
            { n: "5/7", dim: "BTC Dominance   ", sig: "BEARISH ⬇", wt: "MED ", d: "Dominance +0.25% — capital fleeing" },
            { n: "6/7", dim: "Sector Rotation ", sig: "BEARISH ⬇", wt: "MED ", d: "AI -8.7%, NFT -8.0%, Perps -12.3%" },
            { n: "7/7", dim: "Stablecoin Flow ", sig: "NEUTRAL ➡", wt: "HIGH", d: "Volume +12.5% — moderate safe-haven" },
          ].map(({ n, dim, sig, wt, d }) => (
            <div key={n} style={{ display: "flex", gap: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>[{n}]</span>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>{dim}</span>
              <span style={{ color: sig.includes("BEARISH") ? "#e8193c" : sig.includes("BULLISH") ? "#00cc66" : "#ffcc00" }}>{sig}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{wt}</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{d}</span>
            </div>
          ))}
          <div style={{ margin: "12px 0", color: "rgba(255,255,255,0.3)" }}>── COURT III ────────────────────────────────────────────</div>
          <div><span style={{ color: "#e8193c", fontWeight: 700, fontSize: 14 }}>BEARISH</span> &nbsp; <span style={{ color: "#7ab8ff" }}>Confidence:</span> <span style={{ color: "#e8193c" }}>75%</span> &nbsp; <span style={{ color: "#7ab8ff" }}>Risk:</span> <span style={{ color: "#e8193c" }}>🔴 HIGH</span></div>
          <div style={{ color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Entry: $63,400 · Target1: $60,500 · Target2: $58,500 · Stop: $65,800</div>
          <div style={{ color: "rgba(255,255,255,0.5)" }}>Valid until: 2026-06-07 01:15:00 UTC</div>
          <div style={{ marginTop: 8, color: "#ffcc00" }}>⚠ Macro: US Non-Farm Payrolls (HIGH IMPACT) in 4h — may override signals</div>
        </div>
      </div>
    ),

    "api-endpoints": (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#0a1a3a" }}>{t("API Endpoints", "接口列表")}</h2>
          <EarlyBadge lang={lang} />
        </div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 24 }}>
          {t("The Themis Agent API provides real-time verdict signals via REST and SSE. All endpoints require an API key — see Authentication for details.",
            "Themis Agent API 通过 REST 和 SSE 提供实时裁决信号。所有接口均需 API Key，详见鉴权方式。")}
        </p>
        <div style={{ background: "#0a1a3a", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", marginBottom: 16 }}>BASE URL: https://api.themisverdict.xyz</div>
          {[
            { method: "GET", path: "/api/v1/verdict/latest", params: "?symbol=BTC", plan: "Standard+", desc: t("Latest verdict for any asset", "获取任意资产最新裁决") },
            { method: "GET", path: "/api/v1/verdict/stream", params: "", plan: "Pro+", desc: t("SSE real-time verdict stream", "SSE 实时裁决数据流") },
            { method: "GET", path: "/api/v1/verdict/history", params: "?symbol=BTC&limit=24", plan: "Standard+", desc: t("Historical verdicts with accuracy stats", "历史裁决记录及准确率") },
            { method: "GET", path: "/api/v1/regime/current", params: "", plan: "Free", desc: t("Current market regime snapshot", "当前市场状态快照") },
            { method: "GET", path: "/api/v1/accuracy/stats", params: "?symbol=BTC", plan: "Standard+", desc: t("Signal accuracy & Bayesian weights", "信号准确率与贝叶斯权重") },
            { method: "GET", path: "/api/v1/graph/edges", params: "?date=today", plan: "Agent", desc: t("Verdict relation graph data", "裁决关系图谱数据") },
          ].map(({ method, path, params, plan, desc }) => (
            <div key={path} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#00cc66", background: "rgba(0,204,102,0.1)", padding: "2px 6px", borderRadius: 4, flexShrink: 0, width: 36, textAlign: "center" }}>{method}</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#7ab8ff", flex: 1 }}>{path}<span style={{ color: "rgba(255,255,255,0.3)" }}>{params}</span></span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: plan === "Free" ? "#00cc66" : plan === "Agent" ? "#cc66ff" : "#ffcc00", background: plan === "Free" ? "rgba(0,204,102,0.12)" : plan === "Agent" ? "rgba(204,102,255,0.12)" : "rgba(255,204,0,0.12)", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>{plan}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0, maxWidth: 160, textAlign: "right" }}>{desc}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(10,26,58,0.4)", letterSpacing: "0.1em", marginBottom: 10 }}>{t("RESPONSE FORMAT (PREVIEW)", "响应格式（预览）")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "rgba(10,26,58,0.6)", lineHeight: 1.8 }}>
            {"{"}<br/>
            &nbsp;&nbsp;"verdict_id": "VP-20260605091511-BTC",<br/>
            &nbsp;&nbsp;"symbol": "BTC",<br/>
            &nbsp;&nbsp;"conclusion": "bearish",<br/>
            &nbsp;&nbsp;"confidence": 75,<br/>
            &nbsp;&nbsp;"regime": "PANIC_SELLOFF",<br/>
            &nbsp;&nbsp;"intensity": 28,<br/>
            &nbsp;&nbsp;"entry_price": "$63,400",<br/>
            &nbsp;&nbsp;"target1": "$60,500",<br/>
            &nbsp;&nbsp;"stoploss": "$65,800",<br/>
            &nbsp;&nbsp;"valid_until": "2026-06-07T01:15:00Z",<br/>
            &nbsp;&nbsp;"timestamp": "2026-06-05T01:15:00Z"<br/>
            {"}"}
          </div>
        </div>
      </div>
    ),

    "api-auth": (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#0a1a3a" }}>{t("Authentication", "鉴权方式")}</h2>
          <EarlyBadge lang={lang} />
        </div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 24 }}>
          {t("All API requests must include your API key in the request header. Keys are tied to your subscription plan and enforce rate limits automatically.",
            "所有 API 请求必须在请求头中携带 API Key。Key 与订阅计划绑定，并自动执行频率限制。")}
        </p>
        <div style={{ background: "#0a1a3a", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", marginBottom: 12 }}>{t("REQUEST HEADER", "请求头")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#7ab8ff" }}>X-API-Key: <span style={{ color: "#ffcc00" }}>tmv_xxxxxxxxxxxxxxxxxxxx</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {[
            { plan: "Free", color: "#00954a", rateLimit: t("60 req/day", "60次/天"), access: t("Regime snapshot only", "仅市场状态快照") },
            { plan: "Standard", color: "#0047cc", rateLimit: t("1,000 req/day", "1,000次/天"), access: t("Verdict latest, history, accuracy stats", "最新裁决、历史记录、准确率") },
            { plan: "Pro", color: "#d4800a", rateLimit: t("10,000 req/day + SSE stream", "10,000次/天 + SSE流"), access: t("All endpoints including real-time stream", "所有接口含实时数据流") },
            { plan: "Agent", color: "#6633cc", rateLimit: t("Unlimited + priority queue", "无限制 + 优先队列"), access: t("All endpoints + graph data + webhooks", "所有接口 + 图谱数据 + Webhook") },
          ].map(({ plan, color, rateLimit, access }) => (
            <div key={plan} style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${color}22`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color, background: `${color}10`, padding: "4px 10px", borderRadius: 6, flexShrink: 0 }}>{plan}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0a1a3a", marginBottom: 2 }}>{rateLimit}</div>
                <div style={{ fontSize: 12, color: "rgba(10,26,58,0.5)" }}>{access}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(0,71,204,0.04)", border: "1px solid rgba(0,71,204,0.12)", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#0047cc", letterSpacing: "0.1em", marginBottom: 8 }}>{t("GET YOUR API KEY", "获取 API Key")}</div>
          <p style={{ fontSize: 13, color: "rgba(10,26,58,0.6)", marginBottom: 12, lineHeight: 1.7 }}>
            {t("API keys are generated from the Dashboard. Each key is prefixed with tmv_ and can be rotated at any time without changing your plan.",
              "API Key 在控制台生成，以 tmv_ 开头，可随时轮换而不影响订阅计划。")}
          </p>
          <a href="/dashboard" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: "#0047cc", textDecoration: "none", background: "rgba(0,71,204,0.08)", border: "1px solid rgba(0,71,204,0.2)", padding: "6px 14px", borderRadius: 6, display: "inline-block" }}>
            {t("Open Dashboard →", "打开控制台 →")}
          </a>
        </div>
      </div>
    ),

    "api-quickstart": (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#0a1a3a" }}>{t("Quickstart", "快速接入")}</h2>
          <EarlyBadge lang={lang} />
        </div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 24 }}>
          {t("Get your first verdict in under 60 seconds. Replace YOUR_API_KEY with the key from your Dashboard.",
            "60 秒内获取第一条裁决。将 YOUR_API_KEY 替换为控制台中的 Key。")}
        </p>
        {[
          {
            lang: "curl", label: "cURL",
            code: `curl -X GET "https://api.themisverdict.xyz/api/v1/verdict/latest?symbol=BTC" \\
  -H "X-API-Key: YOUR_API_KEY"`,
          },
          {
            lang: "python", label: "Python",
            code: `import requests

res = requests.get(
    "https://api.themisverdict.xyz/api/v1/verdict/latest",
    params={"symbol": "BTC"},
    headers={"X-API-Key": "YOUR_API_KEY"}
)
verdict = res.json()
print(verdict["conclusion"], verdict["confidence"])`,
          },
          {
            lang: "js", label: "JavaScript",
            code: `const res = await fetch(
  "https://api.themisverdict.xyz/api/v1/verdict/latest?symbol=BTC",
  { headers: { "X-API-Key": "YOUR_API_KEY" } }
);
const verdict = await res.json();
console.log(verdict.conclusion, verdict.confidence);`,
          },
        ].map(({ lang: l, label, code }) => (
          <div key={l} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(10,26,58,0.4)", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
            <div style={{ background: "#0a1a3a", borderRadius: 10, padding: "16px 20px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, overflowX: "auto", whiteSpace: "pre" }}>{code}</div>
          </div>
        ))}
        <div style={{ background: "rgba(0,149,74,0.05)", border: "1px solid rgba(0,149,74,0.15)", borderRadius: 10, padding: "16px 20px", marginTop: 8 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#00954a", letterSpacing: "0.1em", marginBottom: 8 }}>{t("EXAMPLE RESPONSE", "响应示例")}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "rgba(10,26,58,0.6)", lineHeight: 1.8 }}>
            {"{"}<br/>
            &nbsp;&nbsp;"verdict_id": "VP-20260611091511-BTC",<br/>
            &nbsp;&nbsp;"symbol": "BTC",<br/>
            &nbsp;&nbsp;"conclusion": "bearish",<br/>
            &nbsp;&nbsp;"confidence": 75,<br/>
            &nbsp;&nbsp;"regime": "PANIC_SELLOFF",<br/>
            &nbsp;&nbsp;"intensity": 28,<br/>
            &nbsp;&nbsp;"entry_price": 63400,<br/>
            &nbsp;&nbsp;"target1": 60500,<br/>
            &nbsp;&nbsp;"target2": 58500,<br/>
            &nbsp;&nbsp;"stoploss": 65800,<br/>
            &nbsp;&nbsp;"valid_until": "2026-06-13T09:15:00Z",<br/>
            &nbsp;&nbsp;"timestamp": "2026-06-11T09:15:00Z"<br/>
            {"}"}
          </div>
        </div>
      </div>
    ),

    roadmap: (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#0a1a3a" }}>{t("Roadmap", "路线图")}</h2>
          <EarlyBadge lang={lang} />
        </div>
        <p style={{ fontSize: 14, color: "rgba(10,26,58,0.65)", lineHeight: 1.9, marginBottom: 24 }}>
          {t("Themis is under active development. The roadmap reflects our current priorities — items may shift as we learn from real-world usage.",
            "Themis 正在积极开发中。路线图反映当前优先级，会随实际使用情况动态调整。")}
        </p>
        {[
          {
            phase: "v0.1 – v0.3", label: t("Foundation", "基础层"), color: "#00954a", status: t("Completed", "已完成"),
            items: [
              t("7-dimension evidence engine with live CMC data", "7维度证据引擎，接入实时 CMC 数据"),
              t("Three-Court verdict process (Claim → Evidence → Verdict)", "三庭裁决流程（起诉庭 → 证据庭 → 裁决庭）"),
              t("5-regime classifier with Bayesian accuracy tracking", "5状态分类器 + 贝叶斯准确率追踪"),
              t("Real-time web dashboard: verdict feed, regime monitor", "实时网页看板：裁决 Feed、状态监控"),
              t("Binance Demo Futures integration — auto entry/exit", "Binance 模拟期货集成，自动开平仓"),
              t("Position management UI with P&L tracking", "持仓管理界面 + 盈亏追踪"),
              t("Developer portal: Agent API docs, plan access table", "开发者门户：Agent API 文档、计划权限表"),
            ],
          },
          {
            phase: "v0.4", label: t("Agent API Layer", "Agent API 层"), color: "#0047cc", status: t("In Progress", "进行中"),
            items: [
              t("REST endpoints: /verdict/latest, /regime/current, /accuracy/stats", "REST 接口上线：latest / regime / accuracy"),
              t("SSE stream endpoint: /verdict/stream (Pro+)", "SSE 实时流接口（Pro+）"),
              t("API Key generation and management in Dashboard", "控制台 API Key 生成与管理"),
              t("Plan-based rate limiting middleware", "基于计划的频率限制中间件"),
              t("APScheduler: auto-verdict every 30 minutes", "APScheduler：每30分钟自动裁决"),
            ],
          },
          {
            phase: "v0.5", label: t("Intelligence Layer", "智能层"), color: "#d4800a", status: t("Planned", "规划中"),
            items: [
              t("Verdict graph: cross-asset correlation edges", "裁决图谱：跨资产相关性边数据"),
              t("Appeal mechanism: 24H verdict review with updated data", "上诉机制：24H 后用更新数据重审裁决"),
              t("Multi-asset portfolio verdict aggregation", "多资产组合裁决聚合"),
              t("Webhook push notifications for subscribed assets", "订阅资产的 Webhook 推送通知"),
            ],
          },
          {
            phase: "v1.0", label: t("On-Chain Protocol", "链上协议"), color: "#6633cc", status: t("Future", "未来"),
            items: [
              t("Verdict NFTs: immutable on-chain verdict record", "裁决 NFT：不可篡改的链上裁决记录"),
              t("Accuracy staking: stake on your verdict's accuracy", "准确率质押：对裁决准确率质押"),
              t("On-chain Bayesian weight registry", "链上贝叶斯权重登记"),
              t("Decentralized verdict economy", "去中心化裁决经济"),
            ],
          },
        ].map(({ phase, label, color, status, items }) => (
          <div key={phase} style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color, background: `${color}10`, padding: "3px 8px", borderRadius: 4 }}>{phase}</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: "#0a1a3a" }}>{label}</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: status === t("Completed", "已完成") ? "#00954a" : status === t("In Progress", "进行中") ? "#0047cc" : "rgba(10,26,58,0.35)", marginLeft: "auto" }}>{status}</span>
            </div>
            {items.map(item => (
              <div key={item} style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(10,26,58,0.6)", padding: "3px 0" }}>
                <span style={{ color, flexShrink: 0 }}>·</span>{item}
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4fb", position: "relative" }}>
      <SiteNav lang={lang} onLangChange={handleLang} />

      <div style={{ display: "flex", paddingTop: 56, minHeight: "100vh" }}>
        {/* Sidebar */}
        <div style={{ width: 220, flexShrink: 0, position: "fixed", top: 56, bottom: 0, left: 0, overflowY: "auto", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", borderRight: "1px solid rgba(255,255,255,0.5)", padding: "20px 0" }}>
          {SECTIONS.map(section => (
            <div key={section.id}>
              <div onClick={() => { if (section.children.length) { toggle(section.id); } else { setActive(section.id); } }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px", cursor: "pointer", background: active === section.id ? "rgba(0,71,204,0.08)" : "none", borderRight: active === section.id ? "2px solid #0047cc" : "2px solid transparent", transition: "all 0.15s" }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 700, color: active === section.id ? "#0047cc" : "rgba(10,26,58,0.6)", letterSpacing: "0.04em" }}>{t(section.en, section.zh)}</span>
                {section.children.length > 0 && <span style={{ fontSize: 10, color: "rgba(10,26,58,0.3)", transform: expanded.includes(section.id) ? "rotate(90deg)" : "", transition: "transform 0.2s", display: "inline-block" }}>›</span>}
              </div>
              {section.children.length > 0 && expanded.includes(section.id) && section.children.map(child => (
                <div key={child.id} onClick={() => setActive(child.id)}
                  style={{ padding: "6px 20px 6px 32px", cursor: "pointer", background: active === child.id ? "rgba(0,71,204,0.06)" : "none", borderRight: active === child.id ? "2px solid #0047cc" : "2px solid transparent" }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: active === child.id ? "#0047cc" : "rgba(10,26,58,0.45)" }}>{t(child.en, child.zh)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ marginLeft: 220, flex: 1, padding: "40px 48px", maxWidth: 800, position: "relative", zIndex: 1 }}>
          {content[active] || <SoonBlock lang={lang} />}
        </div>
      </div>
    </div>
  );
}
