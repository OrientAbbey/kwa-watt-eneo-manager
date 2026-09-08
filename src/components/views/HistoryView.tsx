import React, { useState, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { Card, CardContent } from '../ui/Card';
import { Plus, Trash2, Zap, BatteryCharging, Download, Upload, Edit, SortDesc, SortAsc } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Dialog } from '@capacitor/dialog';

export default function HistoryView() {
  const { state, currentMeter, addConsumption, updateConsumption, deleteConsumption, addRecharge, updateRecharge, deleteRecharge, importData, showToast, clearSection, setLoading } = useApp();

  const [tab, setTab] = useState<'consommations' | 'recharges'>('consommations');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState(format(new Date(), tab === 'consommations' ? 'yyyy-MM' : 'yyyy-MM-dd'));
  const [val1, setVal1] = useState(''); // kwh or montant
  const [val2, setVal2] = useState(''); // -   or kwh

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (tab === 'consommations') {
      const kwh = parseFloat(val1);
      if (!dateStr || isNaN(kwh)) return showToast('Données invalides');
      if (editingId) {
        const { value } = await Dialog.confirm({ title: 'Confirmation', message: "Voulez-vous modifier cette entrée ?" });
        if (!value) return;
        updateConsumption({ id: editingId, date: dateStr, kwh });
        showToast("Entrée modifiée");
      } else {
        addConsumption({ id: uuidv4(), date: dateStr, kwh });
        showToast("Entrée ajoutée");
      }
    } else {
      const montant = parseFloat(val1);
      const kwh = parseFloat(val2);
      if (!dateStr || isNaN(montant) || isNaN(kwh)) return showToast('Données invalides');
      if (editingId) {
        const { value } = await Dialog.confirm({ title: 'Confirmation', message: "Voulez-vous modifier cette entrée ?" });
        if (!value) return;
        updateRecharge({ id: editingId, date: dateStr, montant, kwh });
        showToast("Entrée modifiée");
      } else {
        addRecharge({ id: uuidv4(), date: dateStr, montant, kwh });
        showToast("Entrée ajoutée");
      }
    }
    setIsAdding(false);
    setEditingId(null);
    setVal1('');
    setVal2('');
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setDateStr(item.date);
    if (tab === 'consommations') {
      setVal1(item.kwh.toString());
    } else {
      setVal1(item.montant.toString());
      setVal2(item.kwh.toString());
    }
    setIsAdding(true);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const isCsv = state.settings.exportFormat === 'csv';
      const filename = `eneo_data_${format(new Date(), 'yyyyMMdd')}`;
      let output = '';
      let mimeType = '';

      if (isCsv) {
        mimeType = 'text/csv';
        const lines = ['type,id,date,kwh,montant'];
        currentMeter.consumptions.forEach(c => {
          lines.push(`consommation,${c.id},${c.date},${c.kwh},`);
        });
        currentMeter.recharges.forEach(r => {
          lines.push(`recharge,${r.id},${r.date},${r.kwh},${r.montant}`);
        });
        output = lines.join('\n');
      } else {
        mimeType = 'application/json';
        const data = {
          consumptions: currentMeter.consumptions,
          recharges: currentMeter.recharges
        };
        output = JSON.stringify(data, null, 2);
      }
      
      const fileNameWithExt = `${filename}.${isCsv ? 'csv' : 'json'}`;
      
      // Try using Capacitor native share first
      if (Capacitor.isNativePlatform()) {
        try {
          const result = await Filesystem.writeFile({
            path: fileNameWithExt,
            data: output,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
          });
          
          await Share.share({
            title: 'KWA-WATT - Export de données',
            url: result.uri,
            dialogTitle: 'Partager l\'export'
          });
          showToast("Exportation réussie");
        } catch (shareErr) {
          console.error("Native share error", shareErr);
          showToast("Indisponible sur cet appareil");
        }
      } else {
        // Fallback for web
        const blob = new Blob([output], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileNameWithExt;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Fichier téléchargé");
      }
    } catch(e) {
      showToast("Erreur lors de l'export");
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const text = evt.target?.result as string;
          if (text.trim().startsWith('{')) {
            // JSON
            const data = JSON.parse(text);
            if (data.consumptions || data.recharges) {
              importData(data.consumptions || [], data.recharges || []);
              showToast("Importation JSON réussie");
            } else {
              showToast("Format JSON non reconnu");
            }
          } else {
            // CSV
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            const consos: any[] = [];
            const recharges: any[] = [];
            
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',');
              if (cols.length >= 4) {
                const type = cols[0];
                const id = cols[1] || uuidv4();
                const dateStr = cols[2];
                const kwh = parseFloat(cols[3]);
                
                if (type === 'consommation' && dateStr && !isNaN(kwh)) {
                  consos.push({ id, date: dateStr, kwh });
                } else if (type === 'recharge' && dateStr && !isNaN(kwh)) {
                  const montant = parseFloat(cols[4] || '0');
                  recharges.push({ id, date: dateStr, kwh, montant });
                }
              }
            }
            
            if (consos.length > 0 || recharges.length > 0) {
              importData(consos, recharges);
              showToast("Importation CSV réussie");
            } else {
               showToast("Aucune donnée valide trouvée dans le CSV");
            }
          }
        } catch (err) {
          showToast("Erreur de parsing du fichier");
        } finally {
          setLoading(false);
          // clear input
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }, 500);
    };
    reader.readAsText(file);
  };

  const handleImportSampleData = () => {
    setLoading(true);
    setTimeout(() => {
      // Example data provided by user
      const consosData = [
        {"date": "2024-06", "kwh": 288.27}, {"date": "2024-07", "kwh": 261.62}, {"date": "2024-08", "kwh": 252.66},
        {"date": "2024-09", "kwh": 303.62}, {"date": "2024-10", "kwh": 311.91}, {"date": "2024-11", "kwh": 297.09},
        {"date": "2024-12", "kwh": 253.70}, {"date": "2025-01", "kwh": 252.95}, {"date": "2025-02", "kwh": 265.59},
        {"date": "2025-03", "kwh": 282.68}, {"date": "2025-04", "kwh": 261.71}, {"date": "2025-05", "kwh": 264.87},
        {"date": "2025-06", "kwh": 239.41}, {"date": "2025-07", "kwh": 174.92}, {"date": "2025-08", "kwh": 160.77},
        {"date": "2025-09", "kwh": 189.77},
      ].map(c => ({ id: uuidv4(), ...c }));

      const rechargesData = [
        {"date": "2024-12-01", "montant": 23000, "kwh": 244.1}, {"date": "2024-12-31", "montant": 1200, "kwh": 12.4},
        {"date": "2025-01-02", "montant": 23000, "kwh": 244.1}, {"date": "2025-02-01", "montant": 23000, "kwh": 244.2},
        {"date": "2025-02-26", "montant": 2500, "kwh": 26.5}, {"date": "2025-03-01", "montant": 23000, "kwh": 244.1},
        {"date": "2025-03-29", "montant": 3000, "kwh": 31.9}, {"date": "2025-04-01", "montant": 23000, "kwh": 244.1},
        {"date": "2025-04-28", "montant": 2500, "kwh": 26.6}, {"date": "2025-05-02", "montant": 23000, "kwh": 244.1},
        {"date": "2025-05-30", "montant": 2500, "kwh": 26.5}, {"date": "2025-06-02", "montant": 23000, "kwh": 244.2},
        {"date": "2025-07-03", "montant": 23000, "kwh": 244.1}, {"date": "2025-08-16", "montant": 17000, "kwh": 180.5},
        {"date": "2025-09-19", "montant": 17000, "kwh": 180.4}, {"date": "2025-10-13", "montant": 16000, "kwh": 169.9},
      ].map(r => ({ id: uuidv4(), ...r }));

      importData(consosData, rechargesData);
      setLoading(false);
      showToast('Données exemple importées avec succès !');
    }, 800);
  };

  const handleDeleteAll = async () => {
    const { value } = await Dialog.confirm({ title: 'Attention', message: `Voulez-vous supprimer toutes les données de la section ${tab === 'consommations' ? 'Consommations' : 'Recharges'} ?\nCette action est irréversible.` });
    if (value) {
      clearSection(tab === 'consommations' ? 'consumptions' : 'recharges');
      showToast("Toutes les données ont été supprimées");
    }
  };

  const sortedConsos = [...currentMeter.consumptions].sort((a,b) => sortOrder === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  const sortedRecharges = [...currentMeter.recharges].sort((a,b) => sortOrder === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 relative pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Historique</h2>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".json,.csv" />
          <button onClick={async () => {
            await Dialog.alert({ title: 'Format requis', message: `Format requis pour le fichier JSON:\n{\n  "consumptions": [{ "id": "...", "date": "YYYY-MM", "kwh": 0 }],\n  "recharges": [{ "id": "...", "date": "YYYY-MM-DD", "montant": 0, "kwh": 0 }]\n}\n\nFormat CSV:\nEntête: type,id,date,kwh,montant\nExemple (conso): consommation,,2023-11,150.5,\nExemple (recharge): recharge,,2023-11-05,50.2,5000\n\nSi une date existe déjà, l'entrée sera mise à jour.`});
            fileInputRef.current?.click();
          }} className="text-xs flex items-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded">
            <Upload size={14} className="mr-1" /> Importer file
          </button>
          <button onClick={handleExport} className="text-xs flex items-center text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded">
            <Download size={14} className="mr-1" /> Exporter
          </button>
          <button onClick={handleImportSampleData} className="text-xs flex items-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800">
             Démo
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex-1">
          <button 
            onClick={() => { setTab('consommations'); setIsAdding(false); setEditingId(null); setDateStr(format(new Date(), 'yyyy-MM')); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'consommations' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
          >
            <div className="flex items-center justify-center"><Zap size={16} className="mr-1 hidden sm:block" /> Consommations</div>
          </button>
          <button 
            onClick={() => { setTab('recharges'); setIsAdding(false); setEditingId(null); setDateStr(format(new Date(), 'yyyy-MM-dd')); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'recharges' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}
          >
            <div className="flex items-center justify-center"><BatteryCharging size={16} className="mr-1 hidden sm:block" /> Recharges</div>
          </button>
        </div>
        <button onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')} className="ml-2 p-2 bg-slate-100 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 transition-colors">
          {sortOrder === 'desc' ? <SortDesc size={20} /> : <SortAsc size={20} />}
        </button>
        <button onClick={handleDeleteAll} className="ml-2 p-2 bg-red-50 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center group" title="Supprimer tous">
          <Trash2 size={20} /> <span className="hidden sm:inline-block ml-1 text-xs font-medium">Tout supprimer</span>
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <Card className="w-full max-w-md border-indigo-200 shadow-xl">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100 border-b pb-2 mb-2">{editingId ? 'Modifier l\'entrée' : 'Ajouter une entrée'}</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mois / Date</label>
                <input type={tab === 'consommations' ? 'month' : 'date'} value={dateStr} onChange={e => setDateStr(e.target.value)} className="w-full text-sm p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
              </div>
              
              {tab === 'consommations' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Énergie (kWh)</label>
                  <input type="number" value={val1} onChange={e => setVal1(e.target.value)} className="w-full text-sm p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" placeholder="ex: 245.5" />
                </div>
              ) : (
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Montant (FCFA)</label>
                    <input type="number" value={val1} onChange={e => setVal1(e.target.value)} className="w-full text-sm p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" placeholder="ex: 23000" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Énergie (kWh)</label>
                    <input type="number" value={val2} onChange={e => setVal2(e.target.value)} className="w-full text-sm p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" placeholder="ex: 244.1" />
                  </div>
                </div>
              )}
              <div className="flex space-x-3 pt-4">
                <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 p-3 rounded-lg text-sm font-semibold transition-colors">Annuler</button>
                <button onClick={handleAdd} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg text-sm font-semibold transition-colors shadow-sm">{editingId ? 'Enregistrer' : 'Ajouter'}</button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        {tab === 'consommations' ? (
          sortedConsos.length === 0 ? <div className="text-center text-gray-400 py-10 text-sm">Aucune donnée</div> :
          sortedConsos.map(c => (
            <div key={c.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm">
              <div className="flex-1 cursor-pointer" onClick={() => handleEdit(c)}>
                <p className="font-semibold text-gray-800 dark:text-gray-100 capitalize">{format(parseISO(c.date + '-01'), 'MMMM yyyy', { locale: fr })}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{c.kwh.toFixed(2)} kWh</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(c)} className="text-indigo-400 hover:text-indigo-600 p-2"><Edit size={16} /></button>
                <button onClick={async () => {
                  const { value } = await Dialog.confirm({ title: 'Confirmation', message: "Voulez-vous supprimer cette consommation ?" });
                  if (value) {
                    deleteConsumption(c.id);
                    showToast("Consommation supprimée");
                  }
                }} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        ) : (
          sortedRecharges.length === 0 ? <div className="text-center text-gray-400 py-10 text-sm">Aucune donnée</div> :
          sortedRecharges.map(r => (
            <div key={r.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm">
              <div className="flex-1 cursor-pointer" onClick={() => handleEdit(r)}>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{format(parseISO(r.date), 'dd MMM yyyy', { locale: fr })}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{r.montant.toLocaleString()} FCFA • {r.kwh.toFixed(1)} kWh</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(r)} className="text-indigo-400 hover:text-indigo-600 p-2"><Edit size={16} /></button>
                <button onClick={async () => {
                  const { value } = await Dialog.confirm({ title: 'Confirmation', message: "Voulez-vous supprimer cette recharge ?" });
                  if (value) {
                    deleteRecharge(r.id);
                    showToast("Recharge supprimée");
                  }
                }} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Add Button */}
      {!isAdding && (
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); setVal1(''); setVal2(''); }}
          className="fixed bottom-24 right-6 bg-orange-500 text-white p-4 rounded-full shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-transform hover:scale-105 z-30"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
