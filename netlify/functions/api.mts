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

// ============ REQUEST HANDLER ============
export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  // Handle both direct /.netlify/functions/api/* and proxied /api/* paths
  const path = url.pathname
    .replace(/^\/.netlify\/functions\/api/, "")
    .replace(/^\/api/, "")
    .replace(/\/$/, "") || "/";
  const method = req.method;

  const json = (data: any, status = 200) => {
    const body = JSON.stringify(data);
    return new Response(body, {
      status,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(new TextEncoder().encode(body).length),
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

    return json({ error: "Not found" }, 404);
  } catch (e: any) {
    console.error("API error:", e);
    return json({ error: "Internal server error" }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
};
