
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactQuill from 'react-quill';
// CSS is loaded in index.html
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { fetchNoteFromCloud } from '../services/firebaseService';
import { DownloadIcon } from '../components/Icons';

interface SharedNote {
    title: string;
    content: string;
}

const SharePage: React.FC = () => {
    // The slug is passed via the URL path now: domain/#/slug
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
                setError("Note not found. It may have been deleted or the link is incorrect.");
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

            pdf.save(`${note.title || 'shared-note'}.pdf`);
            setIsDownloading(false);
        }).catch(err => {
            console.error('PDF generation error:', err);
            setIsDownloading(false);
        });
    };

    if (loading) {
        return <div className="text-center p-10 text-slate-500">Loading note...</div>;
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto mt-10 text-center p-10 bg-red-50 dark:bg-slate-800 border border-red-200 dark:border-slate-700 rounded-lg">
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Note Not Found</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
                <Link to="/" className="text-sky-500 hover:underline">Go to Home</Link>
            </div>
        );
    }

    if (!note) return null;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{note.title || 'Untitled Note'}</h1>
                <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 disabled:bg-sky-300"
                >
                    <DownloadIcon className="h-5 w-5" />
                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                </button>
            </div>

            <div ref={contentRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-2 select-text">
                <ReactQuill
                    value={note.content}
                    readOnly={true}
                    theme="bubble"
                    className="[&_.ql-editor]:p-4"
                />
            </div>
            
            <div className="mt-8 text-center">
                 <Link to="/" className="text-sm text-slate-400 hover:text-sky-500">Create your own note with Gemini Notes</Link>
            </div>
        </div>
    );
};

export default SharePage;
