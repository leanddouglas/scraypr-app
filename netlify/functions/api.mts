import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import * as cheerio from "cheerio";

// ============ BLOB STORE HELPERS ============
async function getScrapersStore() {
  return getStore("scrapers");
}
async function getResultsStore() {
  return getStore("results");
}
async function getLogsStore() {
  return getStore("logs");
}

async function getAllScrapers(): Promise<any[]> {
  const store = await getScrapersStore();
  const { blobs } = await store.list();
  const scrapers: any[] = [];
  for (const blob of blobs) {
    try {
      const data = await store.get(blob.key, { type: "json" });
      if (data) scrapers.push(data);
    } catch {}
  }
  return scrapers;
}

async function getScraper(id: string): Promise<any | null> {
  const store = await getScrapersStore();
  try {
    return await store.get(id, { type: "json" });
  } catch {
    return null;
  }
}

async function saveScraper(scraper: any): Promise<void> {
  const store = await getScrapersStore();
  await store.setJSON(scraper.id, scraper);
}

async function deleteScraper(id: string): Promise<void> {
  const store = await getScrapersStore();
  await store.delete(id);
}

async function getResults(scraperId: string): Promise<any[]> {
  const store = await getResultsStore();
  try {
    const data = await store.get(scraperId, { type: "json" });
    return data || [];
  } catch {
    return [];
  }
}

async function saveResults(scraperId: string, results: any[]): Promise<void> {
  const store = await getResultsStore();
  await store.setJSON(scraperId, results);
}

async function deleteResults(scraperId: string): Promise<void> {
  const store = await getResultsStore();
  await store.delete(scraperId);
}

async function getLogs(scraperId: string): Promise<any[]> {
  const store = await getLogsStore();
  try {
    const data = await store.get(scraperId, { type: "json" });
    return data || [];
  } catch {
    return [];
  }
}

async function saveLogs(scraperId: string, logs: any[]): Promise<void> {
  const store = await getLogsStore();
  await store.setJSON(scraperId, logs);
}

async function deleteLogs(scraperId: string): Promise<void> {
  const store = await getLogsStore();
  await store.delete(scraperId);
}

// Batched log helper — accumulates in memory, writes once
function createLogBatch(existing: any[]) {
  const logs = [...existing];
  return {
    add(level: string, message: string) {
      logs.push({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), level, message });
    },
    getLogs() { return logs.slice(-100); }
  };
}

// ============ VALIDATION HELPERS ============
function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitize(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/[<>]/g, "").trim();
}

function isValidSelector(sel: string): boolean {
  try {
    const $ = cheerio.load("<div></div>");
    $(sel);
    return true;
  } catch {
    return false;
  }
}

// Fetch with timeout (8s — must fit within Netlify 10s function limit)
async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ============ SITE KNOWLEDGE BASE ============
interface SiteConfig {
  id: string;
  name: string;
  color: string;
  categories: string[];
  buildUrl: (p: ParsedQuery) => string | null;
  selectors: {
    container: string;
    title: string;
    price: string;
    image?: string;
    link?: string;
    location?: string;
  };
  linkPrefix?: string;
}

interface ParsedQuery {
  raw: string;
  terms: string;
  encoded: string;
  maxPrice: number | null;
  minPrice: number | null;
  year: number | null;
  location: string;
  clHost: string;
  kijijiLocId: string;
  category: "cars" | "electronics" | "furniture" | "general";
}

