import React, { useState, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Sun, MapPin, Plus, Trash2, Utensils, Plane, Home, Camera, Sparkles, X, Loader2 } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { ScheduleItem } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const ICON_MAP = { sightseeing: Camera, food: Utensils, transport: Plane, hotel: Home };

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
    if (!aiText.trim()) return alert("請貼入行程內容唷！📔");
    
    setIsAiLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      // 第一原則：鎖定使用 gemini-3-flash-preview
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      
      const prompt = `你是一個專業旅遊助理。分析以下文字並僅回傳純 JSON 陣列。
      格式範例: [{"time":"14:00", "title":"景點名", "location":"具體地址", "category":"sightseeing/food/transport/hotel", "note":"介紹"}]。
      針對日期: ${selectedDateStr}。嚴禁包含 Markdown 標記或文字廢話。
      內容: ${aiText}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let rawText = response.text();
      
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("JSON Error");
      const parsed = JSON.parse(jsonMatch[0]);

      parsed.forEach((item: any) => {
        addScheduleItem(trip.id, { ...item, id: 'ai-'+Date.now()+Math.random(), date: selectedDateStr });
      });

      alert("AI 智慧導入成功！✨");
      setIsAiOpen(false); setAiText('');
    } catch (e) {
      console.error(e);
      alert("解析失敗，請縮短貼入文字重試。");
    } finally { setIsAiLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="px-6 flex gap-4">
        <button onClick={() => setIsAiOpen(true)} className="card-zakka flex-1 bg-purple-500 text-white border-none flex items-center justify-center gap-2 py-4 active:scale-95 shadow-lg shadow-purple-200 transition-all"><Sparkles size={18}/> <span className="font-black text-sm italic tracking-widest">AI 智慧解析</span></button>
        <div className="card-zakka flex-1 flex flex-col items-center justify-center py-4 bg-white shadow-sm"><Sun className="text-ac-orange mb-1" size={24} /><span className="text-lg font-black italic text-ac-brown">24°C</span></div>
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
        {items.length === 0 ? <div className="ml-12 py-10 text-ac-border italic font-black opacity-30">這天還沒有計畫唷...📓</div> :
          items.map((item) => {
            const Icon = ICON_MAP[item.category as keyof typeof ICON_MAP] || Camera;
            return (
              <div key={item.id} className="flex gap-4 items-start relative group">
                <div className="w-10 pt-2 text-right"><span className="text-[10px] font-black text-ac-brown/30">{item.time}</span></div>
                <div className={`w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 mt-1.5 shrink-0 ${item.category === 'food' ? 'bg-ac-orange' : item.category === 'transport' ? 'bg-blue-400' : item.category === 'hotel' ? 'bg-purple-400' : 'bg-ac-green'}`} />
                <div className="card-zakka flex-1 active:scale-[0.98] transition-transform cursor-pointer bg-white">
                  <div className="flex justify-between items-start"><div className="flex items-center gap-2"><Icon size={14} className="text-ac-brown/40" /><h3 className="font-black text-ac-brown text-lg leading-tight">{item.title}</h3></div><button onClick={() => deleteScheduleItem(trip.id, item.id)} className="text-ac-orange/40 hover:text-ac-orange"><Trash2 size={16} /></button></div>
                  <div className="flex items-center gap-1 text-ac-brown/50 text-xs font-bold mt-2"><MapPin size={12} /> {item.location}</div>
                </div>
              </div>
            );
          })
        }
        <button onClick={() => setIsEditorOpen(true)} className="flex items-center gap-3 w-[calc(100%-48px)] p-5 border-4 border-dashed border-ac-border rounded-[32px] text-ac-border font-black ml-12 active:scale-95 transition-all shadow-sm shadow-ac-bg"><Plus /> 新增手寫項目</button>
      </div>

      {isAiOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-ac-bg w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center"><h2 className="text-xl font-black text-purple-600 flex items-center gap-2"><Sparkles/> AI 智慧導入 (G3)</h2><button onClick={() => setIsAiOpen(false)} className="p-2 bg-white rounded-full"><X size={20}/></button></div>
            <textarea placeholder="例如：14:00 去黑門市場吃章魚燒..." className="w-full h-48 bg-white border-4 border-ac-border rounded-3xl p-4 font-bold text-ac-brown outline-none focus:border-purple-400 resize-none shadow-inner" value={aiText} onChange={e => setAiText(e.target.value)} />
            <button onClick={handleAiAnalyze} disabled={isAiLoading} className="w-full bg-purple-500 text-white py-5 rounded-full font-black shadow-zakka active:scale-95 flex items-center justify-center gap-3 transition-all">{isAiLoading ? <Loader2 className="animate-spin" /> : "開始智慧排程 ➔"}</button>
          </div>
        </div>
      )}
      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};


