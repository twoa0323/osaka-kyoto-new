import React, { useState, useMemo, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Wallet, Coins, MapPin, Image as ImageIcon, Trash2, Camera, X, Edit3, BarChart3, ScanLine, Upload, PenTool, LayoutList, Settings, CheckCircle, Search, ChevronRight } from 'lucide-react';
import { ExpenseItem, CurrencyCode } from '../types';
import { compressImage } from '../utils/imageUtils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';

// --- CSS 統計圖表組件 ---
const DonutChart = ({ data, totalLabel }: { data: { label: string, value: number, color: string }[], totalLabel: string }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <div className="w-48 h-48 rounded-full bg-ac-bg mx-auto flex items-center justify-center text-xs opacity-50">尚無數據</div>;
  let accumulatedDeg = 0;
  const gradients = data.map(d => {
    const deg = (d.value / total) * 360;
    const str = `${d.color} ${accumulatedDeg}deg ${accumulatedDeg + deg}deg`;
    accumulatedDeg += deg;
    return str;
  }).join(', ');
  return (
    <div className="relative w-44 h-44 rounded-full mx-auto shadow-zakka" style={{ background: `conic-gradient(${gradients})` }}>
      <div className="absolute inset-6 bg-[#1A1A1A] rounded-full flex flex-col items-center justify-center text-white">
        <span className="text-3xl font-black">{data.length}</span>
        <span className="text-[9px] opacity-40 font-bold uppercase">{totalLabel}</span>
      </div>
    </div>
  );
};

