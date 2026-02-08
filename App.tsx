import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import SharePage from './pages/SharePage';
import { ThemeProvider } from './context/ThemeContext';

function AppContent() {
  const location = useLocation();
  const isEditorPage = location.pathname === '/new' || location.pathname.startsWith('/edit');

  return (
    <div className="min-h-screen flex flex-col bg-zero-bg dark:bg-zero-darkBg text-zero-text dark:text-zero-darkText font-sans transition-colors duration-300">
      
      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-5">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/new" element={<EditorPage />} />
          <Route path="/edit/:id" element={<EditorPage />} />
          {/* Catch-all route for shared notes */}
          <Route path="/:slug" element={<SharePage />} />
        </Routes>
      </main>
      
      {/* Refined Footer - Hidden on Editor Pages */}
      {!isEditorPage && (
        <footer className="py-2 mt-auto text-center opacity-40 hover:opacity-80 transition-opacity duration-700">
            <p className="text-[10px] tracking-[0.3em] uppercase font-medium text-neutral-500 dark:text-neutral-400 cursor-default">
                Zero Notes © 2026 — Developed by Omkar
            </p>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;