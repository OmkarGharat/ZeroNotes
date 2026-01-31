import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import TurndownService from 'turndown';
import { Marked } from 'marked';
// CSS is loaded in index.html

import type { Note } from '../types';
import { generateText } from '../services/geminiService';
import { publishNoteToCloud, deleteNoteFromCloud, isFirebaseConfigured } from '../services/firebaseService';
import { ArrowLeftIcon, DownloadIcon, ShareIcon, SparklesIcon, TrashIcon } from '../components/Icons';

// Access Quill instance from ReactQuill
const Quill = ReactQuill.Quill;

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
  
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
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

    const marked = new Marked({ gfm: true, breaks: true });
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
      const clipboardData = e.clipboardData;
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

    quill.root.addEventListener('paste', handlePaste);
    return () => { 
        quill.root.removeEventListener('paste', handlePaste); 
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

  const handleGenerateAiContent = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
        const generatedContent = await generateText(aiPrompt);
        const quill = quillRef.current?.getEditor();
        if (quill) {
            const range = quill.getSelection(true);
            quill.insertText(range.index, `\n${generatedContent}\n`, 'user');
        }
    } catch (error) {
        console.error("AI generation failed:", error);
        showNotification('AI Error');
    } finally {
        setIsGenerating(false);
        setAiPrompt('');
        setIsAiModalOpen(false);
    }
  };

  const modules = useMemo(() => ({
    syntax: true, 
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'blockquote', 'code-block'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['clean']
    ],
    keyboard: {
      bindings: {
        // Fix for selection stuck on empty note (Backspace)
        emptyBackspace: {
            key: 8,
            handler: function(this: any, range: any, context: any) {
                const quill = this.quill;
                // If document is empty (length 1 for trailing newline) and we have a selection
                if (quill.getLength() <= 1 && range.length > 0) {
                    quill.setSelection(0);
                    // Also strip formatting to ensure clean state
                    quill.formatLine(0, 1, 'header', false);
                    quill.formatLine(0, 1, 'list', false);
                    quill.formatLine(0, 1, 'code-block', false);
                    quill.formatLine(0, 1, 'blockquote', false);
                    return false; // Prevent default
                }
                return true; // Allow default
            }
        },
        // Fix for selection stuck on empty note (Delete)
        emptyDelete: {
            key: 46,
            handler: function(this: any, range: any, context: any) {
                const quill = this.quill;
                if (quill.getLength() <= 1 && range.length > 0) {
                    quill.setSelection(0);
                    quill.formatLine(0, 1, 'header', false);
                    quill.formatLine(0, 1, 'list', false);
                    quill.formatLine(0, 1, 'code-block', false);
                    quill.formatLine(0, 1, 'blockquote', false);
                    return false;
                }
                return true;
            }
        },
        divider: {
          key: 13,
          collapsed: true,
          prefix: /^---$/,
          handler: function(this: any, range: any, context: any) {
             const quill = this.quill;
             const [line, offset] = quill.getLine(range.index);
             if (line.domNode.textContent.trim() === '---' && offset === 3) {
                 quill.deleteText(range.index - 3, 3);
                 quill.insertEmbed(range.index - 3, 'divider', true, 'user');
                 quill.insertText(range.index - 3 + 1, '\n', 'user');
                 quill.setSelection(range.index - 3 + 2, 0);
                 return false;
             }
             return true;
          }
        }
      }
    }
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
              onClick={() => setIsAiModalOpen(true)} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors text-zero-text dark:text-zero-darkText"
              title="Ask AI"
            >
                <SparklesIcon className="h-4 w-4" />
            </button>
            
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-2"></div>

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

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl p-6 w-full max-w-lg border border-gray-100 dark:border-gray-800 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zero-secondaryText dark:text-zero-darkSecondaryText">
                    Zero Assistant
                  </h3>
                </div>
                <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe what you want to write..."
                    className="w-full h-24 p-0 border-none bg-transparent focus:ring-0 text-lg resize-none placeholder-gray-300 dark:placeholder-gray-700 text-zero-text dark:text-zero-darkText leading-relaxed"
                    autoFocus
                />
                <div className="mt-6 flex justify-between items-center">
                    <span className="text-xs text-gray-300 dark:text-gray-700">Powered by Gemini</span>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsAiModalOpen(false)} 
                            className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors px-3 py-2"
                        >
                            CANCEL
                        </button>
                        <button 
                            onClick={handleGenerateAiContent} 
                            disabled={isGenerating} 
                            className="bg-black dark:bg-white text-white dark:text-black text-xs font-medium tracking-wide px-5 py-2 rounded-md hover:opacity-90 transition-colors"
                        >
                            {isGenerating ? 'GENERATING...' : 'GENERATE'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;