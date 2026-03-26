export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  return res.status(200).json([
    { id: "craigslist", name: "Craigslist", icon: "🏷️", status: "active", description: "Local classifieds — furniture, electronics, vehicles, everything" },
    { id: "autotrader", name: "AutoTrader", icon: "🚗", status: "active", description: "Canada's largest auto marketplace — cars, trucks, SUVs" },
    { id: "ebay", name: "eBay", icon: "🛒", status: "active", description: "Online auctions & Buy It Now — electronics, collectibles, deals" },
    { id: "facebook", name: "FB Marketplace", icon: "📘", status: "coming_soon", description: "Coming soon — requires browser automation" },
    { id: "kijiji", name: "Kijiji", icon: "🟢", status: "coming_soon", description: "Coming soon — requires browser automation" },
  ]);
}
