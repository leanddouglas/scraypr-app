/**
 * Client-side marketplace scraper using CORS proxies + DOMParser.
 * No server needed — runs entirely in the browser.
 */

const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchWithProxy(url, timeoutMs = 8000) {
  let lastError = null;
  for (const proxyFn of CORS_PROXIES) {
    const proxyUrl = proxyFn(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      clearTimeout(timer);
      lastError = e;
      // Try next proxy
    }
  }
  throw lastError || new Error("All CORS proxies failed");
}

function parseHTML(html) {
  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}

// ============ CRAIGSLIST ============
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
  const doc = parseHTML(html);
  const deals = [];
  const results = doc.querySelectorAll(".cl-static-search-result");
  results.forEach((el, i) => {
    if (i >= 50) return;
    const titleEl = el.querySelector(".title");
    const title = titleEl?.textContent?.trim() || "";
    const link = titleEl?.closest("a") || el.querySelector("a");
    const href = link?.getAttribute("href") || "";
    const priceText = el.querySelector(".price")?.textContent?.trim() || "";
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

// ============ EBAY ============
function buildEbayUrl(query) {
  return `https://www.ebay.ca/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=10&LH_BIN=1&rt=nc`;
}

function scrapeEbay(html) {
  const doc = parseHTML(html);
  const deals = [];
  const items = doc.querySelectorAll(".s-item");
  items.forEach((el, i) => {
    if (i >= 30 || i === 0) return; // First item is usually a placeholder
    const title = el.querySelector(".s-item__title")?.textContent?.trim() || "";
    const priceText = el.querySelector(".s-item__price")?.textContent?.trim() || "";
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) || null : null;
    const href = el.querySelector(".s-item__link")?.getAttribute("href") || "";
    const img = el.querySelector(".s-item__image-wrapper img")?.getAttribute("src") || null;

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

// ============ AUTOTRADER ============
function buildAutoTraderUrl(query, location) {
  const loc = location || "Vancouver";
  return `https://www.autotrader.ca/cars/?rcp=15&rcs=0&prx=100&loc=${encodeURIComponent(loc)}&hprc=True&wcp=True&sts=New-Used&kwd=${encodeURIComponent(query)}&inMarket=advancedSearch`;
}

function scrapeAutoTrader(html, location) {
  const doc = parseHTML(html);
  const deals = [];
  const items = doc.querySelectorAll("[class*='result-item'], .listing-details, .result-title");
  items.forEach((el, i) => {
    if (i >= 30) return;
    const titleEl = el.querySelector(".title, h2, .result-title");
    const title = titleEl?.textContent?.trim() || el.textContent?.trim()?.substring(0, 100) || "";
    const priceText = el.querySelector(".price, .price-amount")?.textContent?.trim() || "";
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) || null : null;
    const href = el.querySelector("a")?.getAttribute("href") || "";
    const img = el.querySelector("img")?.getAttribute("src") || el.querySelector("img")?.getAttribute("data-src") || null;

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
    const titles = [];
    const prices = [];
    doc.querySelectorAll(".title, h2 a, .listing-title").forEach((el, i) => { if (i < 30) titles.push(el.textContent?.trim()); });
    doc.querySelectorAll(".price, .price-amount, [class*='price']").forEach((el, i) => { if (i < 30) prices.push(el.textContent?.trim()); });

    titles.forEach((title, i) => {
      if (title && title.length > 3) {
        const pt = prices[i] || "Contact for price";
        const p = pt ? parseFloat(pt.replace(/[^0-9.]/g, "")) || null : null;
        deals.push({
          id: `at-fb-${i}-${Date.now()}`,
          title, price: p, priceText: pt, image: null,
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

// ============ KIJIJI ============
const KIJIJI_LOCATIONS = {
  vancouver: "b-buy-sell/vancouver/",
  toronto: "b-buy-sell/city-of-toronto/",
  montreal: "b-buy-sell/ville-de-montreal/",
  calgary: "b-buy-sell/calgary/",
  edmonton: "b-buy-sell/edmonton/",
  ottawa: "b-buy-sell/ottawa/",
  winnipeg: "b-buy-sell/winnipeg/",
  hamilton: "b-buy-sell/hamilton/",
  kitchener: "b-buy-sell/kitchener-waterloo/",
  london: "b-buy-sell/london/",
  victoria: "b-buy-sell/victoria-bc/",
  halifax: "b-buy-sell/city-of-halifax/",
  saskatoon: "b-buy-sell/saskatoon/",
  regina: "b-buy-sell/regina/",
  "st. john's": "b-buy-sell/st-johns/",
};

function buildKijijiUrl(query, location) {
  const path = KIJIJI_LOCATIONS[location.toLowerCase()] || "b-buy-sell/vancouver/";
  return `https://www.kijiji.ca/${path}k0?dc=true&dFree498=2&srt=2&kwd=${encodeURIComponent(query)}`;
}

function scrapeKijiji(html, location) {
  const doc = parseHTML(html);
  const deals = [];

  // Try multiple selector patterns — Kijiji changes their HTML frequently
  const selectors = [
    "[data-testid='listing-card']",
    ".search-item",
    "[data-listing-id]",
    ".resultContainer",
    ".info-container",
    "[class*='ListItem']",
    "[class*='listing']",
  ];

  let items = [];
  for (const sel of selectors) {
    items = doc.querySelectorAll(sel);
    if (items.length > 0) break;
  }

  // Fallback: scan all anchors that link to /v-* (Kijiji listing pattern)
  if (items.length === 0) {
    const allLinks = doc.querySelectorAll("a[href*='/v-']");
    const seen = new Set();
    allLinks.forEach((a, i) => {
      if (i >= 40) return;
      const href = a.getAttribute("href") || "";
      if (seen.has(href)) return;
      seen.add(href);
      const title = a.textContent?.trim() || a.getAttribute("aria-label") || "";
      if (title && title.length > 5 && title.length < 200) {
        deals.push({
          id: `kj-${deals.length}-${Date.now()}`,
          title,
          price: null,
          priceText: "See listing",
          image: null,
          url: href.startsWith("http") ? href : `https://www.kijiji.ca${href}`,
          marketplace: "kijiji",
          location: location || "Vancouver",
          postedAt: new Date().toISOString(),
        });
      }
    });
    return deals;
  }

  items.forEach((el, i) => {
    if (i >= 40) return;
    // Try various title selectors
    const titleEl = el.querySelector(
      "[data-testid='listing-title'], .title, .info-container .title, a.title, [class*='title'], h3, h2"
    );
    const title = titleEl?.textContent?.trim() || "";

    // Try various price selectors
    const priceEl = el.querySelector(
      "[data-testid='listing-price'], .price, [class*='price'], [class*='Price']"
    );
    const priceText = priceEl?.textContent?.trim() || "";
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) || null : null;

    // Link
    const linkEl = el.querySelector("a[href*='/v-']") || el.closest("a") || el.querySelector("a");
    const href = linkEl?.getAttribute("href") || "";

    // Image
    const img = el.querySelector("img")?.getAttribute("src") ||
      el.querySelector("img")?.getAttribute("data-src") || null;

    if (title && title.length > 3) {
      deals.push({
        id: `kj-${i}-${Date.now()}`,
        title,
        price,
        priceText: priceText || "See listing",
        image: img,
        url: href.startsWith("http") ? href : `https://www.kijiji.ca${href}`,
        marketplace: "kijiji",
        location: location || "Vancouver",
        postedAt: new Date().toISOString(),
      });
    }
  });

  return deals;
}

// ============ FACEBOOK MARKETPLACE ============
// Facebook requires authentication — we use a redirect approach:
// Opens FB Marketplace search in a new tab where the user is already logged in.
// We return a single "redirect" deal card that links directly to the search.

function buildFacebookSearchUrl(query, location) {
  // Facebook Marketplace city IDs for major cities
  const FB_CITIES = {
    vancouver: "vancouver",
    toronto: "toronto",
    montreal: "montreal",
    calgary: "calgary",
    edmonton: "edmonton",
    ottawa: "ottawa",
    "los angeles": "los-angeles",
    "new york": "new-york",
    "san francisco": "san-francisco",
    seattle: "seattle",
    portland: "portland",
    chicago: "chicago",
    houston: "houston",
    phoenix: "phoenix",
    denver: "denver",
    miami: "miami",
    atlanta: "atlanta",
    boston: "boston",
    dallas: "dallas",
    detroit: "detroit",
  };
  const city = FB_CITIES[location?.toLowerCase()] || "";
  const base = city
    ? `https://www.facebook.com/marketplace/${city}/search`
    : `https://www.facebook.com/marketplace/search`;
  return `${base}/?query=${encodeURIComponent(query)}&exact=false`;
}

function getFacebookDeals(query, location) {
  const searchUrl = buildFacebookSearchUrl(query, location);

  // Auto-open Facebook Marketplace in a new tab so the user sees real results
  if (typeof window !== "undefined") {
    window.open(searchUrl, "_blank", "noopener,noreferrer");
  }

  // Return a single card that links to the search — acts as a portal
  return [
    {
      id: `fb-redirect-${Date.now()}`,
      title: `🔗 View "${query}" on Facebook Marketplace`,
      price: null,
      priceText: "View on Facebook",
      image: null,
      url: searchUrl,
      marketplace: "facebook",
      location: location || "Local",
      postedAt: new Date().toISOString(),
      isRedirect: true,
    },
  ];
}

// ============ REVERB ============
function computeStats(deals) {
  const priced = deals.filter((d) => d.price !== null && d.price > 0);
  if (priced.length === 0) return { avgPrice: 0, lowestPrice: 0, highestPrice: 0, totalDeals: deals.length, pricedDeals: 0 };
  const prices = priced.map((d) => d.price);
  function buildReverbUrl(query) {
      return `https://reverb.com/marketplace?query=${encodeURIComponent(query)}`;
  }

  function scrapeReverb(html) {
      const doc = parseHTML(html);
      const deals = [];
      const items = doc.querySelectorAll(".tiles-tile, [class*='product-card'], .grid-card");
      items.forEach((el, i) => {
            if (i >= 30) return;
            const titleEl = el.querySelector("a[class*='title'], .grid-card-text, h4, h3, [class*='Title']");
            const title = titleEl?.textContent?.trim() || "";
            const priceEl = el.querySelector("[class*='price'], .grid-card-upper-right, [class*='Price']");
            const priceText = priceEl?.textContent?.trim() || "";
            const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) || null : null;
            const linkEl = el.querySelector("a[href*='/item/']") || el.querySelector("a");
            const href = linkEl?.getAttribute("href") || "";
            const img = el.querySelector("img")?.getAttribute("src") || el.querySelector("img")?.getAttribute("data-src") || null;
            if (title && title.length > 3) {
                    deals.push({
                              id: `rv-${i}-${Date.now()}`,
                              title,
                              price,
                              priceText: priceText || "See listing",
                              image: img,
                              url: href.startsWith("http") ? href : `https://reverb.com${href}`,
                              marketplace: "reverb",
                              location: "Worldwide",
                              postedAt: new Date().toISOString(),
                    });
            }
      });
      if (deals.length === 0) {
            const allLinks = doc.querySelectorAll("a[href*='/item/']");
            const seen = new Set();
            allLinks.forEach((a, i) => {
                    if (i >= 40) return;
                    const href = a.getAttribute("href") || "";
                    if (seen.has(href)) return;
                    seen.add(href);
                    const title = a.textContent?.trim() || a.getAttribute("aria-label") || "";
                    if (title && title.length > 5 && title.length < 200) {
                              deals.push({
                                          id: `rv-fb-${deals.length}-${Date.now()}`,
                                          title,
                                          price: null,
                                          priceText: "See listing",
                                          image: null,
                                          url: href.startsWith("http") ? href : `https://reverb.com${href}`,
                                          marketplace: "reverb",
                                          location: "Worldwide",
                                          postedAt: new Date().toISOString(),
                              });
                    }
            });
      }
      return deals;
  }
  
  return {
    avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
    totalDeals: deals.length,
    pricedDeals: priced.length,
  };
}

export async function searchMarketplaces(query, marketplaces, location) {
  const allDeals = [];
  const errors = [];
  const tasks = [];

  if (marketplaces.includes("craigslist")) {
    tasks.push(
      fetchWithProxy(buildCraigslistUrl(query, location))
        .then((html) => { allDeals.push(...scrapeCraigslist(html, location)); })
        .catch((e) => { errors.push(`Craigslist: ${e.message}`); })
    );
  }
  if (marketplaces.includes("autotrader")) {
    tasks.push(
      fetchWithProxy(buildAutoTraderUrl(query, location))
        .then((html) => { allDeals.push(...scrapeAutoTrader(html, location)); })
        .catch((e) => { errors.push(`AutoTrader: ${e.message}`); })
    );
  }
  if (marketplaces.includes("ebay")) {
    tasks.push(
      fetchWithProxy(buildEbayUrl(query))
        .then((html) => { allDeals.push(...scrapeEbay(html)); })
        .catch((e) => { errors.push(`eBay: ${e.message}`); })
    );
  }
  if (marketplaces.includes("kijiji")) {
    tasks.push(
      fetchWithProxy(buildKijijiUrl(query, location))
        .then((html) => { allDeals.push(...scrapeKijiji(html, location)); })
        .catch((e) => { errors.push(`Kijiji: ${e.message}`); })
    );
  }
  if (marketplaces.includes("facebook")) {
    // Facebook requires login — redirect to FB Marketplace search in a new tab
    try {
      allDeals.push(...getFacebookDeals(query, location));
    } catch (e) {
      errors.push(`FB Marketplace: ${e.message}`);
    }
  }

  if (marketplaces.includes("reverb")) {
        tasks.push(
                fetchWithProxy(buildReverbUrl(query))
                  .then((html) => { allDeals.push(...scrapeReverb(html)); })
                  .catch((e) => { errors.push(`Reverb: ${e.message}`); })
              );
  }

    await Promise.all(tasks);

  // Sort by price ascending
  allDeals.sort((a, b) => {
    if (a.price === null && b.price === null) return 0;
    if (a.price === null) return 1;
    if (b.price === null) return -1;
    return a.price - b.price;
  });

  const stats = computeStats(allDeals);
  return { deals: allDeals, stats, errors, query, location, marketplaces, timestamp: new Date().toISOString() };
}

// ============ SAVED SEARCHES (localStorage) ============
const SAVED_KEY = "scraypr_saved_searches";

export function getSavedSearches() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  } catch { return []; }
}

export function saveSavedSearch(data) {
  const saved = getSavedSearches();
  const item = {
    id: crypto.randomUUID(),
    query: data.query,
    location: data.location || "Vancouver",
    marketplaces: data.marketplaces || ["craigslist"],
    maxPrice: data.maxPrice || null,
    createdAt: new Date().toISOString(),
  };
  saved.push(item);
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  return item;
}

export function deleteSavedSearch(id) {
  const saved = getSavedSearches().filter((s) => s.id !== id);
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
}
