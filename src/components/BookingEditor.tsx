import React, { useState, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { X, Camera, Globe, QrCode, Loader2, Trash2, Plane, ChevronDown, Sparkles } from 'lucide-react';
import { BookingItem } from '../types';
import { uploadImage, compressImage } from '../utils/imageUtils';
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

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
  const aiInputRef = useRef<HTMLInputElement>(null); // 👈 新增 AI 檔案選擇
  const [uploadingField, setUploadingField] = useState<'images' | 'qrCode' | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false); // 👈 新增 AI 載入狀態

  // 📍 殺手級功能：AI 截圖解析邏輯
  const handleAiParse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!GEMINI_API_KEY) return alert("請先設定 VITE_GEMINI_API_KEY 才能使用 AI 解析喔！");
    
    setIsAiLoading(true);
    try {
      const base64 = await compressImage(file);
      const base64Data = base64.split(',')[1];
      
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }); 
      
      const prompt = type === 'flight' 
        ? `這是一張機票或航班預訂截圖。請解析圖片內容，並以純 JSON 格式回傳（只回傳 JSON，不要 markdown 標記）。
           必須包含以下 key (若無資訊請留空字串)：
           - airline (從此列表擇一：tigerair, starlux, cathay, china, eva, peach, ana, other)
           - flightNo (如 JX820)
           - date (YYYY-MM-DD)
           - depIata (出發機場代碼，如 TPE)
           - arrIata (抵達機場代碼，如 KIX)
           - depTime (HH:mm)
           - arrTime (HH:mm)
           - depCity (出發城市中文)
           - arrCity (抵達城市中文)
           - duration (如 02h 45m)
           - baggage (如 23kg)
           - seat (如 14F)
           - aircraft (如 A350-900)`
        : `這是一張住宿預訂截圖。請解析圖片內容，並以純 JSON 格式回傳（只回傳 JSON，不要 markdown 標記）。
           必須包含以下 key (若無資訊請留空字串)：
           - title (飯店或住宿名稱)
           - location (地址)
           - date (入住日期 YYYY-MM-DD)
           - nights (數字，入住晚數，預設 1)
           - confirmationNo (訂單編號)`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
      ]);
      
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const data = JSON.parse(match[0]);
        if (type === 'flight') {
          setForm(prev => ({
            ...prev,
            airline: data.airline || prev.airline,
            flightNo: data.flightNo || prev.flightNo,
            date: data.date || prev.date,
            depIata: data.depIata || prev.depIata,
            arrIata: data.arrIata || prev.arrIata,
            depTime: data.depTime || prev.depTime,
            arrTime: data.arrTime || prev.arrTime,
            depCity: data.depCity || prev.depCity,
            arrCity: data.arrCity || prev.arrCity,
            baggage: data.baggage || prev.baggage,
            seat: data.seat || prev.seat,
            aircraft: data.aircraft || prev.aircraft
          }));
          if (data.duration) {
             const durMatch = data.duration.match(/(\d+)h\s*(\d+)m/i);
             if (durMatch) { setDurH(durMatch[1]); setDurM(durMatch[2]); }
          }
        } else {
          setForm(prev => ({
            ...prev,
            title: data.title || prev.title,
            location: data.location || prev.location,
            date: data.date || prev.date,
            nights: data.nights || prev.nights,
            confirmationNo: data.confirmationNo || prev.confirmationNo
          }));
        }
        alert("✨ AI 解析成功！已為您自動填入資訊。");
      }
    } catch (e) {
      console.error(e);
      alert("AI 解析失敗，請手動確認填寫。");
    } finally {
      setIsAiLoading(false);
      if (aiInputRef.current) aiInputRef.current.value = '';
    }
  };
  
  const parseInitialDuration = (dur: string | undefined) => {
    if (!dur) return { h: '', m: '' };
    const match = dur.match(/(\d+)h\s*(\d+)m/i) || dur.match(/(\d+)h(\d+)m/i);
    if (match) return { h: match[1], m: match[2] };
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
      } catch (err) { alert("上傳失敗！"); }
      finally { setUploadingField(null); }
    }
  };

  const handleSave = () => {
    if (type !== 'flight' && !form.title) return alert("請輸入名稱唷！");
    if (type === 'flight' && !form.flightNo) return alert("請輸入航班號碼！");
    
    const finalForm = { ...form };
    if (type === 'flight') {
      const selectedAirline = AIRLINES.find(a => a.id === form.airline);
      finalForm.title = selectedAirline ? selectedAirline.name : '航班預訂';
      if (durH || durM) finalForm.duration = `${durH || '0'}h ${durM || '0'}m`;
    }

    if (item) updateBookingItem(tripId, item.id, finalForm);
    else addBookingItem(tripId, { ...finalForm, id: Date.now().toString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-end sm:items-center justify-center p-4">
      <div className="bg-ac-bg w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto text-left">
        
        <div className="p-6 flex justify-between items-center border-b-4 border-ac-border sticky top-0 bg-ac-bg z-10">
          <h2 className="text-xl font-black text-ac-brown italic">🖋️ 編輯資訊</h2>
          <div className="flex items-center gap-2">
            {item && (
               <button onClick={() => { if(confirm('確定要刪除嗎？')) { deleteBookingItem(tripId, item.id); onClose(); } }} className="p-2 bg-red-50 text-red-500 rounded-full active:scale-90"><Trash2 size={18}/></button>
            )}
            <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm border border-ac-border"><X size={20}/></button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          
          {/* 📍 新增：超有質感的 AI 截圖解析按鈕 */}
          <div className="relative">
             <button onClick={() => aiInputRef.current?.click()} disabled={isAiLoading} className="w-full bg-[#1A1A1A] text-white p-4 rounded-2xl font-black tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[4px_4px_0px_#C4A97A] border-2 border-transparent hover:border-[#C4A97A]">
               {isAiLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} className="text-[#C4A97A] animate-pulse" />}
               {isAiLoading ? 'AI 魔法解析中... 🚀' : '📸 上傳截圖，AI 自動帶入'}
             </button>
             <input ref={aiInputRef} type="file" accept="image/*" className="hidden" onChange={handleAiParse} />
          </div>

          {type === 'flight' ? (

            <div className="space-y-6">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest ml-1">航空公司模板</label>
                <div className="relative">
                  <select 
                    className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none appearance-none cursor-pointer"
                    value={form.airline} 
                    onChange={e => setForm({...form, airline: e.target.value})}
                  >
                    {AIRLINES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ac-border">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              {/* 日期與航班號對齊 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest ml-1">日期</label>
                  <input type="date" className="w-full h-14 px-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown text-sm outline-none shadow-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest ml-1">航班號</label>
                  <input placeholder="JX820" className="w-full h-14 px-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown text-sm uppercase outline-none shadow-sm" value={form.flightNo} onChange={e => setForm({...form, flightNo: e.target.value})} />
                </div>
              </div>

              {/* 核心資訊區塊 */}
              <div className="bg-white p-5 rounded-[2.5rem] border-2 border-ac-border space-y-6 shadow-sm relative overflow-hidden">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
                   <Plane size={150} className="text-ac-brown rotate-90" />
                </div>

                <div className="grid grid-cols-2 gap-8 relative z-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-ac-brown/30 uppercase tracking-widest text-center block w-full">出發地</label>
                    <input placeholder="TPE" className="w-full h-12 bg-[#F5F6F8] border border-ac-border/30 rounded-xl font-black text-center text-lg uppercase outline-none focus:border-ac-green focus:bg-white transition-colors" value={form.depIata} onChange={e => setForm({...form, depIata: e.target.value})} />
                    <input type="time" className="w-full h-12 bg-[#F5F6F8] border border-ac-border/30 rounded-xl font-black text-center text-sm outline-none focus:border-ac-green focus:bg-white transition-colors" value={form.depTime} onChange={e => setForm({...form, depTime: e.target.value})} />
                    <input placeholder="台北" className="w-full h-10 bg-[#F5F6F8] border border-ac-border/30 rounded-lg font-bold text-center text-[11px] outline-none focus:border-ac-green focus:bg-white transition-colors" value={form.depCity} onChange={e => setForm({...form, depCity: e.target.value})} />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-ac-brown/30 uppercase tracking-widest text-center block w-full">目的地</label>
                    <input placeholder="KIX" className="w-full h-12 bg-[#F5F6F8] border border-ac-border/30 rounded-xl font-black text-center text-lg uppercase outline-none focus:border-ac-green focus:bg-white transition-colors" value={form.arrIata} onChange={e => setForm({...form, arrIata: e.target.value})} />
                    <input type="time" className="w-full h-12 bg-[#F5F6F8] border border-ac-border/30 rounded-xl font-black text-center text-sm outline-none focus:border-ac-green focus:bg-white transition-colors" value={form.arrTime} onChange={e => setForm({...form, arrTime: e.target.value})} />
                    <input placeholder="大阪" className="w-full h-10 bg-[#F5F6F8] border border-ac-border/30 rounded-lg font-bold text-center text-[11px] outline-none focus:border-ac-green focus:bg-white transition-colors" value={form.arrCity} onChange={e => setForm({...form, arrCity: e.target.value})} />
                  </div>
                </div>

                {/* 飛行時間 */}
                <div className="bg-[#F5F6F8] border border-ac-border/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 relative z-10">
                  <span className="text-[9px] font-black text-ac-brown/40 uppercase tracking-widest">飛行時間</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-ac-border/30 shadow-sm">
                       <input type="number" min="0" value={durH} onChange={e => setDurH(e.target.value)} className="w-10 bg-transparent font-black text-center text-sm outline-none" placeholder="0"/>
                       <span className="text-[10px] font-black text-ac-border">h</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-ac-border/30 shadow-sm">
                       <input type="number" min="0" max="59" value={durM} onChange={e => setDurM(e.target.value)} className="w-10 bg-transparent font-black text-center text-sm outline-none" placeholder="0"/>
                       <span className="text-[10px] font-black text-ac-border">m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部附屬 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 text-center">
                  <label className="text-[9px] font-black text-ac-brown/40 uppercase">行李</label>
                  <input placeholder="15kg" className="w-full h-12 bg-white border-2 border-ac-border rounded-xl font-bold text-xs text-center outline-none" value={form.baggage} onChange={e => setForm({...form, baggage: e.target.value})} />
                </div>
                <div className="space-y-1.5 text-center">
                  <label className="text-[9px] font-black text-ac-brown/40 uppercase">機型</label>
                  <input placeholder="A321" className="w-full h-12 bg-white border-2 border-ac-border rounded-xl font-bold text-xs text-center uppercase outline-none" value={form.aircraft} onChange={e => setForm({...form, aircraft: e.target.value})} />
                </div>
                <div className="space-y-1.5 text-center">
                  <label className="text-[9px] font-black text-ac-brown/40 uppercase">座位</label>
                  <input placeholder="14F" className="w-full h-12 bg-white border-2 border-ac-border rounded-xl font-bold text-xs text-center uppercase outline-none" value={form.seat} onChange={e => setForm({...form, seat: e.target.value})} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="space-y-1.5"><label className="text-[10px] font-black text-ac-brown/40 uppercase ml-1 tracking-widest">標題名稱</label>
               <input className="w-full h-14 px-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none focus:border-ac-green" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="例如：東橫INN" /></div>
               <div className="space-y-1.5"><label className="text-[10px] font-black text-ac-brown/40 uppercase ml-1 tracking-widest">地址 / 位置</label>
               <input placeholder="輸入具體地址" className="w-full h-14 px-4 bg-white border-2 border-ac-border rounded-2xl font-bold outline-none focus:border-ac-green" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
               {type === 'hotel' && (
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-ac-brown/40 uppercase ml-1 tracking-widest">入住晚數</label>
                 <input type="number" className="w-full h-14 px-4 bg-white border-2 border-ac-border rounded-2xl font-bold outline-none focus:border-ac-green" value={form.nights} onChange={e => setForm({...form, nights: Number(e.target.value)})} /></div>
               )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase flex items-center gap-1 ml-1 tracking-widest"><Globe size={12}/> 相關網址</label>
            <input className="w-full h-14 px-4 bg-white border-2 border-ac-border rounded-2xl font-bold outline-none text-sm focus:border-ac-green" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => qrInputRef.current?.click()} className="h-32 border-4 border-dashed border-ac-border rounded-[2rem] flex flex-col items-center justify-center text-ac-border bg-white overflow-hidden relative group active:scale-95 transition-all">
              {uploadingField === 'qrCode' && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                  <Loader2 className="animate-spin text-ac-orange mb-1.5" size={28} strokeWidth={3}/>
                </div>
              )}
              {form.qrCode ? (
                <><img src={form.qrCode} className="h-full object-contain p-2 pointer-events-none" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-[10px] font-black">更換 QR</span></div></>
              ) : <><QrCode size={24}/> <span className="text-[9px] font-black mt-2 uppercase tracking-widest">上傳 QR</span></>}
            </button>
            <input ref={qrInputRef} type="file" className="hidden" onChange={e => handlePhoto(e, 'qrCode')} />

            <button type="button" onClick={() => fileInputRef.current?.click()} className="h-32 border-4 border-dashed border-ac-border rounded-[2rem] flex flex-col items-center justify-center text-ac-border bg-white overflow-hidden relative group active:scale-95 transition-all">
              {uploadingField === 'images' && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                  <Loader2 className="animate-spin text-ac-orange mb-1.5" size={28} strokeWidth={3}/>
                </div>
              )}
              {form.images?.[0] ? (
                <><img src={form.images[0]} className="w-full h-full object-cover pointer-events-none" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-[10px] font-black">更換照片</span></div></>
              ) : <><Camera size={24}/> <span className="text-[9px] font-black mt-2 uppercase tracking-widest">上傳照片</span></>}
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={e => handlePhoto(e, 'images')} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-ac-brown/40 uppercase ml-1">細項筆記</label>
            <textarea placeholder="寫下相關細節資訊..." className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold h-24 text-sm outline-none resize-none focus:border-ac-green" value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
          </div>

          <button onClick={handleSave} className="btn-zakka w-full py-5 text-lg font-black tracking-widest shadow-sm mt-2">
            確認儲存 ➔
          </button>
        </div>
      </div>
    </div>
  );
};












