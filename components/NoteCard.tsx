
import React from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../types';
import { TrashIcon, ShareIcon } from './Icons';

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
      <div className="bg-transparent rounded-lg border border-gray-200 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-500 transition-colors duration-200 p-6 flex flex-col h-56 relative">
        
        <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-medium text-openai-text dark:text-white line-clamp-1 pr-8">
              {note.title || 'Untitled'}
            </h3>
            
            {/* Delete button appears on hover, extremely subtle */}
            <button
              onClick={handleDelete}
              className="text-gray-300 hover:text-red-500 transition-colors absolute right-5 top-6 opacity-0 group-hover:opacity-100"
              aria-label="Delete note"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
        </div>

        <div className="flex-grow">
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-4 font-normal">
            {snippet || <span className="opacity-40">Empty note</span>}
          </p>
        </div>
        
        <div className="mt-auto pt-4 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-600 font-normal">
            {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          
          {note.cloudSlug && (
             <span className="text-openai-accent flex items-center gap-1.5 text-xs font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-openai-accent"></div>
                Public
             </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default NoteCard;
