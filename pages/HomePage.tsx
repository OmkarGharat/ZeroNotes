
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

    let confirmMessage = 'Are you sure you want to delete this note?';
    if (noteToDelete.cloudSlug) {
        confirmMessage = 'This note is shared publicly. Deleting it will also permanently remove the public link. Continue?';
    }

    // NoteCard handles the click event, but we double check confirmation here just in case logic moves or expands
    // Actually, NoteCard usually handles the confirm dialog. 
    // To properly support async deletion with feedback, we might want to handle it here.
    // However, NoteCard calls this function after its own window.confirm. 
    // Let's assume the user has already confirmed the "delete" action in UI, 
    // but if it's a cloud note, we might want to do the extra check or just proceed.
    // Since NoteCard has a simple confirm, we'll implement the logic here.
    // Ideally NoteCard shouldn't have the confirm logic if we want conditional messages,
    // but for now, we will perform the cloud deletion.

    // If NoteCard already asked "Are you sure", we proceed.
    
    // Optimistic update or wait? 
    // If cloud deletion fails, we probably shouldn't delete local note to avoid "orphan" public notes.
    
    if (noteToDelete.cloudSlug && isFirebaseConfigured()) {
        try {
            await deleteNoteFromCloud(noteToDelete.cloudSlug);
        } catch (error) {
            console.error(error);
            alert("Failed to delete the public shared version. Local note was NOT deleted to prevent a ghost link.");
            return;
        }
    }

    const updatedNotes = notes.filter(note => note.id !== id);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Notes</h1>
            <p className="text-slate-500 mt-1">Manage and share your ideas</p>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
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
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-full mb-4">
            <NoteIcon className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">No notes yet</h2>
          <p className="text-slate-500 mt-2 mb-6 max-w-xs text-center">Capture your ideas, generate content with AI, and share with the world.</p>
          <Link
            to="/new"
            className="text-green-600 font-medium hover:text-green-700 hover:underline underline-offset-4"
          >
            Create your first note &rarr;
          </Link>
        </div>
      )}
    </div>
  );
};

export default HomePage;
