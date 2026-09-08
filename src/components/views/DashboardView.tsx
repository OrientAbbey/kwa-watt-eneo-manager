import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, CartesianGrid, Legend, ComposedChart } from 'recharts';
import { LocalNotifications } from '@capacitor/local-notifications';
import * as df from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { sortByDate } from '../../lib/utils';

const { format, subMonths, parseISO, addDays, getDate } = df;

import { calculatePrice } from '../../lib/eneo';

export default function DashboardView() {
  const { state, currentMeter } = useApp();
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Calculate stats
  const sortedConsumptions = useMemo(() => 
    sortByDate(currentMeter.consumptions, 'asc'), 
  [currentMeter.consumptions]);

  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentConso = sortedConsumptions.find(c => c.date === currentMonth)?.kwh || 0;
  
  const lastMonthDate = format(subMonths(new Date(), 1), 'yyyy-MM');
  const lastMonthConso = sortedConsumptions.find(c => c.date === lastMonthDate)?.kwh || 0;

  const currentMonthRecharges = currentMeter.recharges.filter(r => r.date.startsWith(currentMonth));
  const totalRechargeKwh = currentMonthRecharges.reduce((acc, r) => acc + r.kwh, 0);

  const average6Months = useMemo(() => {
    if (sortedConsumptions.length === 0) return 0;
    const last6 = sortedConsumptions.slice(-6);
    return last6.reduce((acc, c) => acc + c.kwh, 0) / last6.length;
  }, [sortedConsumptions]);

  const projectedCost = useMemo(() => {
    if (average6Months === 0) return 0;
    return calculatePrice(average6Months, 0, average6Months, state.settings.clientType, state.settings.tva / 100, state.settings.tariffs).value;
  }, [average6Months, state.settings.clientType, state.settings.tva, state.settings.tariffs]);

  const estimatedDaysLeft = useMemo(() => {
    if (average6Months === 0 || totalRechargeKwh === 0) return null;
    const dailyConso = average6Months / 30; // approx
    const balance = totalRechargeKwh - currentConso;
    if (balance <= 0) return 0;
    return Math.floor(balance / dailyConso);
  }, [average6Months, totalRechargeKwh, currentConso]);

  const sortedRecharges = sortByDate(currentMeter.recharges, 'desc');
  const lastRecharge = sortedRecharges.length > 0 ? sortedRecharges[0] : null;

  // Yearly Comparison Data (Last 12 months)
  const yearlyData = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const monthStr = format(d, 'yyyy-MM');
      const c = currentMeter.consumptions.find(x => x.date === monthStr);
      const r = currentMeter.recharges.filter(x => x.date.startsWith(monthStr));
      
      const kwh = c ? c.kwh : 0;
      const rechargeKwh = r.reduce((acc, curr) => acc + curr.kwh, 0);
      const cost = r.reduce((acc, curr) => acc + curr.montant, 0);
      const calculatedCost = calculatePrice(kwh, 0, average6Months, state.settings.clientType, state.settings.tva / 100, state.settings.tariffs).value;

      data.push({
        name: format(d, i % 3 === 0 ? 'MMM yyyy' : 'MMM', { locale: fr }),
        month: format(d, 'MMMM yyyy', { locale: fr }),
        fullDate: monthStr,
        kwh: kwh,
        rechargeKwh: rechargeKwh,
        cost: cost > 0 ? cost : calculatedCost 
      });
    }
    return data;
  }, [currentMeter.consumptions, currentMeter.recharges, average6Months, state.settings]);

  // Alerts logic
  const alerts = [];
  const currentDay = getDate(new Date());
  const startDay = state.settings.alerts?.startOfMonthDays?.[0] ?? 1;
  const endDay = state.settings.alerts?.startOfMonthDays?.[1] ?? 5;
  
  if (state.settings.alerts?.startOfMonth && currentDay >= startDay && currentDay <= endDay) {
    alerts.push({ id: 'start', type: 'info', title: "Début du mois", message: "N'oubliez pas de vérifier votre crédit et de recharger si nécessaire." });
  }
  if (state.settings.alerts?.highConsumptionThreshold && currentConso >= state.settings.alerts.highConsumptionThreshold) {
    alerts.push({ id: 'high', type: 'warning', title: "Seuil de consommation élevé", message: `Vous avez dépassé votre seuil d'alerte de ${state.settings.alerts.highConsumptionThreshold} kWh.` });
  }
  if (state.settings.alerts?.anomalyPercentage && lastMonthConso > 0) {
    const thresholdKwh = lastMonthConso * (1 + state.settings.alerts.anomalyPercentage / 100);
    if (currentConso > thresholdKwh) {
      alerts.push({ id: 'anomaly', type: 'error', title: "Hausse brutale détectée", message: `Votre consommation actuelle est anormalement plus élevée (+${Math.round(((currentConso / lastMonthConso) - 1) * 100)}%) que le mois précédent.` });
    }
  }

  useEffect(() => {
    const notifyUser = async () => {
      if (state.settings.alerts?.enableNotifications && alerts.length > 0) {
        try {
          const status = await LocalNotifications.checkPermissions();
          if (status.display === 'granted') {
            const today = new Date().toISOString().split('T')[0];
            const lastNotif = localStorage.getItem('last_alert_notif');
            
            if (lastNotif !== today) {
              const notifications = alerts.map((a, i) => ({
                id: Math.floor(Math.random() * 10000) + i, 
                title: a.title,
                body: a.message,
                schedule: { at: new Date(Date.now() + 1000 * (i + 1)) },
                ongoing: a.id === 'start',
                autoCancel: a.id !== 'start'
              }));
              
              await LocalNotifications.schedule({ notifications });
              localStorage.setItem('last_alert_notif', today);
            }
          }
        } catch (e) {
          console.error("Local notifications failed", e);
        }
      }
    };
    notifyUser();
  }, [JSON.stringify(alerts), state.settings.alerts?.enableNotifications]);

  const consumptionStatus = useMemo(() => {
    if (currentConso === 0) return null;
    
    if (lastMonthConso > 0 && state.settings.alerts?.anomalyPercentage) {
      const increase = (currentConso / lastMonthConso) - 1;
      if (increase > state.settings.alerts.anomalyPercentage / 100) {
         return { label: 'Anormale', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800' };
      }
    }
    
    if (state.settings.alerts?.highConsumptionThreshold && currentConso >= state.settings.alerts.highConsumptionThreshold) {
      return { label: 'Élevée', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800' };
    }
    
    if (average6Months > 0) {
       if (currentConso > average6Months * 1.1) return { label: 'Sup. à moy.', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800' };
       if (currentConso < average6Months * 0.9) return { label: 'Économe', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800' };
       return { label: 'Normale', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' };
    }
    
    return { label: 'Initiale', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800' };
  }, [currentConso, lastMonthConso, average6Months, state.settings.alerts]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h2>
      
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div key={alert.id} className={`flex items-start p-4 rounded-xl border ${
              alert.type === 'error' 
                ? 'bg-red-50 border-red-100 text-red-900 dark:bg-red-950/30 dark:border-red-900 dark:text-red-200' 
                : alert.type === 'warning' 
                  ? 'bg-orange-50 border-orange-100 text-orange-900 dark:bg-orange-950/30 dark:border-orange-900 dark:text-orange-200' 
                  : 'bg-blue-50 border-blue-100 text-blue-900 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-200'
            }`}>
              <div className="mr-3 mt-0.5">
                {alert.type === 'error' ? <AlertTriangle size={20} className="text-red-500" /> : alert.type === 'warning' ? <AlertCircle size={20} className="text-orange-500" /> : <Info size={20} className="text-blue-500" />}
              </div>
              <div>
                <h4 className="font-bold text-sm">{alert.title}</h4>
                <p className="text-xs opacity-90 mt-0.5">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🔋</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Énergie Restante (Est.)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">{Math.max(0, totalRechargeKwh - currentConso).toFixed(1)}</span>
            <span className="text-slate-400 font-bold uppercase text-xs">kWh</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full transition-all" style={{ width: `${Math.min(100, (Math.max(0, totalRechargeKwh - currentConso) / Math.max(1, totalRechargeKwh)) * 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-1">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Consommation du Mois</p>
            {consumptionStatus && (
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border shadow-sm ${consumptionStatus.color}`}>
                {consumptionStatus.label}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-600">{currentConso.toFixed(1)}</span>
            <span className="text-slate-400 font-bold uppercase text-xs">kWh</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
             {lastMonthConso > 0 ? (
               <>vs préc. {currentConso > lastMonthConso ? <span className="text-red-500">↗</span> : <span className="text-green-500">↘</span>}</>
             ) : 'Aucune donnée'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Prédiction Fin de Crédit</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-orange-500">
              {estimatedDaysLeft !== null ? format(addDays(new Date(), estimatedDaysLeft), 'dd MMM yyyy', { locale: fr }) : '--'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
             Basé sur ~{average6Months > 0 ? (average6Months / 30).toFixed(1) : '--'} kWh/jour
          </p>
        </div>
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Consumption History Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Évolution de la consommation</h3>
          </div>
          <div className="w-full h-[300px] relative mt-2">
             {mounted && sortedConsumptions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedConsumptions.slice(-6)} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      interval={0} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={(props) => {
                        const { x, y, payload, index } = props;
                        try {
                          const val = payload.value;
                          const d = parseISO(val + '-01');
                          const month = format(d, 'MMM', { locale: fr }).toUpperCase();
                          // Show year on 3 positions (first, middle, and last of the 6 points)
                          const showYear = index === 0 || index === 2 || index === 5;
                          
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text x={0} y={0} dy={10} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight={600}>
                                {month}
                              </text>
                              {showYear && (
                                <text x={0} y={0} dy={22} textAnchor="middle" fill="#cbd5e1" fontSize={8} fontWeight={500}>
                                  {format(d, 'yyyy')}
                                </text>
                              )}
                            </g>
                          );
                        } catch (e) {
                          return <text x={x} y={y} dy={10} textAnchor="middle" fill="#94a3b8" fontSize={10}>{payload.value.toUpperCase()}</text>;
                        }
                      }} 
                    />
                    <YAxis width={45} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: state.theme === 'dark' ? '#1e293b' : '#f1f5f9'}} 
                      contentStyle={{
                        backgroundColor: state.theme === 'dark' ? '#1e293b' : '#fff',
                        borderColor: state.theme === 'dark' ? '#334155' : '#f1f5f9',
                        color: state.theme === 'dark' ? '#f8fafc' : '#0f172a',
                        borderRadius: '0.5rem', 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      labelStyle={{ color: state.theme === 'dark' ? '#f8fafc' : '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
                      labelFormatter={(val) => {
                        try {
                          const d = parseISO(val + '-01');
                          return format(d, 'MMMM yyyy', { locale: fr });
                        } catch(e) { return val; }
                      }}
                    />
                    <Bar dataKey="kwh" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : mounted && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <p className="text-sm">Aucune donnée</p>
                </div>
              )}
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-around">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Moyenne Mensuelle</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{average6Months.toFixed(1)} kWh</p>
            </div>
            <div className="w-px bg-slate-100"></div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Coût Estimé Mens.</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{projectedCost.toLocaleString()} FCFA</p>
            </div>
          </div>
        </div>

        {/* Quick Tools */}
        <div className="lg:col-span-2 space-y-6 h-full flex flex-col">
          {/* Target Widget */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex-1">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="text-orange-500">⚡</span> Objectif du mois
            </h3>
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Facture Estimée (Moyenne)</label>
                  <div className="relative">
                    <input type="text" value={projectedCost.toLocaleString()} readOnly className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:outline-none" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">FCFA</span>
                  </div>
                </div>
               <p className="text-[10px] text-slate-400 leading-relaxed italic mt-2">
                  D'après la grille {state.settings.clientType === 'residential' ? 'Résidentielle' : 'Professionnelle'}.
               </p>
            </div>
          </div>

          {/* Recent Recharge */}
          <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg shadow-indigo-600/20 text-white">
             <h3 className="font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
               <span className="text-indigo-200">🕒</span> Dernière Recharge
             </h3>
             {lastRecharge ? (
               <div className="flex justify-between items-center">
                 <div>
                   <p className="text-2xl font-bold">{lastRecharge.montant.toLocaleString()} <span className="text-xs opacity-70">FCFA</span></p>
                   <p className="text-xs text-indigo-200 capitalize">{format(parseISO(lastRecharge.date), 'dd MMM yyyy', { locale: fr })}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-lg font-bold">+{lastRecharge.kwh.toFixed(1)}</p>
                   <p className="text-xs font-bold text-indigo-100 uppercase">kWh Reçu</p>
                 </div>
               </div>
             ) : (
                <p className="text-sm opacity-80">Aucune recharge.</p>
             )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 mt-6">
        {/* Comparaison Annuelle (12 mois) */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-[550px] overflow-x-auto no-scrollbar">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Comparaison Annuelle (12 derniers mois)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Consommation vs Recharge vs Coût. Cliquez sur la légende pour masquer.</p>
          </div>
          <div className="flex-1 w-full min-w-[500px]">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={yearlyData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }} barGap={4} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" interval={0} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', angle: -45, textAnchor: 'end' }} />
                  <YAxis yAxisId="left" stroke="#6366f1" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                  <YAxis yAxisId="right" orientation="right" stroke="#f97316" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip 
                    cursor={{fill: state.theme === 'dark' ? '#1e293b' : '#f8fafc'}} 
                    contentStyle={{
                      backgroundColor: state.theme === 'dark' ? '#1e293b' : '#fff',
                      borderColor: state.theme === 'dark' ? '#334155' : '#f1f5f9',
                      color: state.theme === 'dark' ? '#f8fafc' : '#0f172a',
                      borderRadius: '0.5rem', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    labelStyle={{ color: state.theme === 'dark' ? '#f8fafc' : '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
                    labelFormatter={(_, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.month;
                      }
                      return "";
                    }}
                  />
                  
                  <Legend 
                    iconType="circle" 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '20px', cursor: 'pointer' }}
                    onClick={(e) => {
                      if (e && typeof e.dataKey === 'string') {
                        setHiddenSeries(s => ({...s, [e.dataKey as string]: !s[e.dataKey as string]}));
                      }
                    }}
                  />
                  
                  <Bar hide={hiddenSeries['rechargeKwh']} yAxisId="left" dataKey="rechargeKwh" name="Recharge (kWh)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar hide={hiddenSeries['kwh']} yAxisId="left" dataKey="kwh" name="Consommation (kWh)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  
                  <Line hide={hiddenSeries['cost']} yAxisId="right" type="monotone" dataKey="cost" name="Coût (FCFA)" stroke="#f97316" strokeWidth={3} dot={{r: 4}} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
