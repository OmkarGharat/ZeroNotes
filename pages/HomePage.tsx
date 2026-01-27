
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
    <div className="animate-fade-in mt-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
            <h1 className="text-3xl font-medium tracking-tight text-openai-text dark:text-white">Your Notes</h1>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
             <div className="relative group">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
                <input 
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-64 pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-neutral-800 border border-transparent focus:bg-white dark:focus:bg-neutral-900 border-gray-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-gray-300 dark:focus:border-neutral-600 transition-all text-openai-text dark:text-white placeholder-gray-400"
                />
             </div>
            <Link
                to="/new"
                className="inline-flex items-center justify-center gap-2 bg-openai-accent hover:bg-openai-accentHover text-white font-medium py-2.5 px-5 rounded-md transition-colors text-sm whitespace-nowrap"
            >
                <PlusIcon className="h-4 w-4" />
                Create note
            </Link>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 opacity-60">
          <div className="mb-6 text-gray-300 dark:text-gray-700">
            <NoteIcon className="h-24 w-24 stroke-[0.5]" />
          </div>
          <p className="text-sm font-medium text-gray-500">ShareNote is ready.</p>
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNotes.map(note => (
            <NoteCard key={note.id} note={note} onDelete={handleDeleteNote} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
            <p className="text-sm">No notes found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