const LOCATION_MAP: Record<string, { clHost: string; kijijiLocId: string; label: string }> = {
  vancouver:  { clHost: "vancouver",  kijijiLocId: "1700271", label: "Vancouver" },
  toronto:    { clHost: "toronto",    kijijiLocId: "1700273", label: "Toronto" },
  calgary:    { clHost: "calgary",    kijijiLocId: "1700199", label: "Calgary" },
  edmonton:   { clHost: "edmonton",   kijijiLocId: "1700203", label: "Edmonton" },
  montreal:   { clHost: "montreal",   kijijiLocId: "1700281", label: "Montreal" },
  ottawa:     { clHost: "ottawa",     kijijiLocId: "1700185", label: "Ottawa" },
  winnipeg:   { clHost: "winnipeg",   kijijiLocId: "1700192", label: "Winnipeg" },
  victoria:   { clHost: "victoria",   kijijiLocId: "1700269", label: "Victoria" },
  kelowna:    { clHost: "kelowna",    kijijiLocId: "1700253", label: "Kelowna" },
  surrey:     { clHost: "vancouver",  kijijiLocId: "1700272", label: "Surrey" },
  burnaby:    { clHost: "vancouver",  kijijiLocId: "1700274", label: "Burnaby" },
  hamilton:   { clHost: "hamilton",   kijijiLocId: "1700182", label: "Hamilton" },
  london:     { clHost: "london",     kijijiLocId: "1700214", label: "London" },
};

const CAR_KEYWORDS = ["mazda","honda","toyota","ford","chevy","chevrolet","bmw","audi","hyundai","kia","nissan","volkswagen","vw","subaru","mercedes","lexus","acura","infiniti","car","truck","suv","van","sedan","coupe","hatchback","pickup","jeep","dodge","chrysler","pontiac","buick","cadillac","tesla","volvo","porsche","ram","gmc","camry","civic","corolla","mustang","f-150","silverado"];
const ELECTRONICS_KEYWORDS = ["phone","iphone","android","laptop","computer","desktop","pc","mac","macbook","ipad","tablet","tv","television","monitor","headphones","airpods","camera","samsung","sony","apple","lg","dell","hp","lenovo","asus","acer","xbox","playstation","ps5","ps4","nintendo","switch","gpu","graphics card","keyboard","mouse","printer","router"];
const FURNITURE_KEYWORDS = ["couch","sofa","chair","table","desk","bed","mattress","dresser","bookshelf","shelving","cabinet","wardrobe","nightstand","ottoman","sectional","recliner","dining","futon","loveseat","armchair"];

function detectCategory(q: string): ParsedQuery["category"] {
  const lower = q.toLowerCase();
  if (CAR_KEYWORDS.some(k => lower.includes(k))) return "cars";
  if (ELECTRONICS_KEYWORDS.some(k => lower.includes(k))) return "electronics";
  if (FURNITURE_KEYWORDS.some(k => lower.includes(k))) return "furniture";
  return "general";
}

