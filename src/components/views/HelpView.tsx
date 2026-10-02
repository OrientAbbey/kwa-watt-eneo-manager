import React, { useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { HelpCircle, Calculator, Zap, Database, Image as ImageIcon, Trash2, Plus, Phone, Mail } from 'lucide-react';
import { useImagePicker } from '../../hooks/useImagePicker';
import ImageViewer from '../ui/ImageViewer';
import { appConfig } from '../../config';
import UsefulLinksCard from '../features/UsefulLinksCard';
import { useRemoteConfig } from '../../store/RemoteConfigContext';
import ExternalLink from '../ui/ExternalLink';
import { MONETARY_UNIT } from '../../lib/utils';
import { OCR_ENGINE_INFO } from '../../lib/ocr';
import { useNav } from '../../store/NavContext';

export default function HelpView() {
  const { state, updateHelpImages } = useApp();
  const { config, brand, brandName } = useRemoteConfig();
  const { consumeIntent, intentTick } = useNav();

  // Arrivée depuis un raccourci (ex. « Guides et liens utiles » de l'onglet Services) : défiler jusqu'à la section
  useEffect(() => {
    const intent = consumeIntent();
    if (intent?.type === 'focus') {
      const t = setTimeout(() => document.getElementById(intent.section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentTick]);
  const [fullScreenImage, setFullScreenImage] = React.useState<string | null>(null);

  const { openPicker, picker } = useImagePicker(
    (base64) => updateHelpImages([...(state.helpImages || []), base64]),
    "Ajouter une image d'aide"
  );

  const removeImage = (index: number) => {
    const updated = [...(state.helpImages || [])];
    updated.splice(index, 1);
    updateHelpImages(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-10">
      {picker}
      <div className="flex items-center space-x-2 text-gray-800 dark:text-gray-100">
        <HelpCircle size={28} />
        <h2 className="text-2xl font-bold">Aide & Informations</h2>
      </div>

      <UsefulLinksCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><Phone size={20} className="mr-2 text-indigo-600"/> Service client {brandName}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <ExternalLink href={`tel:${config.contacts.infoLine}`} showIcon={false} className="flex items-center text-indigo-700 dark:text-indigo-400 hover:underline">
            <Phone size={16} className="mr-2" /> Numéro gratuit : <strong className="ml-1">{config.contacts.infoLine}</strong>
          </ExternalLink>
          <ExternalLink href="mailto:eneo.customercare@eneo.cm" showIcon={false} className="flex items-center text-indigo-700 dark:text-indigo-400 hover:underline">
            <Mail size={16} className="mr-2" /> À l'écoute de la clientèle : eneo.customercare@eneo.cm
          </ExternalLink>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><Zap size={20} className="mr-2 text-amber-500"/> Fonctionnalités de l'application</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-3">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Dashboard Complet :</strong> Vue rapide sur le solde d'énergie estimé, consommation actuelle, prévision des jours restants avant coupure et graphiques.</li>
            <li><strong>Historique (Consommations / Recharges) :</strong> Suivi précis de chaque mois de consommation et achats de crédits en {MONETARY_UNIT}, avec export CSV/JSON et import.</li>
            <li><strong>Calculatrice Intégrée :</strong> Estimations bidirectionnelles "Montant vers kWh" et "kWh vers Montant", avec ajustements rapides des valeurs.</li>
            <li><strong>Onglet Services :</strong> recharge par MTN MoMo ou Orange Money (les boutons ouvrent les codes courts, valables pour tous les abonnés ; le code long compteur + montant est une option à copier-coller, réservée à certains abonnés), frais estimés, crédit d'urgence 811 suivi comme un prêt à rembourser, codes du clavier du compteur, diagnostic de la mise à jour TID, accès aux factures par SMS/WhatsApp et annonces de coupures.</li>
            <li><strong>Recharge depuis un SMS :</strong> collez le SMS de confirmation (Orange Money ou MTN MoMo, même reçu sur un autre téléphone) : montant, kWh, date, référence de transaction, n° de reçu, compteur et frais sont pré-remplis. Le montant enregistré est celui de l'énergie ; les frais de paiement sont notés à part. Achat minimum : {config.minRechargeAmount.toLocaleString('fr-FR')} {MONETARY_UNIT}. Le jeton à 20 chiffres, le nom et le téléphone du payeur ne sont jamais enregistrés. Un contrôle vous avertit si le compteur du SMS n'est pas le vôtre ou si le rapport montant/kWh est incohérent avec les tarifs.</li>
            <li><strong>Lecture d'une photo ou capture (OCR) :</strong> moteur <strong>{OCR_ENGINE_INFO.engine}</strong>, modèle {OCR_ENGINE_INFO.model}, exécuté {OCR_ENGINE_INFO.offline ? 'hors ligne ' : ''}sur votre téléphone ({OCR_ENGINE_INFO.runtime}) : {OCR_ENGINE_INFO.payload}. Aucune image n'est envoyée sur internet. Relisez toujours les chiffres reconnus avant d'enregistrer.</li>
            <li><strong>Notifications :</strong> une alerte (ex. « Début du mois ») reste dans la zone de notification du téléphone tant qu'elle est affichée sur le tableau de bord, puis disparaît à la prochaine ouverture de l'application. « Début du mois » est aussi publiée chaque mois à 08:00, même application fermée. Réglages → Notifications permet de vérifier l'autorisation et d'envoyer un test.</li>
            <li><strong>Rappels de recharge :</strong> une notification vous prévient quelques jours avant la fin estimée de votre crédit, même si l'application est fermée.</li>
            <li><strong>Profil Utilisateur Complet :</strong> Enregistrement du numéro de compteur, photos de l'écran, photo recto-verso de la carte d'accès.</li>
            <li><strong>Synchronisation Cloud :</strong> Connectez-vous avec Google pour sauvegarder automatiquement toutes vos données et vos photos dans le cloud de manière sécurisée.</li>
            <li><strong>Mode Sombre :</strong> Un affichage élégant qui repose vos yeux, surtout la nuit. Appliqué automatiquement ou manuellement dans vos réglages.</li>
            <li><strong>Confidentialité avancée :</strong> Pour les visiteurs, mode 100% hors ligne. Pour les membres connectés, vos données sont stockées dans un espace privé protégé par des règles d'accès strictes : seul votre compte Google peut les lire.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><Calculator size={20} className="mr-2 text-indigo-600"/> Comment fonctionne le calcul ?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-3">
          <p>Le calcul est basé sur la méthode tarifaire de <strong>{brand}</strong> et dépend de votre consommation moyenne des 6 derniers mois.</p>
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
              <li><strong>montant :</strong> montant en {MONETARY_UNIT} (uniquement pour les recharges).</li>
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
              new URL(`${appConfig.assets.helpImagesPath}/eneo_6_months.jpg`, import.meta.url).href,
              new URL(`${appConfig.assets.helpImagesPath}/eneo_6_months_eng.jpg`, import.meta.url).href,
              new URL(`${appConfig.assets.helpImagesPath}/eneo_consumption_rate.jpg`, import.meta.url).href,
              new URL(`${appConfig.assets.helpImagesPath}/eneo_consumption_rate_eng.jpg`, import.meta.url).href
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
              onClick={openPicker}
              className="border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors aspect-square"
            >
              <Plus size={32} className="mb-2 opacity-50" />
              <span className="text-xs font-medium uppercase tracking-wider text-center">Ajouter</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {fullScreenImage && (
        <ImageViewer src={fullScreenImage} onClose={() => setFullScreenImage(null)} />
      )}

    </div>
  );
}
