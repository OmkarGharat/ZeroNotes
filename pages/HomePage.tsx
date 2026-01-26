
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../types';
import NoteCard from '../components/NoteCard';
import { PlusIcon } from '../components/Icons';

const HomePage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem('notes') || '[]') as Note[];
    // Sort notes by last updated date, newest first
    savedNotes.sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(savedNotes);
  }, []);

  const handleDeleteNote = (id: string) => {
    const updatedNotes = notes.filter(note => note.id !== id);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Notes</h1>
        <Link
          to="/new"
          className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-300"
        >
          <PlusIcon className="h-5 w-5" />
          New Note
        </Link>
      </div>

      {notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map(note => (
            <NoteCard key={note.id} note={note} onDelete={handleDeleteNote} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300">No notes yet!</h2>
          <p className="text-slate-500 mt-2 mb-6">Click "New Note" to get started.</p>
          <img src="https://picsum.photos/400/200" alt="placeholder" className="mx-auto rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default HomePage;
