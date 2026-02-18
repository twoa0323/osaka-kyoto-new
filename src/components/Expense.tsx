import React, { useState, useMemo, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Wallet, Coins, MapPin, Image as ImageIcon, Trash2, Camera, X, Search, Edit3, CheckCircle } from 'lucide-react';
import { ExpenseItem, CurrencyCode } from '../types';
import { compressImage } from '../utils/imageUtils';

export const Expense = () => {
  const { trips, currentTripId, exchangeRate, addExpenseItem, deleteExpenseItem, updateExpenseItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [viewMode, setViewMode] = useState<'input' | 'list'>('input');
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<ExpenseItem>>({
    date: new Date().toISOString().split('T')[0],
    currency: trip?.baseCurrency || 'VND',
    method: '現金', amount: 0, title: '', location: '', images: [], splitWith: []
  });

  if (!trip) return null;

  const handleSave = () => {
    if (!form.title || !form.amount) return alert("請輸入項目與金額唷！💰");
    const itemData: ExpenseItem = {
      id: editingId || Date.now().toString(),
      date: form.date!, title: form.title!, amount: Number(form.amount),
      currency: form.currency as CurrencyCode, method: form.method as any,
      location: form.location || '', payerId: 'Admin', splitWith: [], images: form.images || []
    };
    if (editingId) updateExpenseItem(trip.id, editingId, itemData);
    else addExpenseItem(trip.id, itemData);
    
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setForm({ date: form.date, currency: form.currency, method: '現金', title: '', amount: 0, location: '', images: [] });
      setEditingId(null);
    }, 1500);
  };

  const handleSearchMap = () => {
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(form.location || trip.dest)}`, '_blank');
  };

  const totalTwd = useMemo(() => {
    return (trip.expenses || []).reduce((s, e) => s + (e.currency === 'TWD' ? e.amount : e.amount * exchangeRate), 0);
  }, [trip.expenses, exchangeRate]);

  return (
    <div className="px-6 space-y-6 animate-fade-in pb-10 text-left">
      <div className="card-zakka bg-ac-brown text-white border-none p-6 space-y-1">
        <p className="text-[10px] font-black uppercase opacity-40">Expense Balance</p>
        <div className="flex justify-between items-end">
           <h2 className="text-3xl font-black italic">NT$ {Math.round(totalTwd).toLocaleString()}</h2>
           <p className="text-[10px] opacity-40 font-bold italic">Rate: {exchangeRate.toFixed(3)}</p>
        </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-full border-4 border-ac-border shadow-zakka relative z-10">
        <button onClick={() => setViewMode('input')} className={`flex-1 py-3 rounded-full text-sm font-black transition-all ${viewMode === 'input' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>記帳輸入</button>
        <button onClick={() => setViewMode('list')} className={`flex-1 py-3 rounded-full text-sm font-black transition-all ${viewMode === 'list' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>消費明細</button>
      </div>

      {viewMode === 'input' ? (
        <div className="card-zakka bg-white space-y-8 p-10 relative">
          {isSuccess && <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center rounded-[40px] animate-in fade-in zoom-in-95"><CheckCircle size={48} className="text-ac-green mb-2" /><p className="font-black text-ac-brown">儲存成功！</p></div>}
          <div className="flex items-center gap-3"><div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-xl">💰</div><h2 className="text-2xl font-black text-ac-brown italic">{editingId ? '編輯消費' : '記帳輸入'}</h2></div>
          
          {/* 日期對齊 Pill (IMG_6043) */}
          <div className="space-y-2"><label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">日期</label>
          <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-5 bg-ac-bg border-2 border-ac-border rounded-[24px] font-black text-ac-brown text-center outline-none" /></div>

          <div className="space-y-2"><label className="text-[10px] font-black text-ac-brown/40 uppercase">幣別</label>
          <div className="grid grid-cols-2 gap-4">{[trip.baseCurrency, 'TWD'].map(c => <button key={c} onClick={() => setForm({...form, currency: c as any})} className={`py-5 rounded-[24px] font-black border-2 transition-all ${form.currency === c ? 'bg-[#E2F1E7] border-ac-green text-ac-green' : 'bg-white border-ac-border text-ac-border'}`}>{c}</button>)}</div></div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[10px] font-black text-ac-orange uppercase">* 金額</label><input type="number" inputMode="decimal" placeholder="0" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full p-5 bg-ac-bg border-2 border-ac-border rounded-[24px] text-3xl font-black text-ac-brown outline-none focus:border-ac-orange" /></div>
            <div className="space-y-1 text-right"><label className="text-[10px] font-black text-ac-brown/40 uppercase">約合台幣</label><div className="w-full p-5 bg-ac-bg border-2 border-dashed border-ac-border rounded-[24px] text-3xl font-black text-ac-brown/30 italic">{form.currency === 'TWD' ? form.amount : Math.round((form.amount || 0) * exchangeRate)}</div></div>
          </div>

          <div className="space-y-2"><label className="text-[10px] font-black text-ac-brown/40 uppercase">支付方式</label>
          <div className="flex gap-2">{['現金', '信用卡', '行動支付'].map(m => <button key={m} onClick={() => setForm({...form, method: m as any})} className={`px-6 py-4 rounded-2xl font-black text-sm border-2 ${form.method === m ? 'bg-ac-orange text-white border-ac-orange shadow-sm' : 'bg-white border-ac-border text-ac-border'}`}>{m}</button>)}</div></div>

          <div className="space-y-2"><label className="text-[10px] font-black text-ac-brown/40 uppercase">地點 (Google Maps 尋找)</label>
          <div className="flex gap-3"><input placeholder="例如：便利商店" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="flex-1 p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-bold text-ac-brown" /><button onClick={handleSearchMap} className="w-14 h-14 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-center text-blue-500 active:scale-95 transition-all"><Search size={24}/></button></div></div>

          <div className="space-y-2"><label className="text-[10px] font-black text-ac-orange uppercase">* 消費項目</label>
          <div className="flex gap-3"><input placeholder="例如：午餐" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="flex-1 p-5 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" />
          <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 bg-[#E2F1E7] border-2 border-ac-green rounded-2xl flex items-center justify-center text-ac-green overflow-hidden">{form.images?.[0] ? <img src={form.images[0]} className="w-full h-full object-cover" /> : <Camera size={28} />}</button></div></div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={async e => { if(e.target.files?.[0]) { const b64 = await compressImage(e.target.files[0]); setForm({...form, images: [b64]}); } }} />

          <button onClick={handleSave} className="btn-zakka w-full py-6 text-xl">{editingId ? '更新手帳 ➔' : '儲存這筆帳 ➔'}</button>
        </div>
      ) : (
        <div className="space-y-4">
          {[...trip.expenses].reverse().map(e => (
            <div key={e.id} onClick={() => { setForm(e); setEditingId(e.id); setViewMode('input'); }} className="card-zakka bg-white flex justify-between items-center group active:scale-95 transition-all">
              <div className="flex items-center gap-4">{e.images?.[0] ? <img src={e.images[0]} className="w-12 h-12 rounded-full object-cover shadow-inner" /> : <div className="w-12 h-12 bg-ac-bg rounded-full flex items-center justify-center text-ac-orange"><Coins size={20}/></div>}
              <div><h3 className="font-black text-ac-brown text-lg">{e.title}</h3><p className="text-[10px] font-bold text-ac-brown/30 uppercase">{e.date} • {e.method}</p></div></div>
              <div className="text-right flex items-center gap-4"><div><p className="font-black text-ac-brown text-xl">{e.currency} {e.amount.toLocaleString()}</p><p className="text-[10px] font-bold text-ac-brown/30">≈ NT$ {Math.round(e.currency === 'TWD' ? e.amount : e.amount * exchangeRate)}</p></div>
              <button onClick={(ev) => { ev.stopPropagation(); if(confirm('刪除？')) deleteExpenseItem(trip.id, e.id); }} className="p-2 bg-ac-bg rounded-full text-ac-orange/40 hover:text-ac-orange"><Trash2 size={18}/></button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
