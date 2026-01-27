
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
  const snippet = textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // We delegate the confirmation logic to the parent (HomePage) which can handle async cloud deletion checks
    // However, if we want a basic check here first:
    let message = 'Are you sure you want to delete this note?';
    if (note.cloudSlug) {
        message = 'This note is shared publicly. Deleting it will also remove the public link. Are you sure?';
    }
    
    if (window.confirm(message)) {
      onDelete(note.id);
    }
  };

  return (
    <Link to={`/edit/${note.id}`} className="block group">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-600 shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex flex-col h-full relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-1 h-full bg-transparent group-hover:bg-green-500 transition-colors"></div>

        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-1 pr-6">
              {note.title || 'Untitled Note'}
            </h3>
            <button
              onClick={handleDelete}
              className="text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 duration-200 absolute right-4 top-4 z-10"
              aria-label="Delete note"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-3 leading-relaxed">
            {snippet || <span className="italic text-slate-400">No additional text</span>}
          </p>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
          {note.cloudSlug && (
             <span className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider">
                <ShareIcon className="h-3 w-3" /> Shared
             </span>
          )}
        </p>
      </div>
    </Link>
  );
};

export default NoteCard;
