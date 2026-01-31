import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import SharePage from './pages/SharePage';
import { LogoIcon, SunIcon, MoonIcon } from './components/Icons';

function App() {
  // Initialize state based on localStorage, defaulting to true (Dark) if not set.
  const [isDark, setIsDark] = React.useState(() => {
     if (typeof window !== 'undefined' && window.localStorage) {
         const stored = localStorage.getItem('theme');
         // Explicitly check for 'light'. If 'dark' or null (missing), return true.
         if (stored === 'light') {
             return false;
         }
         return true;
     }
     return true; 
  });

  // Sync the DOM class and localStorage whenever isDark changes
  useEffect(() => {
    if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-zero-bg dark:bg-zero-darkBg text-zero-text dark:text-zero-darkText font-sans transition-colors duration-300">
        
        {/* Minimal Header with subtle border */}
        <header className="border-b border-zero-border dark:border-zero-darkBorder sticky top-0 z-10 bg-zero-bg/80 dark:bg-zero-darkBg/80 backdrop-blur-md transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="group flex items-baseline gap-2 opacity-90 hover:opacity-100 transition-opacity">
                <LogoIcon className="w-5 h-5 self-center text-black dark:text-white" />
                <span className="font-semibold text-xl tracking-tighter">ZeroNotes</span>
                <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-medium ml-1">by Omkar</span>
            </Link>

            <button 
                onClick={toggleTheme}
                className="p-2 text-zero-secondaryText hover:text-zero-text dark:hover:text-zero-darkText transition-colors rounded-full hover:bg-zero-surface dark:hover:bg-neutral-800"
                aria-label="Toggle Theme"
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/new" element={<EditorPage />} />
            <Route path="/edit/:id" element={<EditorPage />} />
            {/* Catch-all route for shared notes */}
            <Route path="/:slug" element={<SharePage />} />
          </Routes>
        </main>
        
        {/* Footer - Minimal */}
        {/* Refined Footer */}
        <footer className="py-12 mt-auto text-center opacity-40 hover:opacity-80 transition-opacity duration-700">
            <p className="text-[10px] tracking-[0.3em] uppercase font-medium text-neutral-500 dark:text-neutral-400 cursor-default">
                ZeroNotes © 2026 — Developed by Omkar
            </p>
        </footer>
      </div>
    </HashRouter>
  );
}

export default App;