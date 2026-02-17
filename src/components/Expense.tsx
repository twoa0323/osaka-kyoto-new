import React, { useState, useMemo, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Wallet, Coins, MapPin, Image as ImageIcon, Plus, Trash2, Users, Camera, X } from 'lucide-react';
import { ExpenseItem, CurrencyCode } from '../types';
import { compressImage } from '../utils/imageUtils';

export const Expense = () => {
  const { trips, currentTripId, exchangeRate, addExpenseItem, deleteExpenseItem, updateExpenseItem } = useTripStore(); // 需確認 Store 有 updateExpenseItem
  const trip = trips.find(t => t.id === currentTripId);
  
  const [viewMode, setViewMode] = useState<'input' | 'list'>('input');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 編輯模式狀態
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<ExpenseItem>>({
    date: new Date().toISOString().split('T')[0],
    currency: trip?.baseCurrency || 'TWD',
    method: '現金',
    amount: 0,
    title: '',
    location: '',
    splitWith: trip?.members || ['Admin'],
    images: [] // 這裡雖然 ExpenseItem 定義沒強制，但為了擴充性可保留
  });

  if (!trip) return null;

  const handleSave = () => {
    if (!form.title || !form.amount) return alert("請填入消費項目與金額唷！💰");
    
    const itemData: ExpenseItem = {
      id: editingId || Date.now().toString(),
      date: form.date!,
      title: form.title!,
      amount: Number(form.amount),
      currency: form.currency as CurrencyCode,
      method: form.method as any,
      location: form.location,
      category: 'general',
      payerId: trip.members[0],
      splitWith: form.splitWith!,
      // 如果你的 ExpenseItem 有 images 欄位請加上，若無則忽略
    };

    if (editingId) {
      // 呼叫更新 (Store 需支援，若無則先刪後加)
      deleteExpenseItem(trip.id, editingId);
      addExpenseItem(trip.id, itemData);
      alert("更新成功！");
    } else {
      addExpenseItem(trip.id, itemData);
      alert("記帳成功！");
    }

    // 重置表單
    setForm({ ...form, title: '', amount: 0, location: '', images: [] });
    setEditingId(null);
  };

  const handleEdit = (item: ExpenseItem) => {
    setForm(item);
    setEditingId(item.id);
    setViewMode('input');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // 這裡僅做示意，若 ExpenseItem 尚未支援 images，可先忽略
      alert("圖片已選擇 (需確認資料庫欄位支援)");
    }
  };

  // 幣別清單：去重並只保留 當地貨幣 與 TWD
  const currencies = [trip.baseCurrency, 'TWD'].filter((v, i, a) => a.indexOf(v) === i);

  // 總額計算
  const totals = useMemo(() => {
    const list = trip.expenses || [];
    const foreignTotal = list.filter(e => e.currency !== 'TWD').reduce((sum, e) => sum + e.amount, 0);
    const twdTotal = list.reduce((sum, e) => {
      return sum + (e.currency === 'TWD' ? e.amount : e.amount * exchangeRate);
    }, 0);
    return { foreignTotal, twdTotal };
  }, [trip.expenses, exchangeRate]);

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

      <div className="flex bg-white p-1.5 rounded-full border-4 border-ac-border shadow-zakka">
        <button onClick={() => setViewMode('input')} className={`flex-1 py-3 rounded-full text-sm font-black transition-all ${viewMode === 'input' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>記帳輸入</button>
        <button onClick={() => setViewMode('list')} className={`flex-1 py-3 rounded-full text-sm font-black transition-all ${viewMode === 'list' ? 'bg-ac-green text-white shadow-md' : 'text-ac-border'}`}>消費明細</button>
      </div>

      {viewMode === 'input' ? (
        <div className="card-zakka bg-white space-y-6 p-8 relative">
          {editingId && (
            <div className="absolute top-4 right-4 bg-ac-orange text-white text-[10px] px-2 py-1 rounded-full font-bold animate-pulse">
              編輯模式
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">💰</div>
            <h2 className="text-xl font-black text-ac-brown italic">{editingId ? '編輯消費' : '記帳輸入'}</h2>
          </div>

          {/* 日期 (修正對齊: text-left pl-6) */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">日期</label>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown text-left pl-6" />
          </div>

          {/* 幣別 (限制顯示) */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">幣別</label>
            <div className="flex gap-3">
              {currencies.map(c => (
                <button key={c} onClick={() => setForm({...form, currency: c as any})} className={`flex-1 py-4 rounded-2xl font-black border-2 transition-all ${form.currency === c ? 'bg-[#E2F1E7] border-ac-green text-ac-green shadow-sm' : 'bg-white border-ac-border text-ac-border'}`}>{c}</button>
              ))}
            </div>
          </div>

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

          {/* 支付方式 (移除 WOWPASS) */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">支付方式</label>
            <div className="flex flex-wrap gap-2">
              {['現金', '信用卡', '行動支付'].map(m => (
                <button key={m} onClick={() => setForm({...form, method: m as any})} className={`px-5 py-3 rounded-xl font-black text-xs border-2 transition-all ${form.method === m ? 'bg-ac-orange border-ac-orange text-white' : 'bg-white border-ac-border text-ac-border'}`}>{m}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">地點 (選填)</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-ac-border" size={18} />
              <input placeholder="例如：便利商店" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-ac-bg border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none" />
            </div>
          </div>

          {/* 消費項目與圖片上傳修復 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-orange uppercase tracking-widest">* 消費項目</label>
            <div className="flex gap-3">
              <input placeholder="例如：午餐" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="flex-1 p-5 bg-ac-bg border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none focus:border-ac-green" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-16 h-16 bg-[#E2F1E7] border-2 border-ac-green rounded-2xl flex items-center justify-center text-ac-green active:scale-95 hover:bg-ac-green hover:text-white transition-colors"
              >
                <ImageIcon size={28} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </button>
            </div>
          </div>

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

          <div className="flex gap-2 mt-4">
            {editingId && (
              <button onClick={() => { setEditingId(null); setForm({...form, title: '', amount: 0}); }} className="p-4 rounded-2xl border-2 border-ac-border text-ac-border font-black">
                <X />
              </button>
            )}
            <button onClick={handleSave} className="btn-zakka flex-1 py-5 text-xl">
              {editingId ? '確認更新 ➔' : '儲存這筆帳 ➔'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(trip.expenses || []).length === 0 ? (
            <div className="text-center py-20 text-ac-border font-black italic">尚無消費紀錄</div>
          ) : (
            [...trip.expenses].reverse().map(e => (
              <div 
                key={e.id} 
                onClick={() => handleEdit(e)} 
                className="card-zakka bg-white flex justify-between items-center group cursor-pointer active:scale-[0.98] transition-all hover:border-ac-green"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 bg-ac-bg rounded-full flex items-center justify-center text-ac-orange"><Coins size={20}/></div>
                  <div>
                    <h3 className="font-black text-ac-brown">{e.title}</h3>
                    <p className="text-[10px] font-bold text-ac-brown/40 uppercase">{e.date} • {e.method}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="font-black text-ac-brown text-lg">{e.currency} {e.amount.toLocaleString()}</p>
                    {e.currency !== 'TWD' && <p className="text-[10px] font-bold text-ac-brown/30">≈ NT$ {Math.round(e.amount * exchangeRate)}</p>}
                  </div>
                  <button onClick={(ev) => { ev.stopPropagation(); if(confirm('刪除這筆紀錄？')) deleteExpenseItem(trip.id, e.id); }} className="text-ac-orange/20 hover:text-ac-orange p-2"><Trash2 size={18}/></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};