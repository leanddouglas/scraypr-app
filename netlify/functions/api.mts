import type { Context, Config } from "@netlify/functions";
import * as cheerio from "cheerio";

// ============ IN-MEMORY STORE ============
const scrapers = new Map<string, any>();
const scrapeResults = new Map<string, any[]>();
const scrapeLogs = new Map<string, any[]>();

function uuid() {
  return crypto.randomUUID();
}

function addLog(scraperId: string, level: string, message: string) {
  if (!scrapeLogs.has(scraperId)) scrapeLogs.set(scraperId, []);
  scrapeLogs.get(scraperId)!.push({
    id: uuid(),
    timestamp: new Date().toISOString(),
    level,
    message,
  });
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

// Fetch with timeout (30s default)
async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
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

  // JSON response helper
  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    // Parse JSON body safely — only when there's actually a body to parse
    let body: any = null;
    const contentType = req.headers.get("content-type") || "";
    const contentLength = req.headers.get("content-length");
    if ((method === "POST" || method === "PUT") && contentType.includes("application/json") && contentLength !== "0") {
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }
    }

    // GET /api/stats
    if (method === "GET" && path === "/stats") {
      let totalRecords = 0, totalRuns = 0, activeCount = 0, successRateSum = 0, scraperCount = 0;
      scrapers.forEach((s) => {
        totalRecords += s.stats.totalRecords;
        totalRuns += s.stats.runsCount;
        if (s.status === "running") activeCount++;
        successRateSum += s.stats.successRate;
        scraperCount++;
      });
      return json({
        totalRecords, totalRuns, activeScrapers: activeCount, totalScrapers: scraperCount,
        avgSuccessRate: scraperCount > 0 ? (successRateSum / scraperCount).toFixed(1) : "100",
        velocity: totalRecords > 0 ? Math.round(totalRecords / Math.max(totalRuns, 1)) : 0,
      });
    }

    // GET /api/scrapers
    if (method === "GET" && path === "/scrapers") {
      const list = Array.from(scrapers.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return json(list);
    }

    // POST /api/scrapers — with validation
    if (method === "POST" && path === "/scrapers") {
      // Validate required fields
      if (!body || !body.url) {
        return json({ error: "URL is required" }, 400);
      }
      if (!isValidUrl(body.url)) {
        return json({ error: "Invalid URL. Must be a valid http/https URL." }, 400);
      }
      if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
        return json({ error: "Scraper name is required" }, 400);
      }
      if (body.name.length > 200) {
        return json({ error: "Scraper name must be under 200 characters" }, 400);
      }
      // Validate mode
      const validModes = ["fast-sync", "stealth", "deep-crawl"];
      const mode = validModes.includes(body.mode) ? body.mode : "fast-sync";
      // Validate fields
      const fields = Array.isArray(body.fields) ? body.fields.map((f: any) => ({
        name: sanitize(String(f.name || "")).substring(0, 100),
        selector: String(f.selector || "").substring(0, 500),
        type: String(f.type || "text").substring(0, 20),
        icon: String(f.icon || "code").substring(0, 30),
      })).filter((f: any) => f.name && f.selector) : [];

      const id = uuid();
      const scraper = {
        id,
        name: sanitize(body.name).substring(0, 200),
        url: body.url.substring(0, 2000),
        mode,
        fields,
        schedule: body.schedule || { enabled: false, frequency: "hourly" },
        status: "idle",
        stats: { totalRecords: 0, successRate: 100, lastRun: null, runsCount: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      scrapers.set(id, scraper);
      addLog(id, "info", `Scraper "${scraper.name}" created`);
      return json(scraper, 201);
    }

    // POST /api/preview-selector — with validation & timeout
    if (method === "POST" && path === "/preview-selector") {
      if (!body?.url || !body?.selector) {
        return json({ error: "URL and selector are required" }, 400);
      }
      if (!isValidUrl(body.url)) {
        return json({ error: "Invalid URL. Must be a valid http/https URL." }, 400);
      }
      if (!isValidSelector(body.selector)) {
        return json({ error: "Invalid CSS selector" }, 400);
      }
      try {
        const res = await fetchWithTimeout(body.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        if (!res.ok) {
          return json({ error: `Target site returned ${res.status} ${res.statusText}` }, 502);
        }
        const html = await res.text();
        const $ = cheerio.load(html);
        const matches: any[] = [];
        $(body.selector).each((i: number, el: any) => {
          if (i < 10) {
            matches.push({
              index: i,
              text: $(el).text().trim().substring(0, 200),
              html: sanitize($.html(el) || "").substring(0, 500),
            });
          }
        });
        return json({ matchCount: $(body.selector).length, preview: matches });
      } catch (e: any) {
        if (e.name === "AbortError") {
          return json({ error: "Request timed out after 30 seconds" }, 504);
        }
        return json({ error: `Failed to fetch target: ${e.message}` }, 502);
      }
    }

    // Routes with scraper ID: /api/scrapers/:id/...
    const scraperMatch = path.match(/^\/scrapers\/([^/]+)(\/.*)?$/);
    if (scraperMatch) {
      const id = scraperMatch[1];
      const subPath = scraperMatch[2] || "";

      // GET /api/scrapers/:id
      if (method === "GET" && !subPath) {
        const s = scrapers.get(id);
        if (!s) return json({ error: "Scraper not found" }, 404);
        return json(s);
      }

      // PUT /api/scrapers/:id — with validation
      if (method === "PUT" && !subPath) {
        const s = scrapers.get(id);
        if (!s) return json({ error: "Scraper not found" }, 404);
        // Only allow safe fields to be updated
        if (body.name) s.name = sanitize(String(body.name)).substring(0, 200);
        if (body.url) {
          if (!isValidUrl(body.url)) return json({ error: "Invalid URL" }, 400);
          s.url = body.url.substring(0, 2000);
        }
        if (body.schedule) s.schedule = body.schedule;
        if (body.fields && Array.isArray(body.fields)) s.fields = body.fields;
        s.updatedAt = new Date().toISOString();
        scrapers.set(id, s);
        addLog(id, "info", "Scraper configuration updated");
        return json(s);
      }

      // DELETE /api/scrapers/:id
      if (method === "DELETE" && !subPath) {
        if (!scrapers.has(id)) return json({ error: "Scraper not found" }, 404);
        scrapers.delete(id);
        scrapeResults.delete(id);
        scrapeLogs.delete(id);
        return json({ success: true });
      }

      // POST /api/scrapers/:id/run — with timeout & validation
      if (method === "POST" && subPath === "/run") {
        const s = scrapers.get(id);
        if (!s) return json({ error: "Scraper not found" }, 404);
        if (!s.url || !isValidUrl(s.url)) {
          return json({ error: "Scraper has no valid URL configured" }, 400);
        }
        s.status = "running";
        addLog(s.id, "info", `Scrape started for ${s.url}`);
        try {
          const startTime = Date.now();
          const response = await fetchWithTimeout(s.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });
          if (!response.ok) {
            addLog(s.id, "error", `Target returned ${response.status}`);
            s.status = "error";
            return json({ error: `Target site returned ${response.status} ${response.statusText}` }, 502);
          }
          const html = await response.text();
          addLog(s.id, "info", `Page fetched successfully (${response.status}, ${(html.length / 1024).toFixed(0)}KB)`);
          const $ = cheerio.load(html);
          const results: any[] = [];
          if (s.fields && s.fields.length > 0) {
            const firstField = s.fields[0];
            let matches;
            try {
              matches = $(firstField.selector);
            } catch {
              addLog(s.id, "error", `Invalid selector: "${firstField.selector}"`);
              s.status = "error";
              return json({ error: `Invalid CSS selector: "${firstField.selector}"` }, 400);
            }
            addLog(s.id, "info", `Found ${matches.length} matches for "${firstField.name}"`);
            matches.each((i: number, el: any) => {
              const record: any = { _index: i };
              s.fields.forEach((field: any) => {
                try {
                  const globalMatch = $(field.selector).eq(i);
                  if (field.type === "image") {
                    record[field.name] = globalMatch.attr("src") || globalMatch.find("img").attr("src") || "";
                  } else {
                    record[field.name] = globalMatch.length > 0 ? globalMatch.text().trim() : "";
                  }
                } catch {
                  record[field.name] = "";
                }
              });
              results.push(record);
            });
          } else {
            // Auto-extract when no fields configured
            const links: any[] = [];
            $("a[href]").each((i: number, el: any) => {
              if (i < 50) {
                links.push({ text: $(el).text().trim(), href: $(el).attr("href") });
              }
            });
            results.push({
              _type: "auto-extract",
              pageTitle: $("title").text().trim(),
              linksCount: $("a[href]").length,
              imagesCount: $("img[src]").length,
              headings: $("h1, h2, h3").map((_: number, el: any) => $(el).text().trim()).get().slice(0, 10),
              sampleLinks: links.slice(0, 20),
            });
          }
          const duration = Date.now() - startTime;
          if (!scrapeResults.has(s.id)) scrapeResults.set(s.id, []);
          const runResult = { id: uuid(), scraperId: s.id, timestamp: new Date().toISOString(), recordCount: results.length, duration, data: results };
          scrapeResults.get(s.id)!.unshift(runResult);
          // Keep only the last 20 runs per scraper
          const allRuns = scrapeResults.get(s.id)!;
          if (allRuns.length > 20) scrapeResults.set(s.id, allRuns.slice(0, 20));
          s.stats.totalRecords += results.length;
          s.stats.lastRun = new Date().toISOString();
          s.stats.runsCount += 1;
          s.status = "idle";
          s.updatedAt = new Date().toISOString();
          addLog(s.id, "success", `Scrape completed: ${results.length} records in ${duration}ms`);
          return json({ success: true, recordCount: results.length, duration, runId: runResult.id });
        } catch (e: any) {
          s.status = "error";
          if (e.name === "AbortError") {
            addLog(s.id, "error", "Scrape timed out after 30 seconds");
            return json({ error: "Scrape timed out after 30 seconds" }, 504);
          }
          addLog(s.id, "error", `Scrape failed: ${e.message}`);
          return json({ error: e.message }, 500);
        }
      }

      // GET /api/scrapers/:id/results
      if (method === "GET" && subPath === "/results") {
        if (!scrapers.has(id)) return json({ error: "Scraper not found" }, 404);
        return json(scrapeResults.get(id) || []);
      }

      // GET /api/scrapers/:id/logs
      if (method === "GET" && subPath === "/logs") {
        if (!scrapers.has(id)) return json({ error: "Scraper not found" }, 404);
        return json((scrapeLogs.get(id) || []).slice().reverse());
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
