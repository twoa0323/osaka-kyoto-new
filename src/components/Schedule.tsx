import React, { useState, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Sun, MapPin, Plus, Trash2, Utensils, Plane, Home, Camera, Sparkles, X, Loader2 } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export const Schedule = () => {
  const { trips, currentTripId, deleteScheduleItem, addScheduleItem } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const dateRange = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return [];
    const start = parseISO(trip.startDate);
    const end = parseISO(trip.endDate);
    if (!isValid(start) || !isValid(end)) return [];
    const diff = Math.max(0, differenceInDays(end, start)) + 1;
    return Array.from({ length: diff }, (_, i) => addDays(start, i));
  }, [trip]);

  if (!trip || dateRange.length === 0) return null;
  const selectedDateStr = format(dateRange[selectedDateIdx], 'yyyy-MM-dd');
  const items = (trip.items || []).filter(i => i.date === selectedDateStr).sort((a, b) => a.time.localeCompare(b.time));

  // Gemini AI 處理
  const handleAiAnalyze = async () => {
    if (!GEMINI_API_KEY) return alert("請先設定 Gemini API Key 唷！🔑");
    if (!aiText.trim()) return alert("請貼上想要解析的行程文字唷！");
    
    setIsAiLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `你是一個專業旅遊手帳助理。請將以下亂序的旅遊文字解析為精確的 JSON 陣列。
      格式嚴格遵守: [{"time":"HH:mm", "title":"景點名稱", "location":"具體地址或地標", "category":"sightseeing或food或transport或hotel", "note":"一句話簡介"}]。
      請針對日期 ${selectedDateStr} 進行解析。輸入內容: ${aiText}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text);

      parsed.forEach((item: any) => {
        addScheduleItem(trip.id, { ...item, id: 'ai-'+Date.now()+Math.random(), date: selectedDateStr });
      });

      alert("智慧導入成功！✨");
      setIsAiOpen(false);
      setAiText('');
    } catch (e) {
      console.error(e);
      alert("AI 解析失敗，請確保內容包含時間與地點。");
    }
    setIsAiLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 頂部 AI 與天氣卡片 */}
      <div className="px-6 flex gap-4">
        <button onClick={() => setIsAiOpen(true)} className="card-zakka flex-1 bg-purple-500 text-white border-none flex items-center justify-center gap-2 py-4 active:scale-95 transition-transform shadow-lg">
          <Sparkles size={20}/> <span className="font-black text-sm italic">AI 智慧解析</span>
        </button>
        <div className="card-zakka flex-1 flex flex-col items-center justify-center py-4 bg-white">
          <Sun className="text-ac-orange mb-1" size={24} />
          <span className="text-lg font-black italic text-ac-brown">24°C</span>
        </div>
      </div>

      {/* 日期選擇器 */}
      <div className="flex overflow-x-auto gap-4 px-6 py-2 hide-scrollbar">
        {dateRange.map((date, i) => (
          <button key={i} onClick={() => setSelectedDateIdx(i)} className={`flex flex-col items-center min-w-[65px] p-4 rounded-3xl border-4 transition-all ${selectedDateIdx === i ? 'bg-ac-green border-ac-green text-white shadow-zakka -translate-y-1' : 'bg-white border-ac-border text-ac-brown/40'}`}>
            <span className="text-[10px] font-black mb-1 uppercase">{format(date, 'EEE', { locale: zhTW })}</span>
            <span className="text-2xl font-black">{format(date, 'dd')}</span>
          </button>
        ))}
      </div>

      <div className="px-6 space-y-6 relative text-left">
        <div className="absolute left-10 top-4 bottom-4 w-1.5 bg-ac-border/30 rounded-full" />
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 items-start relative group">
            <div className="w-10 pt-2 text-right"><span className="text-[10px] font-black text-ac-brown/30">{item.time}</span></div>
            <div className={`w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 mt-1.5 shrink-0 ${item.category === 'food' ? 'bg-ac-orange' : item.category === 'transport' ? 'bg-blue-400' : item.category === 'hotel' ? 'bg-purple-400' : 'bg-ac-green'}`} />
            <div className="card-zakka flex-1 active:scale-[0.98] transition-transform cursor-pointer">
              <div className="flex justify-between items-start">
                <h3 className="font-black text-ac-brown text-lg leading-tight">{item.title}</h3>
                <button onClick={() => deleteScheduleItem(trip.id, item.id)} className="text-ac-orange/40 hover:text-ac-orange"><Trash2 size={16} /></button>
              </div>
              <div className="flex items-center gap-1 text-ac-brown/50 text-xs font-bold mt-2"><MapPin size={12} /> {item.location}</div>
            </div>
          </div>
        ))}
        <button onClick={() => setIsEditorOpen(true)} className="flex items-center gap-3 w-[calc(100%-48px)] p-5 border-4 border-dashed border-ac-border rounded-[32px] text-ac-border font-black ml-12 active:scale-95 transition-all"><Plus /> 新增手寫項目</button>
      </div>

      {/* Gemini AI 解析 Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-6">
          <div className="bg-ac-bg w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center"><h2 className="text-xl font-black text-purple-600 flex items-center gap-2"><Sparkles/> AI 智慧行程解析</h2><button onClick={() => setIsAiOpen(false)} className="p-2 bg-white rounded-full"><X size={16}/></button></div>
            <textarea placeholder="例如：下午兩點去黑門市場吃章魚燒，接著三點去心齋橋逛逛。AI 會幫你自動解析時間與標題唷！" className="w-full h-48 bg-white border-4 border-ac-border rounded-3xl p-4 font-bold text-ac-brown outline-none focus:border-purple-400 resize-none" value={aiText} onChange={e => setAiText(e.target.value)} />
            <button onClick={handleAiAnalyze} disabled={isAiLoading} className="w-full bg-purple-500 text-white py-5 rounded-full font-black shadow-zakka active:scale-95 flex items-center justify-center gap-3 transition-all">
              {isAiLoading ? <Loader2 className="animate-spin" /> : "開始幫我排好 ➔"}
            </button>
          </div>
        </div>
      )}

      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};

