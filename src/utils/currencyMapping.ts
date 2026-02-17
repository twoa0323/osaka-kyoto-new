import { CurrencyCode } from '../types';

const countryToCurrency: Record<string, CurrencyCode> = {
  'Japan': 'JPY', 'South Korea': 'KRW', 'France': 'EUR', 'Thailand': 'THB',
  'United States': 'USD', 'United Kingdom': 'GBP', 'Taiwan': 'TWD',
  'Germany': 'EUR', 'Italy': 'EUR', 'Spain': 'EUR', 'Vietnam': 'VND' as any
};

export const getCurrencyByCountry = (country: string): CurrencyCode => {
  return countryToCurrency[country] || 'USD'; // 預設美金
};