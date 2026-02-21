import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Wallet, Coins, Trash2, Camera, BarChart3, Upload, PenTool, LayoutList, Settings, CheckCircle, Image as ImageIcon, Loader2, Store, Search, X, ChevronRight, Edit3, ArrowLeft, Info, ThermometerSun } from 'lucide-react';
import { ExpenseItem, CurrencyCode } from '../types';
import { compressImage, uploadImage } from '../utils/imageUtils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';

// --- 常數配置 ---
const CURRENCY_SYMBOLS: Record<string, string> = {
  TWD: 'NT$', JPY: '¥', KRW: '₩', USD: '$', EUR: '€', THB: '฿', GBP: '£', CNY: '¥', HKD: 'HK$', SGD: 'S$', VND: '₫'
};

const CATEGORIES = ['餐飲','購物','交通','住宿','娛樂','藥妝','便利商店','超市','其他'];
const METHODS = ['現金','信用卡','行動支付','IC卡','其他'];

// --- 子組件：圓餅圖 (純 CSS) ---
const DonutChart = ({ data, totalLabel }: { data: { label: string, value: number, color: string, percent: number }[], totalLabel: string }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) return (
    <div className="w-48 h-48 rounded-full border-[3px] border-dashed border-gray-300 mx-auto flex items-center justify-center text-xs text-gray-400 font-black uppercase">
      No Data
    </div>
  );
  
  let acc = 0;
  const gradients = data.map(d => {
    const deg = (d.value / total) * 360;
    const s = `${d.color} ${acc}deg ${acc + deg}deg`;
    acc += deg; return s;
  }).join(', ');

  return (
    <div className="relative w-52 h-52 rounded-full mx-auto shadow-splat-solid border-[4px] border-splat-dark" style={{ background: `conic-gradient(${gradients})` }}>
      <div className="absolute inset-8 bg-white border-[3px] border-splat-dark rounded-full flex flex-col items-center justify-center text-splat-dark text-center">
        <span className="text-3xl font-black">{data.length}</span>
        <span className="text-[10px] text-gray-400 font-black uppercase block tracking-tighter">{totalLabel}</span>
      </div>
    </div>
  );
};

// --- 子組件：每日趨勢長條圖 ---
const BarChart = ({ data }: { data: { date: string, amount: number }[] }) => {
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <div className="flex items-end justify-between h-44 gap-2 px-2 mt-4 overflow-x-auto hide-scrollbar">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group min-w-[30px]">
          <div className="w-full bg-splat-blue rounded-t-lg relative transition-all group-hover:bg-splat-pink border-x-2 border-t-2 border-splat-dark" style={{ height: `${(d.amount / max) * 100}%` }}>
             <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white border-2 border-splat-dark px-2 py-1 rounded shadow-sm text-splat-dark z-10">
               ${d.amount.toLocaleString()}
             </div>
          </div>
          <span className="text-[9px] font-black text-gray-500 rotate-45 mt-3 origin-left uppercase whitespace-nowrap">
            {d.date.slice(5).replace(/-/g,'/')}
          </span>
        </div>
      ))}
    </div>
  );
};

