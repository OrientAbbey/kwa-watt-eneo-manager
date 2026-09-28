import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "../../lib/utils";
import { useClipboard } from "../../hooks/useClipboard";

interface CopyableValueProps {
  value: string;
  /** Nom affiché dans la confirmation : « <label> copié ». */
  label: string;
  mono?: boolean;
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

/** Valeur (n° de compteur, code, référence…) avec un bouton pour la copier. */
export default function CopyableValue({ value, label, mono = true, placeholder = "Non renseigné", className, children }: CopyableValueProps) {
  const copy = useClipboard();
  const [done, setDone] = useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (await copy(value, label)) {
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    }
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 min-w-0", className)}>
      <span className={cn("truncate", mono && "font-mono", !value && "italic text-slate-400")}>{children ?? (value || placeholder)}</span>
      {value && (
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copier ${label}`}
          title={`Copier ${label}`}
          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
        >
          {done ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      )}
    </span>
  );
}
