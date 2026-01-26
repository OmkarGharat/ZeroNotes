
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactQuill from 'react-quill';
// CSS is loaded in index.html
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { fetchNoteFromCloud } from '../services/firebaseService';
import { DownloadIcon, LogoIcon } from '../components/Icons';

interface SharedNote {
    title: string;
    content: string;
}

const SharePage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    
    const [note, setNote] = useState<SharedNote | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadNote = async () => {
            if (!slug) {
                setError("No note specified.");
                setLoading(false);
                return;
            }

            const data = await fetchNoteFromCloud(slug);
            if (data) {
                setNote(data);
            } else {
                setError("Note not found.");
            }
            setLoading(false);
        };

        loadNote();
    }, [slug]);

    const handleDownloadPdf = () => {
        if (!note || !contentRef.current) return;
        
        const editor = contentRef.current.querySelector('.ql-editor') as HTMLElement;
        if (!editor) {
            return;
        }
        setIsDownloading(true);

        html2canvas(editor, {
            scale: 2,
            backgroundColor: '#ffffff', 
            onclone: (clonedDoc) => {
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

            pdf.save(`${note.title || 'shared-note'}.pdf`);
            setIsDownloading(false);
        }).catch(err => {
            console.error('PDF generation error:', err);
            setIsDownloading(false);
        });
    };

    if (loading) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
             <p className="text-slate-500">Loading note...</p>
          </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto mt-20 text-center p-10 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="inline-block p-4 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Note Unavailable</h2>
                <p className="text-slate-500 mb-8">{error}</p>
                <Link to="/" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                  Go to Home
                </Link>
            </div>
        );
    }

    if (!note) return null;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white leading-tight">{note.title || 'Untitled Note'}</h1>
                <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 disabled:bg-green-300"
                >
                    <DownloadIcon className="h-5 w-5" />
                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                </button>
            </div>

            <div ref={contentRef} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-8 select-text min-h-[400px]">
                <ReactQuill
                    value={note.content}
                    readOnly={true}
                    theme="bubble"
                    className="[&_.ql-editor]:p-0 [&_.ql-editor]:text-lg"
                />
            </div>
            
            <div className="mt-12 text-center pb-10">
                 <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-green-600 transition-colors">
                    <LogoIcon className="h-5 w-5" />
                    <span className="font-medium">Create your own note with ShareNote</span>
                 </Link>
            </div>
        </div>
    );
};

export default SharePage;
