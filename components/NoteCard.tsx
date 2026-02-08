import React from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../types';
import { Trash2 } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete }) => {
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
      // Add a space separator before each block element (except the first)
      const separator = document.createTextNode(' ');
      el.parentNode?.insertBefore(separator, el);
    }
  });

  let textContent = tempDiv.innerText || tempDiv.textContent || '';
  
  // Aggressively strip [object Object] and other common non-text residuals
  // Also normalize multiple spaces to single space
  textContent = textContent
    .replace(/\[object\s+Object\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const snippet = textContent.substring(0, 140) + (textContent.length > 140 ? '...' : '');

  // Log for debugging
  if (note.title === 'test' || !snippet) {
      console.log(`[Snippet Debug] ID: ${note.id} Title: ${note.title}`, {
          rawContentLen: note.content?.length,
          extractedText: textContent.substring(0, 100),
          finalSnippet: snippet
      });
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(note.id);
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
              className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 z-10 w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-red-500 transition-all duration-200"
              aria-label="Delete note"
            >
              <Trash2 className="h-4 w-4 stroke-[1.5]" />
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