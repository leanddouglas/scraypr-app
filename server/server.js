import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { randomUUID } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store for scrapers and results
const scrapers = new Map();
const scrapeResults = new Map();
const scrapeLogs = new Map();

// Helper: add log entry
function addLog(scraperId, level, message) {
  if (!scrapeLogs.has(scraperId)) scrapeLogs.set(scraperId, []);
  scrapeLogs.get(scraperId).push({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    message,
  });
}

// ---- SCRAPER CRUD ----

// List all scrapers
app.get('/api/scrapers', (req, res) => {
  const list = Array.from(scrapers.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// Get single scraper
app.get('/api/scrapers/:id', (req, res) => {
  const s = scrapers.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Scraper not found' });
  res.json(s);
});

// Create scraper
app.post('/api/scrapers', (req, res) => {
  const { name, url, mode, fields, schedule } = req.body;
  const id = randomUUID();
  const scraper = {
    id,
    name: name || 'Untitled Scraper',
    url: url || '',
    mode: mode || 'fast-sync',
    fields: fields || [],
    schedule: schedule || { enabled: false, frequency: 'hourly' },
    status: 'idle',
    stats: { totalRecords: 0, successRate: 100, lastRun: null, runsCount: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  scrapers.set(id, scraper);
  addLog(id, 'info', `Scraper "${scraper.name}" created`);
  res.status(201).json(scraper);
});

// Update scraper
app.put('/api/scrapers/:id', (req, res) => {
  const s = scrapers.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Scraper not found' });
  const updates = req.body;
  Object.assign(s, updates, { updatedAt: new Date().toISOString() });
  scrapers.set(req.params.id, s);
  addLog(req.params.id, 'info', `Scraper configuration updated`);
  res.json(s);
});

// Delete scraper
app.delete('/api/scrapers/:id', (req, res) => {
  if (!scrapers.has(req.params.id)) return res.status(404).json({ error: 'Scraper not found' });
  scrapers.delete(req.params.id);
  scrapeResults.delete(req.params.id);
  scrapeLogs.delete(req.params.id);
  res.json({ success: true });
});

// ---- SCRAPING ENGINE ----

// Run a scrape
app.post('/api/scrapers/:id/run', async (req, res) => {
  const s = scrapers.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Scraper not found' });

  s.status = 'running';
  addLog(s.id, 'info', `Scrape started for ${s.url}`);

  try {
    const startTime = Date.now();

    // Fetch the page
    const response = await axios.get(s.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 30000,
      maxRedirects: 5,
    });

    addLog(s.id, 'info', `Page fetched successfully (${response.status})`);

    const $ = cheerio.load(response.data);
    const results = [];

    // If fields are defined, extract data using CSS selectors
    if (s.fields && s.fields.length > 0) {
      // Try to find repeating container elements
      // Strategy: find the common parent of the first field's selector matches
      const firstField = s.fields[0];
      const matches = $(firstField.selector);

      addLog(s.id, 'info', `Found ${matches.length} matches for primary field "${firstField.name}"`);

      matches.each((i, el) => {
        const record = { _index: i };

        // For each field, try to extract from the same parent context or globally
        s.fields.forEach(field => {
          const parent = $(el).closest('*');
          let value;

          // Try sibling/parent context first
          const contextMatch = parent.parent().find(field.selector).eq(0);
          if (contextMatch.length > 0) {
            value = contextMatch.text().trim();
          } else {
            // Fall back to global index matching
            const globalMatch = $(field.selector).eq(i);
            value = globalMatch.length > 0 ? globalMatch.text().trim() : '';
          }

          // Apply regex if specified
          if (field.regex && value) {
            try {
              const regex = new RegExp(field.regex);
              const match = value.match(regex);
              value = match ? match[0] : value;
            } catch (e) {
              // ignore bad regex
            }
          }

          record[field.name] = value;
        });

        results.push(record);
      });
    } else {
      // Auto-extract: get page title, all links, all images, all headings
      const pageTitle = $('title').text().trim();
      const links = [];
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && text) links.push({ href, text });
      });

      const images = [];
      $('img[src]').each((i, el) => {
        images.push({
          src: $(el).attr('src'),
          alt: $(el).attr('alt') || '',
        });
      });

      const headings = [];
      $('h1, h2, h3').each((i, el) => {
        headings.push({
          tag: el.tagName,
          text: $(el).text().trim(),
        });
      });

      results.push({
        _type: 'auto-extract',
        pageTitle,
        linksCount: links.length,
        imagesCount: images.length,
        headings,
        sampleLinks: links.slice(0, 20),
        sampleImages: images.slice(0, 10),
      });
    }

    const duration = Date.now() - startTime;

    // Store results
    if (!scrapeResults.has(s.id)) scrapeResults.set(s.id, []);
    const runResult = {
      id: randomUUID(),
      scraperId: s.id,
      timestamp: new Date().toISOString(),
      recordCount: results.length,
      duration,
      data: results,
    };
    scrapeResults.get(s.id).unshift(runResult);

    // Update scraper stats
    s.stats.totalRecords += results.length;
    s.stats.lastRun = new Date().toISOString();
    s.stats.runsCount += 1;
    s.status = 'idle';
    s.updatedAt = new Date().toISOString();

    addLog(s.id, 'success', `Scrape completed: ${results.length} records in ${duration}ms`);

    res.json({
      success: true,
      recordCount: results.length,
      duration,
      runId: runResult.id,
    });
  } catch (error) {
    s.status = 'error';
    addLog(s.id, 'error', `Scrape failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Preview a selector on a URL (for the Add Custom Field modal)
app.post('/api/preview-selector', async (req, res) => {
  const { url, selector } = req.body;
  if (!url || !selector) return res.status(400).json({ error: 'URL and selector required' });

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const matches = [];
    $(selector).each((i, el) => {
      if (i < 10) {
        matches.push({
          index: i,
          text: $(el).text().trim().substring(0, 200),
          html: $.html(el).substring(0, 500),
        });
      }
    });

    res.json({
      matchCount: $(selector).length,
      preview: matches,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get results for a scraper
app.get('/api/scrapers/:id/results', (req, res) => {
  const results = scrapeResults.get(req.params.id) || [];
  res.json(results);
});

// Get logs for a scraper
app.get('/api/scrapers/:id/logs', (req, res) => {
  const logs = scrapeLogs.get(req.params.id) || [];
  res.json(logs.slice().reverse());
});

// Get aggregate stats
app.get('/api/stats', (req, res) => {
  let totalRecords = 0;
  let totalRuns = 0;
  let activeCount = 0;
  let successRateSum = 0;
  let scraperCount = 0;

  scrapers.forEach(s => {
    totalRecords += s.stats.totalRecords;
    totalRuns += s.stats.runsCount;
    if (s.status === 'running') activeCount++;
    successRateSum += s.stats.successRate;
    scraperCount++;
  });

  res.json({
    totalRecords,
    totalRuns,
    activeScrapers: activeCount,
    totalScrapers: scraperCount,
    avgSuccessRate: scraperCount > 0 ? (successRateSum / scraperCount).toFixed(1) : 100,
    velocity: totalRecords > 0 ? Math.round(totalRecords / Math.max(totalRuns, 1)) : 0,
  });
});

// No seed data — only real user-created scrapers are stored

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SCRAYPR API server running on http://localhost:${PORT}`);
});
