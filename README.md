# SCRAYPR - Enterprise Web Scraping Platform

A full-stack web scraping application with a stunning dark glassmorphism UI, real scraping backend, and responsive design.

## Quick Start

```bash
# Install dependencies
npm install

# Start both backend and frontend
npm start

# Or start them separately:
npm run server   # Backend on http://localhost:3001
npm run dev      # Frontend on http://localhost:5173
```

## Architecture

- **Frontend**: React 18 + Vite + Tailwind CSS + React Router
- **Backend**: Node.js + Express + Cheerio (HTML parsing)
- **Design**: Dark glassmorphism with cyan accent (#61cdff)

## Features

- **Dashboard**: Real-time stats, active scrapers, velocity metrics
- **Create Scraper**: Configure URL, mode (Fast-Sync/Stealth), field selection
- **Add Custom Fields**: CSS selectors with live data preview
- **Results Browser**: Marketplace-style card layout for scraped data
- **Scraper Settings**: Configuration, scheduling, activity logs
- **User Guide**: Step-by-step extraction guide

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/scrapers | List all scrapers |
| POST | /api/scrapers | Create scraper |
| POST | /api/scrapers/:id/run | Run a scrape |
| GET | /api/scrapers/:id/results | Get results |
| POST | /api/preview-selector | Preview CSS selector |
| GET | /api/stats | Aggregate statistics |
