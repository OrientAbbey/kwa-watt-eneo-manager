import React, { useRef, useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { HelpCircle, Calculator, Zap, Database, Link as LinkIcon, Image as ImageIcon, Trash2, Plus, Phone, Mail, X } from 'lucide-react';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';
import SourcePicker from '../ui/SourcePicker';
import { compressImage } from '../../lib/utils';

export default function HelpView() {
  const { state, updateHelpImages } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullScreenImage, setFullScreenImage] = React.useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleImageUpload = () => {
    setIsPickerOpen(true);
  };

  const handleSourceSelect = async (source: 'camera' | 'gallery' | 'file') => {
    if (source === 'file') {
      fileInputRef.current?.click();
      return;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos
      });

      if (image && image.base64String) {
        const base64 = await compressImage(`data:image/${image.format};base64,${image.base64String}`);
        updateHelpImages([...(state.helpImages || []), base64]);
      }
    } catch (error: any) {
      if (error?.message === 'User cancelled photos app' || error?.message?.includes('cancelled')) {
        return; // simply ignore when user cancels
      }
      console.error("Error picking image", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64 = await compressImage(evt.target?.result as string);
        updateHelpImages([...(state.helpImages || []), base64]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    const updated = [...(state.helpImages || [])];
    updated.splice(index, 1);
    updateHelpImages(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-10">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      
      <SourcePicker 
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleSourceSelect}
        title="Ajouter une image d'aide"
      />
      <div className="flex items-center space-x-2 text-gray-800 dark:text-gray-100">
        <HelpCircle size={28} />
        <h2 className="text-2xl font-bold">Aide & Informations</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><LinkIcon size={20} className="mr-2 text-blue-600"/> Ressources Officielles ENEO</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-4">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <a href="https://www.eneocameroon.cm/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">Site Web Officiel ENEO Cameroun</a>
            </li>
            <li>
              <a href="https://www.eneocameroon.cm/index.php/fr/guide-prepaye-eneo" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">Guide Prépayé Eneo (PDF/Infos)</a>
            </li>
            <li>
              <a href="https://my.eneocameroon.cm/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">Portail MyENEO (Paiement & Factures)</a>
            </li>
            <li>
              <a href="https://my.eneocameroon.cm/infos-service-electrique" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">Infos Service Électrique (Coupures, etc.)</a>
            </li>
          </ul>

          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 p-4 rounded-xl mt-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Service Client ENEO</h4>
              <div className="flex flex-col gap-2">
                <a href="tel:8010" className="flex items-center text-indigo-700 dark:text-indigo-400 hover:underline">
                  <Phone size={16} className="mr-2" /> Numéro gratuit: <strong>8010</strong>
                </a>
                <a href="mailto:eneo.customercare@eneo.cm" className="flex items-center text-indigo-700 dark:text-indigo-400 hover:underline">
                  <Mail size={16} className="mr-2" /> À l'écoute de la clientèle: eneo.customercare@eneo.cm
                </a>
              </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><Zap size={20} className="mr-2 text-amber-500"/> Fonctionnalités de l'application</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-3">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Dashboard Complet :</strong> Vue rapide sur le solde d'énergie estimé, consommation actuelle, prévision des jours restants avant coupure et graphiques.</li>
            <li><strong>Historique (Consommations / Recharges) :</strong> Suivi précis de chaque mois de consommation et achats de crédits en FCFA, avec export CSV/JSON et import.</li>
            <li><strong>Calculatrice Intégrée :</strong> Estimations bidirectionnelles "Montant vers kWh" et "kWh vers Montant", avec ajustements rapides des valeurs.</li>
            <li><strong>Profil Utilisateur Complet :</strong> Enregistrement du numéro de compteur, photos de l'écran, photo recto-verso de la carte d'accès.</li>
            <li><strong>Synchronisation Cloud :</strong> Connectez-vous avec Google pour sauvegarder automatiquement toutes vos données et vos photos dans le cloud de manière sécurisée.</li>
            <li><strong>Mode Sombre :</strong> Un affichage élégant qui repose vos yeux, surtout la nuit. Appliqué automatiquement ou manuellement dans vos réglages.</li>
            <li><strong>Confidentialité avancée :</strong> Pour les visiteurs, mode 100% hors ligne garanti. Pour les membres connectés, vos données sont cryptées et inaccessibles aux tiers.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><Calculator size={20} className="mr-2 text-indigo-600"/> Comment fonctionne le calcul ?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-3">
          <p>Le calcul est basé sur la méthode <strong>ENEO Cameroun</strong> et dépend de votre consommation moyenne des 6 derniers mois.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Part Base :</strong> moins chère, mais limitée en quantité selon votre tranche.</li>
            <li><strong>Part Confort :</strong> plus chère, s'applique lorsque vous dépassez la limite de la part base.</li>
            <li><strong>TVA ({state.settings.tva}%):</strong> S'applique sur certaines tranches au-delà de 220 kWh (secteur résidentiel).</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><Zap size={20} className="mr-2 text-amber-500"/> Suivi de l'énergie</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-3">
          <p>Il y a deux types de données à enregistrer :</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Consommations mensuelles :</strong> à relever une fois par mois sur votre compteur (total en kWh consommé dans le mois). Cela permet à l'application de calculer la facturation correcte.</li>
            <li><strong>Recharges :</strong> à chaque fois que vous achetez du crédit, enregistrez le montant payé et les kWh obtenus pour tenir un suivi précis.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><Database size={20} className="mr-2 text-emerald-500"/> Import / Export et Formats de données</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-3">
          <p>Vous pouvez importer ou exporter vos historiques (recharges/consommations) en <strong>CSV</strong> ou <strong>JSON</strong> (réglable dans les paramètres). Le fichier devra toujours contenir des consommations et des recharges, ou l'un des deux si l'autre n'est pas disponible.</p>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600 mt-2">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Format CSV</h4>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-2 whitespace-pre-wrap">Entête exacte requise: type,id,date,kwh,montant</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>type :</strong> soit "consommation" soit "recharge".</li>
              <li><strong>id :</strong> identifiant unique (laissez vide pour générer automatiquement).</li>
              <li><strong>date :</strong> Format AAAA-MM (ex: 2024-06) pour conso, AAAA-MM-JJ (ex: 2024-06-15) pour recharge.</li>
              <li><strong>kwh :</strong> quantité d'énergie (nombre décimal avec point).</li>
              <li><strong>montant :</strong> montant en FCFA (uniquement pour les recharges).</li>
            </ul>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600 mt-2">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Format JSON</h4>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
{`{
  "consumptions": [
    { "id": "uuid", "date": "2024-06", "kwh": 250.5 }
  ],
  "recharges": [
    { "id": "uuid", "date": "2024-06-15", "montant": 25000, "kwh": 265 }
  ]
}`}
            </p>
          </div>
          <p className="mt-2 text-xs text-amber-600">Si une date existe déjà lors de l'import, l'entrée correspondante sera mise à jour au lieu d'être dupliquée.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><Database size={20} className="mr-2 text-emerald-500"/> Stockage des données</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-3">
          <p>Toutes vos données sont stockées <strong>localement</strong> sur votre appareil. L'application fonctionne <strong>100% hors ligne</strong>.</p>
          <p>Si vous désinstallez l'application ou videz le cache de votre navigateur, vos données seront perdues. <em>Pensez à exporter régulièrement vos données.</em></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><ImageIcon size={20} className="mr-2 text-purple-500"/> Galerie d'Aide (Images / Captures)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Vous pouvez enregistrer ici des captures d'écran, des photos de vos reçus, ou toutes images explicatives pour les consulter plus tard.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Default system images */}
            {[
              new URL('/assets/help/eneo_6_months.jpg', import.meta.url).href,
              new URL('/assets/help/eneo_6_months_eng.jpg', import.meta.url).href,
              new URL('/assets/help/eneo_consumption_rate.jpg', import.meta.url).href,
              new URL('/assets/help/eneo_consumption_rate_eng.jpg', import.meta.url).href
            ].map((imgUrl, idx) => (
              <div key={`default-${idx}`} className="relative group border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden aspect-square cursor-pointer" onClick={() => setFullScreenImage(imgUrl)}>
                <img src={imgUrl} alt={`Aide Eneo ${idx}`} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shadow-sm">Officiel</div>
              </div>
            ))}

            {(state.helpImages || []).map((imgUrl, idx) => (
              <div key={idx} className="relative border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden aspect-square cursor-pointer" onClick={() => setFullScreenImage(imgUrl)}>
                <img src={imgUrl} alt={`Aide ${idx}`} className="w-full h-full object-cover" />
                <button 
                  onClick={(e) => { e.stopPropagation(); removeImage(idx); }} 
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            
            <button 
              onClick={handleImageUpload}
              className="border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors aspect-square"
            >
              <Plus size={32} className="mb-2 opacity-50" />
              <span className="text-xs font-medium uppercase tracking-wider text-center">Ajouter</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {fullScreenImage && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setFullScreenImage(null)}>
          <button 
            className="absolute top-4 right-4 text-white bg-white dark:bg-slate-800/20 p-2 rounded-full hover:bg-white dark:bg-slate-800/40 transition-colors"
            onClick={() => setFullScreenImage(null)}
          >
            <X size={24} />
          </button>
          <img src={fullScreenImage} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

    </div>
  );
}
