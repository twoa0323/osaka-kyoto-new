import React, { useState, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Wallet, Calendar, Coins, MapPin, Image as ImageIcon, Plus, Trash2, User, Users } from 'lucide-react';
import { ExpenseItem, CurrencyCode } from '../types';

export const Expense = () => {
  const { trips, currentTripId, exchangeRate, addExpenseItem, deleteExpenseItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  
  const [viewMode, setViewMode] = useState<'input' | 'list'>('input');
  
  // 表單狀態 (參考 IMG_6020)
  const [form, setForm] = useState<Partial<ExpenseItem>>({
    date: new Date().toISOString().split('T')[0],
    currency: trip?.baseCurrency || 'TWD',
    method: '現金',
    amount: 0,
    title: '',
    location: '',
    splitWith: trip?.members || ['Admin']
  });

  if (!trip) return null;

  // 計算總合
  const totals = useMemo(() => {
    const list = trip.expenses || [];
    const foreignTotal = list.filter(e => e.currency !== 'TWD').reduce((sum, e) => sum + e.amount, 0);
    const twdTotal = list.reduce((sum, e) => {
      return sum + (e.currency === 'TWD' ? e.amount : e.amount * exchangeRate);
    }, 0);
    return { foreignTotal, twdTotal };
  }, [trip.expenses, exchangeRate]);

  const handleSave = () => {
    if (!form.title || !form.amount) return alert("請填入消費項目與金額唷！💰");
    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      date: form.date!,
      title: form.title!,
      amount: Number(form.amount),
      currency: form.currency as CurrencyCode,
      method: form.method as any,
      location: form.location,
      category: 'general',
      payerId: trip.members[0],
      splitWith: form.splitWith!
    };
    addExpenseItem(trip.id, newItem);
    setForm({ ...form, title: '', amount: 0, location: '' });
    alert("記帳成功！📒");
  };

  return (
    <div className="px-6 space-y-6 animate-fade-in pb-10 text-left">
      {/* 總額儀表板 */}
      <div className="card-zakka bg-ac-brown text-white border-none p-6 space-y-2">
        <div className="flex justify-between items-center opacity-60">
          <span className="text-[10px] font-black uppercase tracking-widest">Total Budget</span>
          <Wallet size={16} />
        </div>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-3xl font-black italic">NT$ {Math.round(totals.twdTotal).toLocaleString()}</p>
            <p className="text-xs font-bold opacity-70">外幣累計: {trip.baseCurrency} {totals.foreignTotal.toLocaleString()}</p>
          </div>
          <p className="text-[10px] font-black opacity-40 italic">Rate: {exchangeRate.toFixed(3)}</p>
        </div>
      </div>

      {/* 切換按鈕 (參考圖片上方切換列) */}
      <div className="flex bg-white p-1.5 rounded-full border-4 border-ac-border shadow-zakka">
        <button onClick={() => setViewMode('input')} className={`flex-1 py-3 rounded-full text-sm font-black transition-all ${viewMode === 'input' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>記帳輸入</button>
        <button onClick={() => setViewMode('list')} className={`flex-1 py-3 rounded-full text-sm font-black transition-all ${viewMode === 'list' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>消費明細</button>
      </div>

      {viewMode === 'input' ? (
        <div className="card-zakka bg-white space-y-6 p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">💰</div>
            <h2 className="text-xl font-black text-ac-brown italic">記帳輸入</h2>
          </div>

          {/* 日期 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">日期</label>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown text-center" />
          </div>

          {/* 幣別切換 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">幣別 (預設 {trip.baseCurrency})</label>
            <div className="grid grid-cols-3 gap-3">
              {[trip.baseCurrency, 'TWD', 'USD'].map(c => (
                <button key={c} onClick={() => setForm({...form, currency: c as any})} className={`py-4 rounded-2xl font-black border-2 transition-all ${form.currency === c ? 'bg-[#E2F1E7] border-ac-green text-ac-green shadow-sm' : 'bg-white border-ac-border text-ac-border'}`}>{c}</button>
              ))}
            </div>
          </div>

          {/* 金額與換算 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-ac-orange uppercase tracking-widest">* 金額</label>
              <input type="number" inputMode="decimal" placeholder="0" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full p-5 bg-ac-bg border-2 border-ac-border rounded-2xl text-2xl font-black text-ac-brown outline-none focus:border-ac-orange" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">約合台幣</label>
              <div className="w-full p-5 bg-ac-bg border-2 border-dashed border-ac-border rounded-2xl text-2xl font-black text-ac-brown/30 italic">
                {form.currency === 'TWD' ? form.amount : Math.round((form.amount || 0) * exchangeRate)}
              </div>
            </div>
          </div>

          {/* 支付方式 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">支付方式</label>
            <div className="flex flex-wrap gap-2">
              {['現金', '信用卡', '行動支付', 'WOWPASS'].map(m => (
                <button key={m} onClick={() => setForm({...form, method: m as any})} className={`px-5 py-3 rounded-xl font-black text-xs border-2 transition-all ${form.method === m ? 'bg-ac-orange border-ac-orange text-white' : 'bg-white border-ac-border text-ac-border'}`}>{m}</button>
              ))}
            </div>
          </div>

          {/* 地點 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">地點 (選填)</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-ac-border" size={18} />
              <input placeholder="例如：便利商店" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none" />
            </div>
          </div>

          {/* 消費項目 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-orange uppercase tracking-widest">* 消費項目</label>
            <div className="flex gap-3">
              <input placeholder="例如：午餐" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="flex-1 p-5 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none focus:border-ac-green" />
              <button className="w-16 h-16 bg-[#E2F1E7] border-2 border-ac-green rounded-2xl flex items-center justify-center text-ac-green active:scale-95"><ImageIcon size={28} /></button>
            </div>
          </div>

          {/* 成員選擇 (僅在多人時顯示) */}
          {trip.members.length > 1 && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest flex items-center gap-1"><Users size={12}/> 分攤成員</label>
              <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
                {trip.members.map(m => (
                  <button key={m} onClick={() => {
                    const next = form.splitWith?.includes(m) ? form.splitWith.filter(x => x !== m) : [...(form.splitWith || []), m];
                    setForm({...form, splitWith: next});
                  }} className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 shrink-0 transition-all ${form.splitWith?.includes(m) ? 'bg-ac-green border-ac-green text-white' : 'bg-white border-ac-border text-ac-border'}`}>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m}`} className="w-6 h-6 rounded-full bg-white" alt="m" />
                    <span className="text-xs font-bold">{m}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl mt-4">儲存這筆帳 ➔</button>
        </div>
      ) : (
        <div className="space-y-4">
          {(trip.expenses || []).length === 0 ? (
            <div className="text-center py-20 text-ac-border font-black italic">尚無消費紀錄</div>
          ) : (
            [...trip.expenses].reverse().map(e => (
              <div key={e.id} className="card-zakka bg-white flex justify-between items-center group">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 bg-ac-bg rounded-full flex items-center justify-center text-ac-orange"><Coins size={20}/></div>
                  <div>
                    <h3 className="font-black text-ac-brown">{e.title}</h3>
                    <p className="text-[10px] font-bold text-ac-brown/40 uppercase">{e.date} • {e.method} {e.location && `• ${e.location}`}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="font-black text-ac-brown text-lg">{e.currency} {e.amount.toLocaleString()}</p>
                    {e.currency !== 'TWD' && <p className="text-[10px] font-bold text-ac-brown/30">≈ NT$ {Math.round(e.amount * exchangeRate)}</p>}
                  </div>
                  <button onClick={() => deleteExpenseItem(trip.id, e.id)} className="text-ac-orange/20 hover:text-ac-orange opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};