import React from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../types';
import { TrashIcon } from './Icons';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete }) => {
  // Create a temporary element to parse the HTML content and extract text
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = note.content;
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  const snippet = textContent.substring(0, 140) + (textContent.length > 140 ? '...' : '');

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    let message = 'Delete this note?';
    if (note.cloudSlug) {
        message = 'This note is public. Delete it?';
    }
    
    if (window.confirm(message)) {
      onDelete(note.id);
    }
  };

  return (
    <Link to={`/edit/${note.id}`} className="block group">
      <div className="bg-zero-surface dark:bg-zero-darkSurface rounded-xl shadow-[0px_2px_8px_0px_rgba(99,99,99,0.2)] hover:shadow-[0px_4px_16px_0px_rgba(99,99,99,0.2)] border border-transparent dark:border-neutral-800 transition-all duration-300 p-6 flex flex-col h-48 relative overflow-hidden hover:-translate-y-1">
        
        <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold tracking-tight text-zero-text dark:text-zero-darkText line-clamp-1 pr-8">
              {note.title || 'Untitled'}
            </h3>
            
            {/* Delete button appears on hover */}
            <button
              onClick={handleDelete}
              className="text-zero-secondaryText hover:text-red-500 transition-colors absolute right-4 top-4 opacity-0 group-hover:opacity-100 z-10"
              aria-label="Delete note"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
        </div>

        <div className="flex-grow">
          <p className="text-zero-secondaryText dark:text-zero-darkSecondaryText text-sm leading-relaxed line-clamp-3 font-normal">
            {snippet || <span className="opacity-40 italic">No content</span>}
          </p>
        </div>
        
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-100 dark:border-neutral-800">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
            {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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