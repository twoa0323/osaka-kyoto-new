import { useState, useRef, FC, ChangeEvent } from 'react';
import { useTripStore } from '../store/useTripStore';
import { X, Search, Camera, Trash2, Loader2 } from 'lucide-react';
import { ScheduleItem } from '../types';
import { uploadImage } from '../utils/imageUtils';
import { BottomSheet } from './ui/BottomSheet';
import { useTranslation } from '../hooks/useTranslation';

interface Props { tripId: string; date: string; item?: ScheduleItem; onClose: () => void; }

export const ScheduleEditor: FC<Props> = ({ tripId, date, item, onClose }) => {
  const { t } = useTranslation();
  const { addScheduleItem, updateScheduleItem, deleteScheduleItem, showToast } = useTripStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const CATEGORIES = [
    { id: 'sightseeing', label: t('editor.catSightseeing') || '景點', color: 'bg-ac-green' },
    { id: 'food', label: t('editor.catFood') || '美食', color: 'bg-ac-orange' },
    { id: 'transport', label: t('editor.catTransport') || '交通', color: 'bg-blue-400' },
    { id: 'hotel', label: t('editor.catHotel') || '住宿', color: 'bg-purple-400' }
  ] as const;

  const [form, setForm] = useState<ScheduleItem>(item || {
    id: Date.now().toString(), date, time: '09:00', endTime: '', title: '', location: '', category: 'sightseeing', note: '', images: []
  });

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      e.target.value = '';
      setIsUploading(true);
      try {
        const url = await uploadImage(file);
        setForm(prev => ({ ...prev, images: [url] }));
      } catch (err) {
        showToast(t('editor.toastUploadFailed'), "error");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = () => {
    if (!form.title) return showToast(t('editor.toastMissingTitle'), "info");
    if (item) updateScheduleItem(tripId, item.id, form);
    else addScheduleItem(tripId, { ...form, id: Date.now().toString() });
    onClose();
  };

  return (
    <BottomSheet isOpen={true} onClose={onClose} title={item ? t('editor.titleEdit') : t('editor.titleNew')}>
      <div className="space-y-5">
        {item && (
          <div className="flex justify-end -mb-4">
            <button onClick={() => { deleteScheduleItem(tripId, item.id); showToast(t('editor.toastDeleted'), "success"); onClose(); }} className="p-2 bg-red-50 text-red-500 rounded-full active:scale-90"><Trash2 size={20} /></button>
          </div>
        )}

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase tracking-widest">{t('editor.labelStartTime')}</label>
              <input type="time" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase tracking-widest">{t('editor.labelEndTime')}</label>
              <input type="time" className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" value={form.endTime || ''} onChange={e => setForm({ ...form, endTime: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase tracking-widest">{t('editor.labelCategory')}</label>
            <select className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black outline-none appearance-none cursor-pointer" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase">{t('editor.labelTitle')}</label>
            <input className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-black text-ac-brown outline-none" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t('editor.placeholderTitle')} /></div>

          <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase">{t('editor.labelLocation')}</label>
            <div className="flex gap-2">
              <input className="flex-1 p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown outline-none" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder={t('editor.placeholderLocation')} />
              <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.location || '目的地')}`, '_blank')} className="w-14 h-14 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm active:scale-90 transition-all"><Search size={24} /></button>
            </div></div>

          <div className="space-y-1"><label className="text-[10px] font-black opacity-40 uppercase tracking-widest">{t('editor.labelPhoto')}</label>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-4 border-dashed border-ac-border rounded-3xl flex flex-col items-center justify-center text-ac-border bg-white overflow-hidden relative active:scale-98 transition-all group">
              {isUploading && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                  <Loader2 className="animate-spin text-ac-orange mb-2" size={36} strokeWidth={3} />
                  <span className="text-xs font-black text-ac-orange animate-pulse tracking-widest">{t('editor.photoUploading')}</span>
                </div>
              )}
              {form.images?.[0] ? (
                <>
                  <img src={form.images[0]} className="w-full h-full object-cover pointer-events-none" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="bg-black/60 text-white text-xs font-black px-4 py-1.5 rounded-full">{t('editor.photoChange')}</span></div>
                </>
              ) : (
                <><Camera size={32} /><span className="text-[10px] font-black mt-2 uppercase tracking-tighter">{t('editor.photoUpload')}</span></>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          <textarea placeholder={t('editor.placeholderNote')} className="w-full p-4 bg-white border-2 border-ac-border rounded-2xl font-bold text-ac-brown h-24 outline-none" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          <button onClick={handleSave} className="btn-zakka w-full py-5 text-xl mt-4">{t('editor.btnSave')}</button>
        </div>
      </div>
    </BottomSheet>
  );
};






