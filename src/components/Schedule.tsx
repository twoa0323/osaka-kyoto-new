import React, { useState, useMemo, useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Sun, Cloud, CloudRain, MapPin, Plus, Edit3, Trash2, Utensils, Plane, Home, Camera, Sparkles, X, Loader2, ThermometerSun, Wind, Droplets, Clock, ChevronUp, ChevronDown, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { ScheduleItem } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const ICON_MAP = { sightseeing: Camera, food: Utensils, transport: Plane, hotel: Home };

export const Schedule = () => {
  const { trips, currentTripId, deleteScheduleItem, addScheduleItem, reorderScheduleItems } = useTripStore();
  const trip = trips.find(t => t.id === currentTripId);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | undefined>();
  const [detailItem, setDetailItem] = useState<ScheduleItem | undefined>();

  // 天氣數據
  const [weatherData, setWeatherData] = useState<any>(null);
  const [hourlyWeather, setHourlyWeather] = useState<any[]>([]);
  const [showFullWeather, setShowFullWeather] = useState(false);
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

  // Open-Meteo 天氣介接
  useEffect(() => {
    if (!trip?.lat || !trip?.lng) return;
    const getW = async () => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${trip.lat}&longitude=${trip.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weathercode,precipitation_probability,windspeed_10m&timezone=auto`);
        const data = await res.json();
        setWeatherData(data.daily);
        setHourlyWeather(data.hourly.time.map((t: string, i: number) => ({
          time: t, temp: data.hourly.temperature_2m[i], code: data.hourly.weathercode[i], prob: data.hourly.precipitation_probability[i]
        })));
      } catch (e) { console.error(e); }
    };
    getW();
  }, [trip, selectedDateIdx]);

  if (!trip || dateRange.length === 0) return null;
  const selectedDateStr = format(dateRange[selectedDateIdx], 'yyyy-MM-dd');
  const dayItems = (trip.items || []).filter(i => i.date === selectedDateStr).sort((a, b) => a.time.localeCompare(b.time));

  // --- 第一原則：固定使用 gemini-3-flash-preview ---
  const handleAiAnalyze = async () => {
    if (!GEMINI_API_KEY) return alert("請設定 Gemini Key");
    setIsAiLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const prompt = `分析旅遊文字並僅回傳 JSON。格式: [{"time":"HH:mm", "title":"景點", "location":"地址", "category":"sightseeing/food/transport/hotel", "note":"簡介"}]。日期: ${selectedDateStr}。內容: ${aiText}`;
      const res = await model.generateContent(prompt);
      const match = res.response.text().match(/\[[\s\S]*\]/);
      if (match) {
        JSON.parse(match[0]).forEach((i: any) => addScheduleItem(trip.id, { ...i, id: 'ai-'+Math.random(), date: selectedDateStr, images: [] }));
        setIsAiOpen(false); setAiText('');
      }
    } catch (e) { alert("AI 解析失敗"); }
    finally { setIsAiLoading(false); }
  };

  const handleMove = (idx: number, dir: 'up'|'down') => {
    const ni = [...trip.items];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= ni.length) return;
    [ni[idx], ni[target]] = [ni[target], ni[idx]];
    reorderScheduleItems(trip.id, ni);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ac-bg relative">
      {/* 頂部固定日期列 (IMG_6022) */}
      <div className="bg-white border-b-4 border-ac-border p-4 pt-2 z-30 sticky top-0 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-ac-brown/60">
           <CheckCircle size={14} className="text-ac-green"/> <span className="text-[10px] font-black uppercase tracking-widest">行程日期</span>
        </div>
        <div className="flex overflow-x-auto gap-4 hide-scrollbar">
          {dateRange.map((date, i) => (
            <button key={i} onClick={() => setSelectedDateIdx(i)} className={`flex flex-col items-center min-w-[75px] p-3 rounded-2xl border-2 transition-all ${selectedDateIdx === i ? 'bg-[#E2F1E7] border-ac-green text-ac-green shadow-zakka -translate-y-1' : 'bg-white border-ac-border text-ac-brown/30'}`}>
              <span className="text-[8px] font-black opacity-60">DAY {i+1}</span>
              <span className="text-sm font-black">{format(date, 'M/d')}</span>
              <span className="text-[9px] font-bold">{format(date, 'EEE', { locale: zhTW })}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6">
        {/* 天氣卡片 */}
        <div onClick={() => setShowFullWeather(true)} className="bg-gradient-to-br from-[#4FC3F7] to-[#29B6F6] rounded-[40px] p-8 text-white shadow-zakka relative active:scale-95 transition-all">
          <div className="flex justify-between items-start">
             <div><p className="text-[10px] font-black opacity-80 mb-1 flex items-center gap-1 uppercase tracking-widest"><MapPin size={10}/> {trip.dest} City</p><h2 className="text-3xl font-black italic">晴朗無雲 <Sun className="inline-block animate-pulse" size={28}/></h2></div>
             <div className="text-right"><span className="text-5xl font-black italic">24°</span><p className="text-[10px] font-bold opacity-60 uppercase mt-1">H: 28° / L: 19°</p></div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8 bg-white/10 backdrop-blur-md rounded-3xl p-4 border border-white/20">
             <div className="text-center border-r border-white/10"><Droplets size={14} className="mx-auto mb-1"/><p className="text-[8px] font-black opacity-60">降雨機率</p><p className="font-black">10%</p></div>
             <div className="text-center border-r border-white/10"><Wind size={14} className="mx-auto mb-1"/><p className="text-[8px] font-black opacity-60">風力</p><p className="font-black">2級</p></div>
             <div className="text-center"><Clock size={14} className="mx-auto mb-1"/><p className="text-[8px] font-black opacity-60">下小時</p><p className="font-black">晴</p></div>
          </div>
        </div>

        {/* 出發倒數 */}
        <div className="bg-[#7EAB83] rounded-[40px] p-6 text-white shadow-zakka flex justify-between items-center relative overflow-hidden">
           <div className="bg-white/20 px-4 py-2 rounded-full flex items-center gap-2"><Plane size={14} className="rotate-45"/> <span className="text-[10px] font-black uppercase">距離出發</span></div>
           <div className="text-right"><span className="text-4xl font-black italic">91</span> <span className="text-xs font-bold opacity-60">天</span> <span className="text-lg font-black ml-1">1</span> <span className="text-xs font-bold opacity-60">時</span></div>
           <div className="absolute bottom-0 left-0 h-1.5 bg-white/20 w-full"><div className="h-full bg-white w-[91%] shadow-[0_0_10px_white]"/></div>
        </div>

        {/* 行程列表 */}
        <div className="space-y-4">
          <h3 className="text-xl font-black italic flex items-center gap-2"><div className="w-1.5 h-6 bg-ac-orange rounded-full"/> 當日行程</h3>
          <div className="relative pl-10 space-y-6">
             <div className="absolute left-4 top-4 bottom-4 w-1.5 bg-ac-border/30 rounded-full" />
             {dayItems.map((item, idx) => {
               const Icon = ICON_MAP[item.category as keyof typeof ICON_MAP] || Camera;
               return (
                 <div key={item.id} className="relative group animate-in slide-in-from-left duration-300">
                    <span className="absolute -left-10 top-2 text-[8px] font-black opacity-30">{item.time}</span>
                    <div className={`absolute -left-[28.5px] top-2.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${item.category === 'food' ? 'bg-ac-orange' : 'bg-ac-green'}`} />
                    <div onClick={() => isEditMode ? (setEditingItem(item), setIsEditorOpen(true)) : setDetailItem(item)} className={`card-zakka bg-white p-5 active:scale-98 transition-all flex justify-between items-center ${isEditMode ? 'border-dashed border-ac-orange ring-2 ring-ac-orange/20' : ''}`}>
                       <div><h4 className="font-black text-ac-brown text-lg">{item.title}</h4><p className="text-[10px] font-bold text-ac-brown/40 flex items-center gap-1"><MapPin size={10}/> {item.location}</p></div>
                       {isEditMode && <div className="flex flex-col gap-1"><button onClick={(e)=>{e.stopPropagation(); handleMove(idx,'up')}}><ChevronUp size={16}/></button><button onClick={(e)=>{e.stopPropagation(); handleMove(idx,'down')}}><ChevronDown size={16}/></button></div>}
                    </div>
                 </div>
               );
             })}
          </div>
        </div>
      </div>

      {/* 底部操作列 */}
      <div className="px-6 pb-24 z-20">
         <div className="bg-white/90 backdrop-blur-md rounded-full border-4 border-ac-border shadow-zakka p-2 flex gap-2">
            <button onClick={()=>{setEditingItem(undefined); setIsEditorOpen(true)}} className="flex-1 bg-ac-green text-white py-3 rounded-full font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"><Plus size={18}/> 新增</button>
            <button onClick={()=>setIsEditMode(!isEditMode)} className={`flex-1 py-3 rounded-full font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${isEditMode ? 'bg-ac-orange text-white' : 'bg-white text-ac-brown border-2 border-ac-border'}`}><Edit3 size={18}/> {isEditMode ? '完成' : '編輯'}</button>
            <button onClick={()=>setIsAiOpen(true)} className="w-14 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-zakka active:scale-90 transition-transform"><Sparkles size={20}/></button>
         </div>
      </div>

      {/* 24H 天氣 Modal */}
      {showFullWeather && (
        <div className="fixed inset-0 bg-black/60 z-[500] p-6 flex items-center justify-center">
          <div className="bg-ac-bg w-full max-w-sm rounded-[50px] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="bg-[#4FC3F7] p-8 flex justify-between items-center text-white"><h3 className="text-xl font-black italic">24H 預報</h3><button onClick={()=>setShowFullWeather(false)} className="bg-white/20 p-2 rounded-full"><X size={20}/></button></div>
             <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto hide-scrollbar">
                {hourlyWeather.slice(0, 24).map((h, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-4 rounded-3xl border-2 border-ac-border shadow-sm">
                    <span className="font-black text-ac-brown/50 text-xs">{format(parseISO(h.time), 'HH:00')}</span>
                    <ThermometerSun className="text-ac-orange" size={18}/>
                    <span className="font-black text-ac-brown text-lg">{Math.round(h.temp)}°</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* 詳情 Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/60 z-[600] p-6 flex items-center justify-center" onClick={()=>setDetailItem(undefined)}>
          <div className="bg-ac-bg w-full max-w-sm rounded-[45px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10" onClick={e=>e.stopPropagation()}>
            <div className="h-64 bg-ac-border relative">
               {detailItem.images?.[0] ? <img src={detailItem.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-ac-bg"><ImageIcon size={48}/></div>}
               <button onClick={()=>setDetailItem(undefined)} className="absolute top-6 right-6 bg-white/80 p-2 rounded-full shadow-lg"><X/></button>
            </div>
            <div className="p-8 space-y-6">
               <h2 className="text-2xl font-black italic text-ac-brown tracking-tight">{detailItem.title}</h2>
               <div className="flex items-center gap-4 text-[10px] font-black uppercase text-ac-green">
                  <span className="flex items-center gap-1"><Clock size={12}/> {detailItem.time}</span>
                  <span className="flex items-center gap-1"><MapPin size={12}/> {detailItem.location.split(',')[0]}</span>
               </div>
               <p className="text-sm text-ac-brown/60 font-bold whitespace-pre-wrap leading-relaxed">{detailItem.note || "尚無行程內容筆記..."}</p>
               <button onClick={()=>window.open(`https://www.google.com/maps/search/${encodeURIComponent(detailItem.location)}`)} className="btn-zakka w-full py-4 flex items-center justify-center gap-2"><MapPin size={18}/> GOOGLE MAPS</button>
            </div>
          </div>
        </div>
      )}

      {/* AI 智慧解析 Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[700] flex items-center justify-center p-6">
          <div className="bg-ac-bg w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center"><h2 className="text-xl font-black text-purple-600 flex items-center gap-2"><Sparkles size={20}/> AI 智慧解析 (G3)</h2><button onClick={()=>setIsAiOpen(false)}><X/></button></div>
            <textarea placeholder="直接貼上網頁看到的整段行程內容..." className="w-full h-48 bg-white border-4 border-ac-border rounded-3xl p-4 font-bold text-ac-brown outline-none focus:border-purple-400" value={aiText} onChange={e=>setAiText(e.target.value)} />
            <button onClick={handleAiAnalyze} disabled={isAiLoading} className="w-full bg-purple-500 text-white py-4 rounded-full font-black flex items-center justify-center gap-2 shadow-zakka">{isAiLoading ? <Loader2 className="animate-spin"/> : "開始智慧導入 ➔"}</button>
          </div>
        </div>
      )}

      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} item={editingItem} onClose={()=>setIsEditorOpen(false)} />}
    </div>
  );
};




