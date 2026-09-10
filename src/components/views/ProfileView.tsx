import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { LogOut, Trash2, Edit3, Plus, User, Camera as CameraIcon, Hash, MapPin, Mail, Loader2 } from 'lucide-react';
import { logOut, deleteAccount } from '../../lib/firebase';
import { Dialog } from '@capacitor/dialog';
import { useImagePicker } from '../../hooks/useImagePicker';
import ImageViewer from '../ui/ImageViewer';

const fieldClass = "flex-1 min-w-[120px] p-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800";

export default function ProfileView() {
  const { currentMeter, updateProfile, state, addMeter, deleteMeter, switchMeter, updateMeterName, showToast, currentUser, setCurrentUser, resetData } = useApp();
  const [localProfile, setLocalProfile] = useState(currentMeter.profile);
  const [targetPhoto, setTargetPhoto] = useState<'photoRecto' | 'photoVerso' | 'photoMeter' | 'photoProfile' | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [meterName, setMeterName] = useState(currentMeter.name);

  const { openPicker, picker } = useImagePicker((base64) => {
    if (!targetPhoto) return;
    setLocalProfile(prev => ({ ...prev, [targetPhoto]: base64 }));
    if (targetPhoto === 'photoProfile') {
      updateProfile({ photoProfile: base64 });
    }
  });

  // Synchroniser le nom local avec le store si on change de compteur
  useEffect(() => {
    setMeterName(currentMeter.name);
    setLocalProfile(currentMeter.profile);
  }, [currentMeter.id, currentMeter.name, currentMeter.profile]);

  const handleUpdateMeterName = async () => {
    if (meterName.trim()) {
       const { value } = await Dialog.confirm({ title: 'Confirmation', message: "Voulez-vous modifier le nom de ce compteur ?" });
       if (value) {
         updateMeterName(meterName.trim());
         showToast("Nom du compteur modifié");
       }
    }
    setEditingName(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoClick = (type: 'photoRecto' | 'photoVerso' | 'photoMeter' | 'photoProfile') => {
    setTargetPhoto(type);
    openPicker();
  };

  const removePhoto = async (type: 'photoRecto' | 'photoVerso' | 'photoMeter' | 'photoProfile') => {
    const { value } = await Dialog.confirm({ title: 'Confirmation', message: "Voulez-vous retirer cette photo ? (N'oubliez pas d'enregistrer le profil après)" });
    if (value) {
       setLocalProfile(prev => ({ ...prev, [type]: undefined }));
    }
  };

  const handleSaveProfile = async () => {
    if (localProfile.meterNumber) {
      const isDuplicate = state.meters.some(
        m => m.id !== currentMeter.id && m.profile.meterNumber === localProfile.meterNumber
      );
      if (isDuplicate) {
        await Dialog.alert({ title: 'Erreur', message: "Ce numéro de compteur existe déjà dans un autre profil." });
        return;
      }
    }

    const { value } = await Dialog.confirm({ title: 'Confirmation', message: "Voulez-vous enregistrer les modifications du profil ?" });
    if (value) {
      updateProfile(localProfile);
      showToast("Profil enregistré avec succès");
    }
  };

  const handleDeleteAccount = async () => {
    if (currentUser?.type === 'visitor') {
      const { value } = await Dialog.confirm({
        title: 'Suppression des données',
        message: "Supprimer définitivement toutes les données de cet appareil ?",
      });
      if (!value) return;
      resetData();
      setCurrentUser(null);
      showToast('Données locales supprimées');
      return;
    }

    const first = await Dialog.confirm({
      title: 'Supprimer mon compte',
      message: "Votre compte Google KWA-WATT, vos données synchronisées dans le cloud et les données de cette application seront définitivement supprimés. Cette action est irréversible.",
    });
    if (!first.value) return;
    const second = await Dialog.confirm({
      title: 'Dernière confirmation',
      message: "Êtes-vous absolument sûr ? Cette action ne peut pas être annulée.",
    });
    if (!second.value) return;

    setIsDeleting(true);
    try {
      await deleteAccount();
      resetData();
      setCurrentUser(null);
      showToast('Compte supprimé définitivement');
    } catch (error: any) {
      console.error('Erreur suppression du compte', error);
      if (error?.code === 'auth/requires-recent-login') {
        await Dialog.alert({
          title: 'Reconnexion requise',
          message: "Votre connexion est trop ancienne pour supprimer le compte. Déconnectez-vous puis reconnectez-vous, puis réessayez.",
        });
      } else {
        await Dialog.alert({
          title: 'Erreur',
          message: "Impossible de supprimer le compte. Réessayez dans quelques instants.",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 text-slate-800 dark:text-slate-100">
      {picker}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative group w-20 h-20">
            {localProfile.photoProfile ? (
              <>
                <img src={localProfile.photoProfile} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-md bg-indigo-50 dark:bg-slate-800" />
                <button 
                  onClick={async () => {
                    const { value } = await Dialog.confirm({ title: 'Confirmation', message: "Voulez-vous supprimer votre photo de profil ?" });
                    if (value) {
                      setLocalProfile(prev => ({ ...prev, photoProfile: undefined }));
                      updateProfile({ photoProfile: undefined });
                    }
                  }}
                  className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </>
            ) : (
              <div className="w-full h-full bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md">
                {currentUser?.avatar ? <img src={currentUser.avatar} alt="Avatar" className="w-full h-full rounded-full" /> : <User size={36} />}
              </div>
            )}
            <button 
              onClick={() => handlePhotoClick('photoProfile')} 
              className="absolute bottom-0 right-0 bg-orange-500 text-white p-1.5 rounded-full shadow hover:bg-orange-600 transition-colors"
            >
              <CameraIcon size={14} />
            </button>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 dark:text-white">{currentUser?.name || localProfile.ownerName || 'Profil'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.email || 'Informations de votre compteur local'}</p>
          </div>
        </div>
        <div>
          <button 
            onClick={async () => {
              if (currentUser?.type === 'visitor') {
                setCurrentUser(null);
                return;
              }
              const { value } = await Dialog.confirm({ title: 'Déconnexion', message: "Voulez-vous vous déconnecter ?" });
              if (value) {
                if (currentUser?.type === 'google') {
                  try {
                    await logOut();
                  } catch (e) {}
                }
                setCurrentUser(null);
              }
            }}
            className={currentUser?.type === 'visitor' ? "flex items-center space-x-2 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 px-4 py-2 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900/50" : "flex items-center space-x-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-4 py-2 rounded-lg transition-colors border border-red-100 dark:border-red-900/50"}
          >
            <LogOut size={16} />
            <span>{currentUser?.type === 'visitor' ? 'Connexion' : 'Déconnexion'}</span>
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des Compteurs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 block">Compteur Actuel</label>
              <div className="flex flex-wrap items-center gap-2">
                {editingName ? (
                  <>
                    <input 
                      type="text" 
                      value={meterName} 
                      onChange={e => setMeterName(e.target.value)}
                      className={fieldClass}
                    />
                    <button onClick={handleUpdateMeterName} className="bg-indigo-600 text-white px-3 py-2 rounded-lg font-medium text-sm shrink-0">OK</button>
                    <button onClick={() => { setEditingName(false); setMeterName(currentMeter.name); }} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-3 py-2 rounded-lg font-medium text-sm shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Annuler</button>
                  </>
                ) : (
                  <>
                    <select 
                      value={state.activeMeterId} 
                      onChange={e => switchMeter(e.target.value)}
                      className={fieldClass}
                    >
                      {state.meters.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <button onClick={() => setEditingName(true)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 bg-gray-100 rounded-lg" title="Renommer">
                      <Edit3 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-end gap-2">
              <button 
                onClick={async () => {
                   const { value, cancelled } = await Dialog.prompt({ title: 'Nouveau compteur', message: "Nom du nouveau compteur (Ex: Maison, Bureau) :" });
                   if (!cancelled && value && value.trim()) {
                     addMeter(value.trim());
                     showToast("Nouveau compteur ajouté");
                   }
                }}
                className="flex items-center bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-200"
              >
                <Plus size={18} className="mr-1" /> Nouveau
              </button>
              
              {state.meters.length > 1 && (
                <button 
                  onClick={async () => {
                     const { value } = await Dialog.confirm({ title: 'Attention', message: "Voulez-vous supprimer ce compteur et TOUT son historique ?" });
                     if (value) {
                       deleteMeter(currentMeter.id);
                       showToast("Compteur supprimé");
                     }
                  }}
                  className="flex items-center bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors border border-red-200"
                  title="Supprimer le compteur courant"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              <User size={16} className="mr-2 text-gray-400" />
              Nom du propriétaire (sur la facture)
            </label>
            <input 
              type="text" 
              name="ownerName"
              value={localProfile.ownerName || ''}
              onChange={handleChange}
              placeholder="Ex: Jean Martin"
              className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              <Hash size={16} className="mr-2 text-gray-400" />
              Numéro de compteur
            </label>
            <input 
              type="text" 
              name="meterNumber"
              value={localProfile.meterNumber || ''}
              onChange={handleChange}
              placeholder="Ex: 01234567891"
              className="w-full p-2 border border-gray-300 dark:border-slate-700 border-dashed rounded-lg bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider text-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              <MapPin size={16} className="mr-2 text-gray-400" />
              Localisation / Quartier
            </label>
            <input 
              type="text" 
              name="location"
              value={localProfile.location || ''}
              onChange={handleChange}
              placeholder="Ex: Bonamoussadi, Douala"
              className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              <Mail size={16} className="mr-2 text-gray-400" />
              Adresse Email (facultatif)
            </label>
            <input 
              type="email" 
              name="email"
              value={localProfile.email || ''}
              onChange={handleChange}
              placeholder="Ex: contact@email.com"
              className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos du compteur (Offline)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['photoRecto', 'photoVerso', 'photoMeter'] as const).map(type => (
              <div key={type} className="border border-slate-200 dark:border-slate-600 rounded-xl p-3 flex flex-col justify-center items-center relative overflow-hidden min-h-[160px] bg-slate-50 dark:bg-slate-900/50">
                {localProfile[type] ? (
                  <div className="absolute inset-0 w-full h-full cursor-pointer" onClick={() => setFullScreenImage(localProfile[type]!)}>
                    <img src={localProfile[type]} alt={type} className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removePhoto(type); }} 
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePhotoClick(type); }} 
                      className="absolute bottom-2 right-2 bg-indigo-500 text-white p-1.5 rounded-full shadow hover:bg-indigo-600 transition-colors"
                    >
                      <CameraIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => handlePhotoClick(type)} className="flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors h-full w-full">
                    <CameraIcon size={32} className="mb-2 opacity-50" />
                    <span className="text-xs font-medium uppercase tracking-wider text-center">
                      {type === 'photoRecto' ? 'Carte (Recto)' : type === 'photoVerso' ? 'Carte (Verso)' : 'Compteur Physique'}
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded-r-lg">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Ces informations restent strictement sur cet appareil (mode offline). Elles vous sont utiles pour avoir rapidement les informations sous la main lors d'une recharge en agence.
        </p>
      </div>

      <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 shadow-sm mt-6">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Enregistrer le profil</h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-300">Sauvegardez vos modifications pour ce compteur.</p>
          </div>
          <button 
            onClick={handleSaveProfile}
            className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 shrink-0"
          >
            <span>Enregistrer</span>
          </button>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900/50 mt-6">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Zone de danger</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Supprime définitivement votre compte et toutes les données associées
            {currentUser?.type === 'google' ? ' (synchronisation cloud et données locales)' : ' de cet appareil'}.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="w-full py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            <span>Supprimer mon compte définitivement</span>
          </button>
        </CardContent>
      </Card>

      {fullScreenImage && (
        <ImageViewer src={fullScreenImage} onClose={() => setFullScreenImage(null)} />
      )}
    </div>
  );
}
