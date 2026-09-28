import React, { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "../../lib/utils";

export interface OverflowItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  /** Masque l'entrée (ex. affichée seulement sur mobile). */
  hidden?: boolean;
  disabled?: boolean;
}

/** Menu « ⋮ » qui regroupe les actions secondaires de l'en-tête. */
export default function OverflowMenu({ items }: { items: OverflowItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = items.filter((i) => !i.hidden);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Plus d'actions"
        className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 md:p-2.5 rounded-lg transition-colors"
      >
        <MoreVertical size={20} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-150">
          {visible.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60",
                item.disabled && "opacity-40 pointer-events-none"
              )}
            >
              {item.icon && <span className="text-slate-400 shrink-0">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
