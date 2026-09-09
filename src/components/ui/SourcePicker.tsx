import React from 'react';
import { Camera, Image, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SourcePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (source: 'camera' | 'gallery') => void;
  title?: string;
}

export default function SourcePicker({ isOpen, onClose, onSelect, title = "Choisir une source" }: SourcePickerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
              <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-2 gap-4">
              <button 
                onClick={() => { onSelect('camera'); onClose(); }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
              >
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera size={24} />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Caméra</span>
              </button>
              
              <button 
                onClick={() => { onSelect('gallery'); onClose(); }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
              >
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Image size={24} />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Galerie</span>
              </button>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-center">
              <button onClick={onClose} className="text-sm font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest px-6 py-2">Annuler</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
