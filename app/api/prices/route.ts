import { NextRequest, NextResponse } from "next/server";
import { fetch, ProxyAgent } from "undici";

const CMC_IDS: Record<string, number> = {
  BTC: 1, ETH: 1027, BNB: 1839, SOL: 5426,
  PEPE: 24478, DOGE: 74, ARB: 11841, OP: 11840,
  AVAX: 5805, MATIC: 3890, LINK: 1975, UNI: 7083,
  ADA: 2010, DOT: 6636, ATOM: 3794, APT: 21794,
  SUI: 20947, SEI: 23149, TIA: 22861, INJ: 7226,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols") || "BTC,ETH,BNB,SOL";
  const symbols = symbolsParam.split(",").map(s => s.trim().toUpperCase());
  const ids = symbols.map(s => CMC_IDS[s]).filter(Boolean).join(",");
  if (!ids) return NextResponse.json({ error: "No valid symbols" }, { status: 400 });

  try {
    const dispatcher = process.env.PROXY ? new ProxyAgent(process.env.PROXY) : undefined;
    const res = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${ids}&convert=USD`,
      {
        headers: { "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY || "" },
        ...(dispatcher ? { dispatcher } : {}),
      }
    );
    const data = await res.json() as any;
    const result: Record<string, { symbol: string; price: number; change1h: number; change24h: number; change7d: number; volume24h: number }> = {};
    symbols.forEach(sym => {
      const id = CMC_IDS[sym];
      if (!id || !data.data?.[id]) return;
      const q = data.data[id].quote.USD;
      result[sym] = { symbol: sym, price: q.price, change1h: q.percent_change_1h, change24h: q.percent_change_24h, change7d: q.percent_change_7d, volume24h: q.volume_24h };
    });
    return NextResponse.json({ data: result, timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: "CMC fetch failed", detail: String(e) }, { status: 500 });
  }
}
