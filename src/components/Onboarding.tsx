import { useState, useEffect, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { getCurrencyByCountry } from '../utils/currencyMapping';
import { fetchExchangeRate } from '../utils/exchange';
import { Plane, MapPin, Calendar, Banknote, RefreshCw, Rocket, Loader2, Mail, Lock, Plus, User } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useTranslation } from '../hooks/useTranslation';

export const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  // ✅ 修復 3：引入 addTripLocal 與 trips 來處理加入邏輯
  const { addTrip, addTripLocal, trips, showToast } = useTripStore();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  const [step, setStep] = useState<'info' | 'security'>('info');
  const isSelecting = useRef(false);

  const [form, setForm] = useState({
    selectedPlace: null as any,
    tripName: '', // 👈 新增
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    currency: 'TWD' as any,
    tripPin: '',
    creatorName: '' // 👈 替代 adminEmail
  });

  useEffect(() => {
    if (isSelecting.current) { isSelecting.current = false; return; }
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=5&accept-language=zh-TW`);
          const data = await res.json();
          setSuggestions(data);
        } catch (e) { console.error(e); }
        setLoading(false);
      } else { setSuggestions([]); }
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPlace = async (place: any) => {
    isSelecting.current = true;
    const address = place.address || {};
    const currency = getCurrencyByCountry(address.country_code || '', address.country || '');
    setForm(prev => ({ ...prev, selectedPlace: place, currency }));
    setQuery(place.display_name.split(',')[0]);
    setSuggestions([]);
    const currentRate = await fetchExchangeRate(currency);
    setRate(currentRate);
  };

  const handleFinish = () => {
    if (!form.creatorName || form.tripPin.length < 4) return showToast(t('onboarding.emptyDest'), "info");

    const uid = auth.currentUser?.uid;
    if (!uid) return showToast(t('onboarding.loginReq'), "error");

    addTrip({
      id: Date.now().toString(),
      tripName: form.tripName || form.selectedPlace.display_name.split(',')[0],
      dest: form.selectedPlace.display_name.split(',')[0],
      destination: form.selectedPlace.display_name,
      lat: parseFloat(form.selectedPlace.lat),
      lng: parseFloat(form.selectedPlace.lon),
      startDate: form.start,
      endDate: form.end,
      baseCurrency: form.currency,
      tripPin: form.tripPin,
      creatorId: uid,
      memberIds: [uid], // 👈 確保 UID 被放入權限陣列
      members: [{
        id: uid,
        name: form.creatorName || '主揪',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (form.creatorName || '主揪'),
        email: auth.currentUser?.email || '',
        pin: form.tripPin
      }],
      items: [], bookings: [], expenses: [], journals: [], shoppingList: [], infoItems: [], packingList: []
    });
    onComplete();
  };

  // ✅ 新增：處理加入朋友行程的邏輯
  const handleJoinTrip = async () => {
    const shareId = prompt(t('onboarding.joinPrompt'));
    if (!shareId) return;

    // 防呆：如果已經加入了就不要重複加入
    if (trips.find(t => t.id === shareId)) {
      showToast(t('onboarding.alreadyJoined'), "info");
      onComplete();
      return;
    }

    try {
      const docRef = doc(db, "trips", shareId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const tripData = docSnap.data() as any;
        const pin = prompt(t('onboarding.pinPrompt').replace('{dest}', tripData.dest));
        if (pin === tripData.tripPin) {
          const nick = prompt(t('onboarding.nickPrompt'));
          const uid = auth.currentUser?.uid;
          if (nick && uid) {
            const newMember = {
              id: uid,
              name: nick,
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + nick,
              email: '',
              pin: ''
            };

            // 🚀 同步更新 Firebase (重要：這解開了權限死結與 ID 脫鉤)
            await updateDoc(docRef, {
              members: arrayUnion(newMember),
              memberIds: arrayUnion(uid)
            });

            const updatedMembers = [...(tripData.members || []), newMember];
            addTripLocal({ ...tripData, members: updatedMembers, memberIds: [...(tripData.memberIds || []), uid] });
            showToast(`歡迎加入！${nick} 🎉`, "success");
            onComplete();
          }
        } else {
          showToast(t('onboarding.wrongPin'), "error");
        }
      } else {
        showToast(t('onboarding.notFound'), "error");
      }
    } catch (e) {
      console.error(e);
      showToast("發生錯誤，可能是權限不足！", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#328383] to-[#2E6A9E] flex flex-col items-center justify-center p-6 font-sans text-white z-[500] overflow-y-auto">

      {/* 📍 右上角：新增加入好友行程按鈕 */}
      <button
        onClick={handleJoinTrip}
        className="absolute top-6 right-6 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 px-4 py-2 rounded-full flex items-center gap-2 font-black transition-all active:scale-95 shadow-lg"
      >
        <Plus size={18} strokeWidth={3} /> {t('onboarding.joinRef')}
      </button>

      <div className="w-full max-w-md flex flex-col items-center py-10 mt-10">
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border border-white/30 backdrop-blur-md mb-6 shrink-0"><Plane size={36} className="rotate-45" /></div>
        <h1 className="text-4xl font-black mb-10 tracking-wide">Travel Plan</h1>
        <div className="bg-white rounded-[40px] w-full p-8 shadow-2xl space-y-4 text-left">
          {step === 'info' ? (
            <>
              <div className="bg-[#EDF1F7] rounded-2xl p-4 relative">
                <label className="text-[10px] font-black text-[#8E99AF] uppercase mb-1 block tracking-widest">{t('onboarding.dest')}</label>
                <div className="flex items-center gap-3">
                  <MapPin size={24} className="text-[#5C6B89]" /><input className="bg-transparent w-full text-[#2D3A52] font-bold outline-none" placeholder="輸入城市 (例如: 大阪, 巴黎...)" value={query} onChange={e => setQuery(e.target.value)} />
                  {loading && <Loader2 size={16} className="animate-spin text-[#5C6B89]" />}
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-[105%] bg-white rounded-2xl shadow-xl z-50 overflow-hidden border border-[#EDF1F7]">
                    {suggestions.map((s, i) => (<button key={i} onClick={() => handleSelectPlace(s)} className="w-full text-left px-5 py-4 hover:bg-[#EDF1F7] border-b last:border-0 text-[#2D3A52]"><div className="font-bold text-sm">{s.display_name.split(',')[0]}</div><div className="text-[10px] text-[#8E99AF] truncate">{s.display_name}</div></button>))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#EDF1F7] rounded-2xl p-4"><label className="text-[10px] font-black text-[#8E99AF] block tracking-widest">{t('onboarding.start')}</label><div className="flex items-center gap-2"><Calendar size={18} className="text-[#5C6B89]" /><input type="date" className="bg-transparent w-full text-[#2D3A52] font-bold text-xs outline-none" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></div></div>
                <div className="bg-[#EDF1F7] rounded-2xl p-4"><label className="text-[10px] font-black text-[#8E99AF] block tracking-widest">{t('onboarding.end')}</label><div className="flex items-center gap-2"><Calendar size={18} className="text-[#5C6B89]" /><input type="date" className="bg-transparent w-full text-[#2D3A52] font-bold text-xs outline-none" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></div></div>
              </div>
              <div className="bg-[#EDF1F7] rounded-2xl p-4">
                <label className="text-[10px] font-black text-[#8E99AF] block">Currency</label>
                <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-3"><Banknote size={24} className="text-[#5C6B89]" /><span className="text-[#2D3A52] font-bold">{form.currency}</span></div><div className="text-[#5C6B89] flex flex-col gap-0.5"><div className="w-0 h-0 border-l-[4px] border-transparent border-r-[4px] border-transparent border-b-[6px] border-b-current"></div><div className="w-0 h-0 border-l-[4px] border-transparent border-r-[4px] border-transparent border-t-[6px] border-t-current"></div></div></div>
                <div className="flex justify-between items-center border-t border-[#DDE4EE] pt-2"><div className="flex items-center gap-1 text-[9px] text-[#8E99AF] font-bold italic"><RefreshCw size={10} className="text-ac-green" /> 匯率自動換算</div><div className="text-[10px] text-[#5C6B89] font-black">1 {form.currency} ≈ NT$ {rate.toFixed(3)}</div></div>
              </div>
              <button onClick={() => { if (!form.selectedPlace) return showToast(t('onboarding.emptyDest'), "info"); setStep('security'); }} className="w-full bg-[#147A70] text-white py-5 rounded-full font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-all mt-4"><Rocket size={24} /> {t('onboarding.create')}</button>
            </>
          ) : (
            <div className="space-y-6 py-4 animate-in zoom-in-95 duration-300">
              {/* ✅ 修復紅框：確保 Lock 圖示正確顯示 */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-splat-yellow rounded-full flex items-center justify-center mx-auto border-[3px] border-splat-dark shadow-sm text-splat-dark">
                  <Lock size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-splat-dark italic uppercase tracking-tighter">Secure Your Trip</h3>
              </div>

              <div className="space-y-4">
                {/* ✅ 藍框處新增：旅行名稱 */}
                <div className="bg-[#EDF1F7] rounded-2xl p-4 border-2 border-transparent focus-within:border-splat-blue transition-all">
                  <label className="text-[9px] font-black text-[#8E99AF] uppercase mb-1 block tracking-widest">Trip Name</label>
                  <div className="flex items-center gap-4">
                    <Plane className="text-[#5C6B89]" size={20} />
                    <input placeholder="例如：2024 京阪神大冒險" className="bg-transparent w-full text-splat-dark font-black outline-none" value={form.tripName} onChange={e => setForm({ ...form, tripName: e.target.value })} />
                  </div>
                </div>

                <div className="bg-[#EDF1F7] rounded-2xl p-4 flex items-center gap-4 border-2 border-transparent focus-within:border-splat-blue">
                  <User className="text-[#5C6B89]" size={20} />
                  <input placeholder="您的暱稱 (例如: 主揪, 小明...)" className="bg-transparent w-full text-splat-dark font-black outline-none" value={form.creatorName} onChange={e => setForm({ ...form, creatorName: e.target.value })} />
                </div>
                <div className="bg-[#EDF1F7] rounded-2xl p-4 flex items-center gap-4 border-2 border-transparent focus-within:border-splat-blue">
                  <Lock className="text-[#5C6B89]" size={20} />
                  <input type="password" maxLength={4} inputMode="numeric" placeholder="4 位數進入密碼" className="bg-transparent w-full text-splat-dark font-black outline-none text-2xl tracking-[0.5em]" value={form.tripPin} onChange={e => setForm({ ...form, tripPin: e.target.value })} />
                </div>
              </div>
              {/* ✅ 關鍵修復：更新按鈕的 CSS 樣式，讓它顯現並符合您的 UI 風格 */}
              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep('info')} className="flex-1 py-4 border-[3px] border-splat-dark bg-white rounded-xl font-black text-splat-dark hover:bg-gray-100 transition-colors shadow-splat-solid-sm active:translate-y-1 active:shadow-none">
                  Back
                </button>
                <button onClick={handleFinish} className="flex-[2] bg-splat-green text-white py-4 rounded-xl font-black border-[3px] border-splat-dark shadow-splat-solid active:translate-y-1 active:shadow-none transition-all uppercase tracking-widest">
                  {t('onboarding.btn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



