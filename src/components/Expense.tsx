// filepath: src/components/Expense.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Wallet, Coins, Trash2, Camera, BarChart3, Upload, PenTool, LayoutList, Settings, CheckCircle, Image as ImageIcon, Loader2, Search } from 'lucide-react';
import { ExpenseItem, CurrencyCode } from '../types';
import { compressImage, uploadImage } from '../utils/imageUtils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';

// 📍 修正：貨幣符號對照表
const CURRENCY_SYMBOLS: Record<string, string> = {
  TWD: 'NT$', JPY: '¥', KRW: '₩', USD: '$', EUR: '€', THB: '฿', GBP: '£', CNY: '¥', HKD: 'HK$', SGD: 'S$', VND: '₫'
};

const DonutChart = ({ data, totalLabel }: { data: { label: string, value: number, color: string }[], totalLabel: string }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <div className="w-48 h-48 rounded-full border-[3px] border-dashed border-gray-300 mx-auto flex items-center justify-center text-xs text-gray-400 font-black">無數據</div>;
  let acc = 0;
  const gradients = data.map(d => {
    const deg = (d.value / total) * 360;
    const s = `${d.color} ${acc}deg ${acc + deg}deg`;
    acc += deg; return s;
  }).join(', ');
  return (
    <div className="relative w-44 h-44 rounded-full mx-auto border-[4px] border-splat-dark shadow-splat-solid" style={{ background: `conic-gradient(${gradients})` }}>
      <div className="absolute inset-5 bg-white border-[3px] border-splat-dark rounded-full flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black text-splat-dark">{data.length}</span>
        <span className="text-[9px] text-gray-500 font-bold uppercase block">{totalLabel}</span>
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
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [statsView, setStatsView] = useState<'daily' | 'category' | 'method'>('category');

  const aiInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<ExpenseItem>>({
    date: new Date().toISOString().split('T')[0], currency: trip?.baseCurrency || 'JPY', 
    method: '現金', amount: 0, title: '', location: '', storeName: '', category: '餐飲', images: [], items: []
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
  
  // 📍 修正：總金額計算 (以台幣為主)
  const totalTwd = expenses.reduce((s, e) => s + (e.currency === 'TWD' ? e.amount : e.amount * (exchangeRate || 1)), 0);
  const totalForeign = expenses.filter(e => e.currency === trip.baseCurrency).reduce((s, e) => s + e.amount, 0);
  
  const budget = trip.budget || 0;
  const percent = budget ? Math.min(100, Math.round((totalTwd / budget) * 100)) : 0;

  const handleSave = () => {
    if (!form.title || !form.amount) return alert("內容跟金額要填唷！💰");
    const item: ExpenseItem = {
      id: editingId || Date.now().toString(), date: form.date!, storeName: form.storeName || '', title: form.title!, amount: Number(form.amount),
      currency: form.currency as CurrencyCode, method: form.method as any, location: form.location || '', 
      payerId: 'Admin', splitWith: [], images: form.images || [], category: form.category || '其他', items: form.items
    };
    if (editingId) updateExpenseItem(trip.id, editingId, item);
    else addExpenseItem(trip.id, item);
    setIsSuccess(true);
    setTimeout(() => { setIsSuccess(false); setEditingId(null); setForm({ date: new Date().toISOString().split('T')[0], currency: trip.baseCurrency, method: '現金', title: '', amount: 0, location: '', storeName: '', category: '餐飲', images: [], items: [] }); setActiveTab('record'); setInputMode('manual'); }, 1500);
  };

  const handleAIAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsProcessing(true);
    try {
      const b64 = await compressImage(file, true); 
      const res = await fetch('/api/analyze-receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: b64.split(',')[1] }) });
      const data = await res.json();
      const url = await uploadImage(file);
      setForm(prev => ({ 
        ...prev, 
        storeName: data.storeName || prev.storeName, 
        title: data.title || prev.title, 
        amount: data.amount || prev.amount, 
        date: data.date || prev.date, 
        category: data.category || '餐飲', 
        method: data.paymentMethod || '現金',
        currency: data.currency || prev.currency, 
        items: data.items, 
        images: [url] 
      }));
      alert("AI 辨識成功！請確認欄位 ✨");
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

  const pieData = Object.entries(categoryStats).map(([k, v], i) => ({ label: k, value: v, color: ['#F03C69', '#2932CF', '#FFC000', '#21CC65', '#FF6C00'][i % 5] }));

  return (
    <div className="px-4 space-y-6 animate-fade-in pb-28 text-left">
      
      {/* 📍 修正：頂部餘額卡片 (以台幣為主，顯示外幣) */}
      <div className="bg-splat-yellow border-[3px] border-splat-dark rounded-[32px] p-6 shadow-splat-solid relative overflow-hidden">
        <p className="text-[10px] font-black uppercase text-splat-dark tracking-widest bg-white inline-block px-2 py-1 rounded-md border-2 border-splat-dark -rotate-1 mb-2 relative z-10">TOTAL BALANCE (TWD)</p>
        <div className="flex justify-between items-end relative z-10 mt-1">
          <div>
            <h2 className="text-4xl font-black text-splat-dark tracking-tighter leading-none">NT$ {Math.round(totalTwd).toLocaleString()}</h2>
            <p className="text-[11px] font-black text-splat-dark/70 uppercase mt-2">{trip.baseCurrency} {Math.round(totalForeign).toLocaleString()} <span className="opacity-50">(Rate: {exchangeRate.toFixed(3)})</span></p>
          </div>
          <button onClick={() => setActiveTab('stats')} className="w-12 h-12 bg-white text-splat-dark rounded-xl border-[3px] border-splat-dark shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center active:translate-y-0.5 active:shadow-none transition-all">
            <BarChart3 size={24} strokeWidth={2.5} />
          </button>
        </div>
        <Coins className="absolute -bottom-4 -right-4 text-white opacity-40 rotate-12" size={100} />
      </div>

      <div className="flex bg-gray-200 p-1.5 rounded-[32px] border-[3px] border-splat-dark shadow-splat-solid relative z-10">
        <button onClick={() => setActiveTab('record')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[24px] text-sm font-black transition-all ${activeTab === 'record' ? 'bg-white text-splat-dark shadow-[2px_2px_0px_#1A1A1A] border-2 border-splat-dark' : 'text-gray-500 border-2 border-transparent hover:text-gray-700'}`}><PenTool size={16} strokeWidth={3}/> 記帳</button>
        <button onClick={() => setActiveTab('list')} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[24px] text-sm font-black transition-all ${activeTab === 'list' ? 'bg-white text-splat-dark shadow-[2px_2px_0px_#1A1A1A] border-2 border-splat-dark' : 'text-gray-500 border-2 border-transparent hover:text-gray-700'}`}><LayoutList size={16} strokeWidth={3}/> 明細</button>
      </div>

      {activeTab === 'stats' ? (
        <div className="space-y-6 animate-in slide-in-from-right">
          <div className="bg-splat-blue text-white rounded-[24px] border-[3px] border-splat-dark p-6 space-y-4 shadow-splat-solid">
            <div className="flex justify-between items-start">
              <h3 className="font-black text-xl uppercase italic">Budget 預算</h3>
              <button onClick={() => { const b = prompt("設定預算 (TWD):", trip.budget?.toString()); if(b) updateTripData(trip.id, { budget: Number(b) }); }} className="p-2 bg-white text-splat-dark rounded-full border-2 border-splat-dark active:scale-95"><Settings size={16} strokeWidth={3}/></button>
            </div>
            <div className="h-5 bg-splat-dark rounded-full overflow-hidden border-[2px] border-white"><div className={`h-full transition-all duration-1000 ${percent > 90 ? 'bg-splat-pink' : 'bg-splat-yellow'}`} style={{ width: `${percent}%` }} /></div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span>Used ${Math.round(totalTwd).toLocaleString()}</span><span className="text-splat-yellow">Left ${Math.round(budget - totalTwd).toLocaleString()}</span></div>
          </div>
          
          <div className="flex bg-gray-200 p-1 rounded-xl border-[3px] border-splat-dark">
            {['daily','category','method'].map(v => (
              <button key={v} onClick={() => setStatsView(v as any)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statsView === v ? 'bg-white text-splat-dark border-2 border-splat-dark shadow-sm' : 'text-gray-500 border-2 border-transparent'}`}>
                {v === 'daily' ? '每日' : v === 'category' ? '類別' : '支付'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[32px] border-[3px] border-splat-dark p-8 shadow-splat-solid text-center">
            <h3 className="text-left font-black text-splat-dark mb-6 flex items-center gap-2"><div className="w-1 h-5 bg-splat-pink rounded-full"/> 分析報告</h3>
            <DonutChart data={pieData} totalLabel="Categories" />
          </div>
        </div>
      ) : activeTab === 'record' ? (
            <div className="bg-white rounded-[32px] border-[3px] border-splat-dark p-6 space-y-6 animate-in fade-in relative overflow-hidden shadow-splat-solid">
              {isSuccess && <div className="absolute inset-0 bg-white/95 z-30 flex flex-col items-center justify-center animate-in zoom-in"><CheckCircle size={56} className="text-splat-green mb-3" strokeWidth={2.5}/><p className="font-black text-xl text-splat-dark">儲存成功！✨</p></div>}
              
              <div className="flex gap-2">
                {['scan','import','manual'].map(m => (
                  <button key={m} onClick={() => setInputMode(m as any)} className={`flex-1 py-4 rounded-xl border-[3px] flex flex-col items-center gap-1 transition-all font-black ${inputMode === m ? 'bg-splat-blue text-white border-splat-dark shadow-splat-solid-sm -translate-y-1' : 'border-gray-200 text-gray-400'}`}>
                    {m === 'scan' ? <Camera size={20}/> : m === 'import' ? <Upload size={20}/> : <PenTool size={20}/>}
                    <span className="text-[10px] uppercase">{m}</span>
                  </button>
                ))}
              </div>

              {(inputMode === 'scan' || inputMode === 'import') && (
                <div className="border-[3px] border-dashed border-splat-dark rounded-[24px] p-8 text-center space-y-4 bg-gray-50 relative">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center z-50 py-4 text-splat-blue">
                      <Loader2 className="animate-spin mb-2" size={40} strokeWidth={3}/>
                      <span className="text-sm font-black animate-pulse tracking-widest">AI ANALYZING...</span>
                    </div>
                  ) : <><p className="text-splat-dark font-black text-xs uppercase tracking-widest bg-white inline-block px-3 py-1 border-2 border-splat-dark rounded-md -rotate-1">Receipt Scan</p><button onClick={() => aiInputRef.current?.click()} className="btn-splat w-full py-4 bg-splat-yellow text-splat-dark">{inputMode === 'scan' ? '開啟相機' : '選擇照片'}</button>
                  <input ref={aiInputRef} type="file" accept="image/*" capture={inputMode === 'scan' ? "environment" : undefined} className="hidden" onChange={handleAIAnalyze} /></>}
                </div>
              )}

              <div className={`space-y-5 transition-all ${isProcessing ? 'opacity-30 pointer-events-none' : ''}`}>
                
                {/* 📍 修正：店家資訊移至最上方 */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-1">店家名稱 *</label>
                  <input placeholder="例如：7-11 新宿店" value={form.storeName} onChange={e => setForm({...form, storeName: e.target.value})} className="w-full p-4 bg-gray-100 border-[3px] border-splat-dark rounded-xl font-black text-splat-dark outline-none focus:bg-white" />
                </div>

                {/* 📍 修正：日期對齊與置中 */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-1">日期</label>
                  <div className="flex justify-center bg-gray-100 border-[3px] border-splat-dark rounded-xl overflow-hidden focus-within:bg-white transition-colors">
                    <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full h-14 bg-transparent font-black text-splat-dark text-center text-lg outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-black text-splat-pink uppercase ml-1">* 金額</label><input type="number" inputMode="decimal" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full h-14 px-4 bg-gray-100 border-[3px] border-splat-dark rounded-xl text-2xl font-black text-splat-dark outline-none focus:bg-white" placeholder="0" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-1">幣別</label>
                    <div className="flex gap-2 h-14">
                      {[trip.baseCurrency, 'TWD'].map(c => <button key={c} onClick={() => setForm({...form, currency: c as any})} className={`flex-1 rounded-xl font-black border-[3px] transition-all ${form.currency === c ? 'bg-splat-green border-splat-dark text-white shadow-sm' : 'bg-white border-gray-300 text-gray-400'}`}>{c}</button>)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-1">類別</label>
                     <select value={form.category} onChange={e => setForm({...form, category: e.target.value as any})} className="w-full h-14 px-4 bg-gray-100 border-[3px] border-splat-dark rounded-xl font-black outline-none appearance-none focus:bg-white cursor-pointer">
                        {['餐飲','購物','交通','住宿','娛樂','藥妝','便利商店','超市','其他'].map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-1">付款方式</label>
                     <select value={form.method} onChange={e => setForm({...form, method: e.target.value as any})} className="w-full h-14 px-4 bg-gray-100 border-[3px] border-splat-dark rounded-xl font-black outline-none appearance-none focus:bg-white cursor-pointer">
                        {['現金','信用卡','行動支付','IC卡','其他'].map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                   </div>
                </div>

                <div className="space-y-1"><label className="text-[10px] font-black text-splat-blue uppercase ml-1">* 消費摘要</label>
                  <div className="flex gap-2">
                    <input placeholder="買了什麼呢？" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="flex-1 p-4 bg-gray-100 border-[3px] border-splat-dark rounded-xl font-black text-splat-dark outline-none focus:bg-white" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-white border-[3px] border-splat-dark rounded-xl flex items-center justify-center relative overflow-hidden active:scale-95 transition-transform shadow-splat-solid-sm">
                      {isUploadingImg && <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50"><Loader2 className="animate-spin text-splat-dark" size={24} strokeWidth={3}/></div>}
                      {form.images?.[0] ? <img src={form.images[0]} loading="lazy" className="w-full h-full object-cover pointer-events-none"/> : <ImageIcon size={24}/>}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async e => {
                      if(e.target.files?.[0]){ setIsUploadingImg(true); try { const url = await uploadImage(e.target.files[0]); setForm(prev => ({ ...prev, images: [url] })); } catch(err) { alert("上傳失敗"); } finally { setIsUploadingImg(false); } }
                    }} />
                  </div>
                </div>
                <button onClick={handleSave} className="btn-splat w-full py-5 text-xl mt-4 bg-splat-blue text-white">{editingId ? '確認更新 ➔' : '完成記帳 ➔'}</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right pb-10">
              {Object.keys(grouped).sort((a,b) => b.localeCompare(a)).map(date => {
                const dayDiff = differenceInDays(parseISO(date), parseISO(trip.startDate)) + 1;
                return (
                  <div key={date} className="space-y-3">
                    <h3 className="text-[11px] font-black text-splat-dark pl-3 border-l-[4px] border-splat-pink flex items-center gap-2 uppercase tracking-widest bg-white inline-block py-1 pr-3 rounded-r-md border-y-2 border-r-2 shadow-sm">
                      DAY {dayDiff} <span className="opacity-40">{format(parseISO(date), 'MM/dd')}</span>
                    </h3>
                    {grouped[date].map(e => {
                      // 📍 修正：取得對應的貨幣符號
                      const curSymbol = CURRENCY_SYMBOLS[e.currency] || e.currency;
                      return (
                        <div key={e.id} onClick={() => { setForm(e); setEditingId(e.id); setActiveTab('record'); }} className="bg-white border-[3px] border-splat-dark rounded-[20px] shadow-splat-solid p-4 flex justify-between items-center group active:translate-y-1 active:shadow-none transition-all cursor-pointer [content-visibility:auto] [contain-intrinsic-size:80px]">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl border-2 border-splat-dark flex items-center justify-center text-white font-black text-sm shadow-sm ${e.category === '餐飲' ? 'bg-splat-orange' : e.category === '交通' ? 'bg-splat-blue' : 'bg-splat-green'}`}>{e.category?.slice(0,1) || '其'}</div>
                            <div><h3 className="font-black text-splat-dark text-base truncate w-28 uppercase">{e.storeName || e.title}</h3><p className="text-[9px] font-black text-gray-400 uppercase">{e.method} • {e.category}</p></div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            {/* 📍 修正：金額加上貨幣符號 (IMG_6123) */}
                            <div>
                              <p className="font-black text-xl text-splat-dark leading-none mb-1">{curSymbol} {e.amount.toLocaleString()}</p>
                              <p className="text-[9px] text-gray-400 font-black tracking-widest">≈ NT$ {Math.round(e.currency === 'TWD' ? e.amount : e.amount * exchangeRate)}</p>
                            </div>
                            <button onClick={(ev) => { ev.stopPropagation(); if(confirm('要刪除嗎？')) deleteExpenseItem(trip.id, e.id); }} className="p-2 bg-gray-100 border-2 border-splat-dark rounded-xl text-red-500 hover:bg-splat-pink hover:text-white transition-colors"><Trash2 size={16} strokeWidth={2.5}/></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              {expenses.length === 0 && <div className="text-center py-20 bg-white border-[3px] border-dashed border-gray-400 rounded-[32px] text-gray-500 font-black italic shadow-sm">目前沒有紀錄唷！🪙</div>}
            </div>
          )}
    </div>
  );
};











