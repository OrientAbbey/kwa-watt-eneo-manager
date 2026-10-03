import React, { createElement, useState, useEffect, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { useNav, TabValue } from "../store/NavContext";
import { useRemoteConfig } from "../store/RemoteConfigContext";
import {
  Calculator, Home, History, User, Settings, HelpCircle, Plus, Loader2, CloudOff, Cloud, CloudAlert, Moon, Sun,
  Menu, LifeBuoy, ClipboardPaste, BatteryCharging, Zap, Wrench, ChevronDown, RefreshCw, Check,
} from "lucide-react";
import DashboardView from "./views/DashboardView";
import CalculatorView from "./views/CalculatorView";
import HistoryView from "./views/HistoryView";
import ServicesView from "./views/ServicesView";
import ProfileView from "./views/ProfileView";
import SettingsView from "./views/SettingsView";
import HelpView from "./views/HelpView";
import LoginView from "./views/LoginView";
import Drawer from "./ui/Drawer";
import BottomSheet from "./ui/BottomSheet";
import OverflowMenu, { OverflowItem } from "./ui/OverflowMenu";
import CopyableValue from "./ui/CopyableValue";
import { cn } from "../lib/utils";
import { Dialog } from '@capacitor/dialog';
import { getNotificationPermissionState, notificationsSupported, requestNotificationPermission } from "../lib/notifications";
import { getAlerts } from "../lib/alerts";
import { useAlertScheduler } from "../hooks/useAlertScheduler";
import { useClipboard } from "../hooks/useClipboard";

const NOTIF_ASKED_KEY = 'kwawatt_notif_asked';

type NavItem = { id: TabValue; icon: React.ComponentType<any>; label: string };

const ALL_ITEMS: NavItem[] = [
  { id: "dashboard", icon: Home, label: "Dashboard" },
  { id: "calculator", icon: Calculator, label: "Outil Calcul" },
  { id: "history", icon: History, label: "Historique" },
  { id: "services", icon: Wrench, label: "Services" },
  { id: "profile", icon: User, label: "Profil" },
  { id: "settings", icon: Settings, label: "Paramètres" },
  { id: "help", icon: HelpCircle, label: "Aide" },
];
// Barre du bas mobile : les 4 destinations les plus utilisées ; le reste est dans le tiroir
const BOTTOM_IDS: TabValue[] = ["dashboard", "calculator", "history", "services"];

const timeAgo = (t: number | null) => {
  if (!t) return "jamais";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
};

export default function MainLayout() {
  const { activeTab, navigate } = useNav();
  const {
    state, currentMeter, switchMeter, toastInfo, isLoading, currentUser, updateTheme, updateSettings, showToast,
    syncStatus, syncError, photoIssue, lastSyncAt, retrySync,
  } = useApp();
  const { brandName } = useRemoteConfig();
  const copy = useClipboard();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [meterSheetOpen, setMeterSheetOpen] = useState(false);
  const [syncSheetOpen, setSyncSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // Alertes du jour + rappels de recharge, quel que soit l'onglet ouvert
  useAlertScheduler();

  // Même source que les notifications système : le point du bouton flottant signale une alerte encore active.
  const alertCount = useMemo(() => {
    if (!currentUser || !state.settings.alerts?.enableNotifications) return 0;
    return getAlerts(state, currentMeter).length;
  }, [currentUser, state, currentMeter]);

  // Invite unique pour activer les notifications.
  // IMPORTANT : on interroge l'autorisation du VRAI système (Capacitor). Avant, `Notification.permission` — qui vaut
  // « denied » par défaut dans une WebView Android — faisait ignorer l'invite en silence : les notifications restaient
  // désactivées sans jamais avoir été proposées.
  useEffect(() => {
    if (!notificationsSupported() || localStorage.getItem(NOTIF_ASKED_KEY)) return;
    if (state.settings.alerts?.enableNotifications) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const ask = async () => {
      try {
        const { value } = await Dialog.confirm({
          title: 'Notifications',
          message: "Activer les notifications pour ne pas manquer les alertes de consommation et les rappels de recharge (avant la fin de votre crédit) ?",
        });
        if (value) {
          const granted = await requestNotificationPermission();
          if (granted) {
            updateSettings({ alerts: { ...state.settings.alerts, enableNotifications: true } });
            showToast('Notifications activées');
          } else {
            showToast("Autorisation refusée : activez les notifications de KWA-WATT dans les réglages du téléphone.", 'error');
          }
        }
      } catch (e) {
        console.error('Notification prompt failed', e);
      } finally {
        localStorage.setItem(NOTIF_ASKED_KEY, '1');
      }
    };

    getNotificationPermissionState().then((permission) => {
      if (cancelled) return;
      if (permission === 'denied' || permission === 'unsupported') {
        localStorage.setItem(NOTIF_ASKED_KEY, '1'); // déjà refusé au niveau du système : réglable dans Paramètres
        return;
      }
      timer = setTimeout(ask, 600);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If no user is logged in, show the login view
  if (!currentUser) {
    return <LoginView />;
  }

  const views: Record<TabValue, React.ReactNode> = {
    dashboard: <DashboardView />,
    calculator: <CalculatorView />,
    history: <HistoryView />,
    services: <ServicesView />,
    profile: <ProfileView />,
    settings: <SettingsView />,
    help: <HelpView />,
  };

  const bottomItems = ALL_ITEMS.filter((i) => BOTTOM_IDS.includes(i.id));
  const title = ALL_ITEMS.find((i) => i.id === activeTab)?.label ?? "";
  const isDark = state.theme === 'dark';
  const go = (tab: TabValue, intent?: Parameters<typeof navigate>[1]) => {
    setDrawerOpen(false);
    setAddSheetOpen(false);
    navigate(tab, intent);
  };

  const handleThemeToggle = () => updateTheme(isDark ? 'light' : 'dark');
  const isGoogle = currentUser.type === 'google';

  const syncIcon = !isGoogle
    ? <CloudOff size={18} className="text-slate-400" />
    : syncStatus === 'syncing'
      ? <Loader2 size={18} className="text-indigo-500 animate-spin" />
      : syncStatus === 'error'
        ? <CloudAlert size={18} className="text-red-500" />
        : <Cloud size={18} className="text-green-500" />;
  const syncLabel = !isGoogle ? "Stockage local (hors ligne)" : syncStatus === 'syncing' ? "Synchronisation…" : syncStatus === 'error' ? "Synchronisation en échec" : "Synchronisé";

  const overflowItems: OverflowItem[] = [
    { id: 'theme', label: isDark ? "Passer en thème clair" : "Passer en thème sombre", icon: isDark ? <Sun size={18} /> : <Moon size={18} />, onSelect: handleThemeToggle },
    { id: 'copy-meter', label: "Copier le n° de compteur", icon: <Zap size={18} />, disabled: !currentMeter.profile.meterNumber, onSelect: () => copy(currentMeter.profile.meterNumber, "N° de compteur") },
    { id: 'sync', label: isGoogle ? "État de la synchronisation" : "Mode hors ligne", icon: <Cloud size={18} />, onSelect: () => setSyncSheetOpen(true) },
    { id: 'help', label: "Aide et informations", icon: <HelpCircle size={18} />, onSelect: () => navigate('help') },
  ];

  const addActions = [
    { id: 'recharge', label: "Enregistrer une recharge", hint: "Montant, kWh et référence de transaction", icon: <BatteryCharging size={20} />, run: () => go('history', { type: 'add-recharge' }) },
    { id: 'sms', label: "Recharge depuis un SMS", hint: "Coller ou photographier le SMS de confirmation", icon: <ClipboardPaste size={20} />, run: () => go('history', { type: 'paste-sms' }) },
    { id: 'conso', label: "Relevé de consommation", hint: "kWh consommés dans le mois", icon: <Zap size={20} />, run: () => go('history', { type: 'add-consumption' }) },
    { id: '811', label: "J'ai activé le crédit d'urgence (811)", hint: "À rembourser sur la prochaine recharge", icon: <LifeBuoy size={20} />, run: () => go('services', { type: 'focus', section: 'emergency-credit' }) },
  ];

  const renderNav = (item: NavItem, onClick: () => void) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-left",
        activeTab === item.id
          ? "bg-indigo-900/50 dark:bg-slate-800/50 text-white border-l-4 border-orange-500"
          : "text-indigo-300 dark:text-slate-400 hover:bg-white/5 border-l-4 border-transparent"
      )}
    >
      {createElement(item.icon, { size: 20, className: "opacity-80 shrink-0" })}
      <span>{item.label}</span>
    </button>
  );

  const renderStorageBadge = () => (
    <button onClick={() => { setDrawerOpen(false); setSyncSheetOpen(true); }} className="w-full text-left bg-indigo-900/40 dark:bg-slate-900/40 p-4 rounded-xl border border-indigo-800 dark:border-slate-700">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] text-indigo-300 dark:text-slate-400 uppercase font-bold tracking-wider">Stockage</span>
        <div className={cn("w-2 h-2 rounded-full", !isGoogle ? "bg-slate-400" : syncStatus === 'error' ? "bg-red-400" : "bg-green-400")}></div>
      </div>
      <p className="text-xs text-white">{isGoogle ? 'Synchronisation cloud' : 'Stockage local'}</p>
      <p className="text-[10px] text-indigo-400 dark:text-slate-500 italic mt-0.5">{isGoogle ? syncLabel : 'Mode hors ligne'}</p>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors">

      {/* Sidebar (Desktop/Tablet) */}
      <aside className="w-64 bg-indigo-950 dark:bg-slate-950 hidden md:flex flex-col h-full shrink-0 shadow-xl z-20">
        <div className="p-6 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
              <img src="/icon.png" alt="KWA-WATT Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-white font-bold text-xl tracking-tight">KWA-WATT</h1>
          </div>
          <p className="text-indigo-300 text-[10px] mt-1 font-medium tracking-widest uppercase">{brandName} Manager (CM)</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {ALL_ITEMS.map((item) => <React.Fragment key={item.id}>{renderNav(item, () => navigate(item.id))}</React.Fragment>)}
        </nav>

        <div className="p-6 bg-indigo-950 dark:bg-slate-950 border-t border-indigo-900 dark:border-slate-800">
          {renderStorageBadge()}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Top Header : menu, titre + compteur, état de synchro, actions secondaires */}
        <header className="h-16 md:h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 md:px-8 flex items-center justify-between gap-2 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Ouvrir le menu"
              className="md:hidden shrink-0 text-slate-600 dark:text-slate-300 p-2 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">{title}</h2>
              <button
                onClick={() => setMeterSheetOpen(true)}
                aria-label="Changer de compteur"
                className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-full hover:text-indigo-600"
              >
                <span className="font-semibold truncate max-w-[110px] sm:max-w-[200px]">{currentMeter?.name}</span>
                <span className="mx-1 text-slate-300">·</span>
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 truncate">{currentMeter?.profile.meterNumber || 'N° non renseigné'}</span>
                <ChevronDown size={14} className="ml-0.5 shrink-0" />
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 sm:gap-3 items-center shrink-0">
            <button
              onClick={() => setSyncSheetOpen(true)}
              title={syncLabel}
              aria-label={syncLabel}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 relative"
            >
              {syncIcon}
              {isGoogle && syncStatus === 'error' && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />}
            </button>

            <button
              onClick={() => setAddSheetOpen(true)}
              className="hidden md:flex bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-bold items-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
            >
              <Plus size={18} /> Ajouter
            </button>

            <OverflowMenu items={overflowItems} />
          </div>
        </header>

        {/* Scrollable View Area */}
        <div id="scroll-area" className="flex-1 overflow-y-auto w-full relative h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
          <div className="p-4 md:p-8 w-full max-w-6xl mx-auto pb-32 md:pb-8 flex flex-col min-h-full">
            {views[activeTab]}
          </div>
        </div>

        {/* Bouton d'action flottant (mobile) : ajouter recharge / relevé / SMS.
            Le point rouge en indique le bon état : il y a au moins une alerte active dans la zone de notification. */}
        <button
          onClick={() => setAddSheetOpen(true)}
          aria-label={alertCount > 0 ? `Ajouter — ${alertCount} alerte${alertCount > 1 ? 's' : ''} en cours` : 'Ajouter'}
          className="md:hidden fixed right-4 bottom-24 z-40 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white p-4 rounded-full shadow-xl shadow-orange-500/40 transition-transform relative"
        >
          <Plus size={26} />
          {alertCount > 0 && (
            <span
              aria-hidden="true"
              data-testid="fab-alert-dot"
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-900"
            />
          )}
        </button>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden bg-indigo-950 dark:bg-slate-950 pb-safe fixed bottom-0 w-full z-30 shadow-[0_-10px_40px_rgba(30,27,75,0.3)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex justify-around px-2 py-1">
            {bottomItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-colors min-w-[64px]",
                  activeTab === item.id ? "text-orange-500" : "text-indigo-300 hover:text-white"
                )}
              >
                {createElement(item.icon, { size: 22, className: "mb-1" })}
                <span className="text-[10px] font-medium tracking-tight truncate w-full text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </main>

      {/* Tiroir de navigation (mobile) */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="p-6 pt-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl overflow-hidden shadow-sm"><img src="/icon.png" alt="" className="w-full h-full object-cover" /></div>
            <h1 className="font-bold text-xl tracking-tight">KWA-WATT</h1>
          </div>
          <p className="text-indigo-300 text-[10px] mt-1 font-medium tracking-widest uppercase">{brandName} Manager (CM)</p>
          {currentUser.name && <p className="text-sm text-indigo-200 mt-3 truncate">{currentUser.name}</p>}
        </div>
        <nav className="px-4 space-y-1 flex-1">
          {ALL_ITEMS.map((item) => <React.Fragment key={item.id}>{renderNav(item, () => go(item.id))}</React.Fragment>)}
          <button
            onClick={() => { handleThemeToggle(); setDrawerOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-left text-indigo-300 hover:bg-white/5 border-l-4 border-transparent"
          >
            {isDark ? <Sun size={20} className="opacity-80" /> : <Moon size={20} className="opacity-80" />}
            <span>{isDark ? "Thème clair" : "Thème sombre"}</span>
          </button>
        </nav>
        <div className="p-4">{renderStorageBadge()}</div>
      </Drawer>

      {/* Changer de compteur */}
      <BottomSheet open={meterSheetOpen} title="Mes compteurs" onClose={() => setMeterSheetOpen(false)}>
        <ul className="space-y-2">
          {state.meters.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => { switchMeter(m.id); setMeterSheetOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors",
                  m.id === state.activeMeterId
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{m.name}</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{m.profile.meterNumber || 'N° non renseigné'}</p>
                </div>
                {m.id === state.activeMeterId && <Check size={18} className="text-indigo-600 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
        {currentMeter.profile.meterNumber && (
          <p className="text-xs text-slate-500 mt-4 flex items-center gap-1.5">
            N° du compteur actif : <CopyableValue value={currentMeter.profile.meterNumber} label="N° de compteur" className="font-semibold text-indigo-700 dark:text-indigo-400" />
          </p>
        )}
        <button onClick={() => { setMeterSheetOpen(false); navigate('profile'); }} className="mt-4 w-full text-sm font-semibold text-indigo-600 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
          Ajouter, renommer ou supprimer un compteur
        </button>
      </BottomSheet>

      {/* État de la synchronisation */}
      <BottomSheet open={syncSheetOpen} title="Synchronisation" onClose={() => setSyncSheetOpen(false)}>
        {isGoogle ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">{syncIcon}<p className="font-semibold text-slate-800 dark:text-slate-100">{syncLabel}</p></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Dernière synchronisation : {timeAgo(lastSyncAt)}</p>
            {syncStatus === 'error' && syncError && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 p-3 text-sm text-red-800 dark:text-red-200">
                {syncError}
                <p className="text-xs mt-2 opacity-80">Vos données restent enregistrées sur cet appareil.</p>
              </div>
            )}
            {photoIssue && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 p-3 text-sm text-amber-900 dark:text-amber-200">
                <p className="font-semibold">Photos non synchronisées</p>
                <p className="text-xs mt-1">
                  {photoIssue.code === 'permission'
                    ? "Les règles Firestore du projet n'autorisent pas encore les photos (à déployer : voir docs/SYNC_ET_REGLES.md)."
                    : photoIssue.code === 'too_large'
                      ? "Certaines photos sont trop lourdes pour la synchronisation."
                      : "Réseau indisponible ou quota atteint : nouvel essai automatique."}
                  {' '}Elles restent enregistrées sur ce téléphone ; vos données et recharges, elles, sont bien synchronisées.
                </p>
              </div>
            )}
            <button onClick={() => { retrySync(); }} disabled={syncStatus === 'syncing'} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl">
              <RefreshCw size={18} className={syncStatus === 'syncing' ? 'animate-spin' : ''} /> Synchroniser maintenant
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>Vous utilisez l'application en <strong>mode visiteur</strong> : vos données restent uniquement sur cet appareil.</p>
            <p>Connectez-vous avec Google (depuis le Profil) pour les sauvegarder et les retrouver sur un autre téléphone.</p>
            <button onClick={() => { setSyncSheetOpen(false); navigate('profile'); }} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">Aller au profil</button>
          </div>
        )}
      </BottomSheet>

      {/* Menu « Ajouter » */}
      <BottomSheet open={addSheetOpen} title="Que souhaitez-vous ajouter ?" onClose={() => setAddSheetOpen(false)}>
        <ul className="space-y-2">
          {addActions.map((a) => (
            <li key={a.id}>
              <button onClick={a.run} className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors">
                <span className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 shrink-0">{a.icon}</span>
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-800 dark:text-slate-100">{a.label}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{a.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center max-w-xs text-center border border-slate-100 dark:border-slate-700">
             <Loader2 size={40} className="text-orange-500 animate-spin mb-4" />
             <h3 className="text-slate-900 dark:text-white font-bold mb-1">Chargement en cours</h3>
             <p className="text-slate-500 dark:text-slate-400 text-sm">Veuillez patienter quelques instants...</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastInfo && toastInfo.visible && (
        <div role="status" aria-live="polite" className="fixed top-20 md:top-24 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={cn(
            "text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-start gap-3 border",
            toastInfo.type === 'error' ? "bg-red-600 border-red-500" : "bg-slate-900 dark:bg-indigo-600 border-slate-800 dark:border-indigo-500"
          )}>
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shadow-sm shrink-0", toastInfo.type === 'error' ? "bg-red-800" : toastInfo.type === 'info' ? "bg-blue-500" : "bg-green-500")}>
              {toastInfo.type === 'error' ? '!' : toastInfo.type === 'info' ? 'i' : '✓'}
            </div>
            <span className="min-w-0 break-words">{toastInfo.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
