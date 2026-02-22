/**
 * 離線快取管理工具
 * 用於將動態憑證（如 QR Code、飯店憑證圖片）快取至瀏覽器的 Cache API
 */

const CACHE_NAME = 'zakka-vouchers-v1';

/**
 * 快取指定 URL 的資源
 */
export const cacheAsset = async (url: string): Promise<boolean> => {
    if (!('caches' in window) || !url) return false;
    try {
        const cache = await caches.open(CACHE_NAME);
        await cache.add(url);
        console.log(`[Offline] Cached: ${url}`);
        return true;
    } catch (error) {
        console.error(`[Offline] Cache fail: ${url}`, error);
        return false;
    }
};

/**
 * 檢查是否已快取
 */
export const isAssetCached = async (url: string): Promise<boolean> => {
    if (!('caches' in window) || !url) return false;
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    return !!response;
};

/**
 * 刪除快取的資源
 */
export const removeCachedAsset = async (url: string): Promise<void> => {
    if (!('caches' in window) || !url) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(url);
};
