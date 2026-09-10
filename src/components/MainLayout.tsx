import React, { createElement, useState, useEffect } from "react";
import { useApp } from "../store/AppContext";
import { Calculator, Home, History, User, Settings, HelpCircle, Plus, Loader2, CloudOff, Cloud, Moon, Sun } from "lucide-react";
import DashboardView from "./views/DashboardView";
import CalculatorView from "./views/CalculatorView";
import HistoryView from "./views/HistoryView";
import ProfileView from "./views/ProfileView";
import SettingsView from "./views/SettingsView";
import HelpView from "./views/HelpView";
import LoginView from "./views/LoginView";
import { cn } from "../lib/utils";
import { Dialog } from '@capacitor/dialog';
import { notificationsSupported, requestNotificationPermission } from "../lib/notifications";

type TabValue = "dashboard" | "calculator" | "history" | "profile" | "settings" | "help";

const NOTIF_ASKED_KEY = 'kwawatt_notif_asked';

export default function MainLayout() {
  const [activeTab, setActiveTab] = useState<TabValue>("dashboard");
  const { state, currentMeter, switchMeter, toastInfo, isLoading, currentUser, updateTheme, updateSettings, showToast } = useApp();

  useEffect(() => {
    if (!notificationsSupported() || localStorage.getItem(NOTIF_ASKED_KEY)) return;
    if (state.settings.alerts?.enableNotifications) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      localStorage.setItem(NOTIF_ASKED_KEY, '1');
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { value } = await Dialog.confirm({
          title: 'Notifications',
          message: "Activer les notifications pour ne pas manquer les alertes de consommation (début de mois, seuil atteint, hausse anormale) ?",
        });
        if (value) {
          const granted = await requestNotificationPermission();
          if (granted) {
            updateSettings({ alerts: { ...state.settings.alerts, enableNotifications: true } });
            showToast('Notifications activées');
          }
        }
      } catch (e) {
        console.error('Notification prompt failed', e);
      } finally {
        localStorage.setItem(NOTIF_ASKED_KEY, '1');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // If no user is logged in, show the login view
  if (!currentUser) {
    return <LoginView />;
  }

  const views: Record<TabValue, React.ReactNode> = {
    dashboard: <DashboardView />,
    calculator: <CalculatorView />,
    history: <HistoryView />,
    profile: <ProfileView />,
    settings: <SettingsView />,
    help: <HelpView />,
  };

  const navItems = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "calculator", icon: Calculator, label: "Outil Calcul" },
    { id: "history", icon: History, label: "Historique" },
    { id: "profile", icon: User, label: "Profil" },
    { id: "settings", icon: Settings, label: "Paramètres" },
  ];

  const sidebarItems = [...navItems, { id: "help", icon: HelpCircle, label: "Aide" }];

  const handleThemeToggle = () => {
    updateTheme(state.theme === 'dark' ? 'light' : 'dark');
  };

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
          <p className="text-indigo-300 text-[10px] mt-1 font-medium tracking-widest uppercase">ENEO Manager (CM)</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabValue)}
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
          ))}
        </nav>

        <div className="p-6 bg-indigo-950 dark:bg-slate-950 border-t border-indigo-900 dark:border-slate-800">
          <div className="bg-indigo-900/40 dark:bg-slate-900/40 p-4 rounded-xl border border-indigo-800 dark:border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-indigo-300 dark:text-slate-400 uppercase font-bold tracking-wider">Storage</span>
              <div className={cn("w-2 h-2 rounded-full", currentUser.type === 'google' ? "bg-green-400" : "bg-slate-400")}></div>
            </div>
            <p className="text-xs text-white">{currentUser.type === 'google' ? 'Google Drive Sync' : 'Stockage Local'}</p>
            <p className="text-[10px] text-indigo-400 dark:text-slate-500 italic mt-0.5">{currentUser.type === 'google' ? 'Connecté' : 'Offline Mode'}</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 md:h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex-1 min-w-0 pr-2 sm:pr-4">
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">
              {navItems.find(i => i.id === activeTab)?.label || 'Aide'}
            </h2>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-full overflow-hidden">
              <span className="hidden sm:inline shrink-0">Compteur: </span>
              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 ml-1 truncate">
                {currentMeter?.profile.meterNumber || 'Non renseigné'}
              </span>
              <select 
                title="Changer de compteur"
                value={state.activeMeterId} 
                onChange={e => switchMeter(e.target.value)}
                className="ml-2 text-[10px] sm:text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-0.5 text-slate-700 dark:text-slate-300 font-medium max-w-[80px] sm:max-w-[120px] truncate"
              >
                {state.meters.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-4 items-center shrink-0">
            {/* Sync status mobile */}
            <div 
              title={currentUser.type === 'google' ? 'Cloud Sync Online' : 'Stockage Local'}
              className="flex md:hidden items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800"
            >
              {currentUser.type === 'google' ? (
                <Cloud size={16} className="text-green-500" />
              ) : (
                <CloudOff size={16} className="text-slate-400" />
              )}
            </div>
            
            <button 
              onClick={handleThemeToggle}
              className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 md:p-2.5 rounded-lg transition-colors"
              title="Activer/Désactiver le thème sombre"
            >
              {state.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button 
              onClick={() => setActiveTab('help')}
              className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 md:p-2.5 rounded-lg transition-colors md:hidden"
            >
              <HelpCircle size={20} />
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all text-sm md:text-base shrink-0"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Recharge / Conso</span>
            </button>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto w-full relative h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
          <div className="p-4 md:p-8 w-full max-w-6xl mx-auto pb-24 md:pb-8 flex flex-col min-h-full"> 
            {views[activeTab]}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden bg-indigo-950 dark:bg-slate-950 pb-safe fixed bottom-0 w-full z-30 shadow-[0_-10px_40px_rgba(30,27,75,0.3)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex justify-around px-2 py-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabValue)}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-colors min-w-[60px]",
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
        <div className="fixed top-20 md:top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-900 dark:bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 border border-slate-800 dark:border-indigo-500">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs shadow-sm">✓</div> 
            {toastInfo.message}
          </div>
        </div>
      )}
    </div>
  );
}
