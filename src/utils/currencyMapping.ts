// src/utils/currencyMapping.ts

export const getCurrencyByCountry = (country: string): string => {
  const map: Record<string, string> = {
    'Japan': 'JPY', '日本': 'JPY',
    'South Korea': 'KRW', 'Korea': 'KRW', '韓國': 'KRW',
    'Taiwan': 'TWD', '台灣': 'TWD',
    'United States': 'USD', 'USA': 'USD', '美國': 'USD',
    'Thailand': 'THB', '泰國': 'THB',
    'France': 'EUR', 'Germany': 'EUR', 'Italy': 'EUR', 'Spain': 'EUR', '歐洲': 'EUR',
    'United Kingdom': 'GBP', 'UK': 'GBP', '英國': 'GBP',
    'China': 'CNY', '中國': 'CNY'
  };
  
  // 簡單模糊比對
  for (const key in map) {
    if (country.includes(key)) return map[key];
  }
  
  return 'TWD'; // 預設台幣
};