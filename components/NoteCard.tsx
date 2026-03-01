import React from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../types';
import { Trash2, Pin } from 'lucide-react';

export type ViewMode = 'grid' | 'list';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  isPinLimitReached: boolean;
  viewMode?: ViewMode;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete, onTogglePin, isPinLimitReached, viewMode = 'grid' }) => {
  // Create a temporary element to parse the HTML content and extract text
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = note.content;
  
  // Remove style and script tags to avoid them showing up in textContent
  const styles = tempDiv.getElementsByTagName('style');
  while(styles[0]) styles[0].parentNode?.removeChild(styles[0]);
  const scripts = tempDiv.getElementsByTagName('script');
  while(scripts[0]) scripts[0].parentNode?.removeChild(scripts[0]);

  // Add spacing between block-level elements before extracting text
  const blockElements = tempDiv.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, li, affine-paragraph');
  blockElements.forEach((el, index) => {
    if (index > 0 && el.textContent && el.textContent.trim()) {
      const separator = document.createTextNode(' ');
      el.parentNode?.insertBefore(separator, el);
    }
  });

  let textContent = tempDiv.innerText || tempDiv.textContent || '';
  textContent = textContent
    .replace(/\[object\s+Object\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const snippetLength = viewMode === 'list' ? 80 : 140;
  const snippet = textContent.substring(0, snippetLength) + (textContent.length > snippetLength ? '...' : '');

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(note.id);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!note.pinned && isPinLimitReached) return;
    onTogglePin(note.id);
  };

  const canPin = note.pinned || !isPinLimitReached;

  const dateStr = new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  // ─── List View ─────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <Link to={`/edit/${note.id}`} className="block group">
        <div className={`flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-neutral-800/60 relative border-b border-gray-300 dark:border-neutral-800 ${note.pinned ? 'bg-zero-accent/5 dark:bg-zero-darkAccent/5' : ''}`}>
          
          {/* Pin indicator */}
          {note.pinned && (
            <Pin className="h-3 w-3 text-zero-accent dark:text-zero-darkAccent fill-current rotate-45 flex-shrink-0" />
          )}

          {/* Title */}
          <h3 className="text-sm font-medium text-zero-text dark:text-zero-darkText truncate min-w-[140px] max-w-[240px] flex-shrink-0">
            {note.title || 'Untitled'}
          </h3>

          {/* Snippet */}
          <p className="text-xs text-zero-secondaryText dark:text-zero-darkSecondaryText truncate flex-grow">
            {snippet || <span className="opacity-40 italic">No content</span>}
          </p>

          {/* Date + actions */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
            {note.cloudSlug && (
              <span className="text-[9px] uppercase tracking-widest text-zero-secondaryText dark:text-zero-darkSecondaryText font-medium mr-2">
                Public
              </span>
            )}
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mr-1 group-hover:opacity-0 transition-opacity">
              {dateStr}
            </span>
            
            {/* Hover actions */}
            <div className="absolute right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleTogglePin}
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 ${
                  note.pinned
                    ? 'text-zero-accent dark:text-zero-darkAccent hover:bg-gray-100 dark:hover:bg-neutral-700'
                    : canPin 
                      ? 'text-neutral-400 hover:text-zero-accent dark:hover:text-zero-darkAccent hover:bg-gray-100 dark:hover:bg-neutral-700'
                      : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                }`}
                title={!canPin ? 'Maximum 4 notes can be pinned' : note.pinned ? 'Unpin' : 'Pin to top'}
              >
                <Pin className={`h-3.5 w-3.5 stroke-[1.5] ${note.pinned ? 'fill-current' : ''} rotate-45`} />
              </button>
              <button
                onClick={handleDelete}
                className="w-7 h-7 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-red-500 transition-all duration-200"
                aria-label="Delete note"
              >
                <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ─── Grid View (default) ───────────────────────────
  return (
    <Link to={`/edit/${note.id}`} className="block group">
      <div className={`bg-zero-surface dark:bg-zero-darkSurface rounded-xl shadow-[0px_2px_8px_0px_rgba(99,99,99,0.2)] hover:shadow-[0px_4px_16px_0px_rgba(99,99,99,0.2)] border transition-all duration-300 p-6 flex flex-col h-48 relative overflow-hidden hover:-translate-y-1 ${note.pinned ? 'border-zero-accent/30 dark:border-zero-darkAccent/30' : 'border-transparent dark:border-neutral-800'}`}>
        
        {/* Pin badge */}
        {note.pinned && (
          <div className="absolute top-2 left-2 z-10">
            <Pin className="h-3.5 w-3.5 text-zero-accent dark:text-zero-darkAccent fill-current rotate-45" />
          </div>
        )}

        <div className="flex justify-between items-start mb-3">
            <h3 className={`text-lg font-semibold tracking-tight text-zero-text dark:text-zero-darkText line-clamp-1 ${note.pinned ? 'pl-4' : ''} pr-16`}>
              {note.title || 'Untitled'}
            </h3>
            
            <div className="absolute right-4 top-4 flex items-center gap-1">
              <button
                onClick={handleTogglePin}
                className={`opacity-0 group-hover:opacity-100 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${
                  note.pinned
                    ? 'text-zero-accent dark:text-zero-darkAccent hover:bg-gray-100 dark:hover:bg-neutral-800'
                    : canPin 
                      ? 'text-neutral-400 hover:text-zero-accent dark:hover:text-zero-darkAccent hover:bg-gray-100 dark:hover:bg-neutral-800'
                      : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                }`}
                aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                title={!canPin ? 'Maximum 4 notes can be pinned' : note.pinned ? 'Unpin' : 'Pin to top'}
              >
                <Pin className={`h-4 w-4 stroke-[1.5] ${note.pinned ? 'fill-current' : ''} rotate-45`} />
              </button>
              
              <button
                onClick={handleDelete}
                className="opacity-0 group-hover:opacity-100 z-10 w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-red-500 transition-all duration-200"
                aria-label="Delete note"
              >
                <Trash2 className="h-4 w-4 stroke-[1.5]" />
              </button>
            </div>
        </div>

        <div className="flex-grow">
          <p className="text-zero-secondaryText dark:text-zero-darkSecondaryText text-sm leading-relaxed line-clamp-3 font-normal">
            {snippet || <span className="opacity-40 italic">No content</span>}
          </p>
        </div>
        
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-100 dark:border-neutral-800">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
            {dateStr}
          </span>
          
          {note.cloudSlug && (
             <span className="text-[10px] uppercase tracking-widest text-zero-text dark:text-zero-darkText font-medium opacity-60">
                Public
             </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default NoteCard;