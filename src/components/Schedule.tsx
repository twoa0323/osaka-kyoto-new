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

  // 天氣狀態
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

  // Open-Meteo API
  useEffect(() => {
    if (!trip?.lat || !trip?.lng) return;
    const getW = async () => {
      try {
        // 同時抓取 daily 與 hourly 資料
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${trip.lat}&longitude=${trip.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&hourly=temperature_2m,weathercode,precipitation_probability,windspeed_10m&timezone=auto`);
        const data = await res.json();
        setWeatherData(data.daily);
        setHourlyWeather(data.hourly.time.map((t: string, i: number) => ({
          time: t, temp: data.hourly.temperature_2m[i], code: data.hourly.weathercode[i], prob: data.hourly.precipitation_probability[i], wind: data.hourly.windspeed_10m[i]
        })));
      } catch (e) { console.error(e); }
    };
    getW();
  }, [trip, selectedDateIdx]);

  if (!trip || dateRange.length === 0) return null;
  const selectedDateStr = format(dateRange[selectedDateIdx], 'yyyy-MM-dd');
  const dayItems = (trip.items || []).filter(i => i.date === selectedDateStr).sort((a, b) => a.time.localeCompare(b.time));

  // Gemini-3-flash-preview 鎖定
  const handleAiAnalyze = async () => {
    if (!GEMINI_API_KEY) return alert("請設定 Gemini Key");
    setIsAiLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const prompt = `分析文字並回傳純 JSON 陣列。格式: [{"time":"HH:mm", "title":"景點", "location":"地址", "category":"sightseeing/food/transport/hotel", "note":"介紹"}]。日期: ${selectedDateStr}。內容: ${aiText}`;
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
    const itemsOfThisDay = ni.filter(i => i.date === selectedDateStr);
    const globalIdx = ni.findIndex(x => x.id === itemsOfThisDay[idx].id);
    const targetGlobalIdx = ni.findIndex(x => x.id === itemsOfThisDay[dir === 'up' ? idx - 1 : idx + 1].id);
    
    if (targetGlobalIdx !== -1) {
       [ni[globalIdx], ni[targetGlobalIdx]] = [ni[targetGlobalIdx], ni[globalIdx]];
       reorderScheduleItems(trip.id, ni);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ac-bg relative">
      {/* 1. 日期選擇器 (修正: 增加高度與 Padding 防止上方被切) */}
      <div className="bg-white border-b-4 border-ac-border z-30 sticky top-0 shadow-sm flex flex-col justify-center pb-2 pt-2">
        <div className="flex items-center gap-2 mb-2 px-4 text-ac-brown/60">
           <CheckCircle size={14} className="text-ac-green"/> <span className="text-[10px] font-black uppercase tracking-widest">行程日期</span>
        </div>
        <div className="flex overflow-x-auto gap-3 px-4 pb-4 hide-scrollbar">
          {dateRange.map((date, i) => (
            <button key={i} onClick={() => setSelectedDateIdx(i)} className={`flex flex-col items-center justify-center min-w-[72px] h-[75px] rounded-2xl border-2 transition-all duration-300 ${selectedDateIdx === i ? 'bg-[#E2F1E7] border-ac-green text-ac-green shadow-zakka -translate-y-1' : 'bg-white border-ac-border text-ac-brown/30'}`}>
              <span className="text-[8px] font-black opacity-60 uppercase">DAY {i+1}</span>
              <span className="text-xl font-black leading-none my-0.5">{format(date, 'M/d')}</span>
              <span className="text-[10px] font-bold">{format(date, 'EEE', { locale: zhTW })}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6">
        {/* 2. 天氣卡片 (高度縮小 Compact) */}
        <div onClick={() => setShowFullWeather(true)} className="bg-gradient-to-br from-[#4FC3F7] to-[#29B6F6] rounded-[32px] p-5 text-white shadow-zakka relative active:scale-95 transition-all cursor-pointer">
          <div className="flex justify-between items-center mb-4">
             <div><p className="text-[9px] font-black opacity-80 flex items-center gap-1 uppercase tracking-widest"><MapPin size={9}/> {trip.dest} City</p><h2 className="text-2xl font-black italic flex items-center gap-2">晴朗 <Sun className="animate-pulse" size={20}/></h2></div>
             <div className="text-right"><span className="text-4xl font-black italic">24°</span></div>
          </div>
          <div className="grid grid-cols-3 gap-2 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
             <div className="text-center border-r border-white/10"><Droplets size={12} className="mx-auto mb-1"/><p className="text-[8px] opacity-70">降雨</p><p className="font-black text-xs">10%</p></div>
             <div className="text-center border-r border-white/10"><Wind size={12} className="mx-auto mb-1"/><p className="text-[8px] opacity-70">風力</p><p className="font-black text-xs">2級</p></div>
             <div className="text-center"><Clock size={12} className="mx-auto mb-1"/><p className="text-[8px] opacity-70">下小時</p><p className="font-black text-xs">晴</p></div>
          </div>
        </div>

        {/* 行程列表與功能列 (IMG_6074 藍框位置) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-ac-orange rounded-full"/>
              <h3 className="text-xl font-black text-ac-brown italic">當日行程</h3>
            </div>
            
            {/* 功能按鈕區 (縮小並列) */}
            <div className="bg-white/80 backdrop-blur-md rounded-full border-2 border-ac-border shadow-sm p-1 flex gap-1 items-center">
              <button onClick={()=>{setEditingItem(undefined); setIsEditorOpen(true)}} className="w-9 h-9 rounded-full bg-ac-green text-white flex items-center justify-center active:scale-90 transition-all shadow-sm" title="新增"><Plus size={18}/></button>
              <button onClick={()=>setIsEditMode(!isEditMode)} className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-sm ${isEditMode ? 'bg-ac-orange text-white' : 'bg-white text-ac-brown border border-ac-border'}`} title="編輯"><Edit3 size={16}/></button>
              <button onClick={()=>setIsAiOpen(true)} className="w-9 h-9 rounded-full bg-purple-500 text-white flex items-center justify-center active:scale-90 transition-all shadow-sm" title="AI"><Sparkles size={16}/></button>
            </div>
          </div>
          
          <div className="relative pl-10 space-y-5">
             <div className="absolute left-4 top-4 bottom-4 w-1.5 bg-ac-border/30 rounded-full" />
             {dayItems.length === 0 ? (
               <div className="text-center py-10 text-ac-border font-black opacity-30 italic">今日尚未安排計畫 📖</div>
             ) : (
               dayItems.map((item, idx) => {
                 const Icon = ICON_MAP[item.category as keyof typeof ICON_MAP] || Camera;
                 return (
                   <div key={item.id} className="relative group animate-in slide-in-from-left duration-300">
                      <span className="absolute -left-10 top-3 text-[9px] font-black opacity-40">{item.time}</span>
                      <div className={`absolute -left-[28.5px] top-3.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${item.category === 'food' ? 'bg-ac-orange' : 'bg-ac-green'}`} />
                      
                      <div 
                        onClick={() => isEditMode ? (setEditingItem(item), setIsEditorOpen(true)) : setDetailItem(item)}
                        className={`card-zakka bg-white p-4 cursor-pointer active:scale-[0.98] transition-all flex justify-between items-center ${isEditMode ? 'border-dashed border-ac-orange ring-2 ring-ac-orange/10' : ''}`}
                      >
                         <div className="flex-1 min-w-0">
                           <h4 className="font-black text-ac-brown text-lg truncate">{item.title}</h4>
                           <p className="text-[10px] font-bold text-ac-brown/40 flex items-center gap-1 mt-1 truncate"><MapPin size={10}/> {item.location}</p>
                         </div>
                         {isEditMode && (
                           <div className="flex flex-col gap-1 ml-2">
                              <button onClick={(e) => { e.stopPropagation(); handleMove(idx, 'up'); }} className="p-1 bg-ac-bg rounded text-ac-brown/40 hover:bg-ac-orange hover:text-white"><ChevronUp size={14}/></button>
                              <button onClick={(e) => { e.stopPropagation(); handleMove(idx, 'down'); }} className="p-1 bg-ac-bg rounded text-ac-brown/40 hover:bg-ac-orange hover:text-white"><ChevronDown size={14}/></button>
                           </div>
                         )}
                      </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>
      </div>

      {/* 詳情 Modal (自動圖片) */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[600] p-6 flex items-center justify-center" onClick={() => setDetailItem(undefined)}>
           <div className="bg-ac-bg w-full max-w-sm rounded-[45px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              <div className="h-60 bg-gray-200 relative overflow-hidden">
                 {/* 3. 圖片自動帶入邏輯 */}
                 <img 
                   src={detailItem.images?.[0] || `https://image.pollinations.ai/prompt/${encodeURIComponent(detailItem.location + ' ' + detailItem.title + ' scenery photorealistic')}?width=800&height=600&nologo=true`} 
                   className="w-full h-full object-cover" 
                   alt="location"
                   onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800")}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                 <button onClick={() => setDetailItem(undefined)} className="absolute top-6 right-6 bg-white/20 backdrop-blur-md p-2 rounded-full text-white"><X size={20}/></button>
                 <h2 className="absolute bottom-6 left-6 text-2xl font-black text-white italic tracking-wide">{detailItem.title}</h2>
              </div>
              <div className="p-8 space-y-6">
                 <div className="flex items-center gap-4 text-xs font-black uppercase text-ac-green bg-white p-3 rounded-2xl shadow-sm border border-ac-border">
                    <span className="flex items-center gap-1"><Clock size={14}/> {detailItem.time}</span>
                    <div className="w-px h-3 bg-ac-border"/>
                    <span className="flex items-center gap-1 truncate"><MapPin size={14}/> {detailItem.location}</span>
                 </div>
                 <p className="text-sm text-ac-brown/70 font-bold whitespace-pre-wrap leading-relaxed min-h-[60px]">{detailItem.note || "這個行程還沒有備註，點擊編輯來增加筆記吧！"}</p>
                 <button onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(detailItem.location)}`, '_blank')} className="btn-zakka w-full py-4 flex items-center justify-center gap-2 text-lg shadow-lg"><MapPin size={20}/> Google Maps</button>
              </div>
           </div>
        </div>
      )}

      {/* 天氣 Modal */}
      {showFullWeather && (
        <div className="fixed inset-0 bg-black/60 z-[500] p-6 flex items-center justify-center backdrop-blur-sm" onClick={()=>setShowFullWeather(false)}>
          <div className="bg-ac-bg w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
             <div className="bg-[#4FC3F7] p-6 flex justify-between items-center text-white"><h3 className="text-xl font-black italic">24H 天氣預報</h3><button onClick={()=>setShowFullWeather(false)}><X/></button></div>
             <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto hide-scrollbar">
                {hourlyWeather.slice(0, 24).map((h, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-4 rounded-2xl border-2 border-ac-border">
                    <span className="font-black text-ac-brown/60 text-xs">{format(parseISO(h.time), 'HH:00')}</span>
                    <div className="flex items-center gap-2"><ThermometerSun className="text-ac-orange" size={16}/><span className="font-black text-lg">{Math.round(h.temp)}°</span></div>
                    <span className="text-[10px] font-bold text-blue-400">{h.prob}% 雨</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[700] flex items-center justify-center p-6">
          <div className="bg-ac-bg w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center"><h2 className="text-xl font-black text-purple-600 flex items-center gap-2"><Sparkles size={20}/> AI 智慧解析</h2><button onClick={()=>setIsAiOpen(false)}><X/></button></div>
            <textarea placeholder="貼上行程文字..." className="w-full h-48 bg-white border-4 border-ac-border rounded-3xl p-4 font-bold text-ac-brown outline-none focus:border-purple-400 resize-none shadow-inner" value={aiText} onChange={e=>setAiText(e.target.value)} />
            <button onClick={handleAiAnalyze} disabled={isAiLoading} className="w-full bg-purple-500 text-white py-4 rounded-full font-black flex items-center justify-center gap-2 shadow-zakka">{isAiLoading ? <Loader2 className="animate-spin"/> : "Gemini G3 解析 ➔"}</button>
          </div>
        </div>
      )}

      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};






