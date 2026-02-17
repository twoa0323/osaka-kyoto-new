import React, { useState, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { X, Check, Plane, Camera, MapPin, Calendar, Clock } from 'lucide-react';
import { BookingItem } from '../types';
import { compressImage } from '../utils/imageUtils';

interface Props {
  tripId: string;
  type: 'flight' | 'hotel' | 'car' | 'voucher';
  item?: BookingItem;
  onClose: () => void;
}

export const BookingEditor: React.FC<Props> = ({ tripId, type, item, onClose }) => {
  const { addBookingItem, updateBookingItem } = useTripStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState<BookingItem>(item || {
    id: Date.now().toString(),
    type,
    title: '',
    date: new Date().toISOString().split('T')[0],
    endDate: '',
    location: '',
    note: '',
    images: [],
    flightNo: '',
    depIata: 'TPE',
    arrIata: 'KIX',
    depTime: '09:00',
    arrTime: '13:00',
    confirmationNo: ''
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const compressed = await Promise.all(files.map(f => compressImage(f)));
      setForm(prev => ({ ...prev, images: [...(prev.images || []), ...compressed] }));
    }
  };

  const handleSave = () => {
    if (!form.title) return alert("給這項預訂一個標題吧！📓");
    if (item) {
      updateBookingItem(tripId, item.id, form);
    } else {
      addBookingItem(tripId, { ...form, id: Date.now().toString() });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
      <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
        <div className="p-6 flex justify-between items-center border-b-4 border-ac-border sticky top-0 bg-ac-bg z-10">
          <h2 className="text-xl font-black text-ac-brown italic">{item ? '✍️ 編輯資訊' : '📔 新增預訂'}</h2>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-zakka text-ac-border active:scale-90 transition-transform"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-5 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest">名稱 / 標題</label>
            <input className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none focus:border-ac-green" 
              value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder={type === 'flight' ? '航空公司' : '飯店或租車公司'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-ac-brown/40 uppercase flex items-center gap-1"><Calendar size={12}/> 日期</label>
              <input type="date" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown text-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-ac-brown/40 uppercase flex items-center gap-1">確認號 / 代碼</label>
              <input className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none" 
                value={form.confirmationNo} onChange={e => setForm({...form, confirmationNo: e.target.value})} placeholder="X8J29L" />
            </div>
          </div>

          {type === 'flight' && (
            <div className="bg-white p-5 rounded-[32px] border-2 border-ac-border space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-ac-green font-black text-[10px] uppercase tracking-[0.2em]"><Plane size={14}/> 航班詳細資訊</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-ac-border">班號</label>
                  <input placeholder="BR189" className="w-full p-3 bg-ac-bg rounded-xl font-black text-center outline-none" value={form.flightNo} onChange={e => setForm({...form, flightNo: e.target.value})} />
                </div>
                <div className="space-y-1" />
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-ac-border">出發 IATA</label>
                  <input placeholder="TPE" className="w-full p-3 bg-ac-bg rounded-xl font-black text-center outline-none" value={form.depIata} onChange={e => setForm({...form, depIata: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-ac-border">抵達 IATA</label>
                  <input placeholder="KIX" className="w-full p-3 bg-ac-bg rounded-xl font-black text-center outline-none" value={form.arrIata} onChange={e => setForm({...form, arrIata: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-ac-border">時間</label>
                  <input type="time" className="w-full p-3 bg-ac-bg rounded-xl font-black text-center outline-none" value={form.depTime} onChange={e => setForm({...form, depTime: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-ac-border">時間</label>
                  <input type="time" className="w-full p-3 bg-ac-bg rounded-xl font-black text-center outline-none" value={form.arrTime} onChange={e => setForm({...form, arrTime: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          {type !== 'flight' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-ac-brown/40 uppercase flex items-center gap-1"><MapPin size={12}/> 地址 / 地點</label>
              <input className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none" 
                value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="輸入具體地點" />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase">相關照片 / 截圖</label>
            <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
              <button onClick={() => fileInputRef.current?.click()} className="min-w-[100px] h-[100px] border-4 border-dashed border-ac-border rounded-2xl flex flex-col items-center justify-center text-ac-border bg-white hover:bg-ac-bg transition-colors">
                <Camera size={24}/>
                <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
              </button>
              {form.images?.map((img, i) => (
                <div key={i} className="min-w-[100px] h-[100px] rounded-2xl overflow-hidden relative border-2 border-white shadow-sm">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => setForm({...form, images: form.images?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={10}/></button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl">
             確認儲存 ➔
          </button>
        </div>
      </div>
    </div>
  );
};