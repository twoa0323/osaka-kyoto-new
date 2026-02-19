import React, { useState, useMemo, useEffect } from 'react';
import { useTripStore } from '../store/useTripStore';
import { format, addDays, differenceInDays, parseISO, isValid } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Sun, Cloud, CloudRain, MapPin, Plus, Edit3, Trash2, Sparkles, X, ChevronUp, ChevronDown, Info, ThermometerSun, CloudLightning, Wind, Droplets, Clock, Loader2 } from 'lucide-react';
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
  const [isEditMode, setIsEditMode] = useState(false); // 排序/編輯模式
  const [editingItem, setEditingItem] = useState<ScheduleItem | undefined>();
  const [detailItem, setDetailItem] = useState<ScheduleItem | undefined>();
  
  // 天氣狀態
  const [weather, setWeather] = useState<any>(null);
  const [hourlyWeather, setHourlyWeather] = useState<any[]>([]);
  const [showWeatherFull, setShowWeatherFull] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const dateRange = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return [];
    const start = parseISO(trip.startDate);
    const diff = differenceInDays(parseISO(trip.endDate), start) + 1;
    return Array.from({ length: diff }, (_, i) => addDays(start, i));
  }, [trip]);

  const selectedDateStr = format(dateRange[selectedDateIdx] || new Date(), 'yyyy-MM-dd');

  // --- Open-Meteo API 天氣抓取 ---
  useEffect(() => {
    if (!trip?.lat || !trip?.lng) return;
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${trip.lat}&longitude=${trip.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&hourly=temperature_2m,weathercode,precipitation_probability,windspeed_10m&timezone=auto`);
        const data = await res.json();
        setWeather(data.daily);
        setHourlyWeather(data.hourly.time.map((t: string, i: number) => ({
          time: t, temp: data.hourly.temperature_2m[i], code: data.hourly.weathercode[i]
        })));
      } catch (e) { console.error("Weather API Error", e); }
    };
    fetchWeather();
  }, [trip, selectedDateIdx]);

  if (!trip || dateRange.length === 0) return null;

  const dayItems = (trip.items || []).filter(i => i.date === selectedDateStr).sort((a, b) => a.time.localeCompare(b.time));

  // --- AI 解析邏輯 (第一原則：gemini-3-flash-preview) ---
  const handleAiAnalyze = async () => {
    if (!GEMINI_API_KEY) return alert("請設定 Gemini API Key 🔑");
    setIsAiLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const prompt = `分析文字並僅回傳純 JSON 陣列。格式: [{"time":"14:00", "title":"景點名", "location":"地標", "category":"sightseeing/food/transport/hotel", "note":"介紹"}]。日期: ${selectedDateStr}。內容: ${aiText}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonMatch = response.text().match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        JSON.parse(jsonMatch[0]).forEach((i: any) => addScheduleItem(trip.id, { ...i, id: 'ai-'+Math.random(), date: selectedDateStr, images: [] }));
        alert("智慧導入完成！");
        setIsAiOpen(false); setAiText('');
      }
    } catch (e) { alert("解析失敗"); }
    finally { setIsAiLoading(false); }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...trip.items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    [newItems[index], newItems[targetIdx]] = [newItems[targetIdx], newItems[index]];
    reorderScheduleItems(trip.id, newItems);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ac-bg relative">
      
      {/* 1. 上方固定日期選擇器 (IMG_6022 視覺) */}
      <div className="bg-white border-b-4 border-ac-border p-4 pt-2 z-30 sticky top-0 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-ac-brown/60">
           <Calendar size={14}/> <span className="text-[10px] font-black uppercase tracking-widest">行程日期</span>
        </div>
        <div className="flex overflow-x-auto gap-4 hide-scrollbar pb-2">
          {dateRange.map((date, i) => (
            <button key={i} onClick={() => setSelectedDateIdx(i)} className={`flex flex-col items-center min-w-[70px] p-3 rounded-2xl border-2 transition-all ${selectedDateIdx === i ? 'bg-[#E2F1E7] border-ac-green text-ac-green shadow-zakka -translate-y-1' : 'bg-white border-ac-border text-ac-brown/40'}`}>
              <span className="text-[8px] font-black opacity-60">DAY {i+1}</span>
              <span className="text-sm font-black">{format(date, 'M/d')}</span>
              <span className="text-[10px] font-bold">{format(date, 'EEE', { locale: zhTW })}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6">
        
        {/* 2. 天氣卡片 (IMG_6022 風格) */}
        <div 
          onClick={() => setShowWeatherFull(true)}
          className="bg-gradient-to-br from-[#4FC3F7] to-[#29B6F6] rounded-[40px] p-8 text-white shadow-zakka cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden"
        >
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-1 opacity-80 text-[10px] font-black"><MapPin size={10}/> {trip.dest.toUpperCase()} CITY</div>
              <h2 className="text-3xl font-black italic">晴朗無雲 <Sun className="inline-block ml-2 animate-pulse" size={28}/></h2>
            </div>
            <div className="text-right">
              <span className="text-5xl font-black italic tracking-tighter">24°</span>
              <p className="text-[10px] font-bold opacity-60 uppercase mt-1">H: 28° / L: 19°</p>
            </div>
          </div>
          
          <div className="relative z-10 grid grid-cols-3 gap-4 mt-8 bg-white/10 backdrop-blur-md rounded-3xl p-4 border border-white/20">
             <div className="text-center border-r border-white/10"><Droplets size={14} className="mx-auto mb-1"/><p className="text-[8px] font-black opacity-60">降雨機率</p><p className="font-black">10%</p></div>
             <div className="text-center border-r border-white/10"><Wind size={14} className="mx-auto mb-1"/><p className="text-[8px] font-black opacity-60">風力</p><p className="font-black">2級</p></div>
             <div className="text-center"><Clock size={14} className="mx-auto mb-1"/><p className="text-[8px] font-black opacity-60">下小時天氣</p><p className="font-black">晴</p></div>
          </div>
        </div>

        {/* 3. 出發倒數卡片 */}
        <div className="bg-[#7EAB83] rounded-[40px] p-6 text-white shadow-zakka flex justify-between items-center relative overflow-hidden">
           <div className="bg-white/20 px-4 py-2 rounded-full flex items-center gap-2"><Plane size={14} className="rotate-45"/> <span className="text-[10px] font-black uppercase">距離出發</span></div>
           <div className="text-right"><span className="text-4xl font-black italic">91</span> <span className="text-sm font-bold opacity-60">天</span> <span className="text-xl font-black italic">1</span> <span className="text-sm font-bold opacity-60">時</span></div>
           <div className="absolute bottom-0 left-0 h-1.5 bg-white/30 w-full"><div className="h-full bg-white w-1/3 shadow-[0_0_10px_white]"/></div>
        </div>

        {/* 4. 行程時間軸 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-ac-orange rounded-full"/>
            <h3 className="text-xl font-black text-ac-brown italic">當日行程</h3>
          </div>
          
          <div className="relative pl-10 space-y-6">
             <div className="absolute left-4 top-4 bottom-4 w-1.5 bg-ac-border/30 rounded-full" />
             {dayItems.length === 0 ? (
               <div className="text-center py-10 text-ac-border font-black opacity-50 italic">今日暫無計畫...🏮</div>
             ) : (
               dayItems.map((item, idx) => (
                 <div key={item.id} className="relative group animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx*50}ms` }}>
                    <div className="absolute -left-10 top-2 w-8 text-right pr-2"><span className="text-[8px] font-black text-ac-brown/30">{item.time}</span></div>
                    <div className={`absolute -left-[28.5px] top-2.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${item.category === 'food' ? 'bg-ac-orange' : 'bg-ac-green'}`} />
                    
                    <div 
                      onClick={() => isEditMode ? (setEditingItem(item), setIsEditorOpen(true)) : setDetailItem(item)}
                      className={`card-zakka bg-white p-5 cursor-pointer active:scale-[0.98] transition-all flex justify-between items-center ${isEditMode ? 'border-ac-orange border-dashed' : ''}`}
                    >
                       <div>
                         <h4 className="font-black text-ac-brown text-lg">{item.title}</h4>
                         <p className="text-[10px] font-bold text-ac-brown/40 flex items-center gap-1"><MapPin size={10}/> {item.location}</p>
                       </div>
                       {isEditMode && (
                         <div className="flex flex-col gap-1">
                            <button onClick={(e) => { e.stopPropagation(); moveItem(idx, 'up'); }} className="p-1 bg-ac-bg rounded-lg text-ac-brown/40"><ChevronUp size={16}/></button>
                            <button onClick={(e) => { e.stopPropagation(); moveItem(idx, 'down'); }} className="p-1 bg-ac-bg rounded-lg text-ac-brown/40"><ChevronDown size={16}/></button>
                         </div>
                       )}
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>
      </div>

      {/* 5. 底部操作列 (Pill Style) */}
      <div className="px-6 pb-24 relative z-20">
         <div className="bg-white/80 backdrop-blur-md rounded-full border-4 border-ac-border shadow-zakka p-2 flex gap-2">
            <button onClick={() => { setEditingItem(undefined); setIsEditorOpen(true); }} className="flex-1 bg-ac-green text-white py-3 rounded-full font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2">
               <Plus size={18}/> 新增
            </button>
            <button onClick={() => setIsEditMode(!isEditMode)} className={`flex-1 py-3 rounded-full font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${isEditMode ? 'bg-ac-orange text-white' : 'bg-white text-ac-brown border-2 border-ac-border'}`}>
               <Edit3 size={18}/> {isEditMode ? '完成' : '編輯'}
            </button>
            <button onClick={() => setIsAiOpen(true)} className="w-14 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-zakka active:scale-95">
               <Sparkles size={20}/>
            </button>
         </div>
      </div>

      {/* 24小時天氣詳情 Modal */}
      {showWeatherFull && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] p-6 flex items-center justify-center">
          <div className="bg-ac-bg w-full max-w-sm rounded-[50px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="bg-[#4FC3F7] p-8 flex justify-between items-center text-white">
                <h3 className="text-xl font-black italic">24H 預報</h3>
                <button onClick={() => setShowWeatherFull(false)} className="bg-white/20 p-2 rounded-full"><X size={20}/></button>
             </div>
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

      {/* 行程詳情 Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] p-6 flex items-center justify-center" onClick={() => setDetailItem(undefined)}>
           <div className="bg-ac-bg w-full max-w-sm rounded-[45px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              <div className="h-64 bg-ac-border relative">
                 {detailItem.images?.[0] ? <img src={detailItem.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-ac-bg"><ImageIcon size={48}/></div>}
                 <button onClick={() => setDetailItem(undefined)} className="absolute top-6 right-6 bg-white/80 p-2 rounded-full shadow-lg"><X/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div>
                    <h2 className="text-2xl font-black italic text-ac-brown">{detailItem.title}</h2>
                    <p className="text-[10px] font-black text-ac-green uppercase mt-1 flex items-center gap-1"><Clock size={10}/> {detailItem.time}</p>
                 </div>
                 <p className="text-sm text-ac-brown/60 font-bold whitespace-pre-wrap leading-relaxed">{detailItem.note || "尚無備註內容..."}</p>
                 <button onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(detailItem.location)}`, '_blank')} className="btn-zakka w-full py-4 flex items-center justify-center gap-2">
                    <MapPin size={18}/> 查看 Google Maps
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* AI 解析 Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-ac-bg w-full max-w-md rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center"><h2 className="text-xl font-black text-purple-600 flex items-center gap-2"><Sparkles/> AI 智慧導入 (G3)</h2><button onClick={() => setIsAiOpen(false)}><X size={20}/></button></div>
            <textarea placeholder="例如：14:00 去黑門市場吃章魚燒..." className="w-full h-48 bg-white border-4 border-ac-border rounded-3xl p-4 font-bold text-ac-brown outline-none focus:border-purple-400 resize-none shadow-inner" value={aiText} onChange={e => setAiText(e.target.value)} />
            <button onClick={handleAiAnalyze} disabled={isAiLoading} className="w-full bg-purple-500 text-white py-5 rounded-full font-black shadow-zakka active:scale-95 flex items-center justify-center gap-3 transition-all">
              {isAiLoading ? <Loader2 className="animate-spin" /> : "開始解析行程 ➔"}
            </button>
          </div>
        </div>
      )}

      {isEditorOpen && <ScheduleEditor tripId={trip.id} date={selectedDateStr} item={editingItem} onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
};



