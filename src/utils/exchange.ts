import axios from 'axios';

export const fetchExchangeRate = async (from: string, to: string = 'TWD') => {
  try {
    // 使用無須 Key 的提供者或你的 API Key
    const res = await axios.get(`https://open.er-api.com/v6/latest/${from}`);
    return res.data.rates[to] || 1;
  } catch (error) {
    console.error("匯率更新失敗", error);
    return 1;
  }
};