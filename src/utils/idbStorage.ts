export const idbStorage = {
    getItem: (name: string): Promise<string | null> => {
        return new Promise((resolve) => {
            const request = indexedDB.open('trip-storage', 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains('keyval')) {
                    request.result.createObjectStore('keyval');
                }
            };
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('keyval', 'readonly');
                const store = tx.objectStore('keyval');
                const getRequest = store.get(name);
                getRequest.onsuccess = () => resolve(getRequest.result || null);
                getRequest.onerror = () => resolve(null);
            };
            request.onerror = () => resolve(null);
        });
    },
    setItem: (name: string, value: string): Promise<void> => {
        return new Promise((resolve) => {
            const request = indexedDB.open('trip-storage', 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains('keyval')) {
                    request.result.createObjectStore('keyval');
                }
            };
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('keyval', 'readwrite');
                const store = tx.objectStore('keyval');
                store.put(value, name);
                tx.oncomplete = () => resolve();
            };
            request.onerror = () => resolve();
        });
    },
    removeItem: (name: string): Promise<void> => {
        return new Promise((resolve) => {
            const request = indexedDB.open('trip-storage', 1);
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('keyval', 'readwrite');
                const store = tx.objectStore('keyval');
                store.delete(name);
                tx.oncomplete = () => resolve();
            };
            request.onerror = () => resolve();
        });
    }
};
