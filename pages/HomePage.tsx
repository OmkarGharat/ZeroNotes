
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../types';
import NoteCard from '../components/NoteCard';
import { PlusIcon, NoteIcon } from '../components/Icons';
import { deleteNoteFromCloud, isFirebaseConfigured } from '../services/firebaseService';

const HomePage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);

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

  return (
    <div className="animate-fade-in mt-12">
      <div className="flex justify-between items-end mb-12">
        <div>
            <h1 className="text-3xl font-medium tracking-tight text-openai-text dark:text-white">Your Notes</h1>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center gap-2 bg-openai-accent hover:bg-openai-accentHover text-white font-medium py-2.5 px-5 rounded-md transition-colors text-sm"
        >
          <PlusIcon className="h-4 w-4" />
          Create note
        </Link>
      </div>

      {notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notes.map(note => (
            <NoteCard key={note.id} note={note} onDelete={handleDeleteNote} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 opacity-60">
          <div className="mb-6 text-gray-300 dark:text-gray-700">
            <NoteIcon className="h-24 w-24 stroke-[0.5]" />
          </div>
          <p className="text-sm font-medium text-gray-500">ShareNote is ready.</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
    