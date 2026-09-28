import React, { useEffect } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** Tiroir latéral (menu principal sur mobile). */
export default function Drawer({ open, onClose, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="absolute left-0 top-0 bottom-0 w-[85%] max-w-xs bg-indigo-950 dark:bg-slate-950 text-white shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-left duration-200 pb-safe">
        <button onClick={onClose} aria-label="Fermer le menu" className="absolute right-3 top-3 p-2 rounded-full text-indigo-200 hover:bg-white/10 z-10">
          <X size={20} />
        </button>
        {children}
      </aside>
    </div>
  );
}
