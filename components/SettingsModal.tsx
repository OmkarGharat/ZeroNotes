import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { X, HardDrive, Github, Gitlab, Cloud } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-zero-surface dark:bg-zero-darkSurface rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-200 dark:border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <h2 className="text-lg font-semibold tracking-tight text-zero-text dark:text-zero-darkText">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-zero-text dark:hover:text-zero-darkText hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-200"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
          {/* Auto-Save Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <h3 className="text-sm font-medium text-zero-text dark:text-zero-darkText">
                Auto-Save
              </h3>
              <p className="text-xs text-zero-secondaryText dark:text-zero-darkSecondaryText mt-0.5 leading-relaxed">
                Automatically save notes as you type
              </p>
            </div>
            <button
              onClick={() => updateSettings({ autoSave: !settings.autoSave })}
              className={`relative w-11 h-6 rounded-full transition-all duration-200 focus:outline-none ring-1 ${
                settings.autoSave 
                  ? 'bg-emerald-500 dark:bg-emerald-500 ring-emerald-600 dark:ring-emerald-400' 
                  : 'bg-gray-300 dark:bg-neutral-700 ring-gray-400 dark:ring-neutral-500'
              }`}
              role="switch"
              aria-checked={settings.autoSave}
              aria-label="Toggle auto-save"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                  settings.autoSave ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-neutral-800" />

          {/* Coming Soon — Cloud Integrations */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zero-secondaryText dark:text-zero-darkSecondaryText mb-3">
              Cloud Sync — Coming Soon
            </h3>
            <div className="space-y-2.5 opacity-40 cursor-not-allowed">
              {[
                { icon: HardDrive, name: 'Google Drive' },
                { icon: Cloud, name: 'Mega' },
                { icon: Github, name: 'GitHub' },
                { icon: Gitlab, name: 'GitLab' },
              ].map(({ icon: Icon, name }) => (
                <div
                  key={name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-neutral-800/50"
                >
                  <Icon className="h-4 w-4 text-zero-secondaryText dark:text-zero-darkSecondaryText" />
                  <span className="text-sm text-zero-secondaryText dark:text-zero-darkSecondaryText">
                    {name}
                  </span>
                  <span className="ml-auto text-[10px] uppercase tracking-widest font-medium text-zero-secondaryText dark:text-zero-darkSecondaryText">
                    Soon
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
