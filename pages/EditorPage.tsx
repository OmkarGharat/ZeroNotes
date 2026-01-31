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
import { ArrowLeftIcon, DownloadIcon, ShareIcon, SparklesIcon, TrashIcon } from '../components/Icons';

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
  
  // Load note data
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

  // Handle Markdown Paste
  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const marked = new Marked({ gfm: true, breaks: true } as any);
    marked.use({
        renderer: {
            code(code, language) {
                const cleanCode = code.replace(/\n\s*\n/g, '\n');
                const escapedCode = cleanCode
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
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

      const isMarkdown = 
        /^#{1,6}\s/m.test(text) ||
        /^```/m.test(text) ||
        /(\*\*|__)(.*?)\1/.test(text) ||
        /^(\*|-|\d+\.)\s/m.test(text) ||
        /^>\s/m.test(text) ||
        /`[^`]+`/.test(text);

      if (isMarkdown) {
        e.preventDefault();
        try {
            const html = marked.parse(text) as string;
            const range = quill.getSelection(true);
            if (range) {
                quill.clipboard.dangerouslyPasteHTML(range.index, html, 'user');
            }
        } catch (error) {
            console.error('Failed to parse markdown on paste:', error);
            const range = quill.getSelection(true);
             if (range) quill.insertText(range.index, text, 'user');
        }
      }
    };

    // List Auto-formatting Bindings
    // We add these imperatively to ensure they are registered correctly on the instance
    
    // Unified Markdown shortcuts handler (Space trigger)
    quill.keyboard.addBinding(
        { key: 32, collapsed: true, format: { 'code-block': false } } as any,
        function(range: any, context: any) {
            const [line, offset] = quill.getLine(range.index);
            // Use getText to get the clean content from the start of the line to the cursor
            // This avoids issues with hidden DOM characters on the first line
            const lineStart = range.index - offset;
            const textToCursor = quill.getText(lineStart, offset);

            // --- Block Format Triggers (Start of Line) ---
            
            // 1. Bullet List (* or -)
            if (textToCursor === '*' || textToCursor === '-') {
                quill.deleteText(range.index - 1, 1);
                quill.formatLine(range.index - 1, 1, 'list', 'bullet');
                return false;
            }

            // 2. Ordered List (1.)
            if (textToCursor === '1.') {
                quill.deleteText(range.index - 2, 2);
                quill.formatLine(range.index - 2, 1, 'list', 'ordered');
                return false;
            }

            // 3. Blockquote (>)
            if (textToCursor === '>') {
                 quill.deleteText(range.index - 1, 1);
                 quill.formatLine(range.index - 1, 1, 'blockquote', true);
                 return false;
            }

            // 4. Headers (#, ##, ###)
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

            // 5. Code Block (```)
            if (textToCursor === '```') {
                quill.deleteText(range.index - 3, 3);
                quill.formatLine(range.index - 3, 1, 'code-block', true);
                return false;
            }
            
            // --- Inline Format Triggers ---

            // 6. Bold (**text**)
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

            // 7. Italic (*text*)
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

            // 8. Inline Code (`code`)
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

            // 9. Image (![alt](url))
            // Only simple match: ![alt](url) 
            const imageMatch = textToCursor.match(/!\[([^\]]*)\]\(([^)]+)\)$/);
            if (imageMatch) {
                const matchLength = imageMatch[0].length;
                const url = imageMatch[2];
                const startIndex = range.index - matchLength;
                
                quill.deleteText(startIndex, matchLength);
                quill.insertEmbed(startIndex, 'image', url, 'user');
                // Move cursor after image
                quill.setSelection(startIndex + 1, 0);
                return false;
            }

            // 10. Link ([title](url))
            const linkMatch = textToCursor.match(/\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                 const matchLength = linkMatch[0].length;
                 const text = linkMatch[1];
                 const url = linkMatch[2];
                 const startIndex = range.index - matchLength;

                 quill.deleteText(startIndex, matchLength);
                 quill.insertText(startIndex, text, 'user');
                 quill.formatText(startIndex, text.length, 'link', url);
                 quill.insertText(startIndex + text.length, ' ', 'user');
                 quill.setSelection(startIndex + text.length + 1, 0);
                 quill.format('link', false);
                 return false;
            }

            return true;
        }
    );

    // 4. Divider with '---' + Enter
    quill.keyboard.addBinding(
        { key: 13, collapsed: true, prefix: /^---$/ } as any,
        function(range: any, context: any) {
            const [line] = quill.getLine(range.index);
            if (line.domNode.textContent.trim() === '---') {
                quill.deleteText(range.index - 3, 3);
                quill.insertEmbed(range.index - 3, 'divider', true, 'user');
                quill.insertText(range.index - 3 + 1, '\n', 'user');
                quill.setSelection(range.index - 3 + 2, 0);
                return false;
            }
            return true;
        }
    );

    // Fix for selection stuck on empty note (Backspace)
    quill.keyboard.addBinding(
        { key: 8 } as any, // Backspace
        function(range: any, context: any) {
            if (quill.getLength() <= 1 && range.length >= 0) {
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
        }
    );

    // Fix for selection stuck on empty note (Delete)
    quill.keyboard.addBinding(
        { key: 46 } as any, // Delete
        function(range: any, context: any) {
            if (quill.getLength() <= 1 && range.length >= 0) {
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
        }
    );

    // Prevent identifying selection of the trailing newline in empty doc
    const handleSelectionChange = (range: any) => {
        if (range && range.length > 0 && quill.getLength() === 1) {
             quill.setSelection(0, 0);
        }
    };
    quill.on('selection-change', handleSelectionChange);

    quill.root.addEventListener('paste', handlePaste);
    return () => { 
        quill.root.removeEventListener('paste', handlePaste); 
        quill.off('selection-change', handleSelectionChange);
    };
  }, []);

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
    const hasEmbed = contents.ops?.some((op: any) => typeof op.insert === 'object');
    return !hasEmbed;
  };

  const isTitleDuplicate = (candidateTitle: string) => {
    const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
    const normalized = candidateTitle.trim().toLowerCase();
    return notes.some(n => n.title.trim().toLowerCase() === normalized && n.id !== id);
  };

  const handleSave = () => {
    if (!title.trim()) {
        showNotification('Please enter a title before saving.');
        return;
    }
    if (isTitleDuplicate(title)) {
        showNotification('A note with this name already exists.');
        return;
    }
    if (isEditorEmpty()) {
        showNotification('Note is empty. Please add content.');
        return;
    }

    const savedNote = updateLocalStorage();
    if (!id && savedNote) {
        navigate(`/edit/${savedNote.id}`);
    }
    showNotification('Saved');
  };

  const handleDelete = async () => {
    if (!id) {
        if ((title || content) && !window.confirm("Discard unsaved changes?")) return;
        navigate('/');
        return;
    }
    let confirmMessage = 'Delete this note?';
    if (cloudSlug) confirmMessage = 'This note is public. Delete it and break the link?';
    if (!window.confirm(confirmMessage)) return;

    if (cloudSlug && isFirebaseConfigured()) {
        setIsPublishing(true);
        try {
             await deleteNoteFromCloud(cloudSlug);
        } catch (error) {
            console.error(error);
            const forceDelete = window.confirm("Could not remove public link. Delete local copy anyway?");
            if (!forceDelete) {
                setIsPublishing(false);
                return;
            }
        }
    }

    const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
    const updatedNotes = notes.filter(note => note.id !== id);
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    navigate('/');
  };

  const handleShare = async () => {
    if (!isFirebaseConfigured()) {
        alert("Sharing requires database configuration.");
        return;
    }
    if (!title.trim()) {
        showNotification('Please enter a title before sharing.');
        return;
    }
    if (isTitleDuplicate(title)) {
        showNotification('A note with this name already exists.');
        return;
    }
    if (isEditorEmpty()) {
        showNotification('Cannot share empty note.');
        return;
    }

    setIsPublishing(true);
    try {
        const slug = await publishNoteToCloud(title, content, cloudSlug);
        setCloudSlug(slug);
        const savedNote = updateLocalStorage(slug);
        
        if (!id && savedNote) navigate(`/edit/${savedNote.id}`);

        const shareUrl = `${window.location.href.split('#')[0]}#/${slug}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification('Link copied to clipboard');
        });
    } catch (error) {
        console.error(error);
        showNotification('Error sharing note');
    } finally {
        setIsPublishing(false);
    }
  };

  const handleStopSharing = async () => {
    if (!cloudSlug) return;
    if (!window.confirm("Stop sharing? The link will stop working.")) return;

    setIsPublishing(true);
    try {
        await deleteNoteFromCloud(cloudSlug);
        setCloudSlug(undefined);
        updateLocalStorage(null);
        showNotification("Unshared");
    } catch (error) {
        console.error(error);
        if(window.confirm("Cloud error. Force unlink locally?")) {
             setCloudSlug(undefined);
             updateLocalStorage(null);
        }
    } finally {
        setIsPublishing(false);
    }
  };

  const handleDownloadMarkdown = () => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const turndownService = new TurndownService({ 
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
    });
    
    turndownService.addRule('quillCodeBlock', {
        filter: (node) => node.nodeName === 'PRE' && node.classList.contains('ql-syntax'),
        replacement: (content, node) => '\n```\n' + node.textContent + '\n```\n'
    });

    const markdown = turndownService.turndown(quill.root.innerHTML);
    const filename = (title.trim() || 'Untitled') + '.md';
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Downloaded Markdown');
  };



  const modules = useMemo(() => ({
    syntax: {
      highlight: (text: string) => hljs.highlightAuto(text).value,
    },
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'blockquote', 'code-block'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['clean']
    ],

  }), []);

  const handleEditorChange = (newContent: string, delta: any, source: string, editor: any) => {
    setContent(newContent);
    
    // Check if the change was a deletion (delta.ops contains a 'delete' op)
    const isDelete = delta.ops && delta.ops.some((op: any) => op.delete);

    // Only reset formatting if the user CLEARED the editor via deletion (e.g. Backspace/Delete)
    // We must NOT reset if the user simply clicked a toolbar button (which changes format but doesn't delete)
    if (source === 'user' && editor.getText().length <= 1 && isDelete) {
        // Use the ref to get the full Quill instance which allows imperative formatting
        const quillInstance = quillRef.current?.getEditor();
        if (quillInstance) {
            quillInstance.formatLine(0, 1, 'header', false);
            quillInstance.formatLine(0, 1, 'code-block', false);
            quillInstance.formatLine(0, 1, 'list', false);
            quillInstance.formatLine(0, 1, 'blockquote', false);
        }
    }
  };

  return (
    <div className="flex flex-col h-full mt-4 max-w-4xl mx-auto w-full">
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium tracking-wide py-2 px-6 rounded-md shadow-lg z-50 animate-fade-in-out">
          {notification}
        </div>
      )}
      
      {/* Zero Toolbar Area */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        
        <div className="flex items-center gap-4 w-full md:w-auto flex-grow">
             <button 
                onClick={() => navigate('/')}
                className="group text-gray-400 hover:text-zero-text dark:hover:text-zero-darkText transition-colors"
                aria-label="Back"
            >
                <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Note"
              className="text-3xl font-semibold tracking-tight bg-transparent border-none focus:ring-0 p-0 w-full flex-grow text-zero-text dark:text-zero-darkText placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none"
            />
        </div>
        
        {/* Actions - Monochrome, Sharp, Minimal */}
        <div className="flex items-center gap-1">


            <button 
                onClick={handleShare} 
                disabled={isPublishing}
                className={`p-2 rounded-md transition-all duration-300 ${
                    cloudSlug 
                    ? 'text-zero-accent dark:text-white bg-gray-100 dark:bg-neutral-800' 
                    : 'text-gray-400 hover:text-zero-text dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-900'
                }`}
                title={cloudSlug ? "Update link" : "Share"}
            >
                <ShareIcon className="h-4 w-4" />
            </button>
            
            {cloudSlug && (
                 <button 
                    onClick={handleStopSharing}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-300 hover:text-red-600 rounded-md transition-colors"
                    title="Unpublish"
                 >
                    <TrashIcon className="h-4 w-4" />
                 </button>
            )}

            <button 
              onClick={handleDownloadMarkdown} 
              className="p-2 text-gray-400 hover:text-zero-text dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 rounded-md transition-colors"
              title="Download Markdown"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
            
            <button 
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-colors"
                title="Delete"
            >
                <TrashIcon className="h-4 w-4" />
            </button>

            <button 
              onClick={handleSave} 
              className="ml-4 bg-zero-accent dark:bg-zero-darkAccent text-white dark:text-black font-medium text-xs uppercase tracking-widest py-2 px-5 rounded-md hover:opacity-90 transition-all duration-300 shadow-sm"
            >
              Save
            </button>
        </div>
      </div>

      <div className="flex-grow">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={handleEditorChange}
          modules={modules}
          placeholder="Start writing..."
          className="h-full"
        />
      </div>


    </div>
  );
};

export default EditorPage;