// filepath: src/utils/exchange.ts

export const fetchExchangeRate = async (from: string, to: string = 'TWD') => {
  try {
    // 使用無須 Key 的提供者或你的 API Key，改用原生 fetch
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    const data = await res.json();
    return data.rates[to] || 1;
  } catch (error) {
    console.error("匯率更新失敗", error);
    return 1;
  }
};
