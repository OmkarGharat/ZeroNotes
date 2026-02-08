import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../types';
import NoteCard from '../components/NoteCard';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { PlusIcon, NoteIcon, SearchIcon, SunIcon, MoonIcon } from '../components/Icons';
import { deleteNoteFromCloud, isFirebaseConfigured } from '../services/firebaseService';
import { useTheme } from '../context/ThemeContext';

const HomePage: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDestructive: false,
    onConfirm: () => {},
  });

  const openModal = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    isDestructive = false,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ) => {
    setModalState({ isOpen: true, title, message, onConfirm, isDestructive, confirmText, cancelText });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleModalConfirm = () => {
    modalState.onConfirm();
    closeModal();
  };

  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem('notes') || '[]') as Note[];
    // Sort notes by last updated date, newest first
    savedNotes.sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(savedNotes);
  }, []);

  const executeDelete = async (id: string, forceLocal = false) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    if (noteToDelete.cloudSlug && isFirebaseConfigured() && !forceLocal) {
        try {
            await deleteNoteFromCloud(noteToDelete.cloudSlug);
        } catch (error) {
            console.error(error);
            // Re-open modal for error handling
            openModal(
                "Cloud Error",
                "Failed to remove the shared public link. Delete locally anyway?",
                () => executeDelete(id, true),
                true,
                "Force Delete"
            );
            return;
        }
    }

    const updatedNotes = notes.filter(note => note.id !== id);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  const handleDeleteNote = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    const message = note.cloudSlug 
        ? 'This note is public. Delete it and break the public link?' 
        : 'Are you sure you want to permanently delete this note?';
    
    openModal("Delete Note", message, () => executeDelete(id), true, "Delete");
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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
            {/* Logo Replacement */}
            <h1 className="sr-only">Zero Notes - Minimalist Markdown Editor</h1>
            <div className="h-16 flex items-center mb-1">
                <img 
                    src={isDark ? "/logo-dark.png" : "/logo-light.png"} 
                    alt="Zero Notes - Minimalist Markdown Editor" 
                    className="h-full w-auto object-contain" 
                />
            </div>
            <p className="text-center text-zero-secondaryText dark:text-zero-darkSecondaryText text-sm max-w-md leading-relaxed ml-1">
                Zero Notes: Where clarity begins...
            </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
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
                className="inline-flex items-center justify-center gap-2 bg-zero-accent dark:bg-zero-darkAccent text-white dark:text-black font-medium py-2 px-5 rounded-md hover:opacity-90 transition-all duration-300 text-sm whitespace-nowrap shadow-sm"
            >
                <PlusIcon className="h-4 w-4" />
                New Note
            </Link>
            
            <button 
                onClick={toggleTheme}
                className="p-2 ml-1 text-zero-secondaryText hover:text-zero-text dark:hover:text-zero-darkText transition-colors rounded-md hover:bg-zero-surface dark:hover:bg-neutral-800"
                aria-label="Toggle Theme"
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg">
          <div className="opacity-50 flex flex-col items-center">
            <div className="mb-4 text-zero-secondaryText dark:text-zero-darkSecondaryText">
                <NoteIcon className="h-16 w-16 stroke-[0.5]" />
            </div>
            <p className="text-sm font-medium tracking-wide text-zero-secondaryText dark:text-zero-darkSecondaryText">ZERO FRICTION. START WRITING.</p>
          </div>
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
      <ConfirmationModal 
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        onConfirm={handleModalConfirm}
        onCancel={closeModal}
        isDestructive={modalState.isDestructive}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
      />
    </div>
  );
};

export default HomePage;