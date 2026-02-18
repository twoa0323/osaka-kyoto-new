import React, { useState, useMemo, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Wallet, Coins, MapPin, Image as ImageIcon, Trash2, Camera, X, Edit3, BarChart3, ScanLine, Upload, PenTool, LayoutList, Settings, CheckCircle } from 'lucide-react';
import { ExpenseItem, CurrencyCode } from '../types';
import { compressImage } from '../utils/imageUtils';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';

// --- 純 CSS 甜甜圈圖組件 ---
const DonutChart = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <div className="w-48 h-48 rounded-full bg-ac-bg mx-auto flex items-center justify-center text-xs opacity-50">無數據</div>;
  
  let accumulatedDeg = 0;
  const gradients = data.map(d => {
    const deg = (d.value / total) * 360;
    const str = `${d.color} ${accumulatedDeg}deg ${accumulatedDeg + deg}deg`;
    accumulatedDeg += deg;
    return str;
  }).join(', ');

  return (
    <div className="relative w-48 h-48 rounded-full mx-auto shadow-zakka" style={{ background: `conic-gradient(${gradients})` }}>
      <div className="absolute inset-5 bg-white rounded-full flex flex-col items-center justify-center text-ac-brown">
        <span className="text-3xl font-black">{data.length}</span>
        <span className="text-[10px] opacity-50 font-bold uppercase">Categories</span>
      </div>
    </div>
  );
};

