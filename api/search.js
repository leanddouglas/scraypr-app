import * as cheerio from "cheerio";

// ============ HELPERS ============
function sanitize(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[<>]/g, "").trim();
}

async function fetchPage(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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
const CRAIGSLIST_CITIES = {
  vancouver: "vancouver", toronto: "toronto", montreal: "montreal",
  calgary: "calgary", edmonton: "edmonton", ottawa: "ottawa",
  "los angeles": "losangeles", "new york": "newyork", "san francisco": "sfbay",
  seattle: "seattle", portland: "portland", chicago: "chicago",
  houston: "houston", phoenix: "phoenix", denver: "denver",
  miami: "miami", atlanta: "atlanta", boston: "boston",
  dallas: "dallas", detroit: "detroit", minneapolis: "minneapolis",
  austin: "austin", "san diego": "sandiego", "las vegas": "lasvegas",
};

function buildCraigslistUrl(query, location) {
  const city = CRAIGSLIST_CITIES[location.toLowerCase()] || "vancouver";
  return `https://${city}.craigslist.org/search/sss?query=${encodeURIComponent(query)}&sort=date&bundleDuplicates=1`;
}

function scrapeCraigslist(html, location) {
  const $ = cheerio.load(html);
  const deals = [];
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
        title, price,
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
function buildAutoTraderUrl(query, location) {
  const loc = location || "Vancouver";
  return `https://www.autotrader.ca/cars/?rcp=15&rcs=0&prx=100&loc=${encodeURIComponent(loc)}&hprc=True&wcp=True&sts=New-Used&kwd=${encodeURIComponent(query)}&inMarket=advancedSearch`;
}

function scrapeAutoTrader(html, location) {
  const $ = cheerio.load(html);
  const deals = [];
  $("[class*='result-item'], .listing-details, .result-title").each((i, el) => {
    if (i >= 30) return;
    const $el = $(el);
    const title = $el.find(".title, h2, .result-title").first().text().trim() || $el.text().trim().substring(0, 100);
    const priceText = $el.find(".price, .price-amount").first().text().trim();
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) || null : null;
    const href = $el.find("a").first().attr("href") || "";
    const img = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || null;
    if (title && title.length > 3) {
      deals.push({
        id: `at-${i}-${Date.now()}`,
        title, price,
        priceText: priceText || "Contact for price",
        image: img,
        url: href.startsWith("http") ? href : `https://www.autotrader.ca${href}`,
        marketplace: "autotrader",
        location: location || "Vancouver",
        postedAt: new Date().toISOString(),
      });
    }
  });
  if (deals.length === 0) {
    const titles = []; const prices = [];
    $(".title, h2 a, .listing-title").each((i, el) => { if (i < 30) titles.push($(el).text().trim()); });
    $(".price, .price-amount, [class*='price']").each((i, el) => { if (i < 30) prices.push($(el).text().trim()); });
    titles.forEach((title, i) => {
      if (title && title.length > 3) {
        const pt = prices[i] || "Contact for price";
        const p = pt ? parseFloat(pt.replace(/[^0-9.]/g, "")) || null : null;
        deals.push({ id: `at-fb-${i}-${Date.now()}`, title, price: p, priceText: pt, image: null, url: "https://www.autotrader.ca", marketplace: "autotrader", location: location || "Vancouver", postedAt: new Date().toISOString() });
      }
    });
  }
  return deals;
}

// --- EBAY ---
function buildEbayUrl(query) {
  return `https://www.ebay.ca/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=10&LH_BIN=1&rt=nc`;
}

function scrapeEbay(html) {
  const $ = cheerio.load(html);
  const deals = [];
  $(".s-item").each((i, el) => {
    if (i >= 30 || i === 0) return;
    const $el = $(el);
    const title = $el.find(".s-item__title").text().trim();
    const priceText = $el.find(".s-item__price").first().text().trim();
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) || null : null;
    const href = $el.find(".s-item__link").attr("href") || "";
    const img = $el.find(".s-item__image-wrapper img").attr("src") || null;
    if (title && title !== "Shop on eBay") {
      deals.push({ id: `eb-${i}-${Date.now()}`, title, price, priceText: priceText || "See listing", image: img, url: href, marketplace: "ebay", location: "Canada", postedAt: new Date().toISOString() });
    }
  });
  return deals;
}

// ============ SEARCH ORCHESTRATOR ============
async function searchMarketplaces(query, marketplaces, location) {
  const allDeals = [];
  const errors = [];
  const tasks = [];

  if (marketplaces.includes("craigslist")) {
    tasks.push(fetchPage(buildCraigslistUrl(query, location)).then(html => { allDeals.push(...scrapeCraigslist(html, location)); }).catch(e => { errors.push(`Craigslist: ${e.message}`); }));
  }
  if (marketplaces.includes("autotrader")) {
    tasks.push(fetchPage(buildAutoTraderUrl(query, location)).then(html => { allDeals.push(...scrapeAutoTrader(html, location)); }).catch(e => { errors.push(`AutoTrader: ${e.message}`); }));
  }
  if (marketplaces.includes("ebay")) {
    tasks.push(fetchPage(buildEbayUrl(query)).then(html => { allDeals.push(...scrapeEbay(html)); }).catch(e => { errors.push(`eBay: ${e.message}`); }));
  }
  await Promise.all(tasks);
  allDeals.sort((a, b) => {
    if (a.price === null && b.price === null) return 0;
    if (a.price === null) return 1;
    if (b.price === null) return -1;
    return a.price - b.price;
  });
  return { deals: allDeals, errors };
}

function computeStats(deals) {
  const priced = deals.filter(d => d.price !== null && d.price > 0);
  if (priced.length === 0) return { avgPrice: 0, lowestPrice: 0, highestPrice: 0, totalDeals: deals.length, pricedDeals: 0 };
  const prices = priced.map(d => d.price);
  return {
    avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
    totalDeals: deals.length,
    pricedDeals: priced.length,
  };
}

// ============ VERCEL HANDLER ============
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body;
  if (!body?.query || typeof body.query !== "string" || body.query.trim().length === 0) {
    return res.status(400).json({ error: "Search query is required" });
  }

  const query = sanitize(body.query).substring(0, 200);
  const location = sanitize(body.location || "vancouver").substring(0, 100);
  const marketplaces = Array.isArray(body.marketplaces) && body.marketplaces.length > 0
    ? body.marketplaces.filter(m => ["craigslist", "autotrader", "ebay"].includes(m))
    : ["craigslist", "ebay"];

  if (marketplaces.length === 0) return res.status(400).json({ error: "Select at least one marketplace" });

  try {
    const { deals, errors } = await searchMarketplaces(query, marketplaces, location);
    const stats = computeStats(deals);
    return res.status(200).json({ query, location, deals, stats, errors, marketplaces, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error("Search error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
