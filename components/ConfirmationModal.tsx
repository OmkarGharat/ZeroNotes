import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-[2px] transition-opacity" 
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white dark:bg-[#121212] rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transform transition-all animate-fade-in scale-100">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2 tracking-tight">
            {title}
          </h3>
          <p className="text-[15px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="px-6 pb-6 flex items-center justify-end gap-3">
            <button 
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              className={`px-6 py-2 text-sm font-medium rounded-full shadow-sm transition-all hover:opacity-90 active:scale-95 ${
                isDestructive 
                  ? 'bg-red-600 text-white dark:bg-red-500' 
                  : 'bg-black dark:bg-white text-white dark:text-black'
              }`}
            >
              {confirmText}
            </button>
        </div>
      </div>
    </div>
  );
};
