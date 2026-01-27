
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
        alert("Sharing requires database configuration.\n\nPlease check that FIREBASE_API_KEY and other variables are set in your Vercel Environment Variables.");
        return;
    }

    if (!title && !content) {
        showNotification('Cannot share an empty note.');
        return;
    }

    setIsPublishing(true);
    try {
        const slug = await publishNoteToCloud(title || 'Untitled', content);
        
        // Save the cloud slug to the local note so we can manage it later
        const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
        const now = Date.now();
        
        if (id) {
             // Update existing note
             const updatedNotes = notes.map(note => 
                note.id === id ? { ...note, title, content, updatedAt: now, cloudSlug: slug } : note
             );
             localStorage.setItem('notes', JSON.stringify(updatedNotes));
        } else {
             // Create new note if user shared before saving
             const newNote: Note = {
                id: `note-${now}`,
                title,
                content,
                createdAt: now,
                updatedAt: now,
                cloudSlug: slug
             };
             localStorage.setItem('notes', JSON.stringify([...notes, newNote]));
             // Navigate to the edit URL of the newly created note
             navigate(`/edit/${newNote.id}`);
        }

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
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      {notification && (
        <div className="fixed top-20 right-5 bg-green-600 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-out font-medium">
          {notification}
        </div>
      )}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled Note"
          className="text-3xl font-bold bg-transparent border-none focus:ring-0 p-0 w-full md:w-auto flex-grow text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none"
        />
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button 
              onClick={() => setIsAiModalOpen(true)} 
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-all text-sm"
              title="Generate content with AI"
            >
                <SparklesIcon className="h-4 w-4" /> AI Assist
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button 
                onClick={handleShare} 
                disabled={isPublishing}
                className="p-2 text-slate-500 hover:text-green-600 transition-colors disabled:opacity-50 hover:bg-green-50 rounded-lg" 
                aria-label="Share note"
                title={isPublishing ? "Publishing..." : "Share Public Link"}
            >
                <ShareIcon className={`h-5 w-5 ${isPublishing ? 'animate-pulse text-green-500' : ''}`} />
            </button>
            <button 
              onClick={handleDownloadPdf} 
              className="p-2 text-slate-500 hover:text-green-600 transition-colors hover:bg-green-50 rounded-lg" 
              aria-label="Download PDF"
              title="Download as PDF"
            >
              <DownloadIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={handleSave} 
              className="ml-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors text-sm"
            >
              Save
            </button>
        </div>
      </div>

      <div className="flex-grow bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={setContent}
          modules={modules}
          className="flex-grow flex flex-col [&_.ql-container]:border-none [&_.ql-container]:flex-grow [&_.ql-editor]:text-lg [&_.ql-toolbar]:border-x-0 [&_.ql-toolbar]:border-t-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-toolbar]:dark:border-slate-700 [&_.ql-toolbar]:bg-slate-50 [&_.ql-toolbar]:dark:bg-slate-900"
        />
      </div>

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-lg border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                    <SparklesIcon className="h-5 w-5 text-emerald-500" />
                    Ask Gemini
                  </h3>
                </div>
                <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., Draft a meeting agenda for..."
                    className="w-full h-32 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    aria-label="AI Prompt"
                />
                <div className="mt-4 flex justify-end gap-3">
                    <button onClick={() => setIsAiModalOpen(false)} className="py-2 px-4 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors">Cancel</button>
                    <button onClick={handleGenerateAiContent} disabled={isGenerating} className="py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-emerald-300 transition-colors font-medium">
                        {isGenerating ? 'Generating...' : 'Generate Content'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;
