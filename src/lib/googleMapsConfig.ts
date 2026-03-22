type RuntimeConfigWindow = Window & typeof globalThis & {
    __MYEXPLORER_GOOGLE_MAPS_API_KEY__?: string;
    __MYEXPLORER_GOOGLE_MAPS_MAP_ID__?: string;
};

const GOOGLE_MAPS_FALLBACK_API_KEY = 'AIzaSyBVOgwku6wcaDzHkqY7cL4swqfDzgUfK1A';
const readTrimmedConfigValue = (value: string | null | undefined) => value?.trim() ?? '';
const readWindowConfigValue = (key: keyof RuntimeConfigWindow) => {
    if (typeof window === 'undefined') {
        return '';
    }

    return readTrimmedConfigValue((window as RuntimeConfigWindow)[key]);
};

const readMetaContent = (name: string) => {
    if (typeof document === 'undefined') {
        return '';
    }

    const rawContent = document.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
    const content = readTrimmedConfigValue(rawContent);
    return content.startsWith('%VITE_') && content.endsWith('%') ? '' : content;
};

export const getGoogleMapsApiKey = () => readTrimmedConfigValue(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
    || readMetaContent('myexplorer-google-maps-api-key')
    || readWindowConfigValue('__MYEXPLORER_GOOGLE_MAPS_API_KEY__')
    || GOOGLE_MAPS_FALLBACK_API_KEY;

export const getGoogleMapsMapId = () => readTrimmedConfigValue(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID)
    || readMetaContent('myexplorer-google-maps-map-id')
    || readWindowConfigValue('__MYEXPLORER_GOOGLE_MAPS_MAP_ID__');
