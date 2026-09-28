import React, { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { calculateKwh, calculatePrice, calculateAverageConsumption } from '../../lib/eneo';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { ArrowDownUp, Info } from 'lucide-react';
import { cn, sortByDate, MONETARY_UNIT } from '../../lib/utils';
import { Consumption } from '../../types';
import TrancheSimulatorCard from '../features/TrancheSimulatorCard';
import { useRemoteConfig } from '../../store/RemoteConfigContext';

type Mode = 'PRICE_TO_KWH' | 'KWH_TO_PRICE';

export default function CalculatorView() {
  const { state, currentMeter } = useApp();
  const { config } = useRemoteConfig();
  const minAmount = config.minRechargeAmount;
  const [mode, setMode] = useState<Mode>('KWH_TO_PRICE');
  const [inputValue, setInputValue] = useState<string>('');
  
  // Calculate running values
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const autoCumulConsom = currentMeter.consumptions.find(c => c.date === currentMonth)?.kwh || 0;
  
  const sortedConsumptions = useMemo(() => 
    sortByDate<Consumption>(currentMeter.consumptions, 'asc'), 
  [currentMeter.consumptions]);
  
  const autoAverage6Months = useMemo(() => 
    calculateAverageConsumption(sortedConsumptions.map(c => c.kwh)), 
  [sortedConsumptions]);

  // Local state for independent overrides
  const [manualCumul, setManualCumul] = useState<string>((autoCumulConsom ?? 0).toString());
  const [manualAverage, setManualAverage] = useState<string>((autoAverage6Months ?? 0).toString());
  const [manualClientType, setManualClientType] = useState<"residential" | "professional">(state.settings.clientType ?? "residential");
  const [manualTva, setManualTva] = useState<string>((state.settings.tva ?? 19.25).toString());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const parsedCumul = parseFloat(manualCumul) || 0;
  const parsedAverage = parseFloat(manualAverage) || 0;
  const parsedTva = (parseFloat(manualTva) || 0) / 100;

  const result = useMemo(() => {
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0) return null;

    if (mode === 'KWH_TO_PRICE') {
      return calculatePrice(val, parsedCumul, parsedAverage, manualClientType, parsedTva, state.settings.tariffs);
    } else {
      return calculateKwh(val, parsedCumul, parsedAverage, manualClientType, parsedTva, state.settings.tariffs);
    }
  }, [inputValue, mode, parsedCumul, parsedAverage, manualClientType, parsedTva, state.settings.tariffs]);

  const toggleMode = () => {
    setMode(m => m === 'KWH_TO_PRICE' ? 'PRICE_TO_KWH' : 'KWH_TO_PRICE');
    setInputValue('');
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Outil de calcul</h2>
      
      <Card>
        <CardContent className="p-1">
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
            <button 
              onClick={() => setMode('KWH_TO_PRICE')}
              className={cn("flex-1 py-2 text-sm font-medium rounded-lg transition-all", mode === 'KWH_TO_PRICE' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800/50')}
            >
              kWh → {MONETARY_UNIT}
            </button>
            <button 
              onClick={() => setMode('PRICE_TO_KWH')}
              className={cn("flex-1 py-2 text-sm font-medium rounded-lg transition-all", mode === 'PRICE_TO_KWH' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800/50')}
            >
              {MONETARY_UNIT} → kWh
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {mode === 'KWH_TO_PRICE' ? 'Consommation estimée (kWh)' : `Montant à payer (${MONETARY_UNIT})`}
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={mode === 'KWH_TO_PRICE' ? 'ex: 150' : 'ex: 15000'}
                  className="w-full text-xl p-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 font-medium font-mono">
                  {mode === 'KWH_TO_PRICE' ? 'kWh' : MONETARY_UNIT}
                </div>
              </div>
            </div>

            <div className="flex justify-center my-2">
              <button onClick={toggleMode} className="p-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-full hover:bg-gray-100 transition-colors text-gray-500 dark:text-gray-400">
                <ArrowDownUp size={20} />
              </button>
            </div>

            {/* Context Info & Overrides */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 p-4 rounded-xl space-y-3 mt-4">
              <div className="flex items-center justify-between font-medium text-slate-800 dark:text-slate-100">
                <div className="flex items-center">
                  <Info size={16} className="mr-2 text-indigo-500" />
                  Paramètres de calcul
                </div>
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-indigo-600 font-bold hover:underline">
                  {showAdvanced ? 'Masquer paramètres' : 'Modifier les valeurs'}
                </button>
              </div>

              {showAdvanced ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Type de Client</label>
                    <select 
                      value={manualClientType} 
                      onChange={(e) => setManualClientType(e.target.value as "residential" | "professional")}
                      className="w-full text-sm p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg mt-1"
                    >
                      <option value="residential">Résidentiel</option>
                      <option value="professional">Professionnel</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">TVA (%)</label>
                    <input 
                      type="number" 
                      value={manualTva} 
                      onChange={(e) => setManualTva(e.target.value)} 
                      className="w-full text-sm p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Moyenne Tarifaire (kWh)</label>
                    <input 
                      type="number" 
                      value={manualAverage} 
                      onChange={(e) => setManualAverage(e.target.value)} 
                      className="w-full text-sm p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Déjà Consommé (kWh)</label>
                    <input 
                      type="number" 
                      value={manualCumul} 
                      onChange={(e) => setManualCumul(e.target.value)} 
                      className="w-full text-sm p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600 grid grid-cols-2 gap-y-1">
                  <div>Client: <strong>{manualClientType === 'residential' ? 'Résidentiel' : 'Professionnel'}</strong></div>
                  <div>TVA: <strong>{manualTva}%</strong></div>
                  <div>Moy. Tarifaire: <strong>{parsedAverage} kWh</strong></div>
                  <div>Déjà consommé: <strong>{parsedCumul} kWh</strong></div>
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Achat minimum */}
      {result && (
        (mode === 'PRICE_TO_KWH' && parseFloat(inputValue) < minAmount) ||
        (mode === 'KWH_TO_PRICE' && result.value < minAmount)
      ) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-3 rounded-r-lg text-sm text-amber-800 dark:text-amber-200">
          L'achat minimum de kWh est de <strong>{minAmount.toLocaleString('fr-FR')} {MONETARY_UNIT}</strong> : un montant inférieur ne peut pas être rechargé sur le compteur.
        </div>
      )}

      {/* Result Card */}
      {result && (
        <Card className="bg-indigo-600 text-white border-transparent">
          <CardHeader className="p-6 pb-2 border-b-0">
            <CardTitle className="text-indigo-100 text-sm font-normal">
              {mode === 'KWH_TO_PRICE' ? 'Montant estimé :' : 'Énergie obtenue :'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-4xl font-bold mb-4 font-mono">
              {mode === 'KWH_TO_PRICE' ? (
                <>{result.value.toLocaleString()} <span className="text-xl font-normal text-indigo-200">{MONETARY_UNIT}</span></>
              ) : (
                <>{result.value} <span className="text-xl font-normal text-indigo-200">kWh</span></>
              )}
            </div>

            <div className="bg-indigo-700/50 p-4 rounded-xl mt-4 text-xs font-mono whitespace-pre-wrap leading-relaxed border border-indigo-500/50">
              {result.descriptionLines.map((line, idx) => (
                <div key={idx} className={idx === result.descriptionLines.length - 1 ? 'mt-3 pt-3 border-t border-indigo-400/50 font-bold' : 'mb-1'}>
                  {line}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TrancheSimulatorCard />

    </div>
  );
}