export const Expense = () => {
  const { trips, currentTripId, exchangeRate, addExpenseItem, deleteExpenseItem, updateExpenseItem, updateTripData, setExchangeRate } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  // 視圖狀態
  const [activeTab, setActiveTab] = useState<'record' | 'list' | 'stats'>('record');
  const [inputMode, setInputMode] = useState<'manual' | 'scan' | 'import'>('manual');
  const [statsView, setStatsView] = useState<'daily' | 'category' | 'method'>('daily');
  
  // 詳情與編輯狀態
  const [detailItem, setDetailItem] = useState<ExpenseItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 流程狀態
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const aiInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<ExpenseItem>>({
    date: new Date().toISOString().split('T')[0], currency: trip?.baseCurrency || 'JPY', 
    method: '現金', amount: 0, storeName: '', title: '', location: '', images: [], category: '餐飲', items: []
  });

  // 匯率獲取邏輯
  useEffect(() => {
    if (trip?.baseCurrency && trip.baseCurrency !== 'TWD') {
      fetch(`https://open.er-api.com/v6/latest/${trip.baseCurrency}`)
        .then(res => res.json())
        .then(data => { if(data?.rates?.TWD) setExchangeRate(data.rates.TWD); })
        .catch(() => setExchangeRate(0.21));
    } else { setExchangeRate(1); }
  }, [trip?.baseCurrency, setExchangeRate]);

  if (!trip) return null;

  // --- 統計數據運算 ---
  const expenses = trip.expenses || [];
  const totalTwd = expenses.reduce((s, e) => s + (e.currency === 'TWD' ? e.amount : e.amount * (exchangeRate || 1)), 0);
  const totalForeign = expenses.filter(e => e.currency === trip.baseCurrency).reduce((s, e) => s + e.amount, 0);
  const budget = trip.budget || 0;
  const percent = budget ? Math.min(100, Math.round((totalTwd / budget) * 100)) : 0;

  // 每日支出
  const dailyStats = expenses.reduce((acc, curr) => {
    const val = curr.currency === 'TWD' ? curr.amount : curr.amount * exchangeRate;
    acc[curr.date] = (acc[curr.date] || 0) + val;
    return acc;
  }, {} as Record<string, number>);
  const dailyData = Object.keys(dailyStats).sort().map(d => ({ date: d, amount: Math.round(dailyStats[d]) }));

  // 類別統計
  const catStats = expenses.reduce((acc, curr) => {
    const val = curr.currency === 'TWD' ? curr.amount : curr.amount * exchangeRate;
    acc[curr.category] = (acc[curr.category] || 0) + val;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(catStats).map(([k, v], i) => ({ 
    label: k, value: v, percent: Math.round((v / (totalTwd || 1)) * 100), color: ['#F03C69', '#2932CF', '#FFC000', '#21CC65', '#FF6C00'][i % 5] 
  })).sort((a,b) => b.value - a.value);

  // 支付方式統計
  const methodStats = expenses.reduce((acc, curr) => {
    const val = curr.currency === 'TWD' ? curr.amount : curr.amount * exchangeRate;
    acc[curr.method] = (acc[curr.method] || 0) + val;
    return acc;
  }, {} as Record<string, number>);
  const methodData = Object.entries(methodStats).map(([k, v], i) => ({ 
    label: k, value: v, percent: Math.round((v / (totalTwd || 1)) * 100), color: ['#60A5FA', '#F472B6', '#FBBF24', '#34D399', '#A78BFA'][i % 5] 
  })).sort((a,b) => b.value - a.value);

  const grouped = expenses.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr); return acc;
  }, {} as Record<string, ExpenseItem[]>);

  // --- Handlers ---
  const handleSave = () => {
    if (!form.amount || !form.title) return alert("資訊不完整唷！💰");
    const item: ExpenseItem = {
      id: editingId || Date.now().toString(), date: form.date!, storeName: form.storeName || '', title: form.title!, amount: Number(form.amount),
      currency: form.currency as CurrencyCode, method: form.method as any, location: form.location || '', 
      payerId: 'Admin', splitWith: [], images: form.images || [], category: form.category as any, items: form.items
    };
    if (editingId) updateExpenseItem(trip.id, editingId, item);
    else addExpenseItem(trip.id, item);
    
    setIsSuccess(true);
    setTimeout(() => { setIsSuccess(false); resetForm(); }, 1500);
  };

  const resetForm = () => {
    setForm({ date: new Date().toISOString().split('T')[0], currency: trip.baseCurrency, method: '現金', title: '', amount: 0, location: '', storeName: '', category: '餐飲', images: [], items: [] });
    setEditingId(null); setInputMode('manual');
  };

  const handleAIAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const b64 = await compressImage(file); 
      const res = await fetch('/api/analyze-receipt', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ imageBase64: b64.split(',')[1] }) 
      });
      const data = await res.json();
      const url = await uploadImage(file);
      setForm(prev => ({ 
        ...prev, storeName: data.storeName, title: data.title, amount: data.amount, 
        date: data.date, category: data.category, method: data.paymentMethod, 
        currency: data.currency || prev.currency, items: data.items, images: [url] 
      }));
      alert("AI 辨識成功！請確認欄位 ✨");
      setInputMode('manual');
    } catch (err) { alert("AI 辨識失敗，請手動填寫 🥲"); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="px-4 space-y-6 animate-fade-in pb-32 text-left h-full">
      
      {/* 總額儀表板 (IMG_6124) */}
      <div className="bg-splat-yellow border-[3px] border-splat-dark rounded-[32px] p-6 shadow-splat-solid relative overflow-hidden">
        <p className="text-[10px] font-black uppercase text-splat-dark tracking-widest bg-white inline-block px-2 py-1 rounded-md border-2 border-splat-dark -rotate-1 mb-2 relative z-10">TOTAL BALANCE (TWD)</p>
        <div className="flex justify-between items-end relative z-10 mt-1">
          <div>
            <h2 className="text-4xl font-black text-splat-dark tracking-tighter leading-none">NT$ {Math.round(totalTwd).toLocaleString()}</h2>
            <p className="text-[11px] font-black text-splat-dark/70 uppercase mt-2">{trip.baseCurrency} {Math.round(totalForeign).toLocaleString()} <span className="opacity-50">(Rate: {exchangeRate.toFixed(3)})</span></p>
          </div>
          <button onClick={() => setActiveTab('stats')} className={`w-12 h-12 rounded-xl border-[3px] border-splat-dark shadow-[2.5px_2.5px_0px_#1A1A1A] flex items-center justify-center active:translate-y-0.5 active:shadow-none transition-all ${activeTab === 'stats' ? 'bg-splat-orange text-white' : 'bg-white text-splat-dark'}`}>
            <BarChart3 size={24} strokeWidth={2.5} />
          </button>
        </div>
        <Coins className="absolute -bottom-4 -right-4 text-white opacity-40 rotate-12" size={100} />
      </div>

      <div className="flex bg-gray-200 p-1.5 rounded-[32px] border-[3px] border-splat-dark shadow-splat-solid relative z-10">
        <button onClick={() => { setActiveTab('record'); setEditingId(null); }} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full text-sm font-black transition-all ${activeTab === 'record' ? 'bg-white text-splat-dark shadow-[2px_2px_0px_#1A1A1A] border-2 border-splat-dark' : 'text-gray-500'}`}><PenTool size={16} strokeWidth={3}/> 記帳</button>
        <button onClick={() => setActiveTab('list')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full text-sm font-black transition-all ${activeTab === 'list' ? 'bg-white text-splat-dark shadow-[2px_2px_0px_#1A1A1A] border-2 border-splat-dark' : 'text-gray-500'}`}><LayoutList size={16} strokeWidth={3}/> 明細</button>
      </div>

      {/* --- 統計視圖 (IMG_6060/61/62) --- */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in slide-in-from-right pb-10">
          <button onClick={() => setActiveTab('record')} className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-splat-dark transition-colors pl-1 uppercase tracking-widest"><ArrowLeft size={14} strokeWidth={3}/> BACK TO RECORD</button>
          
          {/* 預算卡片 */}
          <div className="bg-splat-blue text-white rounded-[24px] border-[3px] border-splat-dark p-6 space-y-4 shadow-splat-solid">
            <div className="flex justify-between items-start">
              <h3 className="font-black text-xl uppercase italic tracking-tighter">BUDGET Status</h3>
              <button onClick={() => { const b = prompt("設定預算 (TWD):", trip.budget?.toString()); if(b) updateTripData(trip.id, { budget: Number(b) }); }} className="p-2 bg-white text-splat-dark rounded-full border-2 border-splat-dark active:scale-95"><Settings size={16} strokeWidth={3}/></button>
            </div>
            <div className="h-5 bg-splat-dark rounded-full overflow-hidden border-[2px] border-white shadow-inner"><div className={`h-full transition-all duration-1000 ${percent > 90 ? 'bg-splat-pink' : 'bg-splat-yellow'}`} style={{ width: `${percent}%` }} /></div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span>Used ${Math.round(totalTwd).toLocaleString()}</span><span className="text-splat-yellow">Left ${Math.round((trip.budget || 0) - totalTwd).toLocaleString()}</span></div>
          </div>

          {/* 統計選項 */}
          <div className="flex bg-gray-200 p-1 rounded-xl border-[3px] border-splat-dark">
            {['daily','category','method'].map(v => (
              <button key={v} onClick={() => setStatsView(v as any)} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statsView === v ? 'bg-white text-splat-dark border-2 border-splat-dark shadow-sm' : 'text-gray-500'}`}>
                {v === 'daily' ? '每日支出' : v === 'category' ? '支出類別' : '支付方式'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[32px] border-[3px] border-splat-dark p-8 shadow-splat-solid space-y-8">
            {statsView === 'daily' && (
              <div className="space-y-6">
                 <h3 className="text-left font-black text-splat-dark flex items-center gap-2 uppercase tracking-widest"><div className="w-1.5 h-4 bg-splat-blue rounded-full"/> Daily Trends</h3>
                 <BarChart data={dailyData} />
                 <div className="bg-gray-100 p-4 rounded-xl border-2 border-dashed border-gray-300">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1"><Info size={10}/> AI INSIGHT</p>
                    <p className="text-xs font-bold text-gray-600 leading-relaxed">支出趨勢穩定，目前餐飲佔比較高，建議多利用當地的便利商店省下部分預算唷！🦑</p>
                 </div>
              </div>
            )}
            {statsView === 'category' && (
              <div className="space-y-8">
                <DonutChart data={pieData} totalLabel="Categories" />
                <div className="grid grid-cols-1 gap-2">
                  {pieData.map(d => (
                    <div key={d.label} className="flex items-center justify-between p-3 rounded-xl border-2 border-transparent hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2 text-xs font-black text-splat-dark"><div className="w-3 h-3 rounded-full border-2 border-splat-dark shadow-sm" style={{background: d.color}}/> {d.label}</div>
                      <div className="text-right flex items-center gap-3">
                         <span className="text-xs font-black text-splat-dark">{d.percent}%</span>
                         <span className="text-[10px] font-bold text-gray-400">${Math.round(d.value).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {statsView === 'method' && (
              <div className="space-y-8">
                <DonutChart data={methodData} totalLabel="Methods" />
                <div className="grid grid-cols-1 gap-2">
                  {methodData.map(d => (
                    <div key={d.label} className="flex items-center justify-between p-3 rounded-xl border-2 border-transparent hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2 text-xs font-black text-splat-dark"><div className="w-3 h-3 rounded-full border-2 border-splat-dark shadow-sm" style={{background: d.color}}/> {d.label}</div>
                      <div className="text-right flex items-center gap-3">
                         <span className="text-xs font-black text-splat-dark">{d.percent}%</span>
                         <span className="text-[10px] font-bold text-gray-400">${Math.round(d.value).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 記帳輸入分頁 --- */}
      {activeTab === 'record' && (
        <div className="bg-white rounded-[32px] border-[3px] border-splat-dark p-6 space-y-6 animate-in fade-in relative overflow-hidden shadow-splat-solid">
          {isSuccess && <div className="absolute inset-0 bg-white/95 z-30 flex flex-col items-center justify-center animate-in zoom-in"><CheckCircle size={56} className="text-splat-green mb-3" strokeWidth={2.5}/><p className="font-black text-xl uppercase tracking-widest text-splat-dark">SUCCESS! ✨</p></div>}
          
          <div className="flex gap-2">
            <button onClick={() => setInputMode('scan')} className={`flex-1 py-4 rounded-xl border-[3px] flex flex-col items-center gap-1 transition-all font-black ${inputMode === 'scan' ? 'bg-splat-pink border-splat-dark text-white shadow-splat-solid-sm -translate-y-1' : 'border-gray-200 text-gray-300'}`}><Camera size={20} strokeWidth={3} /><span className="text-[10px] uppercase">Scan</span></button>
            <button onClick={() => setInputMode('import')} className={`flex-1 py-4 rounded-xl border-[3px] flex flex-col items-center gap-1 transition-all font-black ${inputMode === 'import' ? 'bg-splat-green border-splat-dark text-white shadow-splat-solid-sm -translate-y-1' : 'border-gray-200 text-gray-300'}`}><Upload size={20} strokeWidth={3} /><span className="text-[10px] uppercase">Import</span></button>
            <button onClick={() => setInputMode('manual')} className={`flex-1 py-4 rounded-xl border-[3px] flex flex-col items-center gap-1 transition-all font-black ${inputMode === 'manual' ? 'bg-splat-blue border-splat-dark text-white shadow-splat-solid-sm -translate-y-1' : 'border-gray-100 text-gray-300'}`}><PenTool size={20} strokeWidth={3} /><span className="text-[10px] uppercase">Manual</span></button>
          </div>

          {(inputMode === 'scan' || inputMode === 'import') && (
            <div className="border-[3px] border-dashed border-splat-dark rounded-[24px] p-10 text-center space-y-4 bg-gray-50 relative">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center z-50 py-4 text-splat-blue">
                  <Loader2 className="animate-spin mb-2" size={40} strokeWidth={3}/>
                  <span className="text-sm font-black animate-pulse tracking-widest uppercase">AI ANALYZING...</span>
                </div>
              ) : <><p className="text-splat-dark font-black text-[10px] uppercase tracking-widest bg-white inline-block px-3 py-1 border-2 border-splat-dark rounded-md -rotate-1 mb-2">Receipt Processor</p><button onClick={() => aiInputRef.current?.click()} className="btn-splat w-full py-4 bg-splat-yellow text-splat-dark uppercase text-sm">Select receipt ➔</button>
              <input ref={aiInputRef} type="file" accept="image/*" capture={inputMode === 'scan' ? "environment" : undefined} className="hidden" onChange={handleAIAnalyze} /></>}
            </div>
          )}

          <div className={`space-y-5 transition-all ${isProcessing ? 'opacity-30 pointer-events-none' : ''}`}>
            {/* 店家名稱 (Top Position) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">店家名稱 *</label>
              <div className="flex gap-2 relative items-center">
                <Store className="absolute left-4 text-gray-300 pointer-events-none" size={20}/>
                <input placeholder="例如：FamilyMart 難波店" value={form.storeName} onChange={e => setForm({...form, storeName: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-gray-100 border-[3px] border-splat-dark rounded-xl font-black text-splat-dark outline-none focus:bg-white transition-colors" />
              </div>
            </div>

            {/* 日期 (Centered) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">消費日期</label>
              <div className="flex justify-center bg-gray-100 border-[3px] border-splat-dark rounded-xl focus-within:bg-white transition-colors overflow-hidden h-14">
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-transparent font-black text-splat-dark text-center text-lg outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[10px] font-black text-splat-pink uppercase ml-1">* 消費金額</label><input type="number" inputMode="decimal" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full p-4 bg-gray-100 border-[3px] border-splat-dark rounded-xl text-2xl font-black text-splat-dark outline-none focus:bg-white" placeholder="0" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-1">貨幣幣別</label>
                <div className="flex gap-2 h-14">
                  {[trip.baseCurrency, 'TWD'].map(c => <button key={c} onClick={() => setForm({...form, currency: c as any})} className={`flex-1 rounded-xl font-black border-[3px] transition-all ${form.currency === c ? 'bg-splat-green border-splat-dark text-white shadow-sm' : 'bg-white border-gray-100 text-gray-300'}`}>{c}</button>)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-1">分類標籤</label>
                 <select value={form.category} onChange={e => setForm({...form, category: e.target.value as any})} className="w-full h-14 px-4 bg-gray-100 border-[3px] border-splat-dark rounded-xl font-black outline-none appearance-none focus:bg-white cursor-pointer uppercase text-xs">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
               </div>
               <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-1">支付方式</label>
                 <select value={form.method} onChange={e => setForm({...form, method: e.target.value as any})} className="w-full h-14 px-4 bg-gray-100 border-[3px] border-splat-dark rounded-xl font-black outline-none appearance-none focus:bg-white cursor-pointer uppercase text-xs">{METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select>
               </div>
            </div>

            {/* 加大照片上傳 */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-splat-blue uppercase ml-1 tracking-widest">Receipt Photo</label>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-44 bg-white border-[3px] border-dashed border-splat-dark rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors relative overflow-hidden group active:scale-[0.99] shadow-inner">
                {isUploadingImg && <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50"><Loader2 className="animate-spin text-splat-blue" size={32} strokeWidth={3}/></div>}
                {form.images?.[0] ? <><img src={form.images[0]} loading="lazy" className="w-full h-full object-cover pointer-events-none"/><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-[10px] font-black border-2 border-white px-3 py-1 rounded-full uppercase">Update Photo</span></div></> : <><Camera size={36} strokeWidth={2}/><span className="text-[10px] font-black mt-2 uppercase tracking-widest">Tap to add photo</span></>}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async e => {
                const file = e.target.files?.[0];
                if(file){ e.target.value = ''; setIsUploadingImg(true); try { const url = await uploadImage(file); setForm(prev => ({ ...prev, images: [url] })); } catch(err) { alert("上傳失敗"); } finally { setIsUploadingImg(false); } }
              }} />
            </div>

            <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-1">摘要備註</label>
              <input placeholder="例如：買了限定公仔、宵夜..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-4 bg-gray-100 border-[3px] border-splat-dark rounded-xl font-black text-splat-dark outline-none focus:bg-white" />
            </div>
            <button onClick={handleSave} className="btn-splat w-full py-5 text-xl mt-2 bg-splat-blue text-white shadow-splat-solid active:shadow-none active:translate-y-1 uppercase tracking-widest">Confirm & Save ➔</button>
          </div>
        </div>
      )}

      {/* --- 消費明細視圖 --- */}
      {activeTab === 'list' && (
        <div className="space-y-8 animate-in slide-in-from-right pb-10">
          {Object.keys(grouped).sort((a,b) => b.localeCompare(a)).map(date => {
            const dayDiff = differenceInDays(parseISO(date), parseISO(trip.startDate)) + 1;
            return (
              <div key={date} className="space-y-3">
                <h3 className="text-[11px] font-black text-splat-dark pl-3 border-l-[4px] border-splat-pink flex items-center gap-2 uppercase tracking-widest bg-white inline-block py-1 pr-3 rounded-r-md border-y-2 border-r-2 shadow-sm">
                  DAY {dayDiff} <span className="opacity-40">{format(parseISO(date), 'MM/dd')}</span>
                </h3>
                {grouped[date].map(e => {
                  const sym = CURRENCY_SYMBOLS[e.currency] || e.currency;
                  return (
                    <div key={e.id} onClick={() => setDetailItem(e)} className="bg-white border-[3px] border-splat-dark rounded-[20px] shadow-splat-solid p-4 flex justify-between items-center group active:translate-y-1 active:shadow-none transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl border-2 border-splat-dark flex items-center justify-center text-white font-black text-sm shadow-sm ${e.category === '餐飲' ? 'bg-splat-orange' : e.category === '交通' ? 'bg-splat-blue' : 'bg-splat-green'}`}>{e.category?.slice(0,1) || '其'}</div>
                        <div className="flex-1 min-w-0"><h3 className="font-black text-splat-dark text-base truncate w-32 uppercase tracking-tight">{e.storeName || e.title}</h3><p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{e.method} • {e.category}</p></div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-black text-xl text-splat-dark leading-none mb-1">{sym} {e.amount.toLocaleString()}</p>
                          <p className="text-[9px] text-gray-400 font-black tracking-widest uppercase">≈ ${Math.round(e.currency === 'TWD' ? e.amount : e.amount * exchangeRate)}</p>
                        </div>
                        <ChevronRight className="text-gray-300" size={18} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {expenses.length === 0 && <div className="text-center py-20 bg-white border-[3px] border-dashed border-gray-400 rounded-[32px] text-gray-500 font-black italic shadow-sm uppercase tracking-widest">Empty Wallet 🏮</div>}
        </div>
      )}

      {/* --- 明細詳情 Modal --- */}
      {detailItem && (
         <div className="fixed inset-0 bg-splat-dark/95 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setDetailItem(null)}>
            <div className="bg-[#F4F5F7] w-full max-w-sm rounded-[40px] border-[4px] border-splat-dark shadow-[10px_10px_0px_#1A1A1A] overflow-hidden" onClick={e => e.stopPropagation()}>
               <div className="relative h-72 bg-gray-200 border-b-[4px] border-splat-dark">
                  {detailItem.images?.[0] ? <img src={detailItem.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center bg-white gap-2"><ImageIcon size={64} className="text-gray-200" strokeWidth={1}/><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Receipt Photo</span></div>}
                  <button onClick={() => setDetailItem(null)} className="absolute top-5 right-5 bg-white p-2 rounded-full border-2 border-splat-dark shadow-sm active:scale-90 transition-transform"><X size={20} strokeWidth={3}/></button>
               </div>
               <div className="p-6 space-y-6">
                  <div className="flex justify-between items-start">
                     <div className="flex-1 pr-4">
                        <h2 className="text-2xl font-black text-splat-dark uppercase italic tracking-tighter break-all">{detailItem.storeName || detailItem.title}</h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                           <span className="text-[9px] font-black text-white bg-splat-dark px-2 py-0.5 rounded border border-splat-dark uppercase">{detailItem.date}</span>
                           <span className="text-[9px] font-black text-splat-dark bg-white px-2 py-0.5 rounded border border-splat-dark uppercase">{detailItem.category}</span>
                        </div>
                     </div>
                     <div className="text-right shrink-0">
                        <p className="text-3xl font-black text-splat-blue">{CURRENCY_SYMBOLS[detailItem.currency] || detailItem.currency}{detailItem.amount.toLocaleString()}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">≈ NT$ {Math.round(detailItem.amount * exchangeRate)}</p>
                     </div>
                  </div>
                  
                  <div className="bg-white p-5 rounded-2xl border-[3px] border-splat-dark shadow-sm space-y-4">
                     <div className="flex justify-between text-[11px] font-black uppercase tracking-widest border-b-2 border-dashed border-gray-100 pb-2"><span className="text-gray-400">Payment</span><span className="font-black">{detailItem.method}</span></div>
                     <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Description</span>
                        <p className="text-sm font-bold text-splat-dark leading-relaxed">{detailItem.title || "No description provided."}</p>
                        {detailItem.items && detailItem.items.length > 0 && (
                           <div className="mt-2 pt-2 border-t-2 border-dashed border-gray-100 space-y-1">
                              {detailItem.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-xs font-black text-gray-500"><span>• {it.name}</span><span>{it.price}</span></div>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="flex gap-4">
                     <button onClick={() => { setForm(detailItem); setEditingId(detailItem.id); setDetailItem(null); setActiveTab('record'); }} className="flex-1 py-4 bg-white border-[3px] border-splat-dark rounded-2xl font-black text-splat-dark flex items-center justify-center gap-2 active:translate-y-1 shadow-splat-solid-sm uppercase tracking-widest"><Edit3 size={18} strokeWidth={3}/> Edit</button>
                     <button onClick={() => { if(confirm('⚠️ DELETE RECORD PERMANENTLY?')) { deleteExpenseItem(trip.id, detailItem.id); setDetailItem(null); } }} className="flex-1 py-4 bg-white border-[3px] border-splat-dark rounded-2xl font-black text-splat-pink flex items-center justify-center gap-2 active:translate-y-1 shadow-splat-solid-sm uppercase tracking-widest"><Trash2 size={18} strokeWidth={3}/> Delete</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};













