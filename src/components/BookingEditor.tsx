// src/components/BookingEditor.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { X, Camera, Globe, QrCode, Loader2, Trash2 } from 'lucide-react';
import { BookingItem } from '../types';
import { uploadImage } from '../utils/imageUtils';

interface Props {
  tripId: string;
  type: 'flight' | 'hotel' | 'spot' | 'voucher';
  item?: BookingItem;
  onClose: () => void;
}

const AIRLINES = [
  { id: 'tigerair', name: '台灣虎航 (Tigerair)' },
  { id: 'starlux', name: '星宇航空 (STARLUX)' },
  { id: 'cathay', name: '國泰航空 (Cathay Pacific)' },
  { id: 'china', name: '中華航空 (China Airlines)' },
  { id: 'eva', name: '長榮航空 (EVA Air)' },
  { id: 'peach', name: '樂桃航空 (Peach Aviation)' },
  { id: 'ana', name: '全日空 (ANA)' },
  { id: 'other', name: '其他 (Other)' }
];

export const BookingEditor: React.FC<Props> = ({ tripId, type, item, onClose }) => {
  const { addBookingItem, updateBookingItem, deleteBookingItem } = useTripStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const [uploadingField, setUploadingField] = useState<'images' | 'qrCode' | null>(null);
  
  // 解析舊有或現有的 duration 格式 (例如 "02h45m" 或 "2h 45m") 為分開的 h 和 m
  const parseInitialDuration = (dur: string | undefined) => {
    if (!dur) return { h: '', m: '' };
    const matchWithSpace = dur.match(/(\d+)h\s*(\d+)m/i);
    if (matchWithSpace) return { h: parseInt(matchWithSpace[1]).toString(), m: parseInt(matchWithSpace[2]).toString() };
    const matchNoSpace = dur.match(/(\d+)h(\d+)m/i);
    if (matchNoSpace) return { h: parseInt(matchNoSpace[1]).toString(), m: parseInt(matchNoSpace[2]).toString() };
    return { h: '', m: '' };
  };

  const initialDur = parseInitialDuration(item?.duration);
  const [durH, setDurH] = useState(initialDur.h);
  const [durM, setDurM] = useState(initialDur.m);

  const [form, setForm] = useState<BookingItem>(item || {
    id: Date.now().toString(),
    type, title: '', date: new Date().toISOString().split('T')[0], confirmationNo: '',
    location: '', note: '', images: [], 
    airline: 'starlux', flightNo: '', 
    depIata: '', arrIata: '', 
    depCity: '', arrCity: '', 
    depTime: '09:00', arrTime: '13:00',
    duration: '', baggage: '', aircraft: '', seat: '',
    qrCode: '', website: '', nights: 1
  });

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>, field: 'images' | 'qrCode') => {
    const file = e.target.files?.[0];
    if (file) {
      e.target.value = '';
      setUploadingField(field);
      try {
        const url = await uploadImage(file);
        if (field === 'images') setForm(prev => ({ ...prev, images: [url] }));
        else setForm(prev => ({ ...prev, qrCode: url }));
      } catch (err) {
        alert("上傳失敗！");
      } finally {
        setUploadingField(null);
      }
    }
  };

  const handleSave = () => {
    if (type !== 'flight' && !form.title) return alert("請輸入名稱唷！");
    if (type === 'flight' && !form.flightNo) return alert("請輸入航班號碼！");
    
    const finalForm = { ...form };
    
    if (type === 'flight') {
      const selectedAirline = AIRLINES.find(a => a.id === form.airline);
      finalForm.title = selectedAirline ? selectedAirline.name : '航班預訂';
      // 組合飛行時間 (確保加入半形空格)
      if (durH || durM) {
        finalForm.duration = `${durH || '0'}h ${durM || '0'}m`;
      }
    }

    if (item) updateBookingItem(tripId, item.id, finalForm);
    else addBookingItem(tripId, { ...finalForm, id: Date.now().toString() });
    onClose();
  };

  const handleDelete = () => {
    if (confirm('確定要永久刪除這個預訂項目嗎？')) {
      deleteBookingItem(tripId, item!.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-end sm:items-center justify-center p-4">
      <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto text-left">
        
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b-4 border-ac-border sticky top-0 bg-ac-bg z-10">
          <h2 className="text-xl font-black text-ac-brown italic">{item ? '✍️ 編輯' : '📔 新增'}</h2>
          <div className="flex items-center gap-2">
            {item && (
               <button onClick={handleDelete} className="p-2 bg-red-50 text-red-500 rounded-full active:scale-90"><Trash2 size={18}/></button>
            )}
            <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm border border-ac-border"><X size={20}/></button>
          </div>
        </div>
        
        <div className="p-6 space-y-5">
          {type === 'flight' ? (
            <div className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-ac-brown/40 uppercase">航空公司模板</label>
                <div className="relative">
                  <select 
                    className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none appearance-none cursor-pointer"
                    value={form.airline} 
                    onChange={e => setForm({...form, airline: e.target.value})}
                  >
                    {AIRLINES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              {/* 日期與航班號碼對齊 */}
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-ac-brown/40 uppercase">日期</label>
                  <input type="date" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown text-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-ac-brown/40 uppercase">航班號</label>
                  <input placeholder="例如：JX820" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown text-sm uppercase" value={form.flightNo} onChange={e => setForm({...form, flightNo: e.target.value})} />
                </div>
              </div>

              {/* 航班詳細資訊區塊 (包含標題說明) */}
              <div className="bg-white p-4 rounded-[2rem] border-2 border-ac-border space-y-3">
                {/* 說明標籤 Header */}
                <div className="flex justify-between px-2 text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">
                   <span className="w-[30%] text-center">出發地</span>
                   <span className="w-[30%] text-center">飛行時間</span>
                   <span className="w-[30%] text-center">目的地</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* 出發 Origin */}
                  <div className="flex-1 space-y-2">
                    <input placeholder="TPE" className="w-full p-2.5 bg-ac-bg border border-ac-border/50 rounded-xl font-black text-center text-sm uppercase" value={form.depIata} onChange={e => setForm({...form, depIata: e.target.value})} />
                    <input type="time" className="w-full p-2.5 bg-ac-bg border border-ac-border/50 rounded-xl font-bold text-center text-sm" value={form.depTime} onChange={e => setForm({...form, depTime: e.target.value})} />
                    <input placeholder="台北" className="w-full p-2 bg-ac-bg border border-ac-border/50 rounded-lg font-bold text-center text-xs" value={form.depCity} onChange={e => setForm({...form, depCity: e.target.value})} />
                  </div>
                  
                  {/* 飛行時間 Duration (分開輸入 h 與 m) */}
                  <div className="w-[85px] flex flex-col items-center justify-center gap-1.5 pt-1">
                     <div className="flex items-center gap-1 w-full">
                       <input type="number" min="0" value={durH} onChange={e => setDurH(e.target.value)} className="w-full p-2 bg-ac-bg border border-ac-border/50 rounded-lg font-bold text-center text-xs outline-none" placeholder="2"/>
                       <span className="text-[10px] font-black text-ac-border">h</span>
                     </div>
                     <div className="flex items-center gap-1 w-full">
                       <input type="number" min="0" max="59" value={durM} onChange={e => setDurM(e.target.value)} className="w-full p-2 bg-ac-bg border border-ac-border/50 rounded-lg font-bold text-center text-xs outline-none" placeholder="45"/>
                       <span className="text-[10px] font-black text-ac-border">m</span>
                     </div>
                  </div>
                  
                  {/* 抵達 Destination */}
                  <div className="flex-1 space-y-2">
                    <input placeholder="KIX" className="w-full p-2.5 bg-ac-bg border border-ac-border/50 rounded-xl font-black text-center text-sm uppercase" value={form.arrIata} onChange={e => setForm({...form, arrIata: e.target.value})} />
                    <input type="time" className="w-full p-2.5 bg-ac-bg border border-ac-border/50 rounded-xl font-bold text-center text-sm" value={form.arrTime} onChange={e => setForm({...form, arrTime: e.target.value})} />
                    <input placeholder="大阪" className="w-full p-2 bg-ac-bg border border-ac-border/50 rounded-lg font-bold text-center text-xs" value={form.arrCity} onChange={e => setForm({...form, arrCity: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* 底部附屬欄位 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ac-brown/40 uppercase">行李</label>
                  <input placeholder="15kg" className="w-full p-3 bg-white border-2 border-ac-border rounded-xl font-bold text-sm text-center" value={form.baggage} onChange={e => setForm({...form, baggage: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ac-brown/40 uppercase">機型</label>
                  <input placeholder="A321" className="w-full p-3 bg-white border-2 border-ac-border rounded-xl font-bold text-sm text-center uppercase" value={form.aircraft} onChange={e => setForm({...form, aircraft: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-ac-brown/40 uppercase">座位</label>
                  <input placeholder="14F" className="w-full p-3 bg-white border-2 border-ac-border rounded-xl font-bold text-sm text-center uppercase" value={form.seat} onChange={e => setForm({...form, seat: e.target.value})} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">標題</label>
               <input className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="例如：東橫INN" /></div>
               <input placeholder="地點 / 地址" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
               {type === 'hotel' && <input type="number" placeholder="住宿晚數" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold" value={form.nights} onChange={e => setForm({...form, nights: Number(e.target.value)})} />}
            </div>
          )}

          <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase flex items-center gap-1"><Globe size={12}/> 網址</label>
          <input className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold outline-none text-sm" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://..." /></div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => qrInputRef.current?.click()} className="h-28 border-4 border-dashed border-ac-border rounded-3xl flex flex-col items-center justify-center text-ac-border bg-white overflow-hidden relative group transition-all active:scale-[0.98]">
              {uploadingField === 'qrCode' && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                  <Loader2 className="animate-spin text-ac-orange mb-1.5" size={28} strokeWidth={3}/>
                </div>
              )}
              {form.qrCode ? (
                <><img src={form.qrCode} className="h-full object-contain pointer-events-none" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-[10px] font-black">點擊更換</span></div></>
              ) : <><QrCode size={24}/> <span className="text-[10px] font-black mt-1">上傳 QR</span></>}
            </button>
            <input ref={qrInputRef} type="file" className="hidden" onChange={e => handlePhoto(e, 'qrCode')} />

            <button type="button" onClick={() => fileInputRef.current?.click()} className="h-28 border-4 border-dashed border-ac-border rounded-3xl flex flex-col items-center justify-center text-ac-border bg-white overflow-hidden relative group transition-all active:scale-[0.98]">
              {uploadingField === 'images' && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                  <Loader2 className="animate-spin text-ac-orange mb-1.5" size={28} strokeWidth={3}/>
                </div>
              )}
              {form.images?.[0] ? (
                <><img src={form.images[0]} className="w-full h-full object-cover pointer-events-none" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-[10px] font-black">點擊更換</span></div></>
              ) : <><Camera size={24}/> <span className="text-[10px] font-black mt-1">上傳照片</span></>}
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={e => handlePhoto(e, 'images')} />
          </div>

          <textarea placeholder="寫下詳情或備註..." className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold h-24 text-sm" value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
          <button onClick={handleSave} className="btn-zakka w-full py-5 text-lg font-black tracking-widest shadow-sm">確認儲存 ➔</button>
        </div>
      </div>
    </div>
  );
};







