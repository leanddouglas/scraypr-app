// In-memory store for saved searches (resets on cold start — fine for demo)
// For persistence, connect a database like Vercel KV or Supabase
let savedSearches = [];

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    return res.status(200).json(savedSearches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }

  if (req.method === "POST") {
    const body = req.body;
    if (!body?.query) return res.status(400).json({ error: "Query is required" });
    const saved = {
      id: crypto.randomUUID(),
      query: body.query.substring(0, 200),
      location: (body.location || "vancouver").substring(0, 100),
      marketplaces: Array.isArray(body.marketplaces) ? body.marketplaces : ["craigslist"],
      maxPrice: body.maxPrice || null,
      createdAt: new Date().toISOString(),
    };
    savedSearches.push(saved);
    return res.status(201).json(saved);
  }

  if (req.method === "DELETE") {
    // Extract ID from query param since this handles /api/saved-searches?id=xxx
    const id = req.query?.id;
    if (id) {
      savedSearches = savedSearches.filter(s => s.id !== id);
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ error: "ID required" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
