import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// @ts-ignore
import TurndownService from 'turndown';
import { Marked } from 'marked';
import hljs from 'highlight.js'; // Might be needed for static html rendering if we keep it, but mostly for the editor which is now BlockSuite. 
// We keep it for now to avoid breaking other things if they rely on global hljs, though likely not needed for BlockSuite itself.

import type { Note } from '../types';

import { publishNoteToCloud, deleteNoteFromCloud, isFirebaseConfigured } from '../services/firebaseService';
import { ArrowLeft, Download, Share2, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';
import BlockSuiteEditor from '../components/BlockSuiteEditor';
import { useSettings } from '../context/SettingsContext';

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // HTML for compatibility/sharing
  const [blockSuiteData, setBlockSuiteData] = useState<any>(undefined); // BlockSuite Snapshot
  const [cloudSlug, setCloudSlug] = useState<string | undefined>(undefined);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notification, setNotification] = useState('');
  const [isLoading, setIsLoading] = useState(!!id);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const currentIdRef = useRef(id);
  
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

  // 1. Data Loading
  useEffect(() => {
    if (id) {
      setIsLoading(true);
      const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
      const noteToEdit = notes.find(note => note.id === id);
      if (noteToEdit) {
        setTitle(noteToEdit.title);
        setContent(noteToEdit.content);
        setBlockSuiteData(noteToEdit.blockSuiteData);
        setCloudSlug(noteToEdit.cloudSlug);
      }
      setIsLoading(false);
    } else {
      // New note: reset state
      setTitle('');
      setContent('');
      setBlockSuiteData(undefined);
      setCloudSlug(undefined);
      setIsLoading(false);
    }
    // Mark initial load complete after a short delay to avoid triggering auto-save on open
    const loadTimer = setTimeout(() => { isInitialLoadRef.current = false; }, 500);
    return () => clearTimeout(loadTimer);
  }, [id]);

  // 3. Helper Functions
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const updateLocalStorage = (newSlug?: string | null) => {
    const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
    const now = Date.now();
    const finalSlug = newSlug === null ? undefined : (newSlug || cloudSlug);

    const noteData = {
        title,
        content,
        blockSuiteData,
        updatedAt: now,
        cloudSlug: finalSlug
    };

    if (id) {
      const updatedNotes = notes.map(note => 
        note.id === id ? { ...note, ...noteData } : note
      );
      localStorage.setItem('notes', JSON.stringify(updatedNotes));
      return updatedNotes.find(n => n.id === id);
    } else {
      const newNote: Note = {
        id: `note-${now}`,
        ...noteData,
        createdAt: now,
      };
      localStorage.setItem('notes', JSON.stringify([...notes, newNote]));
      return newNote;
    }
  };

  const isEditorEmpty = () => {
     if (!content) return true;
     
     // Strip HTML tags and check if there's any visible text
     const plainText = content.replace(/<[^>]*>?/gm, '').trim();
     return plainText === ''; 
  };

  const isTitleDuplicate = (candidateTitle: string) => {
    const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
    const normalized = candidateTitle.trim().toLowerCase();
    return notes.some(n => n.title.trim().toLowerCase() === normalized && n.id !== id);
  };

  // 4. Action Handlers
  const handleBack = () => {
    if (!id) {
        const hasTitle = title.trim().length > 0;
        const hasContent = !isEditorEmpty();

        if (hasTitle || hasContent) {
            openModal(
                "Discard Unsaved Note?",
                "You have started writing a new note. If you leave now, your changes will be lost.",
                () => navigate('/'),
                true,
                "Discard"
            );
            return;
        }
    }
    navigate('/');
  };

  const handleSave = () => {
    if (!title.trim()) { showNotification('Please enter a title before saving.'); return; }
    if (isTitleDuplicate(title)) { showNotification('A note with this name already exists.'); return; }
    if (isEditorEmpty()) { showNotification('Note is empty. Please add content.'); return; } 
    
    const savedNote = updateLocalStorage();
    if (!id && savedNote) navigate(`/edit/${savedNote.id}`);
    showNotification('Saved');
  };

  const executeDelete = async (forceLocal = false) => {
    if (cloudSlug && isFirebaseConfigured() && !forceLocal) {
        try { await deleteNoteFromCloud(cloudSlug); } 
        catch (_) { 
            openModal(
                "Cloud Error", 
                "Could not remove public link. Delete local copy anyway?", 
                () => executeDelete(true), 
                true, 
                "Force Delete"
            );
            return; 
        }
    }

    const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
    localStorage.setItem('notes', JSON.stringify(notes.filter(note => note.id !== id)));
    navigate('/');
  };

  const handleDelete = async () => {
    if (!id) {
        if (title || content) {
            openModal("Discard Changes", "Are you sure you want to discard your unsaved changes?", () => navigate('/'), true, "Discard");
            return;
        }
        navigate('/');
        return;
    }
    
    const msg = cloudSlug ? 'This note is public. Delete it and break the public link?' : 'Are you sure you want to permanently delete this note?';
    openModal("Delete Note", msg, () => executeDelete(), true, "Delete");
  };

  const handleShare = async () => {
    if (!isFirebaseConfigured()) { alert("Sharing requires database configuration."); return; }
    if (!title.trim() || isTitleDuplicate(title)) {
        showNotification(!title.trim() ? 'Title required' : 'Name exists');
        return;
    }

    setIsPublishing(true);
    try {
        const slug = await publishNoteToCloud(title, content, cloudSlug);
        setCloudSlug(slug);
        const savedNote = updateLocalStorage(slug);
        if (!id && savedNote) navigate(`/edit/${savedNote.id}`);
        const shareUrl = `${window.location.href.split('#')[0]}#/${slug}`;
        navigator.clipboard.writeText(shareUrl).then(() => showNotification('Link copied'));
    } catch (err) { showNotification('Share error'); } 
    finally { setIsPublishing(false); }
  };

  const executeStopSharing = async (forceLocal = false) => {
    if (!cloudSlug) return;
    setIsPublishing(true);
    try {
        if (!forceLocal) await deleteNoteFromCloud(cloudSlug);
        setCloudSlug(undefined);
        updateLocalStorage(null);
        showNotification("Unshared");
    } catch (err) {
        if (!forceLocal) {
            openModal(
                "Cloud Error",
                "Could not unpublish from cloud. Unlink locally?",
                () => executeStopSharing(true),
                true,
                "Unlink"
            );
        }
    } finally { setIsPublishing(false); }
  };

  const handleStopSharing = async () => {
    if (!cloudSlug) return;
    openModal("Stop Sharing", "This will remove the public link. The note will remain in your library.", () => executeStopSharing(), true, "Unpublish");
  };

  const handleDownloadMarkdown = () => {
    // We use the HTML content for download
    if (!content) return;
    const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    const markdown = turndown.turndown(content);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (title.trim() || 'Untitled') + '.md';
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Downloaded');
  };

  const handleEditorChange = (newHtml: string, snapshot: any) => {
      setContent(newHtml);
      setBlockSuiteData(snapshot);
  };

  // --- Auto-Save Logic ---
  useEffect(() => {
    // Keep ref in sync
    currentIdRef.current = id;
  }, [id]);

  useEffect(() => {
    if (!settings.autoSave) return;
    if (isInitialLoadRef.current) return;
    if (isLoading) return;

    // Clear previous timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      // Validate before auto-saving
      if (!title.trim()) return;
      
      const checkContent = content?.replace(/<[^>]*>?/gm, '').trim();
      if (!checkContent) return;

      // Check for duplicate title
      const allNotes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
      const normalized = title.trim().toLowerCase();
      const hasDuplicate = allNotes.some(n => n.title.trim().toLowerCase() === normalized && n.id !== currentIdRef.current);
      if (hasDuplicate) return;

      // Perform save
      setAutoSaveStatus('saving');
      const savedNote = updateLocalStorage();
      if (!currentIdRef.current && savedNote) {
        navigate(`/edit/${savedNote.id}`);
      }
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, blockSuiteData, settings.autoSave, isLoading]);

  return (
    <div className="flex flex-col h-full mt-12 max-w-4xl mx-auto w-full">
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

      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium tracking-wide py-2 px-6 rounded-md shadow-lg z-50">
          {notification}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto flex-grow">
             <button onClick={handleBack} className="group text-gray-400 hover:text-zero-text transition-colors">
                <ArrowLeft className="h-6 w-6 stroke-[1.5] group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Note"
              className="text-3xl font-semibold tracking-tight bg-transparent border-none focus:ring-0 p-0 w-full text-zero-text dark:text-zero-darkText focus:outline-none"
            />
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={handleShare} 
                disabled={isPublishing} 
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${cloudSlug ? 'text-zero-accent bg-gray-100 dark:bg-neutral-800' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`} 
                title="Share"
            >
                <Share2 className="h-5 w-5 stroke-[1.5]" />
            </button>
            {cloudSlug && (
                 <button 
                    onClick={handleStopSharing} 
                    className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 text-neutral-400 hover:text-white hover:bg-neutral-800" 
                    title="Unpublish"
                >
                    <Trash2 className="h-5 w-5 stroke-[1.5]" />
                 </button>
            )}
            <button 
                onClick={handleDownloadMarkdown} 
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 text-neutral-400 hover:text-white hover:bg-neutral-800"
                title="Download"
            >
              <Download className="h-5 w-5 stroke-[1.5]" />
            </button>
            <button 
                onClick={handleDelete} 
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 text-neutral-400 hover:text-white hover:bg-red-900/40 hover:!text-white" 
                title="Delete"
            >
                <Trash2 className="h-5 w-5 stroke-[1.5]" />
            </button>
            <button onClick={handleSave} className="ml-4 bg-zero-accent dark:bg-zero-darkAccent text-white dark:text-black font-medium text-xs uppercase tracking-widest py-2 px-5 rounded-md hover:opacity-90 transition-all shadow-sm">
              {settings.autoSave && autoSaveStatus === 'saved' ? 'Saved ✓' : 'Save'}
            </button>
        </div>
      </div>

      <div className="flex-grow h-[calc(100vh-200px)] rounded-lg overflow-hidden relative bg-white dark:bg-neutral-900">
        {!isLoading ? (
          <BlockSuiteEditor 
              key={id || 'new'}
              initialContentHtml={content} 
              initialSnapshot={blockSuiteData} 
              onChange={handleEditorChange} 
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zero-secondaryText dark:text-zero-darkSecondaryText">
            Loading note...
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPage;