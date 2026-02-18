import React, { useState, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { X, Check, Plane, Camera, MapPin, Calendar, Globe, QrCode } from 'lucide-react';
import { BookingItem } from '../types';
import { compressImage } from '../utils/imageUtils';

interface Props {
  tripId: string;
  type: 'flight' | 'hotel' | 'spot' | 'voucher';
  item?: BookingItem;
  onClose: () => void;
}

export const BookingEditor: React.FC<Props> = ({ tripId, type, item, onClose }) => {
  const { addBookingItem, updateBookingItem } = useTripStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState<BookingItem>(item || {
    id: Date.now().toString(),
    type, title: '', date: new Date().toISOString().split('T')[0], confirmationNo: '',
    location: '', note: '', images: [], flightNo: '', depIata: 'TPE', arrIata: 'SGN', 
    depCity: '台北', arrCity: '胡志明', depTime: '09:00', arrTime: '13:00',
    duration: '02h25m', baggage: '15kg', aircraft: 'A321', qrCode: '', website: '', nights: 1
  });

  const handlePhoto = async (e: any, field: 'images' | 'qrCode') => {
    if (e.target.files?.[0]) {
      const b64 = await compressImage(e.target.files[0]);
      if (field === 'images') setForm({ ...form, images: [b64] });
      else setForm({ ...form, qrCode: b64 });
    }
  };

  const handleSave = () => {
    if (!form.title) return alert("請輸入名稱唷！");
    if (item) updateBookingItem(tripId, item.id, form);
    else addBookingItem(tripId, { ...form, id: Date.now().toString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-end sm:items-center justify-center p-4">
      <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto text-left">
        <div className="p-6 flex justify-between items-center border-b-4 border-ac-border sticky top-0 bg-ac-bg z-10"><h2 className="text-xl font-black text-ac-brown italic">{item ? '✍️ 編輯' : '📔 新增'}</h2><button onClick={onClose} className="p-2 bg-white rounded-full"><X size={20}/></button></div>
        <div className="p-6 space-y-5">
          <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase">標題</label>
          <input className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="例如：釜山航空" /></div>

          {type === 'flight' ? (
            <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-3xl border-2 border-ac-border">
              <input placeholder="航班號 (BX 796)" className="p-3 bg-ac-bg rounded-xl font-bold text-center" value={form.flightNo} onChange={e => setForm({...form, flightNo: e.target.value})} />
              <input placeholder="時長 (02h25m)" className="p-3 bg-ac-bg rounded-xl font-bold text-center" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
              <input placeholder="出發 (TPE)" className="p-3 bg-ac-bg rounded-xl font-bold text-center" value={form.depIata} onChange={e => setForm({...form, depIata: e.target.value})} />
              <input placeholder="抵達 (PUS)" className="p-3 bg-ac-bg rounded-xl font-bold text-center" value={form.arrIata} onChange={e => setForm({...form, arrIata: e.target.value})} />
            </div>
          ) : (
            <div className="space-y-4">
               <input placeholder="地點 / 地址" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
               {type === 'hotel' && <input type="number" placeholder="住宿晚數" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold" value={form.nights} onChange={e => setForm({...form, nights: Number(e.target.value)})} />}
            </div>
          )}

          <div className="space-y-1"><label className="text-[10px] font-black text-ac-brown/40 uppercase flex items-center gap-1"><Globe size={12}/> 網址</label>
          <input className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold outline-none" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://..." /></div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => qrInputRef.current?.click()} className="h-24 border-4 border-dashed border-ac-border rounded-2xl flex flex-col items-center justify-center text-ac-border bg-white">{form.qrCode ? <img src={form.qrCode} className="h-full object-contain" /> : <><QrCode size={20}/> <span className="text-[10px] font-black">上傳 QR</span></>}</button>
            <button onClick={() => fileInputRef.current?.click()} className="h-24 border-4 border-dashed border-ac-border rounded-2xl flex flex-col items-center justify-center text-ac-border bg-white">{form.images?.[0] ? <img src={form.images[0]} className="h-full object-cover rounded-xl" /> : <><Camera size={20}/> <span className="text-[10px] font-black">上傳照片</span></>}</button>
          </div>
          <input ref={qrInputRef} type="file" className="hidden" onChange={e => handlePhoto(e, 'qrCode')} />
          <input ref={fileInputRef} type="file" className="hidden" onChange={e => handlePhoto(e, 'images')} />

          <textarea placeholder="寫下詳情或備註..." className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold h-24" value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
          <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl">確認儲存 ➔</button>
        </div>
      </div>
    </div>
  );
};