function parseSearchQuery(raw: string): ParsedQuery {
  let q = raw.trim();

  // Extract max price: "under $5000", "less than 5k", "max 5,000", "<500"
  let maxPrice: number | null = null;
  const maxMatch = q.match(/(?:under|below|less\s+than|max|<)\s*\$?\s*([\d,]+)\s*k?\b/i);
  if (maxMatch) {
    const num = parseInt(maxMatch[1].replace(/,/g, ""));
    maxPrice = /\d\s*k\b/i.test(maxMatch[0]) ? num * 1000 : num;
    q = q.replace(maxMatch[0], " ").trim();
  } else {
    // Standalone "$5000" or "$5k" at end of query
    const dollarMatch = q.match(/\$\s*([\d,]+)\s*k?\b/i);
    if (dollarMatch) {
      const num = parseInt(dollarMatch[1].replace(/,/g, ""));
      maxPrice = /\d\s*k\b/i.test(dollarMatch[0]) ? num * 1000 : num;
      q = q.replace(dollarMatch[0], " ").trim();
    }
  }

  // Extract min price: "over $1000", "more than 500", "min 2000"
  let minPrice: number | null = null;
  const minMatch = q.match(/(?:over|above|more\s+than|min|>)\s*\$?\s*([\d,]+)\s*k?\b/i);
  if (minMatch) {
    const num = parseInt(minMatch[1].replace(/,/g, ""));
    minPrice = /\d\s*k\b/i.test(minMatch[0]) ? num * 1000 : num;
    q = q.replace(minMatch[0], " ").trim();
  }

  // Extract year (1960–2030)
  const yearMatch = q.match(/\b(19[6-9]\d|20[0-2]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  // Extract location after "in", "near", "around"
  let location = "vancouver";
  let clHost = "vancouver";
  let kijijiLocId = "1700271";
  const locMatch = q.match(/\b(?:in|near|around)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\b/i);
  if (locMatch) {
    const locRaw = locMatch[1].toLowerCase().trim();
    for (const [key, val] of Object.entries(LOCATION_MAP)) {
      if (locRaw.includes(key) || key.includes(locRaw)) {
        location = key;
        clHost = val.clHost;
        kijijiLocId = val.kijijiLocId;
        q = q.replace(locMatch[0], " ").trim();
        break;
      }
    }
  }

  // Strip filler words but keep meaningful terms
  q = q.replace(/\b(?:find|me|a|an|the|some|for|sale|looking|for|want|need|buy|get|show|list|used|new|good)\b/gi, " ")
       .replace(/\s+/g, " ").trim();

  const category = detectCategory(q + " " + raw);
  const terms = q || raw;
  const encoded = encodeURIComponent(terms);

  return { raw, terms, encoded, maxPrice, minPrice, year, location, clHost, kijijiLocId, category };
}

const SITE_REGISTRY: SiteConfig[] = [
  {
    id: "craigslist",
    name: "Craigslist",
    color: "#7c3aed",
    categories: ["cars", "electronics", "furniture", "general"],
    buildUrl: (p) => {
      const cat = p.category === "cars" ? "cta" : "sss";
      let url = `https://${p.clHost}.craigslist.org/search/${cat}?query=${p.encoded}&sort=date`;
      if (p.maxPrice) url += `&max_price=${p.maxPrice}`;
      if (p.minPrice) url += `&min_price=${p.minPrice}`;
      return url;
    },
    selectors: {
      container: "li.cl-search-result, .result-row",
      title: "a.posting-title .label, a.result-title",
      price: "span.priceinfo, .result-price",
      link: "a.posting-title, a.result-title",
      location: "div.meta .supertitle, .result-hood",
    },
  },
  {
    id: "ebay",
    name: "eBay",
    color: "#e53e3e",
    categories: ["electronics", "general", "cars", "furniture"],
    buildUrl: (p) => {
      let url = `https://www.ebay.ca/sch/i.html?_nkw=${p.encoded}&_sop=10`;
      if (p.maxPrice) url += `&_udhi=${p.maxPrice}`;
      if (p.minPrice) url += `&_udlo=${p.minPrice}`;
      return url;
    },
    selectors: {
      container: "li.s-item",
      title: "div.s-item__title",
      price: "span.s-item__price",
      image: "img.s-item__image-img",
      link: "a.s-item__link",
      location: "span.s-item__location",
    },
  },
  {
    id: "kijiji",
    name: "Kijiji",
    color: "#38a169",
    categories: ["cars", "general", "electronics", "furniture"],
    buildUrl: (p) => {
      const slug = p.terms.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "all";
      if (p.category === "cars") {
        let url = `https://www.kijiji.ca/b-cars-trucks/${p.location}/${slug}/k0c174l${p.kijijiLocId}`;
        if (p.maxPrice || p.minPrice) url += `?price=${p.minPrice || ""}__${p.maxPrice || ""}`;
        return url;
      }
      let url = `https://www.kijiji.ca/b-buy-sell/${p.location}/${slug}/k0c10l${p.kijijiLocId}`;
      if (p.maxPrice || p.minPrice) url += `?price=${p.minPrice || ""}__${p.maxPrice || ""}`;
      return url;
    },
    selectors: {
      container: "[data-testid='listing-card-list-item'], article.regular-ad",
      title: "[data-testid='listing-title'], .title .title",
      price: "[data-testid='listing-price'], .price",
      image: "img[data-testid='listing-image'], .image img",
      link: "a[data-testid='listing-link'], a.title",
      location: "[data-testid='listing-location'], .location",
    },
    linkPrefix: "https://www.kijiji.ca",
  },
  {
    id: "autotrader",
    name: "AutoTrader",
    color: "#dd6b20",
    categories: ["cars"],
    buildUrl: (p) => {
      if (p.category !== "cars") return null;
      const locLabel = LOCATION_MAP[p.location]?.label || "Vancouver";
      let url = `https://www.autotrader.ca/cars/?text=${p.encoded}&loc=${encodeURIComponent(locLabel)}`;
      if (p.maxPrice) url += `&priceTo=${p.maxPrice}`;
      if (p.minPrice) url += `&priceFrom=${p.minPrice}`;
      return url;
    },
    selectors: {
      container: "[data-listing-id], .result-item",
      title: ".result-title, h2.title-with-trim",
      price: ".price-amount, .price",
      image: ".hero-image img, .img-responsive",
      link: "a[data-listing-id], a.result-link",
      location: ".dealer-info .city, .location",
    },
    linkPrefix: "https://www.autotrader.ca",
  },
];

async function scrapeSite(site: SiteConfig, params: ParsedQuery): Promise<any[]> {
  const url = site.buildUrl(params);
  if (!url) return [];
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-CA,en-US;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      },
    }, 5000);
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);

    // Try each comma-separated container selector until one yields results
    let $items: any = null;
    for (const sel of site.selectors.container.split(",").map(s => s.trim())) {
      const found = $(sel);
      if (found.length > 0) { $items = found; break; }
    }
    if (!$items || $items.length === 0) return [];

    const getField = ($el: any, selStr: string): string => {
      for (const sel of selStr.split(",").map((s: string) => s.trim())) {
        const text = $el.find(sel).first().text().trim();
        if (text) return text;
      }
      return "";
    };
    const getAttr = ($el: any, selStr: string, attr: string): string => {
      for (const sel of selStr.split(",").map((s: string) => s.trim())) {
        const val = $el.find(sel).first().attr(attr);
        if (val) return val as string;
      }
      return "";
    };

    const results: any[] = [];
    $items.each((i: number, el: any) => {
      if (i >= 20) return;
      const $el = $(el);
      const title = getField($el, site.selectors.title);
      if (!title || title.length < 2) return;
      const price = getField($el, site.selectors.price);
      const location = site.selectors.location ? getField($el, site.selectors.location) : "";
      let link = site.selectors.link ? getAttr($el, site.selectors.link, "href") : "";
      if (link && !link.startsWith("http") && site.linkPrefix) link = site.linkPrefix + link;
      let image = site.selectors.image
        ? (getAttr($el, site.selectors.image, "src") || getAttr($el, site.selectors.image, "data-src"))
        : "";
      // Skip placeholder/tracking images
      if (image && (image.includes("spacer") || image.includes("1x1") || image.length < 10)) image = "";
      results.push({ title, price, location, link, image, source: site.id, sourceName: site.name, sourceColor: site.color });
    });
    return results;
  } catch {
    return [];
  }
}

