
import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import SharePage from './pages/SharePage';
import { LogoIcon } from './components/Icons';

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col text-slate-800 dark:text-slate-200 font-sans">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="transition-transform group-hover:scale-110">
                    <LogoIcon className="h-8 w-8 text-green-600" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-green-600 transition-colors">ShareNote</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/new" element={<EditorPage />} />
            <Route path="/edit/:id" element={<EditorPage />} />
            {/* Catch-all route for shared notes */}
            <Route path="/:slug" element={<SharePage />} />
          </Routes>
        </main>
        <footer className="text-center p-6 text-sm text-slate-400">
            <p>&copy; {new Date().getFullYear()} ShareNote. All rights reserved.</p>
        </footer>
      </div>
    </HashRouter>
  );
}

export default App;
