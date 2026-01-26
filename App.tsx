
import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import SharePage from './pages/SharePage';
import { LogoIcon } from './components/Icons';

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col text-slate-800 dark:text-slate-200">
        <header className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-lg sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                <LogoIcon className="h-8 w-8 text-sky-500" />
                <span>Gemini Notes</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/new" element={<EditorPage />} />
            <Route path="/edit/:id" element={<EditorPage />} />
            {/* Catch-all route for shared notes to support short URLs like domain/#/my-note-title */}
            <Route path="/:slug" element={<SharePage />} />
          </Routes>
        </main>
        <footer className="text-center p-4 text-sm text-slate-500">
            <p>Built with Gemini & React</p>
        </footer>
      </div>
    </HashRouter>
  );
}

export default App;
