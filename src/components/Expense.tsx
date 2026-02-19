// filepath: src/components/Expense.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Wallet, Coins, MapPin, Image as ImageIcon, Trash2, Camera, X, Edit3, BarChart3, ScanLine, Upload, PenTool, LayoutList, Settings, CheckCircle, Search } from 'lucide-react';
import { ExpenseItem, CurrencyCode } from '../types';
import { compressImage, uploadImage } from '../utils/imageUtils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const DonutChart = ({ data, totalLabel }: { data: { label: string, value: number, color: string }[], totalLabel: string }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <div className="w-48 h-48 rounded-full bg-ac-bg mx-auto flex items-center justify-center text-xs opacity-50 font-black">無數據</div>;
  let acc = 0;
  const gradients = data.map(d => {
    const deg = (d.value / total) * 360;
    const s = `${d.color} ${acc}deg ${acc + deg}deg`;
    acc += deg; return s;
  }).join(', ');
  return (
    <div className="relative w-44 h-44 rounded-full mx-auto shadow-zakka" style={{ background: `conic-gradient(${gradients})` }}>
      <div className="absolute inset-6 bg-[#1A1A1A] rounded-full flex flex-col items-center justify-center text-white text-center">
        <span className="text-3xl font-black">{data.length}</span>
        <span className="text-[9px] opacity-40 font-bold uppercase block">{totalLabel}</span>
      </div>
    </div>
  );
};

