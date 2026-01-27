
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
                setError("Note not specified.");
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
        if (!editor) return;
        setIsDownloading(true);

        html2canvas(editor, {
            scale: 2,
            backgroundColor: '#ffffff', 
            onclone: (clonedDoc) => {
                const editorEl = clonedDoc.querySelector('.ql-editor') as HTMLElement;
                if (editorEl) editorEl.style.color = '#000';
            },
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
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
            console.error(err);
            setIsDownloading(false);
        });
    };

    if (loading) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] opacity-50">
             <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
          </div>
        );
    }

    if (error) {
        return (
            <div className="text-center mt-32">
                <p className="text-lg text-gray-500 mb-6">{error}</p>
                <Link to="/" className="text-black dark:text-white underline underline-offset-4 decoration-gray-300 hover:decoration-black">
                  Go Home
                </Link>
            </div>
        );
    }

    if (!note) return null;

    return (
        <div className="max-w-3xl mx-auto mt-12">
            <div className="flex items-center justify-between mb-12">
                <h1 className="text-4xl font-medium text-openai-text dark:text-white">{note.title || 'Untitled'}</h1>
                <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    title="Download PDF"
                >
                    <DownloadIcon className="h-5 w-5" />
                </button>
            </div>

            <div ref={contentRef} className="select-text min-h-[400px]">
                <ReactQuill
                    value={note.content}
                    readOnly={true}
                    theme="bubble"
                    className="[&_.ql-editor]:p-0 [&_.ql-editor]:text-lg [&_.ql-editor]:font-sans [&_.ql-editor]:leading-relaxed"
                />
            </div>
            
            <div className="mt-20 pt-10 border-t border-gray-100 dark:border-neutral-800 text-center">
                 <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors text-sm">
                    <span className="font-medium">Powered by ShareNote</span>
                 </Link>
            </div>
        </div>
    );
};

export default SharePage;
    