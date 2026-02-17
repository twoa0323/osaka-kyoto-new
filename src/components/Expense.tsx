import React, { useState, useMemo, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Wallet, Coins, MapPin, Image as ImageIcon, Trash2, Camera, X } from 'lucide-react';
import { ExpenseItem, CurrencyCode } from '../types';
import { compressImage } from '../utils/imageUtils';

export const Expense = () => {
  const { trips, currentTripId, exchangeRate, addExpenseItem, deleteExpenseItem, updateExpenseItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [viewMode, setViewMode] = useState<'input' | 'list'>('input');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<ExpenseItem>>({
    date: new Date().toISOString().split('T')[0],
    currency: trip?.baseCurrency || 'VND',
    method: '現金', amount: 0, title: '', location: '', images: [], splitWith: []
  });

  if (!trip) return null;

  const handleSave = () => {
    if (!form.title || !form.amount) return alert("請填入內容與金額！💰");
    const itemData: ExpenseItem = {
      id: editingId || Date.now().toString(),
      date: form.date!, title: form.title!, amount: Number(form.amount),
      currency: form.currency as CurrencyCode, method: form.method as any,
      location: form.location || '', payerId: 'Admin', splitWith: [], images: form.images || []
    };
    if (editingId) updateExpenseItem(trip.id, editingId, itemData);
    else addExpenseItem(trip.id, itemData);
    
    setForm({ date: form.date, currency: form.currency, method: '現金', title: '', amount: 0, location: '', images: [] });
    setEditingId(null);
    alert("儲存成功！📒");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const compressed = await compressImage(e.target.files[0]);
      setForm(prev => ({ ...prev, images: [compressed] }));
    }
  };

  const totalTwd = useMemo(() => {
    return (trip.expenses || []).reduce((s, e) => s + (e.currency === 'TWD' ? e.amount : e.amount * exchangeRate), 0);
  }, [trip.expenses, exchangeRate]);

  return (
    <div className="px-6 space-y-6 animate-fade-in pb-10 text-left">
      <div className="card-zakka bg-ac-brown text-white border-none p-6">
        <p className="text-[10px] font-black uppercase opacity-40">Total Budget</p>
        <p className="text-3xl font-black italic">NT$ {Math.round(totalTwd).toLocaleString()}</p>
      </div>

      <div className="flex bg-white p-1.5 rounded-full border-4 border-ac-border shadow-zakka">
        <button onClick={() => setViewMode('input')} className={`flex-1 py-3 rounded-full text-sm font-black transition-all ${viewMode === 'input' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>記帳輸入</button>
        <button onClick={() => setViewMode('list')} className={`flex-1 py-3 rounded-full text-sm font-black transition-all ${viewMode === 'list' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>消費明細</button>
      </div>

      {viewMode === 'input' ? (
        <div className="card-zakka bg-white space-y-6 p-8 relative">
          {editingId && <div className="absolute top-4 right-4 bg-ac-orange text-white text-[10px] px-2 py-1 rounded-full font-bold animate-pulse">編輯中</div>}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">💰</div>
            <h2 className="text-xl font-black text-ac-brown italic">{editingId ? '編輯消費' : '記帳輸入'}</h2>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase">日期</label>
            {/* 修正對齊：text-left pl-6 */}
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown text-left pl-6" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase">幣別</label>
            <div className="flex gap-3">
              {[trip.baseCurrency, 'TWD'].map(c => (
                <button key={c} onClick={() => setForm({...form, currency: c as any})} className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${form.currency === c ? 'bg-[#E2F1E7] border-ac-green text-ac-green shadow-sm' : 'bg-white border-ac-border text-ac-border'}`}>{c}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-ac-orange uppercase">* 金額</label>
              <input type="number" inputMode="decimal" placeholder="0" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full p-5 bg-ac-bg border-2 border-ac-border rounded-2xl text-2xl font-black text-ac-brown outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-ac-brown/40 uppercase">約合台幣</label>
              <div className="w-full p-5 bg-ac-bg border-2 border-dashed border-ac-border rounded-2xl text-2xl font-black text-ac-brown/30 italic">
                {form.currency === 'TWD' ? form.amount : Math.round((form.amount || 0) * exchangeRate)}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase">支付方式</label>
            <div className="flex gap-2">
              {['現金', '信用卡', '行動支付'].map(m => (
                <button key={m} onClick={() => setForm({...form, method: m as any})} className={`px-5 py-3 rounded-xl font-black text-xs border-2 transition-all ${form.method === m ? 'bg-ac-orange border-ac-orange text-white' : 'bg-white border-ac-border text-ac-border'}`}>{m}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-orange uppercase">* 消費項目</label>
            <div className="flex gap-3">
              <input placeholder="例如：午餐" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="flex-1 p-5 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-16 h-16 bg-[#E2F1E7] border-2 border-ac-green rounded-2xl flex items-center justify-center text-ac-green active:scale-95 overflow-hidden relative"
              >
                {form.images?.[0] ? <img src={form.images[0]} className="w-full h-full object-cover" /> : <ImageIcon size={28} />}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </button>
            </div>
          </div>
          <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl">{editingId ? '確認更新 ➔' : '儲存這筆帳 ➔'}</button>
        </div>
      ) : (
        <div className="space-y-4">
          {(trip.expenses || []).length === 0 ? <div className="text-center py-20 text-ac-border font-black italic">尚無紀錄</div> :
            [...trip.expenses].reverse().map(e => (
              <div key={e.id} onClick={() => { setForm(e); setEditingId(e.id); setViewMode('input'); }} className="card-zakka bg-white flex justify-between items-center group cursor-pointer active:scale-95 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-ac-bg rounded-full overflow-hidden flex items-center justify-center text-ac-orange">
                    {e.images?.[0] ? <img src={e.images[0]} className="w-full h-full object-cover" /> : <Coins size={20}/>}
                  </div>
                  <div><h3 className="font-black text-ac-brown">{e.title}</h3><p className="text-[10px] font-bold text-ac-brown/40 uppercase">{e.date} • {e.method}</p></div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div><p className="font-black text-ac-brown text-lg">{e.currency} {e.amount.toLocaleString()}</p>
                  {e.currency !== 'TWD' && <p className="text-[10px] font-bold text-ac-brown/30">≈ NT$ {Math.round(e.amount * exchangeRate)}</p>}</div>
                  <button onClick={(ev) => { ev.stopPropagation(); if(confirm('刪除紀錄？')) deleteExpenseItem(trip.id, e.id); }} className="text-ac-orange/20 hover:text-ac-orange"><Trash2 size={18}/></button>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};
