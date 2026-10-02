import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ClipboardPaste, Loader2, ScanText } from "lucide-react";
import BottomSheet from "../ui/BottomSheet";
import { ParsedSms, parseRechargeSms, parsedFieldCount, findMeterByNumber } from "../../lib/smsParser";
import { checkUnitPrice } from "../../lib/eneo";
import { MONETARY_UNIT } from "../../lib/utils";
import { recognizeText } from "../../lib/ocr";
import { useImagePicker } from "../../hooks/useImagePicker";
import { useApp } from "../../store/AppContext";
import { copyText } from "../../lib/clipboard";
import type { MeterData } from "../../types";

interface SmsImportSheetProps {
  open: boolean;
  onClose: () => void;
  /** Reçoit les champs reconnus ; le formulaire de recharge sert d'étape de vérification. */
  onParsed: (parsed: ParsedSms) => void;
}

/**
 * Import d'une recharge depuis le texte d'un SMS de confirmation — collé ou lu par OCR sur une photo/capture.
 * Le paiement a pu être fait depuis un autre téléphone (agent, proche) : aucune permission SMS n'est requise.
 */
export default function SmsImportSheet({ open, onClose, onParsed }: SmsImportSheetProps) {
  const { state, currentMeter, switchMeter, updateProfile, showToast } = useApp();
  const [text, setText] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  // Numéro de la lecture OCR en cours : si on ferme la fenêtre pendant qu'elle tourne, son résultat est ignoré (sinon il
  // aurait pollué la zone de texte à la prochaine ouverture).
  const ocrRun = useRef(0);

  useEffect(() => {
    if (!open) {
      ocrRun.current += 1;
      setText("");
      setOcrBusy(false);
      setOcrStatus("");
    }
  }, [open]);

  const parsed = useMemo(() => parseRechargeSms(text), [text]);
  const found = parsedFieldCount(parsed);

  // Le SMS concerne-t-il le compteur actif ? (garde-fou contre une mauvaise lecture OCR ou un SMS d'un autre compteur)
  const meterMatch: MeterData | undefined = findMeterByNumber<MeterData>(state.meters, parsed.meterNumber);
  const meterState: "none" | "current" | "other" | "unknown_empty" | "unknown" = !parsed.meterNumber
    ? "none"
    : meterMatch
      ? meterMatch.id === currentMeter.id ? "current" : "other"
      : currentMeter.profile.meterNumber.trim() === "" ? "unknown_empty" : "unknown";

  // Rapport montant / kWh cohérent avec la grille ? (« Dette » retenue = prix apparent plus élevé : on ne juge pas)
  const priceCheck =
    parsed.montant !== undefined && parsed.kwh !== undefined && !(parsed.dette && parsed.dette > 0)
      ? checkUnitPrice(parsed.montant, parsed.kwh, state.settings.tariffs)
      : null;

  const { openPicker, picker } = useImagePicker(
    async (image) => {
      const run = ++ocrRun.current;
      const stale = () => run !== ocrRun.current;
      setOcrBusy(true);
      setOcrStatus("Préparation de la lecture…");
      try {
        const result = await recognizeText(image, ({ status, progress }) => {
          if (stale()) return;
          const labels: Record<string, string> = {
            "loading tesseract core": "Chargement du moteur…",
            "loading language traineddata": "Téléchargement du modèle de langue (une seule fois)…",
            "initializing api": "Initialisation…",
            "recognizing text": "Lecture du texte…",
          };
          setOcrStatus(`${labels[status] ?? status} ${Math.round(progress * 100)}%`);
        });
        if (stale()) return;
        if (!result.trim()) {
          showToast("Aucun texte lu sur l'image. Essayez une capture d'écran nette ou collez le SMS.", "error");
        } else {
          setText((prev) => (prev ? `${prev}\n${result}` : result));
          showToast("Texte lu : vérifiez les valeurs reconnues");
        }
      } catch (e) {
        if (stale()) return;
        console.error("OCR failed", e);
        showToast("Lecture de l'image impossible sur cet appareil. Collez le texte du SMS à la place.", "error");
      } finally {
        if (!stale()) {
          setOcrBusy(false);
          setOcrStatus("");
        }
      }
    },
    "Photo ou capture du SMS / reçu",
    { maxSize: 1800, quality: 0.92 }
  );

  const paste = async () => {
    if (ocrBusy) return; // la lecture OCR ajoutera son texte à la fin : on ne laisse rien d'autre écrire dans la zone
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText(clip);
      else showToast("Le presse-papiers est vide", "info");
    } catch {
      showToast("Collage automatique refusé : appuyez longuement dans la zone de texte pour coller.", "info");
    }
  };

  const fmt = (n?: number) => (n !== undefined ? `${n.toLocaleString("fr-FR")} ${MONETARY_UNIT}` : undefined);
  const summary: [string, string | undefined][] = [
    ["Montant (énergie)", fmt(parsed.montant)],
    ["Énergie", parsed.kwh !== undefined ? `${parsed.kwh} kWh` : undefined],
    ["Date", parsed.date ? `${parsed.date}${parsed.dateSource === "reference" ? " (déduite de la référence)" : ""}` : undefined],
    ["Référence", parsed.transactionRef],
    ["Reçu n°", parsed.receiptNo],
    ["Compteur", parsed.meterNumber],
    ["Frais (non inclus)", fmt(parsed.fees)],
  ];

  return (
    <BottomSheet open={open} title="Recharge depuis un SMS" onClose={onClose}>
      {picker}
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Collez le SMS de confirmation (même reçu sur un autre téléphone) ou photographiez-le. Vous pourrez tout vérifier avant d'enregistrer.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={paste} disabled={ocrBusy} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-40 disabled:cursor-not-allowed">
            <ClipboardPaste size={16} /> Coller
          </button>
          <button onClick={openPicker} disabled={ocrBusy} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-50">
            <Camera size={16} /> Photo (OCR)
          </button>
        </div>

        {ocrBusy && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <Loader2 size={16} className="animate-spin shrink-0" /> <span>{ocrStatus || "Lecture en cours…"}</span>
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={ocrBusy}
          aria-busy={ocrBusy}
          rows={6}
          placeholder="Ex : Paiement de facture reussi. Montant: 5000 FCFA. ID Transaction: BP260115.1234.A12345…"
          className={`w-full text-sm p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 scrollbar-visible resize-none ${ocrBusy ? "opacity-60 cursor-wait" : ""}`}
        />

        {text.trim() && (
          <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><ScanText size={14} /> Valeurs reconnues</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {summary.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                  <dd className={v ? "font-semibold text-slate-800 dark:text-slate-100 truncate" : "text-slate-300 dark:text-slate-600"}>{v ?? "—"}</dd>
                </React.Fragment>
              ))}
            </dl>
            {meterState === "current" && (
              <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14} /> Compteur reconnu : {currentMeter.name}</p>
            )}
            {meterState === "other" && meterMatch && (
              <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-900 dark:text-amber-200">
                <p className="flex items-start gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> Ce SMS concerne le compteur « {meterMatch.name} », pas « {currentMeter.name} ».</p>
                <button onClick={() => { switchMeter(meterMatch.id); showToast(`Compteur actif : ${meterMatch.name}`, "info"); }} className="mt-2 font-semibold underline">Basculer sur « {meterMatch.name} »</button>
              </div>
            )}
            {meterState === "unknown_empty" && (
              <div className="mt-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-3 text-xs text-indigo-900 dark:text-indigo-200">
                <p>« {currentMeter.name} » n'a pas encore de numéro de compteur.</p>
                <button onClick={() => { updateProfile({ meterNumber: parsed.meterNumber! }); showToast("Numéro de compteur enregistré", "success"); }} className="mt-2 font-semibold underline">Enregistrer {parsed.meterNumber} sur ce compteur</button>
              </div>
            )}
            {meterState === "unknown" && (
              <p className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Le numéro lu ({parsed.meterNumber}) ne correspond à aucun de vos compteurs : vérifiez la lecture (chiffre mal reconnu ?) ou le compteur concerné.
              </p>
            )}
            {priceCheck && priceCheck.status !== "ok" && (
              <p className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                {priceCheck.status === "too_many_kwh"
                  ? `${Math.round(priceCheck.unitPrice)} ${MONETARY_UNIT}/kWh est plus bas que tout tarif : un chiffre en trop sur les kWh, ou en moins sur le montant ?`
                  : `${Math.round(priceCheck.unitPrice)} ${MONETARY_UNIT}/kWh est plus haut que tout tarif : un chiffre manquant sur les kWh, ou en trop sur le montant ?`}
              </p>
            )}
            {parsed.token && (
              <button
                onClick={async () => showToast((await copyText(parsed.token!)) ? "Jeton copié : saisissez-le sur le compteur" : "Copie impossible", "info")}
                className="mt-3 text-xs text-indigo-600 underline"
              >
                Copier le jeton à 20 chiffres (non enregistré dans l'application)
              </button>
            )}
            {found === 0 && !parsed.token && <p className="text-xs text-amber-600 mt-2">Rien de reconnu : vous pourrez tout saisir à la main dans l'étape suivante.</p>}
          </div>
        )}

        <button
          onClick={() => { onParsed(parsed); onClose(); }}
          disabled={ocrBusy}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {text.trim() ? "Continuer et vérifier" : "Saisir à la main"}
        </button>
      </div>
    </BottomSheet>
  );
}
