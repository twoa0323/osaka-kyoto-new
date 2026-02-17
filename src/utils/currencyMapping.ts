import { CurrencyCode } from '../types';

// 使用 ISO 3166-1 alpha-2 國家代碼對應幣別
// 這是最穩定的方式，不受語言影響
const codeToCurrency: Record<string, CurrencyCode> = {
  // 東北亞
  'jp': 'JPY', // 日本
  'kr': 'KRW', // 南韓
  'cn': 'CNY', // 中國 (上海, 北京...)
  'tw': 'TWD', // 台灣
  'hk': 'HKD', // 香港
  'mo': 'MOP' as any, // 澳門 (通常通用 HKD 或 MOP，這裡暫時映射)

  // 東南亞
  'th': 'THB', // 泰國
  'vn': 'VND', // 越南
  'sg': 'SGD', // 新加坡
  'my': 'MYR' as any, // 馬來西亞
  'ph': 'PHP' as any, // 菲律賓
  'id': 'IDR' as any, // 印尼

  // 歐美
  'us': 'USD', // 美國
  'gb': 'GBP', // 英國
  'fr': 'EUR', // 法國
  'de': 'EUR', // 德國
  'it': 'EUR', // 義大利
  'es': 'EUR', // 西班牙
  'pt': 'EUR', // 葡萄牙
  'nl': 'EUR', // 荷蘭
  'be': 'EUR', // 比利時
  'at': 'EUR', // 奧地利
  'gr': 'EUR', // 希臘
  
  // 澳洲
  'au': 'AUD' as any,
};

/**
 * 根據國家代碼 (優先) 或國家名稱 (備用) 取得幣別
 * @param countryCode Nominatim 回傳的 country_code (ex: 'jp', 'kr')
 * @param countryName Nominatim 回傳的 country (ex: 'Japan', '日本')
 */
export const getCurrencyByCountry = (countryCode: string, countryName?: string): CurrencyCode => {
  // 1. 優先使用代碼比對 (轉小寫以防萬一)
  const code = countryCode.toLowerCase();
  if (codeToCurrency[code]) {
    return codeToCurrency[code];
  }

  // 2. 如果代碼比對失敗（極少見），才使用名稱模糊比對 (Legacy support)
  if (countryName) {
    if (countryName.includes('Korea') || countryName.includes('韓')) return 'KRW';
    if (countryName.includes('Japan') || countryName.includes('日')) return 'JPY';
    if (countryName.includes('China') || countryName.includes('中')) return 'CNY';
    if (countryName.includes('Hong Kong') || countryName.includes('香')) return 'HKD';
    if (countryName.includes('Euro') || countryName.includes('歐')) return 'EUR';
    if (countryName.includes('Thai') || countryName.includes('泰')) return 'THB';
    if (countryName.includes('Viet') || countryName.includes('越')) return 'VND';
  }

  // 3. 預設回傳台幣 (或美金)
  return 'TWD';
};