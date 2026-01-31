import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
// @ts-ignore
import TurndownService from 'turndown';
import { Marked } from 'marked';
import hljs from 'highlight.js';
// CSS is loaded in index.html

import type { Note } from '../types';

import { publishNoteToCloud, deleteNoteFromCloud, isFirebaseConfigured } from '../services/firebaseService';
import { ArrowLeftIcon, DownloadIcon, ShareIcon, TrashIcon } from '../components/Icons';

// Access Quill instance from ReactQuill
const Quill = (ReactQuill as any).Quill;
(window as any).hljs = hljs;

// Register a custom divider blot (hr)
const BlockEmbed = Quill.import('blots/block/embed');
class DividerBlot extends BlockEmbed {
  static blotName = 'divider';
  static tagName = 'hr';

  static create() {
    const node = super.create();
    return node;
  }
}
Quill.register(DividerBlot);

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const quillRef = useRef<ReactQuill>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [cloudSlug, setCloudSlug] = useState<string | undefined>(undefined);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notification, setNotification] = useState('');

  // 1. Data Loading
  useEffect(() => {
    if (id) {
      const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
      const noteToEdit = notes.find(note => note.id === id);
      if (noteToEdit) {
        setTitle(noteToEdit.title);
        setContent(noteToEdit.content);
        setCloudSlug(noteToEdit.cloudSlug);
      }
    }
  }, [id]);

  // 2. Editor Initialization & Priority Logic
  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    // --- Definitive Capture-Phase Backspace Interception ---
    // This is the NUCLEAR fix for the behavior the user wants.
    const handleKeyDownCapture = (e: KeyboardEvent) => {
        if (e.key === 'Backspace' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
            const range = quill.getSelection();
            if (range && range.length === 0) {
                const [line, offset] = quill.getLine(range.index);
                if (offset === 0 && range.index > 0) {
                    const formats = quill.getFormat(range.index);
                    if (formats['code-block'] || formats['blockquote']) {
                        // Bypass Quill's internal handlers
                        e.preventDefault();
                        e.stopPropagation();
                        // Turn line into normal text
                        quill.formatLine(range.index, 1, 'code-block', false);
                        quill.formatLine(range.index, 1, 'blockquote', false);
                        quill.format('code', false);
                        return;
                    }
                }
            }
        }
    };

    quill.root.addEventListener('keydown', handleKeyDownCapture, true);

    // --- Markdown Paste Handler ---
    const marked = new Marked({ gfm: true, breaks: true } as any);
    marked.use({
        renderer: {
            code(code, language) {
                const cleanCode = code.replace(/\n\s*\n/g, '\n');
                const escapedCode = cleanCode.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const langAttr = language ? ` class="language-${language}"` : '';
                return `<pre><code${langAttr}>${escapedCode}</code></pre>`;
            }
        }
    });

    const handlePaste = (e: ClipboardEvent) => {
        const clipboardData = (e as any).clipboardData;
        if (!clipboardData) return;
        const text = clipboardData.getData('text/plain');
        if (!text) return;

        const isMarkdown = /^#{1,6}\s/m.test(text) || /^```/m.test(text) || /(\*\*|__)(.*?)\1/.test(text);
        if (isMarkdown) {
            e.preventDefault();
            try {
                const html = marked.parse(text) as string;
                const range = quill.getSelection(true);
                if (range) quill.clipboard.dangerouslyPasteHTML(range.index, html, 'user');
            } catch (err) { console.error(err); }
        }
    };
    quill.root.addEventListener('paste', handlePaste);

    // --- Markdown Shortcuts (Imperative) ---
    quill.keyboard.addBinding(
        { key: 32, collapsed: true, format: { 'code-block': false } } as any,
        function(range: any, context: any) {
            const [line, offset] = quill.getLine(range.index);
            const lineStart = range.index - offset;
            const textToCursor = quill.getText(lineStart, offset);

            // Block Triggers
            if (textToCursor === '*' || textToCursor === '-') {
                quill.deleteText(range.index - 1, 1);
                quill.formatLine(range.index - 1, 1, 'list', 'bullet');
                return false;
            }
            if (textToCursor === '1.') {
                quill.deleteText(range.index - 2, 2);
                quill.formatLine(range.index - 2, 1, 'list', 'ordered');
                return false;
            }
            if (textToCursor === '>') {
                quill.deleteText(range.index - 1, 1);
                quill.formatLine(range.index - 1, 1, 'blockquote', true);
                return false;
            }
            if (textToCursor === '#') {
                quill.deleteText(range.index - 1, 1);
                quill.formatLine(range.index - 1, 1, 'header', 1);
                return false;
            }
            if (textToCursor === '##') {
                quill.deleteText(range.index - 2, 2);
                quill.formatLine(range.index - 2, 1, 'header', 2);
                return false;
            }
            if (textToCursor === '###') {
                quill.deleteText(range.index - 3, 3);
                quill.formatLine(range.index - 3, 1, 'header', 3);
                return false;
            }
            if (textToCursor === '```') {
                quill.deleteText(range.index - 3, 3);
                quill.formatLine(range.index - 3, 1, 'code-block', true);
                return false;
            }
            
            // Inline
            const boldMatch = textToCursor.match(/\*\*([^\s][^*]*[^\s])\*\*$/);
            if (boldMatch) {
                const matchLength = boldMatch[0].length;
                const textLength = boldMatch[1].length;
                const startIndex = range.index - matchLength;
                quill.deleteText(startIndex, matchLength);
                quill.insertText(startIndex, boldMatch[1], 'user');
                quill.formatText(startIndex, textLength, 'bold', true);
                quill.insertText(startIndex + textLength, ' ', 'user');
                quill.setSelection(startIndex + textLength + 1, 0);
                quill.format('bold', false);
                return false;
            }
            const italicMatch = textToCursor.match(/(?<!\*)\*([^\s][^*]*[^\s])\*(?!\*)$/);
            if (italicMatch) {
                const matchLength = italicMatch[0].length;
                const textLength = italicMatch[1].length;
                const startIndex = range.index - matchLength;
                quill.deleteText(startIndex, matchLength);
                quill.insertText(startIndex, italicMatch[1], 'user');
                quill.formatText(startIndex, textLength, 'italic', true);
                quill.insertText(startIndex + textLength, ' ', 'user');
                quill.setSelection(startIndex + textLength + 1, 0);
                quill.format('italic', false);
                return false;
            }
            const codeMatch = textToCursor.match(/`([^`]+)`$/);
            if (codeMatch) {
                const matchLength = codeMatch[0].length;
                const textLength = codeMatch[1].length;
                const startIndex = range.index - matchLength;
                quill.deleteText(startIndex, matchLength);
                quill.insertText(startIndex, codeMatch[1], 'user');
                quill.formatText(startIndex, textLength, { 'code': true });
                quill.insertText(startIndex + textLength, ' ', 'user');
                quill.setSelection(startIndex + textLength + 1, 0);
                quill.format('code', false);
                return false;
            }

            if (textToCursor === '---') {
                quill.deleteText(lineStart, 3);
                quill.insertEmbed(lineStart, 'divider', true, 'user');
                quill.insertText(lineStart + 1, '\n', 'user');
                quill.setSelection(lineStart + 2, 0);
                return false;
            }
            return true;
        }
    );

    // Empty note formatting reset logic
    const handleEmptyUI = () => {
        if (quill.getLength() <= 1) {
            quill.setSelection(0, 0);
            quill.formatLine(0, 1, 'header', false);
            quill.formatLine(0, 1, 'list', false);
            quill.formatLine(0, 1, 'code-block', false);
            quill.formatLine(0, 1, 'blockquote', false);
            quill.format('bold', false);
            quill.format('italic', false);
            quill.format('code', false);
            return false;
        }
        return true;
    };
    quill.keyboard.addBinding({ key: 8 } as any, handleEmptyUI);
    quill.keyboard.addBinding({ key: 46 } as any, handleEmptyUI);

    const handleSelectionChange = (range: any) => {
        if (range && range.length > 0 && quill.getLength() === 1) {
             quill.setSelection(0, 0);
        }
    };
    quill.on('selection-change', handleSelectionChange);

    return () => { 
        quill.root.removeEventListener('keydown', handleKeyDownCapture, true);
        quill.root.removeEventListener('paste', handlePaste); 
        quill.off('selection-change', handleSelectionChange);
    };
  }, []);

  // 3. Helper Functions
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const updateLocalStorage = (newSlug?: string | null) => {
    const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
    const now = Date.now();
    const finalSlug = newSlug === null ? undefined : (newSlug || cloudSlug);

    if (id) {
      const updatedNotes = notes.map(note => 
        note.id === id ? { ...note, title, content, updatedAt: now, cloudSlug: finalSlug } : note
      );
      localStorage.setItem('notes', JSON.stringify(updatedNotes));
      return updatedNotes.find(n => n.id === id);
    } else {
      const newNote: Note = {
        id: `note-${now}`,
        title,
        content,
        createdAt: now,
        updatedAt: now,
        cloudSlug: finalSlug
      };
      localStorage.setItem('notes', JSON.stringify([...notes, newNote]));
      return newNote;
    }
  };

  const isEditorEmpty = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return true;
    const text = editor.getText().trim();
    if (text.length > 0) return false;
    const contents = editor.getContents();
    return !contents.ops?.some((op: any) => typeof op.insert === 'object');
  };

  const isTitleDuplicate = (candidateTitle: string) => {
    const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
    const normalized = candidateTitle.trim().toLowerCase();
    return notes.some(n => n.title.trim().toLowerCase() === normalized && n.id !== id);
  };

  // 4. Action Handlers
  const handleSave = () => {
    if (!title.trim()) { showNotification('Please enter a title before saving.'); return; }
    if (isTitleDuplicate(title)) { showNotification('A note with this name already exists.'); return; }
    if (isEditorEmpty()) { showNotification('Note is empty. Please add content.'); return; }
    const savedNote = updateLocalStorage();
    if (!id && savedNote) navigate(`/edit/${savedNote.id}`);
    showNotification('Saved');
  };

  const handleDelete = async () => {
    if (!id) {
        if ((title || content) && !window.confirm("Discard unsaved changes?")) return;
        navigate('/');
        return;
    }
    if (!window.confirm(cloudSlug ? 'This note is public. Delete it and break the link?' : 'Delete this note?')) return;

    if (cloudSlug && isFirebaseConfigured()) {
        try { await deleteNoteFromCloud(cloudSlug); } 
        catch (_) { if (!window.confirm("Could not remove public link. Delete local copy anyway?")) return; }
    }

    const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
    localStorage.setItem('notes', JSON.stringify(notes.filter(note => note.id !== id)));
    navigate('/');
  };

  const handleShare = async () => {
    if (!isFirebaseConfigured()) { alert("Sharing requires database configuration."); return; }
    if (!title.trim() || isTitleDuplicate(title) || isEditorEmpty()) {
        showNotification(!title.trim() ? 'Title required' : isTitleDuplicate(title) ? 'Name exists' : 'Note empty');
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

  const handleStopSharing = async () => {
    if (!cloudSlug || !window.confirm("Stop sharing?")) return;
    setIsPublishing(true);
    try {
        await deleteNoteFromCloud(cloudSlug);
        setCloudSlug(undefined);
        updateLocalStorage(null);
        showNotification("Unshared");
    } catch (err) {
        if(window.confirm("Cloud error. Unlink locally?")) {
            setCloudSlug(undefined);
            updateLocalStorage(null);
        }
    } finally { setIsPublishing(false); }
  };

  const handleDownloadMarkdown = () => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    turndown.addRule('quillCodeBlock', {
        filter: (n: any) => n.nodeName === 'PRE' && n.classList.contains('ql-syntax'),
        replacement: (c: any, n: any) => '\n```\n' + n.textContent + '\n```\n'
    });
    const markdown = turndown.turndown(quill.root.innerHTML);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (title.trim() || 'Untitled') + '.md';
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Downloaded');
  };

  const modules = useMemo(() => ({
    syntax: { highlight: (text: string) => hljs.highlightAuto(text).value },
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'blockquote', 'code-block'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'], ['clean']
    ],
  }), []);

  const handleEditorChange = (newContent: string, delta: any, source: string, editor: any) => {
    setContent(newContent);
    if (source === 'user' && editor.getText().length <= 1 && delta.ops?.some((op: any) => op.delete)) {
        const quill = quillRef.current?.getEditor();
        if (quill) {
            quill.formatLine(0, 1, 'header', false);
            quill.formatLine(0, 1, 'code-block', false);
            quill.formatLine(0, 1, 'list', false);
            quill.formatLine(0, 1, 'blockquote', false);
        }
    }
  };

  return (
    <div className="flex flex-col h-full mt-4 max-w-4xl mx-auto w-full">
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium tracking-wide py-2 px-6 rounded-md shadow-lg z-50">
          {notification}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto flex-grow">
             <button onClick={() => navigate('/')} className="group text-gray-400 hover:text-zero-text transition-colors">
                <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Note"
              className="text-3xl font-semibold tracking-tight bg-transparent border-none focus:ring-0 p-0 w-full text-zero-text dark:text-zero-darkText focus:outline-none"
            />
        </div>
        
        <div className="flex items-center gap-1">
            <button onClick={handleShare} disabled={isPublishing} className={`p-2 rounded-md ${cloudSlug ? 'text-zero-accent bg-gray-100 dark:bg-neutral-800' : 'text-gray-400 hover:text-zero-text'}`} title="Share">
                <ShareIcon className="h-4 w-4" />
            </button>
            {cloudSlug && (
                 <button onClick={handleStopSharing} className="p-2 text-gray-300 hover:text-red-600 rounded-md" title="Unpublish">
                    <TrashIcon className="h-4 w-4" />
                 </button>
            )}
            <button onClick={handleDownloadMarkdown} className="p-2 text-gray-400 hover:text-zero-text rounded-md" title="Download">
              <DownloadIcon className="h-4 w-4" />
            </button>
            <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-600 rounded-md" title="Delete">
                <TrashIcon className="h-4 w-4" />
            </button>
            <button onClick={handleSave} className="ml-4 bg-zero-accent dark:bg-zero-darkAccent text-white dark:text-black font-medium text-xs uppercase tracking-widest py-2 px-5 rounded-md hover:opacity-90 transition-all shadow-sm">
              Save
            </button>
        </div>
      </div>

      <div className="flex-grow">
        <ReactQuill ref={quillRef} theme="snow" value={content} onChange={handleEditorChange} modules={modules} placeholder="Start writing..." className="h-full" />
      </div>
    </div>
  );
};

export default EditorPage;