import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import * as cheerio from "cheerio";

// ============ BLOB STORE HELPERS ============
async function getSearchStore() { return getStore("searches"); }
async function getSavedStore() { return getStore("saved-searches"); }

async function saveSearch(id: string, data: any): Promise<void> {
  const store = await getSearchStore();
  await store.setJSON(id, data);
}
async function getSearch(id: string): Promise<any | null> {
  const store = await getSearchStore();
  try { return await store.get(id, { type: "json" }); } catch { return null; }
}
async function getSavedSearches(): Promise<any[]> {
  const store = await getSavedStore();
  const { blobs } = await store.list();
  const items: any[] = [];
  for (const blob of blobs) {
    try { const d = await store.get(blob.key, { type: "json" }); if (d) items.push(d); } catch {}
  }
  return items;
}
async function saveSavedSearch(data: any): Promise<void> {
  const store = await getSavedStore();
  await store.setJSON(data.id, data);
}
async function deleteSavedSearch(id: string): Promise<void> {
  const store = await getSavedStore();
  await store.delete(id);
}

// ============ HELPERS ============
function sanitize(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/[<>]/g, "").trim();
}

async function fetchPage(url: string, timeoutMs = 6000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ============ MARKETPLACE SCRAPERS ============

// --- CRAIGSLIST ---
interface Deal {
  id: string;
  title: string;
  price: number | null;
  priceText: string;
  image: string | null;
  url: string;
  marketplace: string;
  location: string;
  postedAt: string;
}

const CRAIGSLIST_CITIES: Record<string, string> = {
  "vancouver": "vancouver", "toronto": "toronto", "montreal": "montreal",
  "calgary": "calgary", "edmonton": "edmonton", "ottawa": "ottawa",
  "los angeles": "losangeles", "new york": "newyork", "san francisco": "sfbay",
  "seattle": "seattle", "portland": "portland", "chicago": "chicago",
  "houston": "houston", "phoenix": "phoenix", "denver": "denver",
  "miami": "miami", "atlanta": "atlanta", "boston": "boston",
  "dallas": "dallas", "detroit": "detroit", "minneapolis": "minneapolis",
  "austin": "austin", "san diego": "sandiego", "las vegas": "lasvegas",
};

function buildCraigslistUrl(query: string, location: string): string {
  const city = CRAIGSLIST_CITIES[location.toLowerCase()] || "vancouver";
  const encoded = encodeURIComponent(query);
  return `https://${city}.craigslist.org/search/sss?query=${encoded}&sort=date&bundleDuplicates=1`;
}

function scrapeCraigslist(html: string, location: string): Deal[] {
  const $ = cheerio.load(html);
  const deals: Deal[] = [];

  $(".cl-static-search-result").each((i, el) => {
    if (i >= 50) return;
    const $el = $(el);
    const titleEl = $el.find(".title");
    const title = titleEl.text().trim();
    const href = titleEl.closest("a").attr("href") || $el.find("a").first().attr("href") || "";
    const priceText = $el.find(".price").text().trim();
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) || null : null;

    if (title) {
      deals.push({
        id: `cl-${i}-${Date.now()}`,
        title,
        price,
        priceText: priceText || "No price",
        image: null,
        url: href.startsWith("http") ? href : `https://craigslist.org${href}`,
        marketplace: "craigslist",
        location: location || "Local",
        postedAt: new Date().toISOString(),
      });
    }
  });
  return deals;
}

// --- AUTOTRADER.CA ---
function buildAutoTraderUrl(query: string, location: string): string {
  const encoded = encodeURIComponent(query);
  const loc = location || "Vancouver";
  return `https://www.autotrader.ca/cars/?rcp=15&rcs=0&prx=100&loc=${encodeURIComponent(loc)}&hprc=True&wcp=True&sts=New-Used&kwd=${encoded}&inMarket=advancedSearch`;
}

function scrapeAutoTrader(html: string, location: string): Deal[] {
  const $ = cheerio.load(html);
  const deals: Deal[] = [];

  // AutoTrader uses various selectors depending on rendering
  $("[class*='result-item'], .listing-details, .result-title").each((i, el) => {
    if (i >= 30) return;
    const $el = $(el);
    const title = $el.find(".title, h2, .result-title").first().text().trim() ||
                  $el.text().trim().substring(0, 100);
    const priceText = $el.find(".price, .price-amount").first().text().trim();
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) || null : null;
    const href = $el.find("a").first().attr("href") || "";
    const img = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || null;

    if (title && title.length > 3) {
      deals.push({
        id: `at-${i}-${Date.now()}`,
        title,
        price,
        priceText: priceText || "Contact for price",
        image: img,
        url: href.startsWith("http") ? href : `https://www.autotrader.ca${href}`,
        marketplace: "autotrader",
        location: location || "Vancouver",
        postedAt: new Date().toISOString(),
      });
    }
  });

  // Fallback: try generic title/price selectors
  if (deals.length === 0) {
    const titles: string[] = [];
    const prices: string[] = [];
    $(".title, h2 a, .listing-title").each((i, el) => { if (i < 30) titles.push($(el).text().trim()); });
    $(".price, .price-amount, [class*='price']").each((i, el) => { if (i < 30) prices.push($(el).text().trim()); });

    titles.forEach((title, i) => {
      if (title && title.length > 3) {
        const priceText = prices[i] || "Contact for price";
        const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) || null : null;
        deals.push({
          id: `at-fb-${i}-${Date.now()}`,
          title,
          price,
          priceText,
          image: null,
          url: "https://www.autotrader.ca",
          marketplace: "autotrader",
          location: location || "Vancouver",
          postedAt: new Date().toISOString(),
        });
      }
    });
  }
  return deals;
}

// --- EBAY (limited — HTML search still works) ---
function buildEbayUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://www.ebay.ca/sch/i.html?_nkw=${encoded}&_sop=10&LH_BIN=1&rt=nc`;
}

function scrapeEbay(html: string): Deal[] {
  const $ = cheerio.load(html);
  const deals: Deal[] = [];

  $(".s-item").each((i, el) => {
    if (i >= 30 || i === 0) return; // First item is often a placeholder
    const $el = $(el);
    const title = $el.find(".s-item__title").text().trim();
    const priceText = $el.find(".s-item__price").first().text().trim();
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) || null : null;
    const href = $el.find(".s-item__link").attr("href") || "";
    const img = $el.find(".s-item__image-wrapper img").attr("src") || null;

    if (title && title !== "Shop on eBay") {
      deals.push({
        id: `eb-${i}-${Date.now()}`,
        title,
        price,
        priceText: priceText || "See listing",
        image: img,
        url: href,
        marketplace: "ebay",
        location: "Canada",
        postedAt: new Date().toISOString(),
      });
    }
  });
  return deals;
}

// ============ SEARCH ORCHESTRATOR ============
async function searchMarketplaces(query: string, marketplaces: string[], location: string): Promise<{ deals: Deal[]; errors: string[] }> {
  const allDeals: Deal[] = [];
  const errors: string[] = [];

  const tasks: Promise<void>[] = [];

  if (marketplaces.includes("craigslist")) {
    tasks.push(
      fetchPage(buildCraigslistUrl(query, location))
        .then(html => { allDeals.push(...scrapeCraigslist(html, location)); })
        .catch(e => { errors.push(`Craigslist: ${e.message}`); })
    );
  }

  if (marketplaces.includes("autotrader")) {
    tasks.push(
      fetchPage(buildAutoTraderUrl(query, location))
        .then(html => { allDeals.push(...scrapeAutoTrader(html, location)); })
        .catch(e => { errors.push(`AutoTrader: ${e.message}`); })
    );
  }

  if (marketplaces.includes("ebay")) {
    tasks.push(
      fetchPage(buildEbayUrl(query))
        .then(html => { allDeals.push(...scrapeEbay(html)); })
        .catch(e => { errors.push(`eBay: ${e.message}`); })
    );
  }

  await Promise.all(tasks);

  // Sort by price ascending (deals with price first, then no-price at end)
  allDeals.sort((a, b) => {
    if (a.price === null && b.price === null) return 0;
    if (a.price === null) return 1;
    if (b.price === null) return -1;
    return a.price - b.price;
  });

  return { deals: allDeals, errors };
}