export const Expense = () => {
  const { trips, currentTripId, exchangeRate, addExpenseItem, deleteExpenseItem, updateExpenseItem, updateTripData } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  // 視圖狀態
  const [activeTab, setActiveTab] = useState<'record' | 'list' | 'stats'>('record');
  const [inputMode, setInputMode] = useState<'manual' | 'scan' | 'import'>('manual');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null); // 一般圖片
  const aiInputRef = useRef<HTMLInputElement>(null);   // AI 分析用

  const [form, setForm] = useState<Partial<ExpenseItem>>({
    date: new Date().toISOString().split('T')[0],
    currency: trip?.baseCurrency || 'TWD',
    method: '現金', amount: 0, title: '', location: '', images: [], splitWith: [], category: '飲食'
  });

  if (!trip) return null;

  // --- Actions ---

  const handleSave = () => {
    if (!form.title || !form.amount) return alert("請填入內容與金額！💰");
    const itemData: ExpenseItem = {
      id: editingId || Date.now().toString(),
      date: form.date!, title: form.title!, amount: Number(form.amount),
      currency: form.currency as CurrencyCode, method: form.method as any,
      location: form.location || '', payerId: 'Admin', splitWith: [], 
      images: form.images || [], category: form.category || '其他',
      items: form.items // AI 辨識出的細項
    };

    if (editingId) {
      updateExpenseItem(trip.id, editingId, itemData);
      alert("更新成功！✨");
    } else {
      addExpenseItem(trip.id, itemData);
      // 成功動畫
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ date: new Date().toISOString().split('T')[0], currency: trip.baseCurrency, method: '現金', title: '', amount: 0, location: '', images: [], category: '飲食', items: [] });
    setEditingId(null);
    setInputMode('manual');
  };

  const handleAIAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    try {
      const base64 = await compressImage(file);
      const cleanBase64 = base64.split(',')[1];

      // 呼叫後端 API
      const response = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: cleanBase64 })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // 自動填入
      setForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        amount: data.amount || prev.amount,
        date: data.date || prev.date,
        currency: (['TWD', 'JPY', 'KRW', 'USD', 'EUR', 'VND'].includes(data.currency) ? data.currency : prev.currency) as any,
        items: data.items,
        category: data.category || '其他',
        images: [base64] // 附上收據圖
      }));
      alert("AI 辨識完成！請確認內容 ✨");
      setInputMode('manual'); // 轉回手動介面確認
    } catch (err) {
      console.error(err);
      alert("辨識失敗，請重試或手動輸入 🥲");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (item: ExpenseItem) => {
    setForm(item);
    setEditingId(item.id);
    setActiveTab('record');
    setInputMode('manual');
  };

  // --- 統計計算 ---
  const totalTwd = (trip.expenses || []).reduce((s, e) => s + (e.currency === 'TWD' ? e.amount : e.amount * exchangeRate), 0);
  const remaining = (trip.budget || 0) - totalTwd;
  const percent = trip.budget ? Math.min(100, Math.round((totalTwd / trip.budget) * 100)) : 0;

  const categoryStats = (trip.expenses || []).reduce((acc, curr) => {
    const twd = curr.currency === 'TWD' ? curr.amount : curr.amount * exchangeRate;
    const cat = curr.category || '其他';
    acc[cat] = (acc[cat] || 0) + twd;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryStats).map(([k, v], i) => ({
    label: k, value: v, color: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F7FFF7', '#FF9F1C'][i % 6]
  }));

  // --- 明細分組 ---
  const groupedExpenses = (trip.expenses || []).reduce((groups, item) => {
    const date = item.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
    return groups;
  }, {} as Record<string, ExpenseItem[]>);

  // --- UI Render ---

  return (
    <div className="px-6 space-y-6 animate-fade-in pb-24 text-left">
      
      {/* 頂部 Dashboard */}
      <div className="flex gap-4 items-stretch">
        <div className="card-zakka bg-[#8D775F] text-white border-none p-5 flex-1 flex flex-col justify-between relative overflow-hidden">
          <p className="text-[10px] font-black uppercase opacity-60 tracking-widest relative z-10">Total Expense</p>
          <div className="relative z-10">
            <h2 className="text-2xl font-black italic">NT$ {Math.round(totalTwd).toLocaleString()}</h2>
            <p className="text-[10px] opacity-50 font-bold">{trip.baseCurrency} 匯率: {exchangeRate.toFixed(3)}</p>
          </div>
          <Coins className="absolute -bottom-4 -right-4 text-white opacity-10" size={80} />
        </div>
        <button onClick={() => setActiveTab('stats')} className={`w-20 card-zakka border-none flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${activeTab === 'stats' ? 'bg-ac-orange text-white shadow-inner' : 'bg-white text-ac-brown'}`}>
          <BarChart3 size={24} />
          <span className="text-[10px] font-black">統計</span>
        </button>
      </div>

      {/* 統計視圖 */}
      {activeTab === 'stats' ? (
        <div className="space-y-6 animate-in slide-in-from-right">
          <div className="card-zakka bg-[#1A1A1A] text-white border-none p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div><h3 className="font-black text-lg">預算與剩餘</h3><p className="text-xs opacity-50">已使用 {percent}%</p></div>
              <button onClick={() => { const b = prompt("設定總預算 (TWD):", trip.budget?.toString()); if(b) updateTripData(trip.id, { budget: Number(b) }); }} className="p-2 bg-white/10 rounded-full active:bg-white/20"><Settings size={16}/></button>
            </div>
            <div className="h-4 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-ac-green transition-all duration-1000" style={{ width: `${percent}%` }} /></div>
            <div className="flex justify-between text-xs font-bold"><span>已用 ${Math.round(totalTwd).toLocaleString()}</span><span className={remaining < 0 ? 'text-red-400' : 'text-ac-green'}>剩餘 ${Math.round(remaining).toLocaleString()}</span></div>
          </div>

          <div className="card-zakka bg-white border-4 border-ac-border p-6 text-center">
            <h3 className="font-black text-ac-brown text-left mb-6 flex items-center gap-2"><div className="w-1 h-4 bg-ac-orange rounded-full"/> 支出類別</h3>
            {pieData.length > 0 ? <DonutChart data={pieData} /> : <p className="opacity-50 py-10 font-bold text-ac-border">尚無數據</p>}
            <div className="grid grid-cols-2 gap-3 mt-6 text-left">
              {pieData.map(d => (
                <div key={d.label} className="flex items-center gap-2 text-xs font-bold text-ac-brown"><div className="w-3 h-3 rounded-full" style={{background: d.color}}/> {d.label} <span className="opacity-50 ml-auto">${Math.round(d.value).toLocaleString()}</span></div>
              ))}
            </div>
          </div>
          <button onClick={() => setActiveTab('record')} className="w-full py-4 text-center text-ac-brown/50 font-black text-xs hover:text-ac-orange transition-colors">返回記帳</button>
        </div>
      ) : (
        <>
          {/* Tab Switcher */}
          <div className="flex bg-white p-1.5 rounded-full border-4 border-ac-border shadow-zakka">
            <button onClick={() => setActiveTab('record')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-black transition-all ${activeTab === 'record' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}><Wallet size={16}/> 記帳</button>
            <button onClick={() => setActiveTab('list')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-black transition-all ${activeTab === 'list' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}><LayoutList size={16}/> 明細</button>
          </div>

          {/* 記帳介面 */}
          {activeTab === 'record' && (
            <div className="card-zakka bg-white space-y-6 p-6 animate-in fade-in relative overflow-hidden">
              {isSuccess && <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center animate-in zoom-in"><CheckCircle className="text-ac-green w-16 h-16 mb-2"/><p className="font-black text-ac-brown">記帳成功！</p></div>}
              
              {/* 子模式：手動/掃描/匯入 */}
              <div className="flex gap-2 mb-2">
                <button onClick={() => setInputMode('scan')} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${inputMode === 'scan' ? 'border-ac-orange bg-orange-50 text-ac-orange' : 'border-ac-border text-ac-border'}`}><Camera size={20} /><span className="text-[10px] font-black">掃描</span></button>
                <button onClick={() => setInputMode('import')} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${inputMode === 'import' ? 'border-ac-green bg-green-50 text-ac-green' : 'border-ac-border text-ac-border'}`}><Upload size={20} /><span className="text-[10px] font-black">匯入</span></button>
                <button onClick={() => setInputMode('manual')} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${inputMode === 'manual' ? 'border-blue-400 bg-blue-50 text-blue-500' : 'border-ac-border text-ac-border'}`}><PenTool size={20} /><span className="text-[10px] font-black">手動</span></button>
              </div>

              {/* 掃描/匯入區塊 */}
              {(inputMode === 'scan' || inputMode === 'import') && (
                <div className="border-4 border-dashed border-ac-border rounded-3xl p-8 text-center space-y-4 bg-ac-bg">
                  {isProcessing ? (
                    <div className="flex flex-col items-center text-ac-green animate-pulse"><ScanLine size={48} /><p className="font-black mt-2">AI 辨識中...</p></div>
                  ) : (
                    <>
                      <p className="text-ac-brown font-bold text-sm">{inputMode === 'scan' ? '開啟相機拍攝收據' : '從相簿選擇收據'}</p>
                      <button onClick={() => aiInputRef.current?.click()} className="btn-zakka px-8 py-3 shadow-lg active:scale-95">{inputMode === 'scan' ? '啟動相機 📸' : '選擇照片 🖼️'}</button>
                      <input ref={aiInputRef} type="file" accept="image/*" capture={inputMode === 'scan' ? "environment" : undefined} className="hidden" onChange={handleAIAnalyze} />
                    </>
                  )}
                </div>
              )}

              {/* 表單區 */}
              <div className={`space-y-4 transition-opacity ${inputMode !== 'manual' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center justify-between"><h3 className="font-black text-ac-brown italic text-lg">詳細資訊</h3>{editingId && <button onClick={resetForm} className="text-xs text-red-400 underline">取消編輯</button>}</div>

                <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">日期</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown text-center outline-none" /></div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-black text-ac-orange uppercase">* 金額</label><input type="number" inputMode="decimal" placeholder="0" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl text-2xl font-black text-ac-brown outline-none focus:border-ac-orange" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">幣別</label><div className="flex gap-2 h-[66px]">{[trip.baseCurrency, 'TWD'].map(c => <button key={c} onClick={() => setForm({...form, currency: c as any})} className={`flex-1 rounded-xl font-black border-2 transition-all ${form.currency === c ? 'bg-[#E2F1E7] border-ac-green text-ac-green' : 'bg-white border-ac-border text-ac-border'}`}>{c}</button>)}</div></div>
                </div>

                <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">分類</label>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">{['飲食','交通','購物','住宿','娛樂','其他'].map(c => <button key={c} onClick={() => setForm({...form, category: c})} className={`px-4 py-2 rounded-xl border-2 whitespace-nowrap font-bold text-xs ${form.category === c ? 'bg-ac-orange text-white border-ac-orange' : 'border-ac-border text-ac-brown'}`}>{c}</button>)}</div></div>

                <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">支付方式</label>
                <div className="flex gap-2">{['現金','信用卡','行動支付'].map(m => <button key={m} onClick={() => setForm({...form, method: m as any})} className={`flex-1 py-3 rounded-xl font-black text-xs border-2 ${form.method === m ? 'bg-blue-50 border-blue-400 text-blue-500' : 'bg-white border-ac-border text-ac-border'}`}>{m}</button>)}</div></div>

                <div className="space-y-1"><label className="text-[10px] font-black text-ac-orange uppercase">* 項目名稱</label>
                <div className="flex gap-2">
                  <input placeholder="例如：便利商店" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="flex-1 p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-[#E2F1E7] border-2 border-ac-green rounded-2xl flex items-center justify-center text-ac-green overflow-hidden">{form.images?.[0] ? <img src={form.images[0]} className="w-full h-full object-cover"/> : <ImageIcon size={24}/>}</button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async e => { if(e.target.files?.[0]) { const b64 = await compressImage(e.target.files[0]); setForm({...form, images: [b64]}); } }} />
                </div></div>

                {/* AI 明細預覽 */}
                {form.items && form.items.length > 0 && (
                  <div className="bg-ac-bg/50 p-4 rounded-2xl space-y-2 border-2 border-dashed border-ac-border">
                    <p className="text-[10px] font-black opacity-50">AI 辨識明細</p>
                    {form.items.map((it, idx) => <div key={idx} className="flex justify-between text-xs font-bold text-ac-brown/70"><span>{it.name}</span><span>{it.price}</span></div>)}
                  </div>
                )}

                <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl mt-2">{editingId ? '確認更新 ➔' : '儲存紀錄 ➔'}</button>
              </div>
            </div>
          )}

          {/* 明細列表 (日期分組) */}
          {activeTab === 'list' && (
            <div className="space-y-8 animate-in slide-in-from-right">
              {Object.keys(groupedExpenses).sort((a,b) => b.localeCompare(a)).map(date => (
                <div key={date} className="space-y-3">
                  <h3 className="text-sm font-black text-ac-border pl-2 border-l-4 border-ac-orange">{format(parseISO(date), 'yyyy/MM/dd (EEE)', {locale: zhTW})}</h3>
                  {groupedExpenses[date].map(e => (
                    <div key={e.id} onClick={() => handleEdit(e)} className="card-zakka bg-white flex justify-between items-center group active:scale-95 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${e.category === '飲食' ? 'bg-orange-400' : e.category === '交通' ? 'bg-blue-400' : 'bg-ac-green'}`}>{e.category?.slice(0,1) || '其'}</div>
                        <div><h3 className="font-black text-ac-brown">{e.title}</h3><p className="text-[10px] font-bold text-ac-brown/40">{e.method}</p></div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div><p className="font-black text-ac-brown text-lg">{e.amount.toLocaleString()}</p></div>
                        <button onClick={(ev) => { ev.stopPropagation(); if(confirm('刪除？')) deleteExpenseItem(trip.id, e.id); }} className="p-2 bg-ac-bg rounded-lg text-ac-orange"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {Object.keys(groupedExpenses).length === 0 && <div className="text-center py-20 text-ac-border font-black italic opacity-30">目前沒有任何紀錄</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

