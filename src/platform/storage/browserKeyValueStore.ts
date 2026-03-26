import type { KeyValueStore } from './keyValueStore';

export const browserKeyValueStore: KeyValueStore = {
    getItem(key) {
        return window.localStorage.getItem(key);
    },
    setItem(key, value) {
        window.localStorage.setItem(key, value);
    },
    removeItem(key) {
        window.localStorage.removeItem(key);
    },
};
