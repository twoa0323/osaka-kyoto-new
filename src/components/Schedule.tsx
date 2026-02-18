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

  // 核心功能：多天行程 AI 智慧解析
  const handleAiAnalyze = async () => {
    if (!GEMINI_API_KEY) return alert("請設定 Gemini API Key 🔑");
    if (!aiText) return alert("請貼入行程內容唷！📔");
    
    setIsAiLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      // 使用最新的 Gemini 3 Flash preview 模型
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      
      const prompt = `你是一個專業旅遊策劃。請分析提供的文字內容，並將其中的行程轉化為一個 JSON 陣列。
      
      ### 重要規則：
      1. 每個項目必須包含 date 欄位，格式為 "YYYY-MM-DD"。
      2. 請根據內文判斷日期，行程開始日為 ${trip.startDate}。例如 Day 1 = ${trip.startDate}, Day 2 = 隔天，以此類推。
      3. JSON 格式: [{"date":"YYYY-MM-DD", "time":"HH:mm", "title":"名稱", "location":"地點", "category":"sightseeing或food或transport或hotel", "note":"簡介"}]。
      4. 不要包含 Markdown 標記，直接回傳純 JSON 陣列文字。
      5. 忽略與行程時間地點無關的閒聊資訊。
      
      ### 內容如下：
      ${aiText}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let rawText = response.text();
      
      // 強健的 JSON 提取邏輯
      const jsonStart = rawText.indexOf('[');
      const jsonEnd = rawText.lastIndexOf(']') + 1;
      if (jsonStart === -1 || jsonEnd === 0) throw new Error("AI 回傳格式不正確");
      
      const jsonStr = rawText.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);

      parsed.forEach((item: any) => {
        // 使用解析出的日期儲存行程
        addScheduleItem(trip.id, { 
          ...item, 
          id: 'ai-' + Date.now() + Math.random(),
          date: item.date // 確保使用 AI 判斷的日期
        });
      });

      alert(`✨ 成功導入 ${parsed.length} 筆行程！請切換日期檢查看看唷。`);
      setIsAiOpen(false);
      setAiText('');
    } catch (e) {
      console.error(e);
      alert("解析失敗。可能原因是內容過長或格式過於複雜，建議「分天貼入」解析。🍵");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="px-6 flex gap-4">
        <button onClick={() => setIsAiOpen(true)} className="card-zakka flex-1 bg-purple-500 text-white border-none flex items-center justify-center gap-2 py-4 active:scale-95 shadow-lg transition-transform">
          <Sparkles size={18}/> <span className="font-black text-sm italic">AI 智慧解析</span>
        </button>
        <div className="card-zakka flex-1 flex flex-col items-center justify-center py-4 bg-white text-ac-brown">
          <Sun className="text-ac-orange mb-1" size={24} />
          <span className="text-lg font-black italic">24°C</span>
        </div>
      </div>

      {/* 日期選擇列 */}
      <div className="flex overflow-x-auto gap-4 px-6 py-2 hide-scrollbar">
        {dateRange.map((date, i) => (
          <button key={i} onClick={() => setSelectedDateIdx(i)} className={`flex flex-col items-center min-w-[65px] p-4 rounded-3xl border-4 transition-all ${selectedDateIdx === i ? 'bg-ac-green border-ac-green text-white shadow-zakka -translate-y-1' : 'bg-white border-ac-border text-ac-brown/40'}`}>
            <span className="text-[10px] font-black mb-1 uppercase">{format(date, 'EEE', { locale: zhTW })}</span>
            <span className="text-2xl font-black">{format(date, 'dd')}</span>
          </button>
        ))}
      </div>

      {/* 行程列表 */}
      <div className="px-6 space-y-6 relative text-left">
        <div className="absolute left-10 top-4 bottom-4 w-1.5 bg-ac-border/30 rounded-full" />
        {items.length === 0 ? (
          <div className="text-center py-20 text-ac-border font-black italic opacity-30 ml-10">
            今天還沒有規劃唷 📖
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex gap-4 items-start relative group">
              <div className="w-10 pt-2 text-right">
                <span className="text-[10px] font-black text-ac-brown/30">{item.time}</span>
              </div>
              <div className={`w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 mt-1.5 shrink-0 ${
                item.category === 'food' ? 'bg-ac-orange' : 
                item.category === 'transport' ? 'bg-blue-400' : 
                item.category === 'hotel' ? 'bg-purple-400' : 'bg-ac-green'
              }`} />
              <div className="card-zakka flex-1 active:scale-[0.98] transition-transform cursor-pointer">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-ac-brown text-lg leading-tight">{item.title}</h3>
                  <button onClick={() => deleteScheduleItem(trip.id, item.id)} className="text-ac-orange/40 hover:text-ac-orange">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-ac-brown/50 text-xs font-bold mt-2">
                  <MapPin size={12} /> {item.location}
                </div>
                {item.note && <p className="text-[10px] text-ac-brown/40 mt-2 font-bold italic line-clamp-2">{item.note}</p>}
              </div>
            </div>
          ))
        )}
        <button onClick={() => setIsEditorOpen(true)} className="flex items-center gap-3 w-[calc(100%-48px)] p-5 border-4 border-dashed border-ac-border rounded-[32px] text-ac-border font-black ml-12 active:scale-95 transition-all">
          <Plus /> 新增手寫項目
        </button>
      </div>

      {/* AI 解析彈窗 */}
      {isAiOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-ac-bg w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-purple-600 flex items-center gap-2"><Sparkles/> AI 智慧解析</h2>
              <button onClick={() => setIsAiOpen(false)} className="p-2 bg-white rounded-full"><X size={16}/></button>
            </div>
            <p className="text-[10px] font-black text-ac-brown/40 uppercase tracking-widest text-center">可一次貼入多天行程，AI 會自動分類日期唷</p>
            <textarea 
              placeholder="貼上網頁行程或您的記事本內容..." 
              className="w-full h-48 bg-white border-4 border-ac-border rounded-3xl p-4 font-bold text-ac-brown outline-none focus:border-purple-400 resize-none" 
              value={aiText} 
              onChange={e => setAiText(e.target.value)} 
            />
            <button 
              onClick={handleAiAnalyze} 
              disabled={isAiLoading} 
              className="w-full bg-purple-500 text-white py-5 rounded-full font-black shadow-zakka active:scale-95 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
            >
              {isAiLoading ? <Loader2 className="animate-spin" /> : "開始幫我排好 ➔"}
            </button>
          </div>
        </div>
      )}

      {isEditorOpen && (
        <ScheduleEditor 
          tripId={trip.id} 
          date={selectedDateStr} 
          onClose={() => setIsEditorOpen(false)} 
        />
      )}
    </div>
  );
};


