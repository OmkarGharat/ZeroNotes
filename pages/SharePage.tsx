import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import TurndownService from 'turndown';
// CSS is loaded in index.html

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

    const handleDownloadMarkdown = () => {
        if (!note || !contentRef.current) return;
        
        setIsDownloading(true);


        try {
            const turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced'
            });

            turndownService.addRule('quillCodeBlock', {
                filter: (node) => {
                    return node.nodeName === 'PRE' && node.classList.contains('ql-syntax');
                },
                replacement: (content, node) => {
                    return '\n```\n' + node.textContent + '\n```\n';
                }
            });

            const markdown = turndownService.turndown(note.content);
            const filename = (note.title.trim() || 'shared-note') + '.md';
            
            const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Markdown download failed:", err);
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] opacity-30">
             <div className="w-5 h-5 border-2 border-gray-300 border-t-black dark:border-t-white rounded-full animate-spin"></div>
          </div>
        );
    }

    if (error) {
        return (
            <div className="text-center mt-32">
                <p className="text-lg text-zero-secondaryText mb-6 font-light">{error}</p>
                <Link to="/" className="text-zero-text dark:text-zero-darkText text-sm font-medium border-b border-gray-300 pb-0.5 hover:border-black dark:hover:border-white transition-colors">
                  Go Home
                </Link>
            </div>
        );
    }

    if (!note) return null;

    return (
        <div className="max-w-4xl mx-auto mt-12 animate-fade-in">
            <div className="flex items-start justify-between mb-16 border-b border-zero-border dark:border-zero-darkBorder pb-8">
                <h1 className="text-4xl font-semibold tracking-tight text-zero-text dark:text-zero-darkText">{note.title || 'Untitled'}</h1>
                <button
                    onClick={handleDownloadMarkdown}
                    disabled={isDownloading}
                    className="p-2 text-gray-400 hover:text-zero-text dark:hover:text-white transition-colors rounded-md"
                    title="Download Markdown"
                >
                    <DownloadIcon className="h-5 w-5" />
                </button>
            </div>

            <div 
                ref={contentRef} 
                className="select-text min-h-[400px] prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: note.content }}
            />

            
            <div className="mt-24 py-8 border-t border-zero-border dark:border-zero-darkBorder text-center">
                 <Link to="/" className="inline-flex items-center gap-2 text-zero-secondaryText hover:text-zero-text dark:hover:text-white transition-colors text-xs uppercase tracking-widest font-medium">
                    <LogoIcon className="w-3 h-3" />
                    <span>ZeroNotes</span>
                 </Link>
            </div>
        </div>
    );
};

export default SharePage;