export const Expense = () => {
  const { trips, currentTripId, exchangeRate, addExpenseItem, deleteExpenseItem, updateExpenseItem, updateTripData, setExchangeRate } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [activeTab, setActiveTab] = useState<'record' | 'list' | 'stats'>('record');
  const [inputMode, setInputMode] = useState<'manual' | 'scan' | 'import'>('manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<ExpenseItem>>({
    date: new Date().toISOString().split('T')[0], currency: trip?.baseCurrency || 'JPY', 
    method: '現金', amount: 0, title: '', location: '', images: [], category: '飲食', items: []
  });

  useEffect(() => {
    if (trip?.baseCurrency && trip.baseCurrency !== 'TWD') {
      fetch(`https://open.er-api.com/v6/latest/${trip.baseCurrency}`)
        .then(res => res.json())
        .then(data => { if(data?.rates?.TWD) setExchangeRate(data.rates.TWD); })
        .catch(() => setExchangeRate(0.21));
    } else { setExchangeRate(1); }
  }, [trip?.baseCurrency, setExchangeRate]);

  if (!trip) return null;

  const expenses = trip.expenses || [];
  const totalTwd = expenses.reduce((s, e) => s + (e.currency === 'TWD' ? e.amount : e.amount * (exchangeRate || 1)), 0);
  const budget = trip.budget || 0;
  const percent = budget ? Math.min(100, Math.round((totalTwd / budget) * 100)) : 0;

  const handleSave = () => {
    if (!form.title || !form.amount) return alert("內容跟金額要填唷！💰");
    const item: ExpenseItem = {
      id: editingId || Date.now().toString(), date: form.date!, title: form.title!, amount: Number(form.amount),
      currency: form.currency as CurrencyCode, method: form.method as any, location: form.location || '', 
      payerId: 'Admin', splitWith: [], images: form.images || [], category: form.category || '其他', items: form.items
    };
    if (editingId) updateExpenseItem(trip.id, editingId, item);
    else addExpenseItem(trip.id, item);
    setIsSuccess(true);
    setTimeout(() => { setIsSuccess(false); setEditingId(null); setViewModeToRecord(); }, 1500);
  };

  const setViewModeToRecord = () => {
    setForm({ date: new Date().toISOString().split('T')[0], currency: trip.baseCurrency, method: '現金', title: '', amount: 0, location: '', images: [], category: '飲食', items: [] });
    setActiveTab('record'); setInputMode('manual');
  };

  const handleAIAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // 提早清空
    setIsProcessing(true);
    try {
      const b64 = await compressImage(file); // AI 需要 base64 解析
      const res = await fetch('/api/analyze-receipt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64.split(',')[1] })
      });
      const data = await res.json();
      const url = await uploadImage(file); // 實際儲存為雲端 URL
      setForm(prev => ({ ...prev, title: data.title, amount: data.amount, date: data.date, category: data.category, items: data.items, images: [url] }));
      alert("AI 辨識成功！✨");
      setInputMode('manual');
    } catch (err) { alert("辨識失敗，請手動輸入 🥲"); }
    finally { setIsProcessing(false); }
  };

  const grouped = expenses.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr); return acc;
  }, {} as Record<string, ExpenseItem[]>);

  const categoryStats = expenses.reduce((acc, curr) => {
    const twd = curr.currency === 'TWD' ? curr.amount : curr.amount * exchangeRate;
    acc[curr.category || '其他'] = (acc[curr.category || '其他'] || 0) + twd;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryStats).map(([k, v], i) => ({
    label: k, value: v, color: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F9AC7D'][i % 5]
  }));

  return (
    <div className="px-6 space-y-6 animate-fade-in pb-28 text-left">
      <div className="flex gap-4">
        <div className="card-zakka bg-[#8D775F] text-white border-none p-5 flex-1 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <p className="text-[10px] font-black uppercase opacity-60 tracking-widest z-10">Total Balance</p>
          <div className="z-10">
            <h2 className="text-2xl font-black italic">NT$ {Math.round(totalTwd).toLocaleString()}</h2>
            <p className="text-[9px] font-bold opacity-40 uppercase">1 {trip.baseCurrency} ≈ {exchangeRate.toFixed(3)} TWD</p>
          </div>
          <Coins className="absolute -bottom-4 -right-4 text-white opacity-10 rotate-12" size={80} />
        </div>
        <button onClick={() => setActiveTab('stats')} className={`w-20 card-zakka border-none flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${activeTab === 'stats' ? 'bg-ac-orange text-white shadow-inner' : 'bg-white text-ac-brown'}`}>
          <BarChart3 size={24} /><span className="text-[9px] font-black">統計</span>
        </button>
      </div>

      {activeTab === 'stats' ? (
        <div className="space-y-6 animate-in slide-in-from-right">
          <div className="card-zakka bg-[#1A1A1A] text-white border-none p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div><h3 className="font-black text-lg">預算規劃</h3></div>
              <button onClick={() => { const b = prompt("設定預算 (TWD):", trip.budget?.toString()); if(b) updateTripData(trip.id, { budget: Number(b) }); }} className="p-2 bg-white/10 rounded-full"><Settings size={16}/></button>
            </div>
            <div className="h-4 bg-white/20 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-1000 ${percent > 90 ? 'bg-red-400' : 'bg-ac-green'}`} style={{ width: `${percent}%` }} /></div>
            <div className="flex justify-between text-[10px] font-black uppercase"><span>已用 ${Math.round(totalTwd).toLocaleString()}</span><span className="text-ac-green">剩餘 ${Math.round(budget - totalTwd).toLocaleString()}</span></div>
          </div>
          <div className="card-zakka bg-white border-4 border-ac-border p-8 text-center shadow-zakka">
             <h3 className="text-left font-black text-ac-brown mb-6 flex items-center gap-2"><div className="w-1 h-4 bg-ac-orange rounded-full"/> 支出類別統計</h3>
             <DonutChart data={pieData} totalLabel="Categories" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex bg-white p-1.5 rounded-full border-4 border-ac-border shadow-zakka relative z-10">
            <button onClick={() => setActiveTab('record')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-black transition-all ${activeTab === 'record' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}><PenTool size={16}/> 記帳</button>
            <button onClick={() => setActiveTab('list')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-black transition-all ${activeTab === 'list' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}><LayoutList size={16}/> 明細</button>
          </div>

          {activeTab === 'record' && (
            <div className="card-zakka bg-white p-6 space-y-6 animate-in fade-in relative overflow-hidden shadow-zakka">
              {isSuccess && <div className="absolute inset-0 bg-white/95 z-30 flex flex-col items-center justify-center animate-in zoom-in"><CheckCircle size={48} className="text-ac-green mb-2"/><p className="font-black">儲存成功！✨</p></div>}
              <div className="flex gap-2">
                <button onClick={() => setInputMode('scan')} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${inputMode === 'scan' ? 'border-ac-orange bg-orange-50 text-ac-orange' : 'border-ac-border text-ac-border'}`}><Camera size={20} /><span className="text-[9px] font-black">掃描</span></button>
                <button onClick={() => setInputMode('import')} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${inputMode === 'import' ? 'border-ac-green bg-green-50 text-ac-green' : 'border-ac-border text-ac-border'}`}><Upload size={20} /><span className="text-[9px] font-black">匯入</span></button>
                <button onClick={() => setInputMode('manual')} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${inputMode === 'manual' ? 'border-blue-400 bg-blue-50 text-blue-500' : 'border-ac-border text-ac-border'}`}><PenTool size={20} /><span className="text-[9px] font-black">手動</span></button>
              </div>

              {(inputMode === 'scan' || inputMode === 'import') && (
                <div className="border-4 border-dashed border-ac-border rounded-[32px] p-10 text-center space-y-4 bg-ac-bg">
                  {isProcessing ? <div className="flex flex-col items-center text-ac-green animate-pulse"><ScanLine size={48}/><p className="font-black mt-2">AI 分析中...</p></div> : 
                  <><p className="text-ac-brown font-bold text-xs opacity-50 uppercase tracking-widest">Receipt Scan</p><button onClick={() => aiInputRef.current?.click()} className="btn-zakka px-8 py-3">{inputMode === 'scan' ? '相機拍照' : '選擇照片'}</button>
                  <input ref={aiInputRef} type="file" accept="image/*" capture={inputMode === 'scan' ? "environment" : undefined} className="hidden" onChange={handleAIAnalyze} /></>}
                </div>
              )}

              <div className={`space-y-5 transition-all ${isProcessing ? 'opacity-30 pointer-events-none' : ''}`}>
                <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest pl-1">日期</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown text-center outline-none" /></div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-black text-ac-orange uppercase pl-1">* 金額</label><input type="number" inputMode="decimal" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl text-2xl font-black text-ac-brown outline-none" placeholder="0" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase pl-1">幣別</label><div className="flex gap-2 h-[66px]">{[trip.baseCurrency, 'TWD'].map(c => <button key={c} onClick={() => setForm({...form, currency: c as any})} className={`flex-1 rounded-xl font-black border-2 ${form.currency === c ? 'bg-[#E2F1E7] border-ac-green text-ac-green shadow-sm' : 'bg-white border-ac-border text-ac-border'}`}>{c}</button>)}</div></div>
                </div>

                <div className="space-y-1"><label className="text-[10px] font-black text-ac-orange uppercase pl-1">* 項目名稱</label>
                  <div className="flex gap-2"><input placeholder="買了什麼呢？" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="flex-1 p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-[#E2F1E7] border-2 border-ac-green rounded-2xl flex items-center justify-center text-ac-green overflow-hidden relative active:scale-90 transition-transform">{form.images?.[0] ? <img src={form.images[0]} className="w-full h-full object-cover"/> : <ImageIcon size={24}/>}</button></div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async e => {
                    const file = e.target.files?.[0];
                    if(file){
                      e.target.value = '';
                      const url = await uploadImage(file);
                      setForm(prev => ({ ...prev, images: [url] }));
                    }
                  }} />
                </div>
                <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl mt-2 shadow-zakka">{editingId ? '確認更新 ➔' : '完成記帳 ➔'}</button>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-8 animate-in slide-in-from-right pb-10">
              {Object.keys(grouped).sort((a,b) => b.localeCompare(a)).map(date => {
                const dayDiff = differenceInDays(parseISO(date), parseISO(trip.startDate)) + 1;
                return (
                  <div key={date} className="space-y-3">
                    <h3 className="text-[11px] font-black text-ac-border pl-2 border-l-4 border-ac-orange flex items-center gap-2 uppercase tracking-[0.2em]">DAY {dayDiff} <span className="opacity-30">{format(parseISO(date), 'MM/dd')}</span></h3>
                    {grouped[date].map(e => (
                      <div key={e.id} onClick={() => { setForm(e); setEditingId(e.id); setActiveTab('record'); }} className="card-zakka bg-white flex justify-between items-center group active:scale-95 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xs ${e.category === '飲食' ? 'bg-orange-400' : 'bg-ac-green'}`}>{e.category?.slice(0,1) || '其'}</div>
                          <div><h3 className="font-black text-ac-brown text-sm truncate w-28">{e.title}</h3><p className="text-[9px] font-bold text-ac-border uppercase">{e.method} • {e.currency}</p></div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div><p className="font-black text-ac-brown">{e.amount.toLocaleString()}</p><p className="text-[8px] opacity-30 font-black">≈ ${Math.round(e.currency === 'TWD' ? e.amount : e.amount * exchangeRate)}</p></div>
                          <button onClick={(ev) => { ev.stopPropagation(); if(confirm('要刪除嗎？')) deleteExpenseItem(trip.id, e.id); }} className="p-2 bg-ac-bg rounded-lg text-ac-orange/40 hover:text-ac-orange transition-colors"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
              {expenses.length === 0 && <div className="text-center py-20 text-ac-border font-black italic opacity-30">目前沒有紀錄唷！🏮</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
};






