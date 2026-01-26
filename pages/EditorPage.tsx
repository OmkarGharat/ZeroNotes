
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
// CSS is loaded in index.html to avoid ESM import errors
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import type { Note } from '../types';
import { generateText } from '../services/geminiService';
import { publishNoteToCloud, isFirebaseConfigured } from '../services/firebaseService';
import { DownloadIcon, ShareIcon, SparklesIcon } from '../components/Icons';

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const quillRef = useRef<ReactQuill>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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
      }
    }
  }, [id]);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };
  
  const handleSave = () => {
    const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
    const now = Date.now();
    if (id) {
      const updatedNotes = notes.map(note => 
        note.id === id ? { ...note, title, content, updatedAt: now } : note
      );
      localStorage.setItem('notes', JSON.stringify(updatedNotes));
    } else {
      const newNote: Note = {
        id: `note-${now}`,
        title,
        content,
        createdAt: now,
        updatedAt: now,
      };
      localStorage.setItem('notes', JSON.stringify([...notes, newNote]));
      navigate(`/edit/${newNote.id}`);
    }
    showNotification('Note saved successfully!');
  };

  const handleShare = async () => {
    if (!isFirebaseConfigured()) {
        alert("Sharing requires database configuration.\n\nPlease set REACT_APP_FIREBASE_API_KEY and other variables in your environment.");
        return;
    }

    if (!title && !content) {
        showNotification('Cannot share an empty note.');
        return;
    }

    setIsPublishing(true);
    try {
        const slug = await publishNoteToCloud(title || 'Untitled', content);
        
        // Construct the short URL
        const baseUrl = window.location.href.split('#')[0];
        const shareUrl = `${baseUrl}#/${slug}`;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification('Public link copied to clipboard!');
        }).catch(() => {
            showNotification('Link generated but failed to copy.');
            console.log(shareUrl);
        });
    } catch (error) {
        console.error(error);
        showNotification('Failed to publish note. Check console.');
    } finally {
        setIsPublishing(false);
    }
  };

  const handleDownloadPdf = () => {
    const editor = document.querySelector('.ql-editor') as HTMLElement;
    if (!editor) return;

    showNotification('Generating PDF...');

    html2canvas(editor, {
      scale: 2,
      backgroundColor: '#ffffff', // Use a white background for PDF consistency
      onclone: (clonedDoc) => {
        // Force a black text color on the root editor element for readability on the PDF.
        const editorEl = clonedDoc.querySelector('.ql-editor') as HTMLElement;
        if (editorEl) {
          editorEl.style.color = '#000';
        }
      },
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;

      const imgWidth = pdfWidth;
      const imgHeight = imgWidth / ratio;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`${title || 'note'}.pdf`);
    });
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
        showNotification('Failed to generate AI content.');
    } finally {
        setIsGenerating(false);
        setAiPrompt('');
        setIsAiModalOpen(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image', 'code-block'],
      ['clean']
    ],
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {notification && (
        <div className="fixed top-20 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-out">
          {notification}
        </div>
      )}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title"
          className="text-3xl font-bold bg-transparent border-none focus:ring-0 w-full md:w-auto flex-grow text-slate-900 dark:text-white placeholder-slate-400"
        />
        <div className="flex items-center gap-2">
            <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-all">
                <SparklesIcon className="h-5 w-5" /> Ask Gemini
            </button>
            <button 
                onClick={handleShare} 
                disabled={isPublishing}
                className="p-2 text-slate-500 hover:text-sky-500 transition-colors disabled:opacity-50" 
                aria-label="Share note"
                title={isPublishing ? "Publishing..." : "Share Public Link"}
            >
                <ShareIcon className={`h-6 w-6 ${isPublishing ? 'animate-pulse text-sky-500' : ''}`} />
            </button>
            <button onClick={handleDownloadPdf} className="p-2 text-slate-500 hover:text-sky-500 transition-colors" aria-label="Download PDF"><DownloadIcon className="h-6 w-6" /></button>
        </div>
      </div>

      <div className="flex-grow bg-white dark:bg-slate-800 rounded-lg shadow-inner overflow-hidden min-h-[500px]">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={setContent}
          modules={modules}
          className="h-full [&_.ql-container]:border-none [&_.ql-toolbar]:border-x-0 [&_.ql-toolbar]:border-t-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-toolbar]:dark:border-slate-700"
        />
      </div>

      <div className="mt-4 flex justify-end">
          <button onClick={handleSave} className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors">
              Save Note
          </button>
      </div>

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">Generate content with Gemini</h3>
                <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., Write a poem about React..."
                    className="w-full h-32 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    aria-label="AI Prompt"
                />
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setIsAiModalOpen(false)} className="py-2 px-4 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleGenerateAiContent} disabled={isGenerating} className="py-2 px-4 rounded-lg bg-sky-500 hover:bg-sky-600 text-white disabled:bg-sky-300 transition-colors">
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;
