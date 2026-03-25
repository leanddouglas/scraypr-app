import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CreateScraper from './pages/CreateScraper';
import ResultsBrowser from './pages/ResultsBrowser';
import ScraperSettings from './pages/ScraperSettings';
import UserGuide from './pages/UserGuide';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="create" element={<CreateScraper />} />
          <Route path="data" element={<ResultsBrowser />} />
          <Route path="data/:scraperId" element={<ResultsBrowser />} />
          <Route path="settings/:scraperId" element={<ScraperSettings />} />
          <Route path="guide" element={<UserGuide />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
