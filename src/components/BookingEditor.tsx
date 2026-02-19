import React, { useState, useRef } from 'react';
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
  
  const [form, setForm] = useState<BookingItem>(item || {
    id: Date.now().toString(),
    type, title: '', date: new Date().toISOString().split('T')[0], confirmationNo: '',
    location: '', note: '', images: [], 
    airline: 'tigerair', flightNo: 'IT240', 
    depIata: 'KHH', arrIata: 'PUS', 
    depCity: '高雄', arrCity: '釜山', 
    depTime: '15:00', arrTime: '18:25',
    duration: '02h25m', baggage: '15kg', aircraft: 'A321', seat: '14F',
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
    
    // 如果是機票，將 Title 自動設為航空公司名稱
    const finalForm = { ...form };
    if (type === 'flight') {
      const selectedAirline = AIRLINES.find(a => a.id === form.airline);
      finalForm.title = selectedAirline ? selectedAirline.name : '航班預訂';
    }

    if (item) updateBookingItem(tripId, item.id, finalForm);
    else addBookingItem(tripId, { ...finalForm, id: Date.now().toString() });
    onClose();
  };

  // 移入的刪除功能
  const handleDelete = () => {
    if (confirm('確定要永久刪除這個預訂項目嗎？')) {
      deleteBookingItem(tripId, item!.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-end sm:items-center justify-center p-4">
      <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto text-left">
        
        {/* Header 區塊加入刪除按鈕 */}
        <div className="p-6 flex justify-between items-center border-b-4 border-ac-border sticky top-0 bg-ac-bg z-10">
          <h2 className="text-xl font-black text-ac-brown italic">{item ? '✍️ 編輯' : '📔 新增'}</h2>
          <div className="flex items-center gap-2">
            {item && (
               <button onClick={handleDelete} className="p-2 bg-red-50 text-red-500 rounded-full active:scale-90"><Trash2 size={18}/></button>
            )}
            <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">日期</label>
                <input type="date" className="w-full p-3 bg-white border-2 border-ac-border rounded-xl font-bold" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">航班號</label>
                <input placeholder="IT240" className="w-full p-3 bg-white border-2 border-ac-border rounded-xl font-bold" value={form.flightNo} onChange={e => setForm({...form, flightNo: e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-white p-4 rounded-3xl border-2 border-ac-border items-end">
                <div className="space-y-2">
                  <input placeholder="出發 (KHH)" className="w-full p-2 bg-ac-bg rounded-lg font-black text-center text-sm" value={form.depIata} onChange={e => setForm({...form, depIata: e.target.value})} />
                  <input type="time" className="w-full p-2 bg-ac-bg rounded-lg font-bold text-center text-sm" value={form.depTime} onChange={e => setForm({...form, depTime: e.target.value})} />
                  <input placeholder="城市 (高雄)" className="w-full p-2 bg-ac-bg rounded-lg font-bold text-center text-xs" value={form.depCity} onChange={e => setForm({...form, depCity: e.target.value})} />
                </div>
                <div className="space-y-2 pb-2">
                   <label className="text-[10px] font-black text-ac-brown/40 uppercase text-center block">飛行時間</label>
                   <input placeholder="02h25m" className="w-full p-2 bg-ac-bg rounded-lg font-bold text-center text-xs" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <input placeholder="抵達 (PUS)" className="w-full p-2 bg-ac-bg rounded-lg font-black text-center text-sm" value={form.arrIata} onChange={e => setForm({...form, arrIata: e.target.value})} />
                  <input type="time" className="w-full p-2 bg-ac-bg rounded-lg font-bold text-center text-sm" value={form.arrTime} onChange={e => setForm({...form, arrTime: e.target.value})} />
                  <input placeholder="城市 (釜山)" className="w-full p-2 bg-ac-bg rounded-lg font-bold text-center text-xs" value={form.arrCity} onChange={e => setForm({...form, arrCity: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">行李</label>
                <input placeholder="15kg" className="w-full p-3 bg-white border-2 border-ac-border rounded-xl font-bold" value={form.baggage} onChange={e => setForm({...form, baggage: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">機型</label>
                <input placeholder="A321" className="w-full p-3 bg-white border-2 border-ac-border rounded-xl font-bold" value={form.aircraft} onChange={e => setForm({...form, aircraft: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">座位</label>
                <input placeholder="14F" className="w-full p-3 bg-white border-2 border-ac-border rounded-xl font-bold" value={form.seat} onChange={e => setForm({...form, seat: e.target.value})} /></div>
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
          <input className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold outline-none" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://..." /></div>

          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => qrInputRef.current?.click()} className="h-28 border-4 border-dashed border-ac-border rounded-2xl flex flex-col items-center justify-center text-ac-border bg-white overflow-hidden relative group transition-all active:scale-[0.98]">
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

            <button type="button" onClick={() => fileInputRef.current?.click()} className="h-28 border-4 border-dashed border-ac-border rounded-2xl flex flex-col items-center justify-center text-ac-border bg-white overflow-hidden relative group transition-all active:scale-[0.98]">
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

          <textarea placeholder="寫下詳情或備註..." className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold h-24" value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
          <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl">確認儲存 ➔</button>
        </div>
      </div>
    </div>
  );
};