// ============ REQUEST HANDLER ============
export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  // Handle both direct /.netlify/functions/api/* and proxied /api/* paths
  const path = url.pathname
    .replace(/^\/.netlify\/functions\/api/, "")
    .replace(/^\/api/, "")
    .replace(/\/$/, "") || "/";
  const method = req.method;

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const json = (data: any, status = 200) => {
    const body = JSON.stringify(data);
    return new Response(body, {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  };

  try {
    // Parse JSON body safely — only when there's content
    let body: any = null;
    const contentLength = req.headers.get("content-length");
    const hasBody = contentLength !== null && contentLength !== "0" && parseInt(contentLength) > 0;
    if ((method === "POST" || method === "PUT") && hasBody) {
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }
    }

    // GET /api/stats
    if (method === "GET" && path === "/stats") {
      const scrapers = await getAllScrapers();
      let totalRecords = 0, totalRuns = 0, activeCount = 0, successRateSum = 0;
      scrapers.forEach((s) => {
        totalRecords += s.stats?.totalRecords || 0;
        totalRuns += s.stats?.runsCount || 0;
        if (s.status === "running") activeCount++;
        successRateSum += s.stats?.successRate || 100;
      });
      return json({
        totalRecords, totalRuns, activeScrapers: activeCount, totalScrapers: scrapers.length,
        avgSuccessRate: scrapers.length > 0 ? (successRateSum / scrapers.length).toFixed(1) : "100",
        velocity: totalRecords > 0 ? Math.round(totalRecords / Math.max(totalRuns, 1)) : 0,
      });
    }

    // GET /api/scrapers
    if (method === "GET" && path === "/scrapers") {
      const scrapers = await getAllScrapers();
      return json(scrapers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }

    // POST /api/scrapers
    if (method === "POST" && path === "/scrapers") {
      if (!body || !body.url) return json({ error: "URL is required" }, 400);
      if (!isValidUrl(body.url)) return json({ error: "Invalid URL. Must be a valid http/https URL." }, 400);
      if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) return json({ error: "Scraper name is required" }, 400);
      if (body.name.length > 200) return json({ error: "Scraper name must be under 200 characters" }, 400);
      const validModes = ["fast-sync", "stealth", "deep-crawl"];
      const mode = validModes.includes(body.mode) ? body.mode : "fast-sync";
      const fields = Array.isArray(body.fields) ? body.fields.map((f: any) => ({
        name: sanitize(String(f.name || "")).substring(0, 100),
        selector: String(f.selector || "").substring(0, 500),
        type: String(f.type || "text").substring(0, 20),
        icon: String(f.icon || "code").substring(0, 30),
      })).filter((f: any) => f.name && f.selector) : [];

      const id = crypto.randomUUID();
      const scraper = {
        id, name: sanitize(body.name).substring(0, 200), url: body.url.substring(0, 2000),
        mode, fields, schedule: body.schedule || { enabled: false, frequency: "hourly" },
        status: "idle", stats: { totalRecords: 0, successRate: 100, lastRun: null, runsCount: 0 },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      await saveScraper(scraper);
      return json(scraper, 201);
    }

    // POST /api/preview-selector
    if (method === "POST" && path === "/preview-selector") {
      if (!body?.url || !body?.selector) return json({ error: "URL and selector are required" }, 400);
      if (!isValidUrl(body.url)) return json({ error: "Invalid URL." }, 400);
      if (!isValidSelector(body.selector)) return json({ error: "Invalid CSS selector" }, 400);
      try {
        const res = await fetchWithTimeout(body.url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "text/html,*/*" },
        });
        if (!res.ok) return json({ error: `Target returned ${res.status}` }, 502);
        const html = await res.text();
        const $ = cheerio.load(html);
        const matches: any[] = [];
        $(body.selector).each((i: number, el: any) => {
          if (i < 10) matches.push({ index: i, text: $(el).text().trim().substring(0, 200), html: sanitize($.html(el) || "").substring(0, 500) });
        });
        return json({ matchCount: $(body.selector).length, preview: matches });
      } catch (e: any) {
        if (e.name === "AbortError") return json({ error: "Timed out" }, 504);
        return json({ error: `Failed: ${e.message}` }, 502);
      }
    }

    // Routes with scraper ID
    const scraperMatch = path.match(/^\/scrapers\/([^/]+)(\/.*)?$/);
    if (scraperMatch) {
      const id = scraperMatch[1];
      const subPath = scraperMatch[2] || "";

      if (method === "GET" && !subPath) {
        const s = await getScraper(id);
        if (!s) return json({ error: "Scraper not found" }, 404);
        return json(s);
      }

      if (method === "PUT" && !subPath) {
        const s = await getScraper(id);
        if (!s) return json({ error: "Scraper not found" }, 404);
        if (body.name) s.name = sanitize(String(body.name)).substring(0, 200);
        if (body.url) { if (!isValidUrl(body.url)) return json({ error: "Invalid URL" }, 400); s.url = body.url.substring(0, 2000); }
        if (body.schedule) s.schedule = body.schedule;
        if (body.fields && Array.isArray(body.fields)) s.fields = body.fields;
        s.updatedAt = new Date().toISOString();
        await saveScraper(s);
        return json(s);
      }

      if (method === "DELETE" && !subPath) {
        const s = await getScraper(id);
        if (!s) return json({ error: "Scraper not found" }, 404);
        // Fire deletes in parallel
        await Promise.all([deleteScraper(id), deleteResults(id), deleteLogs(id)]);
        return json({ success: true });
      }

      // POST /api/scrapers/:id/run — OPTIMIZED: minimal blob writes
      if (method === "POST" && subPath === "/run") {
        const s = await getScraper(id);
        if (!s) return json({ error: "Scraper not found" }, 404);
        if (!s.url || !isValidUrl(s.url)) return json({ error: "Scraper has no valid URL configured" }, 400);

        // Collect logs in memory, write once at end
        const logBatch = createLogBatch([]);
        logBatch.add("info", `Scrape started for ${s.url}`);

        try {
          const startTime = Date.now();
          const response = await fetchWithTimeout(s.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });
          if (!response.ok) {
            logBatch.add("error", `Target returned ${response.status}`);
            s.status = "error"; s.updatedAt = new Date().toISOString();
            // Parallel writes
            await Promise.all([saveScraper(s), saveLogs(id, logBatch.getLogs())]);
            return json({ error: `Target site returned ${response.status} ${response.statusText}` }, 502);
          }

          const html = await response.text();
          logBatch.add("info", `Fetched (${response.status}, ${(html.length / 1024).toFixed(0)}KB)`);
          const $ = cheerio.load(html);
          const results: any[] = [];

          if (s.fields && s.fields.length > 0) {
            const firstField = s.fields[0];
            let matches;
            try { matches = $(firstField.selector); } catch {
              logBatch.add("error", `Invalid selector: "${firstField.selector}"`);
              s.status = "error"; s.updatedAt = new Date().toISOString();
              await Promise.all([saveScraper(s), saveLogs(id, logBatch.getLogs())]);
              return json({ error: `Invalid CSS selector` }, 400);
            }
            logBatch.add("info", `Found ${matches.length} matches for "${firstField.name}"`);
            matches.each((i: number, el: any) => {
              if (i >= 100) return; // Cap at 100 records
              const record: any = { _index: i };
              s.fields.forEach((field: any) => {
                try {
                  const m = $(field.selector).eq(i);
                  record[field.name] = field.type === "image"
                    ? (m.attr("src") || m.find("img").attr("src") || "")
                    : (m.length > 0 ? m.text().trim() : "");
                } catch { record[field.name] = ""; }
              });
              results.push(record);
            });
          } else {
            const links: any[] = [];
            $("a[href]").each((i: number, el: any) => { if (i < 20) links.push({ text: $(el).text().trim(), href: $(el).attr("href") }); });
            results.push({
              _type: "auto-extract", pageTitle: $("title").text().trim(),
              linksCount: $("a[href]").length, imagesCount: $("img[src]").length,
              headings: $("h1, h2, h3").map((_: number, el: any) => $(el).text().trim()).get().slice(0, 10),
              sampleLinks: links,
            });
          }

          const duration = Date.now() - startTime;
          const runResult = { id: crypto.randomUUID(), scraperId: s.id, timestamp: new Date().toISOString(), recordCount: results.length, duration, data: results };

          // Update scraper stats
          s.stats.totalRecords += results.length;
          s.stats.lastRun = new Date().toISOString();
          s.stats.runsCount += 1;
          s.status = "idle";
          s.updatedAt = new Date().toISOString();
          logBatch.add("success", `Completed: ${results.length} records in ${duration}ms`);

          // Single parallel write for ALL data at once
          const existingResults = await getResults(s.id);
          existingResults.unshift(runResult);
          await Promise.all([
            saveScraper(s),
            saveResults(s.id, existingResults.slice(0, 10)),
            saveLogs(id, logBatch.getLogs()),
          ]);

          return json({ success: true, recordCount: results.length, duration, runId: runResult.id });
        } catch (e: any) {
          s.status = "error"; s.updatedAt = new Date().toISOString();
          if (e.name === "AbortError") {
            logBatch.add("error", "Timed out after 8 seconds");
            await Promise.all([saveScraper(s), saveLogs(id, logBatch.getLogs())]);
            return json({ error: "Scrape timed out" }, 504);
          }
          logBatch.add("error", `Failed: ${e.message}`);
          await Promise.all([saveScraper(s), saveLogs(id, logBatch.getLogs())]);
          return json({ error: e.message }, 500);
        }
      }

      if (method === "GET" && subPath === "/results") {
        const s = await getScraper(id);
        if (!s) return json({ error: "Scraper not found" }, 404);
        return json(await getResults(id));
      }

      if (method === "GET" && subPath === "/logs") {
        const s = await getScraper(id);
        if (!s) return json({ error: "Scraper not found" }, 404);
        const logs = await getLogs(id);
        return json(logs.slice().reverse());
      }
    }

    // POST /api/search — smart multi-site search
    if (method === "POST" && path === "/search") {
      if (!body?.query || typeof body.query !== "string") return json({ error: "query is required" }, 400);
      const rawQuery = body.query.trim().substring(0, 300);
      if (rawQuery.length < 2) return json({ error: "Query too short" }, 400);

      const params = parseSearchQuery(rawQuery);

      // Override category/location from explicit body params if provided
      if (body.category && ["cars","electronics","furniture","general"].includes(body.category)) {
        (params as any).category = body.category;
      }
      if (body.location && LOCATION_MAP[body.location.toLowerCase()]) {
        const loc = body.location.toLowerCase();
        params.location = loc;
        params.clHost = LOCATION_MAP[loc].clHost;
        params.kijijiLocId = LOCATION_MAP[loc].kijijiLocId;
      }
      if (body.maxPrice && Number.isFinite(Number(body.maxPrice))) params.maxPrice = Number(body.maxPrice);
      if (body.minPrice && Number.isFinite(Number(body.minPrice))) params.minPrice = Number(body.minPrice);

      // Filter sites by category and optional explicit site list
      const requestedSites: string[] = Array.isArray(body.sites) ? body.sites : [];
      const sitesToSearch = SITE_REGISTRY.filter(s =>
        s.categories.includes(params.category) &&
        (requestedSites.length === 0 || requestedSites.includes(s.id))
      );

      // Scrape all matching sites in parallel — use Promise.allSettled so one failure doesn't block others
      const settled = await Promise.allSettled(sitesToSearch.map(s => scrapeSite(s, params)));

      const allResults: any[] = [];
      const siteStats: any[] = [];
      settled.forEach((r, i) => {
        const site = sitesToSearch[i];
        const count = r.status === "fulfilled" ? r.value.length : 0;
        if (r.status === "fulfilled") allResults.push(...r.value);
        siteStats.push({ id: site.id, name: site.name, color: site.color, count, url: site.buildUrl(params), error: r.status === "rejected" });
      });

      return json({ query: rawQuery, parsed: { category: params.category, location: params.location, maxPrice: params.maxPrice, minPrice: params.minPrice, year: params.year }, totalResults: allResults.length, sites: siteStats, results: allResults });
    }

    return json({ error: "Not found" }, 404);
  } catch (e: any) {
    console.error("API error:", e);
    return json({ error: "Internal server error" }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
};
