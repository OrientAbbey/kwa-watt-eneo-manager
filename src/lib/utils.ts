import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const MONETARY_UNIT = 'U';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function generateAvatar(name: string): string {
  const initials = (name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
  const colorIndex = Array.from(name || 'U').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">` +
    `<rect width="128" height="128" rx="24" fill="${AVATAR_COLORS[colorIndex]}"/>` +
    `<text x="64" y="50%" font-family="system-ui, sans-serif" font-size="48" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function sortByDate<T extends { date: string }>(items: readonly T[], order: 'asc' | 'desc'): T[] {
  return [...items].sort((a, b) => (order === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
}

/** Taille maximale (en caractères Base64) d'une photo conservée dans l'application. */
export const MAX_STORED_PHOTO_CHARS = 350_000;

export interface CompressAttempt {
  size: number;
  quality: number;
}

/**
 * Suite d'essais de compression, du plus fidèle au plus agressif. Pure et testée : la compression s'arrête au premier
 * résultat qui tient dans la limite, et ÉCHOUE si aucun n'y parvient (jamais de repli sur l'image d'origine).
 */
export function compressionPlan(maxSize: number, quality: number): CompressAttempt[] {
  const attempts: CompressAttempt[] = [];
  for (const scale of [1, 0.8, 0.6, 0.45, 0.3]) {
    const size = Math.max(160, Math.round(maxSize * scale));
    for (const q of [quality, Math.max(0.4, quality - 0.15), 0.4]) {
      if (!attempts.some((a) => a.size === size && a.quality === q)) attempts.push({ size, quality: q });
    }
  }
  return attempts;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });
}

/**
 * Réduit une image en JPEG. Avant : en cas d'échec (mémoire du WebView, canvas trop grand), la photo ORIGINALE — parfois
 * plusieurs Mo — était renvoyée telle quelle et saturait le stockage de l'appareil. Maintenant : on réessaie en plus
 * petit, et si rien ne tient dans `maxChars`, on lève une erreur (l'appelant prévient l'utilisateur).
 */
export async function compressImage(dataUrl: string, maxSize = 720, quality = 0.72, maxChars = MAX_STORED_PHOTO_CHARS): Promise<string> {
  const img = await loadImage(dataUrl);
  const longest = Math.max(img.width, img.height);
  const canvas = document.createElement("canvas");
  try {
    for (const { size, quality: q } of compressionPlan(maxSize, quality)) {
      const scale = Math.min(1, size / longest);
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let out = "";
      try {
        out = canvas.toDataURL("image/jpeg", q);
      } catch {
        continue; // mémoire insuffisante : on essaie plus petit
      }
      if (out.startsWith("data:image/jpeg") && out.length > 100 && out.length <= maxChars) return out;
    }
  } finally {
    canvas.width = 0; // libère la mémoire du canvas
    canvas.height = 0;
  }
  throw new Error("compress_failed");
}
