
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
  const snippet = textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      onDelete(note.id);
    }
  };

  return (
    <Link to={`/edit/${note.id}`} className="block group">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-6 flex flex-col h-full">
        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              {note.title || 'Untitled Note'}
            </h3>
            <button
              onClick={handleDelete}
              className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded-full opacity-0 group-hover:opacity-100"
              aria-label="Delete note"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            {snippet || 'No content yet...'}
          </p>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-auto">
          Last updated: {new Date(note.updatedAt).toLocaleString()}
        </p>
      </div>
    </Link>
  );
};

export default NoteCard;
