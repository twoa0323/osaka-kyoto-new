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

  const handleAiAnalyze = async () => {
    if (!GEMINI_API_KEY) return alert("請設定 Gemini API Key 🔑");
    setIsAiLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      // 使用 Gemini 3 Flash preview 預覽版，解析速度最快且最智慧
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      
      const prompt = `你是一個專業旅遊策劃。請將以下文字轉化為 JSON 陣列。
      格式: [{"time":"HH:mm", "title":"名稱", "location":"地點", "category":"sightseeing或food或transport或hotel", "note":"簡介"}]。
      針對日期: ${selectedDateStr}。不要包含 Markdown 標記，直接回傳純 JSON 文字。
      內容: ${aiText}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let rawText = response.text();
      
      // 容錯提取 JSON
      const jsonStart = rawText.indexOf('[');
      const jsonEnd = rawText.lastIndexOf(']') + 1;
      const jsonStr = rawText.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);

      parsed.forEach((item: any) => {
        addScheduleItem(trip.id, { ...item, id: 'ai-'+Date.now()+Math.random(), date: selectedDateStr });
      });

      alert("AI 智慧解析成功！✨");
      setIsAiOpen(false);
      setAiText('');
    } catch (e) {
      console.error(e);
      alert("解析失敗，請縮短內容或重新嘗試。");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="px-6 flex gap-4">
        <button onClick={() => setIsAiOpen(true)} className="card-zakka flex-1 bg-purple-500 text-white border-none flex items-center justify-center gap-2 py-4 active:scale-95 shadow-lg transition-transform"><Sparkles size={18}/> <span className="font-black text-sm italic">AI 智慧解析</span></button>
        <div className="card-zakka flex-1 flex flex-col items-center justify-center py-4 bg-white text-ac-brown"><Sun className="text-ac-orange mb-1" size={24} /><span className="text-lg font-black italic">24°C</span></div>
      </div>

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
              <div className="flex justify-between items-start"><h3 className="font-black text-ac-brown text-lg leading-tight">{item.title}</h3><button onClick={() => deleteScheduleItem(trip.id, item.id)} className="text-ac-orange/40 hover:text-ac-orange"><Trash2 size={16} /></button></div>
              <div className="flex items-center gap-1 text-ac-brown/50 text-xs font-bold mt-2"><MapPin size={12} /> {item.location}</div>
            </div>
          </div>
        ))}
        <button onClick={() => setIsEditorOpen(true)} className="flex items-center gap-3 w-[calc(100%-48px)] p-5 border-4 border-dashed border-ac-border rounded-[32px] text-ac-border font-black ml-12 active:scale-95 transition-all"><Plus /> 新增手寫項目</button>
      </div>

      {isAiOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-ac-bg w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center"><h2 className="text-xl font-black text-purple-600 flex items-center gap-2"><Sparkles/> AI 智慧導入</h2><button onClick={() => setIsAiOpen(false)}><X size={16}/></button></div>
            <textarea placeholder="貼上網頁行程或任何凌亂的紀錄文字，AI 會幫你自動整理時間與標題唷！" className="w-full h-48 bg-white border-4 border-ac-border rounded-3xl p-4 font-bold text-ac-brown outline-none focus:border-purple-400 resize-none" value={aiText} onChange={e => setAiText(e.target.value)} />
            <button onClick={handleAiAnalyze} disabled={isAiLoading} className="w-full bg-purple-500 text-white py-5 rounded-full font-black shadow-zakka active:scale-95 flex items-center justify-center gap-3 transition-all">{isAiLoading ? <Loader2 className="animate-spin" /> : "開始幫我排好 ➔"}</button>
          </div>
        </div>
      )}
      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};