function computeStats(deals: Deal[]) {
  const priced = deals.filter(d => d.price !== null && d.price > 0);
  if (priced.length === 0) return { avgPrice: 0, lowestPrice: 0, highestPrice: 0, totalDeals: deals.length, pricedDeals: 0 };
  const prices = priced.map(d => d.price as number);
  return {
    avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
    totalDeals: deals.length,
    pricedDeals: priced.length,
  };
}

// ============ REQUEST HANDLER ============
export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/.netlify\/functions\/api/, "").replace(/^\/api/, "").replace(/\/$/, "") || "/";
  const method = req.method;

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });

  try {
    let body: any = null;
    const contentLength = req.headers.get("content-length");
    const hasBody = contentLength !== null && contentLength !== "0" && parseInt(contentLength) > 0;
    if ((method === "POST" || method === "PUT") && hasBody) {
      try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
    }

    // ============ SEARCH ============
    // POST /api/search — core deal search
    if (method === "POST" && path === "/search") {
      if (!body?.query || typeof body.query !== "string" || body.query.trim().length === 0) {
        return json({ error: "Search query is required" }, 400);
      }
      const query = sanitize(body.query).substring(0, 200);
      const location = sanitize(body.location || "vancouver").substring(0, 100);
      const marketplaces: string[] = Array.isArray(body.marketplaces) && body.marketplaces.length > 0
        ? body.marketplaces.filter((m: string) => ["craigslist", "autotrader", "ebay"].includes(m))
        : ["craigslist", "ebay"];

      if (marketplaces.length === 0) return json({ error: "Select at least one marketplace" }, 400);

      const searchId = crypto.randomUUID();
      const { deals, errors } = await searchMarketplaces(query, marketplaces, location);
      const stats = computeStats(deals);

      // Save results to blob
      await saveSearch(searchId, { id: searchId, query, location, marketplaces, deals, stats, errors, timestamp: new Date().toISOString() });

      return json({ searchId, query, location, deals, stats, errors, marketplaces, timestamp: new Date().toISOString() });
    }

    // GET /api/search/:id — retrieve cached search
    if (method === "GET" && path.match(/^\/search\/[^/]+$/)) {
      const id = path.split("/")[2];
      const result = await getSearch(id);
      if (!result) return json({ error: "Search not found" }, 404);
      return json(result);
    }

    // ============ SAVED SEARCHES ============
    if (method === "GET" && path === "/saved-searches") {
      const searches = await getSavedSearches();
      return json(searches.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }

    if (method === "POST" && path === "/saved-searches") {
      if (!body?.query) return json({ error: "Query is required" }, 400);
      const saved = {
        id: crypto.randomUUID(),
        query: sanitize(body.query).substring(0, 200),
        location: sanitize(body.location || "vancouver").substring(0, 100),
        marketplaces: Array.isArray(body.marketplaces) ? body.marketplaces : ["craigslist"],
        maxPrice: body.maxPrice || null,
        createdAt: new Date().toISOString(),
      };
      await saveSavedSearch(saved);
      return json(saved, 201);
    }

    if (method === "DELETE" && path.match(/^\/saved-searches\/[^/]+$/)) {
      const id = path.split("/")[2];
      await deleteSavedSearch(id);
      return json({ success: true });
    }

    // ============ MARKETPLACE STATUS ============
    if (method === "GET" && path === "/marketplaces") {
      return json([
        { id: "craigslist", name: "Craigslist", icon: "🏷️", status: "active", description: "Local classifieds — furniture, electronics, vehicles, everything" },
        { id: "autotrader", name: "AutoTrader", icon: "🚗", status: "active", description: "Canada's largest auto marketplace — cars, trucks, SUVs" },
        { id: "ebay", name: "eBay", icon: "🛒", status: "active", description: "Online auctions & Buy It Now — electronics, collectibles, deals" },
        { id: "facebook", name: "FB Marketplace", icon: "📘", status: "coming_soon", description: "Coming soon — requires browser automation" },
        { id: "kijiji", name: "Kijiji", icon: "🟢", status: "coming_soon", description: "Coming soon — requires browser automation" },
      ]);
    }

    return json({ error: "Not found" }, 404);
  } catch (e: any) {
    console.error("API error:", e);
    return json({ error: "Internal server error" }, 500);
  }
};

export const config: Config = { path: "/api/*" };