export const Expense = () => {
  const { trips, currentTripId, exchangeRate, addExpenseItem, deleteExpenseItem, updateExpenseItem, updateTripData } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  const [activeTab, setActiveTab] = useState<'record' | 'list' | 'stats'>('record');
  const [inputMode, setInputMode] = useState<'manual' | 'scan' | 'import'>('manual');
  const [statsView, setStatsView] = useState<'daily' | 'category' | 'method'>('category');

  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<ExpenseItem>>({
    date: new Date().toISOString().split('T')[0],
    currency: trip?.baseCurrency || 'JPY', method: '現金', amount: 0, title: '', location: '', images: [], category: '飲食', items: []
  });

  if (!trip) return null;

  // --- 統計數據計算 ---
  const totalTwd = (trip.expenses || []).reduce((s, e) => s + (e.currency === 'TWD' ? e.amount : e.amount * exchangeRate), 0);
  const budget = trip.budget || 0;
  const remaining = budget - totalTwd;
  const percent = budget ? Math.min(100, Math.round((totalTwd / budget) * 100)) : 0;

  const categoryStats = (trip.expenses || []).reduce((acc, curr) => {
    const twd = curr.currency === 'TWD' ? curr.amount : curr.amount * exchangeRate;
    acc[curr.category] = (acc[curr.category] || 0) + twd;
    return acc;
  }, {} as Record<string, number>);

  const methodStats = (trip.expenses || []).reduce((acc, curr) => {
    const twd = curr.currency === 'TWD' ? curr.amount : curr.amount * exchangeRate;
    acc[curr.method] = (acc[curr.method] || 0) + twd;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryStats).map(([k, v], i) => ({
    label: k, value: v, color: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F9AC7D'][i % 5]
  }));

  const methodData = Object.entries(methodStats).map(([k, v], i) => ({
    label: k, value: v, color: ['#60A5FA', '#A78BFA', '#F472B6'][i % 3]
  }));

  // --- 邏輯操作 ---

  const handleSave = () => {
    if (!form.title || !form.amount) return alert("內容跟金額要填唷！💰");
    const item: ExpenseItem = {
      id: editingId || Date.now().toString(),
      date: form.date!, title: form.title!, amount: Number(form.amount),
      currency: form.currency as CurrencyCode, method: form.method as any,
      location: form.location || '', payerId: 'Admin', splitWith: [], images: form.images || [], 
      category: form.category || '其他', items: form.items
    };
    if (editingId) updateExpenseItem(trip.id, editingId, item);
    else addExpenseItem(trip.id, item);
    setIsSuccess(true);
    setTimeout(() => { setIsSuccess(false); resetForm(); }, 1500);
  };

  const resetForm = () => {
    setForm({ date: new Date().toISOString().split('T')[0], currency: trip.baseCurrency, method: '現金', title: '', amount: 0, location: '', images: [], category: '飲食', items: [] });
    setEditingId(null);
  };

  const handleAIAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsProcessing(true);
    try {
      const base64 = await compressImage(e.target.files[0]);
      const response = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64.split(',')[1] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setForm(prev => ({ ...prev, title: data.title, amount: data.amount, date: data.date, category: data.category, items: data.items, images: [base64] }));
      alert("AI 辨識成功！請確認內容 ✨");
      setInputMode('manual');
    } catch (err) { alert("辨識失敗，請手動輸入 🥲"); }
    finally { setIsProcessing(false); }
  };

  // --- 明細分組渲染 ---
  const grouped = (trip.expenses || []).reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {} as Record<string, ExpenseItem[]>);

  return (
    <div className="px-6 space-y-6 animate-fade-in pb-28 text-left">
      
      {/* 1. Dashboard */}
      <div className="flex gap-4">
        <div className="card-zakka bg-[#8D775F] text-white border-none p-5 flex-1 flex flex-col justify-between shadow-xl">
           <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Total Expenses</p>
           <div>
              <h2 className="text-2xl font-black italic">NT$ {Math.round(totalTwd).toLocaleString()}</h2>
              <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">1 {trip.baseCurrency} ≈ {exchangeRate} TWD</p>
           </div>
        </div>
        <button onClick={() => setActiveTab('stats')} className={`w-20 card-zakka border-none flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${activeTab === 'stats' ? 'bg-ac-orange text-white' : 'bg-white text-ac-brown'}`}>
          <BarChart3 size={24} /><span className="text-[9px] font-black">統計</span>
        </button>
      </div>

      {activeTab === 'stats' ? (
        <div className="space-y-6 animate-in slide-in-from-right">
          {/* 預算卡片 (IMG_6060) */}
          <div className="card-zakka bg-[#1A1A1A] text-white border-none p-6 space-y-4">
            <div className="flex justify-between items-start">
               <div><h3 className="font-black text-lg">預算與剩餘額度</h3><p className="text-[10px] opacity-40 font-bold uppercase">Budget Tracking</p></div>
               <button onClick={() => {const b=prompt("設定總預算 (TWD):"); if(b) updateTripData(trip.id, {budget: Number(b)} )}} className="p-2 bg-white/10 rounded-full"><Settings size={14}/></button>
            </div>
            <div className="space-y-1">
               <div className="flex justify-between text-xs font-bold mb-1"><span>已使用 ${Math.round(totalTwd).toLocaleString()}</span><span className="opacity-50">上限 ${budget.toLocaleString()}</span></div>
               <div className="h-3 bg-white/10 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${percent > 90 ? 'bg-red-400' : 'bg-ac-green'}`} style={{width: `${percent}%`}} /></div>
            </div>
          </div>

          {/* 統計分類切換 */}
          <div className="flex bg-ac-bg p-1 rounded-2xl border-2 border-ac-border">
            {['daily','category','method'].map(v => (
              <button key={v} onClick={() => setStatsView(v as any)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statsView === v ? 'bg-white text-ac-brown shadow-sm' : 'text-ac-border'}`}>
                {v === 'daily' ? '每日支出' : v === 'category' ? '支出類別' : '支付方式'}
              </button>
            ))}
          </div>

          <div className="card-zakka bg-[#1A1A1A] text-white border-none p-8 text-center space-y-8">
             {statsView === 'category' && <><DonutChart data={pieData} totalLabel="Types" />
             <div className="grid grid-cols-2 gap-3 text-left">
                {pieData.map(d => <div key={d.label} className="flex items-center gap-2 text-xs font-bold"><div className="w-2 h-2 rounded-full" style={{background: d.color}}/>{d.label} <span className="opacity-30 ml-auto">${Math.round(d.value).toLocaleString()}</span></div>)}
             </div></>}
             
             {statsView === 'method' && <><DonutChart data={methodData} totalLabel="Methods" />
             <div className="grid grid-cols-2 gap-3 text-left">
                {methodData.map(d => <div key={d.label} className="flex items-center gap-2 text-xs font-bold"><div className="w-2 h-2 rounded-full" style={{background: d.color}}/>{d.label} <span className="opacity-30 ml-auto">${Math.round(d.value).toLocaleString()}</span></div>)}
             </div></>}

             {statsView === 'daily' && <div className="py-10 text-ac-border font-black italic">每日趨勢統計中...</div>}
          </div>
          <button onClick={() => setActiveTab('record')} className="w-full py-4 text-ac-border font-black text-[10px] uppercase tracking-[0.3em]">Back to Record</button>
        </div>
      ) : (
        <>
          <div className="flex bg-white p-1.5 rounded-full border-4 border-ac-border shadow-zakka">
            <button onClick={() => setActiveTab('record')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-black transition-all ${activeTab === 'record' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}><PenTool size={16}/> 記帳</button>
            <button onClick={() => setActiveTab('list')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-black transition-all ${activeTab === 'list' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}><LayoutList size={16}/> 明細</button>
          </div>

          {activeTab === 'record' && (
            <div className="card-zakka bg-white p-6 space-y-6 animate-in fade-in relative overflow-hidden">
              {isSuccess && <div className="absolute inset-0 bg-white/95 z-30 flex flex-col items-center justify-center animate-in zoom-in"><CheckCircle size={48} className="text-ac-green mb-2"/><p className="font-black">儲存成功！</p></div>}
              
              {/* 模式切換 (IMG_6052) */}
              <div className="flex gap-2">
                <button onClick={() => setInputMode('scan')} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 ${inputMode === 'scan' ? 'border-ac-orange bg-orange-50 text-ac-orange' : 'border-ac-border text-ac-border'}`}><Camera size={20}/><span className="text-[9px] font-black">掃描</span></button>
                <button onClick={() => setInputMode('import')} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 ${inputMode === 'import' ? 'border-ac-green bg-green-50 text-ac-green' : 'border-ac-border text-ac-border'}`}><Upload size={20}/><span className="text-[9px] font-black">匯入</span></button>
                <button onClick={() => setInputMode('manual')} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 ${inputMode === 'manual' ? 'border-blue-400 bg-blue-50 text-blue-500' : 'border-ac-border text-ac-border'}`}><PenTool size={20}/><span className="text-[9px] font-black">手動</span></button>
              </div>

              {(inputMode === 'scan' || inputMode === 'import') && (
                <div className="border-4 border-dashed border-ac-border rounded-[32px] p-10 text-center space-y-4 bg-ac-bg">
                  {isProcessing ? <div className="flex flex-col items-center text-ac-green animate-pulse"><ScanLine size={48}/><p className="font-black mt-2">AI 分析中...</p></div> : 
                  <><p className="text-ac-brown font-bold text-xs">辨識收據內容自動帶入</p><button onClick={() => aiInputRef.current?.click()} className="btn-zakka px-8 py-3">{inputMode === 'scan' ? '開啟相機' : '選擇照片'}</button>
                  <input ref={aiInputRef} type="file" accept="image/*" capture={inputMode === 'scan' ? "environment" : undefined} className="hidden" onChange={handleAIAnalyze} /></>}
                </div>
              )}

              <div className={`space-y-5 transition-all ${inputMode !== 'manual' ? 'opacity-30 pointer-events-none' : ''}`}>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ac-brown/40 uppercase">日期</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown text-center" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-black text-ac-orange uppercase">* 金額</label><input type="number" inputMode="decimal" placeholder="0" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl text-2xl font-black text-ac-brown outline-none" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">幣別</label><div className="flex gap-2">{[trip.baseCurrency, 'TWD'].map(c => <button key={c} onClick={() => setForm({...form, currency: c as any})} className={`flex-1 h-[62px] rounded-xl font-black border-2 ${form.currency === c ? 'bg-[#E2F1E7] border-ac-green text-ac-green' : 'bg-white border-ac-border text-ac-border'}`}>{c}</button>)}</div></div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">地點</label><div className="flex gap-2"><input placeholder="尋找商店名稱" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="flex-1 p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-bold" /><button onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(form.location || trip.dest)}`)} className="w-14 h-14 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-center text-blue-500 active:scale-95"><Search size={20}/></button></div></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-ac-orange uppercase">* 項目名稱</label>
                  <div className="flex gap-2"><input placeholder="例如：午餐" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="flex-1 p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-[#E2F1E7] border-2 border-ac-green rounded-2xl flex items-center justify-center text-ac-green overflow-hidden">{form.images?.[0] ? <img src={form.images[0]} className="w-full h-full object-cover"/> : <ImageIcon size={24}/>}</button></div>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={async e => {if(e.target.files?.[0]){const b=await compressImage(e.target.files[0]);setForm({...form, images:[b]});}}} />
                </div>
                <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl">{editingId ? '確認更新 ➔' : '完成記帳 ➔'}</button>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-8 animate-in slide-in-from-right pb-10">
              {Object.keys(grouped).sort((a,b) => b.localeCompare(a)).map(date => {
                const dayDiff = differenceInDays(parseISO(date), parseISO(trip.startDate)) + 1;
                return (
                  <div key={date} className="space-y-3">
                    <h3 className="text-[11px] font-black text-ac-border pl-2 border-l-4 border-ac-orange flex items-center gap-2 uppercase tracking-widest">
                       Day {dayDiff} <span className="opacity-40">{format(parseISO(date), 'MM/dd')}</span>
                    </h3>
                    {grouped[date].map(e => (
                      <div key={e.id} onClick={() => handleEdit(e)} className="card-zakka bg-white flex justify-between items-center group active:scale-95 transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${e.category === '飲食' ? 'bg-orange-400' : 'bg-ac-green'}`}>{e.category?.slice(0,1)}</div>
                          <div><h3 className="font-black text-ac-brown truncate w-32">{e.title}</h3><p className="text-[9px] font-bold text-ac-border uppercase">{e.method} • {e.currency}</p></div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div><p className="font-black text-ac-brown text-lg">{e.amount.toLocaleString()}</p></div>
                          <button onClick={(ev) => {ev.stopPropagation(); deleteExpenseItem(trip.id, e.id);}} className="p-2 text-ac-orange/30 hover:text-ac-orange transition-colors"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

