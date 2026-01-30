import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../types';
import NoteCard from '../components/NoteCard';
import { PlusIcon, NoteIcon, SearchIcon } from '../components/Icons';
import { deleteNoteFromCloud, isFirebaseConfigured } from '../services/firebaseService';

const HomePage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem('notes') || '[]') as Note[];
    // Sort notes by last updated date, newest first
    savedNotes.sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(savedNotes);
  }, []);

  const handleDeleteNote = async (id: string) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;
    
    if (noteToDelete.cloudSlug && isFirebaseConfigured()) {
        try {
            await deleteNoteFromCloud(noteToDelete.cloudSlug);
        } catch (error) {
            console.error(error);
            const forceDelete = window.confirm(
                "Failed to remove the shared public link.\n\n" +
                "Delete locally anyway?"
            );
            if (!forceDelete) return;
        }
    }

    const updatedNotes = notes.filter(note => note.id !== id);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  const filteredNotes = notes.filter(note => {
    const query = searchQuery.toLowerCase();
    const titleMatch = (note.title || '').toLowerCase().includes(query);
    // Basic search in content; matches raw HTML but sufficient for basic search
    const contentMatch = (note.content || '').toLowerCase().includes(query);
    return titleMatch || contentMatch;
  });

  return (
    <div className="animate-fade-in mt-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
            <h1 className="text-4xl font-semibold tracking-tight text-zero-text dark:text-zero-darkText">ZeroNotes</h1>
            <p className="text-zero-secondaryText dark:text-zero-darkSecondaryText mt-2 text-sm max-w-md leading-relaxed">
                A minimalist workspace for your thoughts, enhanced by AI.
            </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
             <div className="relative group w-full md:w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-zero-accent dark:group-focus-within:text-zero-darkAccent transition-colors" />
                <input 
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-zero-surface dark:bg-zero-darkSurface border border-transparent focus:bg-white dark:focus:bg-zero-darkBg border-zero-border dark:border-zero-darkBorder rounded-md text-sm focus:outline-none focus:border-zero-border dark:focus:border-neutral-600 transition-all text-zero-text dark:text-zero-darkText placeholder-gray-400"
                />
             </div>
            <Link
                to="/new"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-zero-accent dark:bg-zero-darkAccent text-white dark:text-black font-medium py-2 px-5 rounded-md hover:opacity-90 transition-all duration-300 text-sm whitespace-nowrap shadow-sm"
            >
                <PlusIcon className="h-4 w-4" />
                New Note
            </Link>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 opacity-40 border border-dashed border-zero-border dark:border-zero-darkBorder rounded-lg">
          <div className="mb-4 text-zero-secondaryText dark:text-zero-darkSecondaryText">
            <NoteIcon className="h-16 w-16 stroke-[0.5]" />
          </div>
          <p className="text-sm font-medium tracking-wide">ZERO FRICTION. START WRITING.</p>
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredNotes.map(note => (
            <NoteCard key={note.id} note={note} onDelete={handleDeleteNote} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-zero-secondaryText">
            <p className="text-sm">No results for "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;