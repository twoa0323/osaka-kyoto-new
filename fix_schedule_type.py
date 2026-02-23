import re

with open('/Users/huangchenwei/osaka-kyoto-new/src/components/Schedule.tsx', 'r') as f:
    content = f.read()

# 修正 onFinish 的隱式 any 錯誤
content = content.replace("onFinish: (prompt, resultText) => {", "onFinish: (prompt: any, resultText: string) => {")

# 修正 JSX 結尾錯位
content = content.replace("""                <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location)}`, '_blank')} className="btn-splat w-full py-4 bg-splat-blue text-white flex items-center justify-center gap-2">
                  <MapPin size={20} /> 開啟導航
                </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>""", """                <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailItem.location)}`, '_blank')} className="btn-splat w-full py-4 bg-splat-blue text-white flex items-center justify-center gap-2">
                  <MapPin size={20} /> 開啟導航
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>""")

with open('/Users/huangchenwei/osaka-kyoto-new/src/components/Schedule.tsx', 'w') as f:
    f.write(content)
