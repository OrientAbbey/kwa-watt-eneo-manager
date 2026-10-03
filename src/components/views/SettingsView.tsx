import React, { useEffect, useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Settings as SettingsIcon, Save, RefreshCcw, Bell } from 'lucide-react';
import { DEFAULT_SETTINGS, DEFAULT_ALERTS } from '../../constants';
import { MONETARY_UNIT } from '../../lib/utils';
import { Dialog } from '@capacitor/dialog';
import { NotificationPermissionState, getNotificationPermissionState, notificationsSupported, requestNotificationPermission, sendTestNotification } from '../../lib/notifications';

export default function SettingsView() {
  const { state, updateSettings, resetData, showToast } = useApp();
  const [permission, setPermission] = useState<NotificationPermissionState>('prompt');
  const [testing, setTesting] = useState(false);
  useEffect(() => { getNotificationPermissionState().then(setPermission); }, []);
  const [clientType, setClientType] = useState(state.settings.clientType);
  const [tva, setTva] = useState(state.settings.tva.toString());
  
  const [alerts, setAlerts] = useState({
    startOfMonth: state.settings.alerts?.startOfMonth ?? DEFAULT_ALERTS.startOfMonth,
    startOfMonthDays: state.settings.alerts?.startOfMonthDays ?? DEFAULT_ALERTS.startOfMonthDays,
    highConsumptionThreshold: state.settings.alerts?.highConsumptionThreshold ?? DEFAULT_ALERTS.highConsumptionThreshold,
    anomalyPercentage: state.settings.alerts?.anomalyPercentage ?? DEFAULT_ALERTS.anomalyPercentage,
    toastDuration: state.settings.alerts?.toastDuration ?? 6,
    enableNotifications: state.settings.alerts?.enableNotifications ?? false,
    rechargeReminder: state.settings.alerts?.rechargeReminder ?? DEFAULT_ALERTS.rechargeReminder,
    rechargeReminderDays: state.settings.alerts?.rechargeReminderDays ?? DEFAULT_ALERTS.rechargeReminderDays,
  });
  const [tariffs, setTariffs] = useState(state.settings.tariffs || DEFAULT_SETTINGS.tariffs);
  const [exportFormat, setExportFormat] = useState(state.settings.exportFormat || "csv");

  const handleSave = async () => {
    const { value } = await Dialog.confirm({ title: 'Confirmation', message: "Voulez-vous enregistrer ces modifications ?" });
    if (value) {
      updateSettings({
        clientType,
        tva: parseFloat(tva) || 19.25,
        exportFormat,
        alerts,
        tariffs
      });
      showToast('Paramètres enregistrés');
    }
  };

  const handleResetSettings = async () => {
    const { value } = await Dialog.confirm({ title: 'Attention', message: "Voulez-vous réinitialiser uniquement les paramètres (les données d'historique seront conservées) ?" });
    if (value) {
      updateSettings(DEFAULT_SETTINGS);
      setClientType(DEFAULT_SETTINGS.clientType);
      setTva(DEFAULT_SETTINGS.tva.toString());
      setAlerts(DEFAULT_ALERTS);
      setExportFormat(DEFAULT_SETTINGS.exportFormat);
      setTariffs(DEFAULT_SETTINGS.tariffs);
      showToast('Tous les paramètres ont été réinitialisés');
    }
  };

  const handleResetSettingsGroup = async (group: 'taxes' | 'tariffs' | 'alerts') => {
    const { value } = await Dialog.confirm({ title: 'Attention', message: "Voulez-vous réinitialiser ce groupe de paramètres ?" });
    if (value) {
      if (group === 'taxes') {
        setClientType(DEFAULT_SETTINGS.clientType);
        setTva(DEFAULT_SETTINGS.tva.toString());
        updateSettings({ 
          clientType: DEFAULT_SETTINGS.clientType, 
          tva: DEFAULT_SETTINGS.tva
        });
        showToast('Paramètres de taxes réinitialisés');
      }
      if (group === 'tariffs') {
        setTariffs(DEFAULT_SETTINGS.tariffs);
        updateSettings({ 
          tariffs: DEFAULT_SETTINGS.tariffs 
        });
        showToast('Configuration des tranches réinitialisée');
      }
      if (group === 'alerts') {
        setAlerts(DEFAULT_ALERTS);
        setExportFormat(DEFAULT_SETTINGS.exportFormat);
        updateSettings({ 
          alerts: DEFAULT_ALERTS, 
          exportFormat: DEFAULT_SETTINGS.exportFormat 
        });
        showToast('Paramètres d\'alertes et export réinitialisés');
      }
    }
  };

  const updateTariffCell = (idx: number, key: 'min' | 'max' | 'base' | 'comfort', raw: string) => {
    setTariffs(s => ({
      ...s,
      [clientType]: s[clientType].map((row, i) => {
        if (i !== idx) return row;
        // Un champ « Max » vide = tranche sans plafond (dernière tranche)
        if (key === 'max' && raw.trim() === '') return { ...row, max: Infinity };
        return { ...row, [key]: parseFloat(raw) || 0 };
      })
    }));
  };

  const addTarrifRow = () => {
    const list = tariffs[clientType];
    const last = list[list.length - 1];
    const min = last ? (Number.isFinite(last.max) ? last.max + 1 : last.min + 100) : 0;
    setTariffs(s => ({
      ...s,
      [clientType]: [...s[clientType], { min, max: min + 100, base: 0, comfort: 0, tva_thresh: 220 }]
    }));
  };

  const removeTariffRow = async (idx: number) => {
    const { value } = await Dialog.confirm({ title: 'Confirmation', message: "Voulez-vous supprimer cette tranche tarifaire ?" });
    if (value) {
      setTariffs(s => ({
        ...s,
        [clientType]: s[clientType].filter((_, i) => i !== idx)
      }));
    }
  };

  const handleReset = async () => {
    const { value } = await Dialog.confirm({ title: 'Attention', message: "Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible (sauf si vous avez une sauvegarde)." });
    if (value) {
      resetData();
      showToast('Application réinitialisée.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between text-gray-800 dark:text-gray-100">
        <div className="flex items-center space-x-2">
          <SettingsIcon size={28} />
          <h2 className="text-2xl font-bold">Paramètres</h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tarification et Taxes</CardTitle>
            <button 
              onClick={() => handleResetSettingsGroup('taxes')} 
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 flex items-center bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors"
            >
              <RefreshCcw size={12} className="mr-1.5"/> Réinitialiser
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Type de client</label>
            <select 
              value={clientType}
              onChange={(e) => setClientType(e.target.value as any)}
              className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="residential">Résidentiel</option>
              <option value="professional">Professionnel</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Définit la grille tarifaire utilisée.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
               TVA (%) <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Actuel: {state.settings.tva}%)</span>
            </label>
            <input 
              type="number" 
              step="0.01"
              value={tva ?? ''}
              onChange={(e) => setTva(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Configuration des Tranches ({clientType === 'residential' ? 'Résidentiel' : 'Professionnel'})</h3>
              <button 
                onClick={() => handleResetSettingsGroup('tariffs')} 
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 flex items-center bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors"
              >
                <RefreshCcw size={12} className="mr-1.5"/> Réinitialiser
              </button>
            </div>
            
            <div className="overflow-x-auto text-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-slate-500 dark:text-slate-400">
                    <th className="pb-2">Min</th>
                    <th className="pb-2">Max</th>
                    <th className="pb-2">Base ({MONETARY_UNIT})</th>
                    <th className="pb-2">Confort ({MONETARY_UNIT})</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {tariffs[clientType].map((tranche, idx) => (
                    <tr key={idx} className="border-b last:border-0 border-slate-100 dark:border-slate-700">
                      <td className="py-2">
                        <input type="number" value={tranche.min ?? ''} onChange={e => updateTariffCell(idx, 'min', e.target.value)} className="w-16 p-1 border rounded bg-slate-50 dark:bg-slate-900/50" />
                      </td>
                      <td className="py-2">
                        <input type="number" placeholder="∞" value={Number.isFinite(tranche.max) ? tranche.max : ''} onChange={e => updateTariffCell(idx, 'max', e.target.value)} className="w-16 p-1 border rounded bg-slate-50 dark:bg-slate-900/50" />
                      </td>
                      <td className="py-2">
                        <input type="number" value={tranche.base ?? ''} onChange={e => updateTariffCell(idx, 'base', e.target.value)} className="w-16 p-1 border rounded bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100" />
                      </td>
                      <td className="py-2">
                        <input type="number" value={tranche.comfort ?? ''} onChange={e => updateTariffCell(idx, 'comfort', e.target.value)} className="w-16 p-1 border rounded bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100" />
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => removeTariffRow(idx)} className="text-red-400 hover:text-red-600 p-1">X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addTarrifRow} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-3">+ Ajouter une tranche</button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center"><Bell size={18} className="mr-2"/> Alertes et Export</CardTitle>
            <button 
              onClick={() => handleResetSettingsGroup('alerts')} 
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 flex items-center bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors"
            >
              <RefreshCcw size={12} className="mr-1.5"/> Réinitialiser
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="mr-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Rappel Début de mois</label>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Du jour</span>
                <input 
                  type="number" 
                  min="1" max="31"
                  value={alerts.startOfMonthDays?.[0] ?? 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setAlerts(s => ({
                      ...s, 
                      startOfMonthDays: [val, s.startOfMonthDays?.[1] ?? 5]
                    }));
                  }}
                  className="w-12 p-1 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">au jour</span>
                <input 
                  type="number" 
                  min="1" max="31"
                  value={alerts.startOfMonthDays?.[1] ?? 5}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 5;
                    setAlerts(s => ({
                      ...s, 
                      startOfMonthDays: [s.startOfMonthDays?.[0] ?? 1, val]
                    }));
                  }}
                  className="w-12 p-1 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={alerts.startOfMonth} 
              onChange={(e) => setAlerts(s => ({...s, startOfMonth: e.target.checked}))} 
              className="w-5 h-5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Seuil de consommation élevé (kWh)</label>
            <input 
              type="number" 
              value={alerts.highConsumptionThreshold ?? ''}
              onChange={(e) => setAlerts(s => ({...s, highConsumptionThreshold: e.target.value ? parseFloat(e.target.value) : null}))}
              placeholder="Ex: 300"
              className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Alerte Hausse Brutale (%)</label>
            <input 
              type="number" 
              value={alerts.anomalyPercentage ?? ''}
              onChange={(e) => setAlerts(s => ({...s, anomalyPercentage: e.target.value ? parseFloat(e.target.value) : null}))}
              placeholder="Ex: 20"
              className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Comparée au mois précédent.</p>
          </div>
          <div className="flex items-center justify-between mt-4 border-t pt-4">
            <div className="mr-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Rappel de recharge</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Vous prévient avant la fin estimée de votre crédit, même si l'application est fermée.</p>
              {alerts.rechargeReminder && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Prévenir</span>
                  <input
                    type="number" min="0" max="30"
                    value={alerts.rechargeReminderDays}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setAlerts(s => ({...s, rechargeReminderDays: Number.isFinite(v) ? Math.min(30, Math.max(0, v)) : 3}));
                    }}
                    className="w-14 p-1 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">jour(s) avant l'épuisement estimé</span>
                </div>
              )}
              {alerts.rechargeReminder && !alerts.enableNotifications && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Activez les notifications ci-dessous pour recevoir ce rappel.</p>
              )}
            </div>
            <input
              type="checkbox"
              checked={alerts.rechargeReminder}
              onChange={(e) => setAlerts(s => ({...s, rechargeReminder: e.target.checked}))}
              className="w-5 h-5"
            />
          </div>
          <div className="flex items-center justify-between mt-4 border-t pt-4">
            <div className="mr-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Notifications</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Alertes de consommation (début de mois, seuils, hausse brutale) et rappels de recharge.</p>
            </div>
            <input 
              type="checkbox" 
              checked={alerts.enableNotifications} 
              onChange={async (e) => {
                const checked = e.target.checked;
                if (checked) {
                  if (!notificationsSupported()) {
                    showToast('Notifications non supportées sur cet appareil.', 'error');
                    return;
                  }
                  const granted = await requestNotificationPermission();
                  setPermission(await getNotificationPermissionState());
                  if (!granted) {
                    showToast("Autorisation refusée : activez les notifications de KWA-WATT dans les réglages du téléphone (Applications → KWA-WATT → Notifications).", 'error');
                    return;
                  }
                }
                // Appliqué IMMÉDIATEMENT (avant, il fallait penser à « Enregistrer » : sinon les notifications restaient désactivées)
                setAlerts(s => ({...s, enableNotifications: checked}));
                updateSettings({ alerts: { ...state.settings.alerts, enableNotifications: checked } });
                showToast(checked ? 'Notifications activées' : 'Notifications désactivées', 'success');
              }} 
              className="w-5 h-5"
            />
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-3 text-xs space-y-2">
            <p className="text-slate-600 dark:text-slate-300">
              Autorisation du téléphone :{' '}
              <strong className={permission === 'granted' ? 'text-emerald-600' : permission === 'denied' ? 'text-red-600' : 'text-amber-600'}>
                {permission === 'granted' ? 'accordée' : permission === 'denied' ? 'refusée' : permission === 'unsupported' ? 'non disponible' : 'pas encore demandée'}
              </strong>
            </p>
            {permission === 'denied' && (
              <p className="text-red-700 dark:text-red-300">Réglages du téléphone → Applications → KWA-WATT → Notifications, puis autorisez-les.</p>
            )}
            <p className="text-slate-500 dark:text-slate-400">La zone de notification reflète le tableau de bord : une alerte y reste tant qu'elle y est affichée (ex. « Début du mois » : du jour {alerts.startOfMonthDays?.[0] ?? 1} au jour {alerts.startOfMonthDays?.[1] ?? 5}) — impossible de la balayer à la main — et disparaît dès qu'elle n'est plus active. « Début du mois » est aussi publiée automatiquement à 08:00 le jour {alerts.startOfMonthDays?.[0] ?? 1}, même application fermée. Si une notification disparaît pour une autre raison, elle revient à la prochaine ouverture de l'application.</p>
            <button
              disabled={testing}
              onClick={async () => {
                setTesting(true);
                const r = await sendTestNotification();
                setPermission(await getNotificationPermissionState());
                setTesting(false);
                showToast(r.ok === true ? 'Notification de test envoyée : faites glisser la barre de notification du téléphone.' : r.message, r.ok === true ? 'success' : 'error');
              }}
              className="text-indigo-700 dark:text-indigo-300 font-semibold underline disabled:opacity-50"
            >
              {testing ? 'Envoi…' : 'Envoyer une notification de test'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Durée info-bulle (secondes)</label>
            <input 
              type="number" 
              value={alerts.toastDuration === null || alerts.toastDuration === undefined ? 6 : alerts.toastDuration}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setAlerts(s => ({...s, toastDuration: isNaN(val) ? 6 : val}));
              }}
              className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Format d'export par défaut</label>
            <div className="flex items-center gap-4">
               <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                 <input type="radio" value="csv" checked={exportFormat === 'csv'} onChange={() => setExportFormat('csv')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                 CSV
               </label>
               <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                 <input type="radio" value="json" checked={exportFormat === 'json'} onChange={() => setExportFormat('json')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                 JSON
               </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 shadow-sm">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Enregistrer les modifications</h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-300">N'oubliez pas d'enregistrer après avoir modifié les tarifs ou la TVA.</p>
          </div>
          <button 
            onClick={handleSave}
            className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 shrink-0"
          >
            <Save size={20} />
            <span>Enregistrer Tout</span>
          </button>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Zone de danger</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Actions dangereuses.</p>
          <div className="space-y-3">
            <button 
              onClick={handleResetSettings}
              className="w-full py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors border border-amber-200 dark:border-amber-800"
            >
              <RefreshCcw size={18} />
              <span>Réinitialiser les paramètres</span>
            </button>
            <button 
              onClick={handleReset}
              className="w-full py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800"
            >
              <RefreshCcw size={18} />
              <span>Réinitialiser TOUT (données + paramètres)</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
