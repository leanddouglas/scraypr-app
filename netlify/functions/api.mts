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

// No seed data — only real user-created scrapers are stored

// ============ REQUEST HANDLER ============
export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "").replace(/\/$/, "") || "/";
  const method = req.method;

  // Helper
  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
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

    // POST /api/scrapers
    if (method === "POST" && path === "/scrapers") {
      const body = await req.json();
      const id = uuid();
      const scraper = {
        id,
        name: body.name || "Untitled Scraper",
        url: body.url || "",
        mode: body.mode || "fast-sync",
        fields: body.fields || [],
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

    // POST /api/preview-selector
    if (method === "POST" && path === "/preview-selector") {
      const body = await req.json();
      if (!body.url || !body.selector) return json({ error: "URL and selector required" }, 400);
      try {
        const res = await fetch(body.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        const html = await res.text();
        const $ = cheerio.load(html);
        const matches: any[] = [];
        $(body.selector).each((i: number, el: any) => {
          if (i < 10) {
            matches.push({
              index: i,
              text: $(el).text().trim().substring(0, 200),
              html: $.html(el).substring(0, 500),
            });
          }
        });
        return json({ matchCount: $(body.selector).length, preview: matches });
      } catch (e: any) {
        return json({ error: e.message }, 500);
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

      // PUT /api/scrapers/:id
      if (method === "PUT" && !subPath) {
        const s = scrapers.get(id);
        if (!s) return json({ error: "Scraper not found" }, 404);
        const updates = await req.json();
        Object.assign(s, updates, { updatedAt: new Date().toISOString() });
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

      // POST /api/scrapers/:id/run
      if (method === "POST" && subPath === "/run") {
        const s = scrapers.get(id);
        if (!s) return json({ error: "Scraper not found" }, 404);
        s.status = "running";
        addLog(s.id, "info", `Scrape started for ${s.url}`);
        try {
          const startTime = Date.now();
          const response = await fetch(s.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });
          const html = await response.text();
          addLog(s.id, "info", `Page fetched successfully (${response.status})`);
          const $ = cheerio.load(html);
          const results: any[] = [];
          if (s.fields && s.fields.length > 0) {
            const firstField = s.fields[0];
            const matches = $(firstField.selector);
            addLog(s.id, "info", `Found ${matches.length} matches for "${firstField.name}"`);
            matches.each((i: number, el: any) => {
              const record: any = { _index: i };
              s.fields.forEach((field: any) => {
                const globalMatch = $(field.selector).eq(i);
                record[field.name] = globalMatch.length > 0 ? globalMatch.text().trim() : "";
              });
              results.push(record);
            });
          } else {
            results.push({
              _type: "auto-extract",
              pageTitle: $("title").text().trim(),
              linksCount: $("a[href]").length,
              imagesCount: $("img[src]").length,
            });
          }
          const duration = Date.now() - startTime;
          if (!scrapeResults.has(s.id)) scrapeResults.set(s.id, []);
          const runResult = { id: uuid(), scraperId: s.id, timestamp: new Date().toISOString(), recordCount: results.length, duration, data: results };
          scrapeResults.get(s.id)!.unshift(runResult);
          s.stats.totalRecords += results.length;
          s.stats.lastRun = new Date().toISOString();
          s.stats.runsCount += 1;
          s.status = "idle";
          s.updatedAt = new Date().toISOString();
          addLog(s.id, "success", `Scrape completed: ${results.length} records in ${duration}ms`);
          return json({ success: true, recordCount: results.length, duration, runId: runResult.id });
        } catch (e: any) {
          s.status = "error";
          addLog(s.id, "error", `Scrape failed: ${e.message}`);
          return json({ error: e.message }, 500);
        }
      }

      // GET /api/scrapers/:id/results
      if (method === "GET" && subPath === "/results") {
        return json(scrapeResults.get(id) || []);
      }

      // GET /api/scrapers/:id/logs
      if (method === "GET" && subPath === "/logs") {
        return json((scrapeLogs.get(id) || []).slice().reverse());
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
};
