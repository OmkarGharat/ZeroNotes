
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import TurndownService from 'turndown';
// CSS is loaded in index.html to avoid ESM import errors
// highlight.js is now loaded via script tag in index.html to satisfy Quill's global requirement

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
    if (!editor) return true; // Safety check
    
    // Check for text content (ignoring whitespace)
    const text = editor.getText().trim();
    if (text.length > 0) return false;
    
    // Check for embeds (images, dividers, etc.)
    // editor.getContents().ops is an array of operations.
    // Embeds are represented by an insert operation where the value is an object.
    const contents = editor.getContents();
    const hasEmbed = contents.ops?.some((op: any) => typeof op.insert === 'object');
    
    return !hasEmbed;
  };

  const isTitleDuplicate = (candidateTitle: string) => {
    const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
    const normalized = candidateTitle.trim().toLowerCase();
    // Check if any other note has the same title (case-insensitive)
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
    
    // Custom rule for Quill code blocks to handle them gracefully
    turndownService.addRule('quillCodeBlock', {
        filter: (node) => {
            // Quill uses <pre class="ql-syntax"> for code blocks
            return node.nodeName === 'PRE' && node.classList.contains('ql-syntax');
        },
        replacement: (content, node) => {
            // Use textContent to strip out highlight.js syntax spans if present
            return '\n```\n' + node.textContent + '\n```\n';
        }
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

  // Memoize modules to prevent re-rendering loops in Quill
  const modules = useMemo(() => ({
    syntax: true, // Enable syntax highlighting module
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'blockquote', 'code-block'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['clean']
    ],
    keyboard: {
      bindings: {
        // Auto-format "---" to horizontal rule
        divider: {
          key: 13, // Enter
          collapsed: true,
          prefix: /^---$/,
          handler: function(this: any, range: any, context: any) {
             const quill = this.quill;
             const [line, offset] = quill.getLine(range.index);
             
             // Check if the line is exactly "---" and we are at the end of it
             if (line.domNode.textContent.trim() === '---' && offset === 3) {
                 // Delete the "---" text
                 quill.deleteText(range.index - 3, 3);
                 
                 // Insert the divider embed
                 quill.insertEmbed(range.index - 3, 'divider', true, 'user');
                 
                 // Insert a newline after the divider so the user can type below it
                 // We add +1 because the embed takes length 1
                 quill.insertText(range.index - 3 + 1, '\n', 'user');
                 
                 // Move cursor to the new line
                 quill.setSelection(range.index - 3 + 2, 0);
                 
                 // Prevent default Enter behavior
                 return false;
             }
             return true;
          }
        }
      }
    }
  }), []);

  return (
    <div className="flex flex-col h-full mt-4 max-w-3xl mx-auto w-full">
      {notification && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm py-2 px-6 rounded-full shadow-lg z-50 animate-fade-in-out">
          {notification}
        </div>
      )}
      
      {/* Zen Toolbar Area */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        
        <div className="flex items-center gap-2 w-full md:w-auto flex-grow">
             <button 
                onClick={() => navigate('/')}
                className="group p-2 -ml-2 text-gray-400 hover:text-openai-text dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                aria-label="Back"
            >
                <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title"
              className="text-4xl font-medium bg-transparent border-none focus:ring-0 p-0 w-full flex-grow text-openai-text dark:text-white placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none"
            />
        </div>
        
        {/* Actions - Minimal Icons */}
        <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setIsAiModalOpen(true)} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors text-openai-text dark:text-white"
              title="AI Assist"
            >
                <SparklesIcon className="h-5 w-5" />
            </button>
            
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>

            <button 
                onClick={handleShare} 
                disabled={isPublishing}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    cloudSlug 
                    ? 'text-openai-accent bg-green-50 dark:bg-green-900/10' 
                    : 'text-openai-text dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-800'
                }`}
                title={cloudSlug ? "Update link" : "Make public"}
            >
                <ShareIcon className="h-4 w-4" />
                {cloudSlug && <span className="text-xs">Public</span>}
            </button>
            
            {cloudSlug && (
                 <button 
                    onClick={handleStopSharing}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                    title="Stop sharing"
                 >
                    <TrashIcon className="h-4 w-4" />
                 </button>
            )}

            <button 
              onClick={handleDownloadMarkdown} 
              className="p-2 text-openai-text dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
              title="Download Markdown"
            >
              <DownloadIcon className="h-5 w-5" />
            </button>
            
            <button 
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-colors"
                title="Delete"
            >
                <TrashIcon className="h-5 w-5" />
            </button>

            <button 
              onClick={handleSave} 
              className="ml-3 bg-black dark:bg-white text-white dark:text-black font-medium text-sm py-2 px-4 rounded-md hover:opacity-80 transition-opacity"
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
          onChange={setContent}
          modules={modules}
          placeholder="Start writing..."
          className="h-full"
        />
      </div>

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8 w-full max-w-lg border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-openai-text dark:text-white">
                    Ask AI
                  </h3>
                </div>
                <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Draft an email..."
                    className="w-full h-32 p-0 border-none bg-transparent focus:ring-0 text-lg resize-none placeholder-gray-300 dark:placeholder-gray-600 text-openai-text dark:text-white"
                    autoFocus
                />
                <div className="mt-8 flex justify-end gap-3">
                    <button onClick={() => setIsAiModalOpen(false)} className="text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors px-4 py-2">Cancel</button>
                    <button onClick={handleGenerateAiContent} disabled={isGenerating} className="text-sm bg-openai-accent hover:bg-openai-accentHover text-white px-5 py-2 rounded-md font-medium transition-colors">
                        {isGenerating ? 'Thinking...' : 'Generate'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;
