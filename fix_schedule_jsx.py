import re

with open('/Users/huangchenwei/osaka-kyoto-new/src/components/Schedule.tsx', 'r') as f:
    content = f.read()

# 修正從 760 行開始到 820 行附近的混亂標籤
# 尋找 <motion.div initial={{ scale: ... 開頭到 detailItem && 結束的大區塊
search_block = r"(<motion\.div initial=\{\{ scale: 0\.9 \}\} animate=\{\{ scale: 1 \}\} exit=\{\{ scale: 0\.9 \}\} className=\"bg-white w-full max-w-sm rounded-\[32px\] border-\[4px\] border-splat-dark shadow-splat-solid flex flex-col max-h-\[85vh\] overflow-hidden\" onClick=\{e => e\.stopPropagation\(\)\}>)(.*?)(</AnimatePresence>)"
# 實際的修正邏輯是用 regex 或單純的重新產生該區塊

replacement = """<motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white w-full max-w-sm rounded-[32px] border-[4px] border-splat-dark shadow-splat-solid flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="h-56 bg-gray-200 relative shrink-0 border-b-[4px] border-splat-dark">
                <LazyImage src={detailItem.images?.[0] || ''} containerClassName="w-full h-full" alt="location" />
                <button onClick={() => setDetailItem(undefined)} className="absolute top-4 right-4 bg-white border-[3px] border-splat-dark p-2 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-5 bg-[#F4F5F7] overflow-y-auto">
                <div className="inline-flex items-center gap-2 text-sm font-black bg-white border-[3px] border-splat-dark px-3 py-1.5 rounded-lg">{detailItem.title}</div>
                <div className="card-splat p-4 bg-white/50">
                  <h4 className="text-[10px] font-black uppercase mb-2 flex items-center gap-1.5"><Sparkles size={14} /> AI 景點導覽</h4>
                  {detailItem.spotGuide ? (
                    <div className="text-sm font-bold text-gray-700 whitespace-pre-wrap leading-relaxed">{detailItem.spotGuide.background}</div>
                  ) : spotAiLoading === detailItem.id && completion ? (
                    <div className="text-sm font-bold text-gray-700 whitespace-pre-wrap leading-relaxed animate-pulse">{completion}</div>
                  ) : (
                    <button onClick={() => handleFetchSpotGuide(detailItem)} disabled={!!spotAiLoading} className="w-full py-3 border-2 border-dashed rounded-lg text-xs font-black">
                      {spotAiLoading === detailItem.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 取得 AI 景點建議
                    </button>
                  )}
                </div>
                <div className="card-splat p-4">
                  <h4 className="text-[10px] font-black uppercase mb-2 flex items-center gap-1.5"><Plane size={14} /> 交通建議</h4>
                  {detailItem.transportSuggestion ? (
                    <p className="text-sm font-bold text-gray-700">{detailItem.transportSuggestion}</p>
                  ) : (
                    <button onClick={() => handleTransportAiSuggest(detailItem)} disabled={!!transportAiLoading} className="w-full py-3 border-2 border-dashed rounded-lg text-xs font-black">
                      {transportAiLoading === detailItem.id ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} 取得交通建議
                    </button>
                  )}
                </div>
                <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location)}`, '_blank')} className="btn-splat w-full py-4 bg-splat-blue text-white flex items-center justify-center gap-2">
                  <MapPin size={20} /> 開啟導航
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>"""

match = re.search(search_block, content, re.DOTALL)
if match:
    new_content = content[:match.start()] + replacement + content[match.end():]
    # 清理殘留的結尾
    new_content = re.sub(r"</div>\s*</div>\s*</motion\.div>\s*</div>\s*\)\}\s*</AnimatePresence>\s*</AnimatePresence>", "</AnimatePresence>", new_content)
    with open('/Users/huangchenwei/osaka-kyoto-new/src/components/Schedule.tsx', 'w') as f:
        f.write(new_content)
