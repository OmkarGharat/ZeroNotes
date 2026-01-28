
import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import SharePage from './pages/SharePage';
import { LogoIcon } from './components/Icons';

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col text-openai-text dark:text-openai-darkText font-sans transition-colors duration-200">
        
        {/* Minimal Header */}
        <header className="pt-8 pb-4">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <Link to="/" className="group flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
               <LogoIcon className="w-6 h-6 text-black dark:text-white" />
               <span className="font-medium text-lg tracking-tight">ShareNote</span>
            </Link>
          </div>
        </header>

        {/* Main Content - Wider container for Home, specific pages constrain themselves */}
        <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/new" element={<EditorPage />} />
            <Route path="/edit/:id" element={<EditorPage />} />
            {/* Catch-all route for shared notes */}
            <Route path="/:slug" element={<SharePage />} />
          </Routes>
        </main>
        
        {/* Footer */}
        <footer className="py-10 text-center mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium cursor-default">
                Crafted by Omkar ✒️
            </p>
        </footer>
      </div>
    </HashRouter>
  );
}

export default App;
