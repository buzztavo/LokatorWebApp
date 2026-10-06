import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { POI } from '../types';

// Initial sample POIs centered around Washington, DC matching user's original repo
const DEFAULT_DC_POIS: POI[] = [
  {
    id: 'sample-1',
    name: 'Washington Monument',
    description: 'Iconic marble obelisk honoring George Washington at the center of the National Mall.',
    category: 'Landmark',
    latitude: 38.8895,
    longitude: -77.0353,
    elevation: 169.0, // 169 meters
    created_at: new Date().toISOString(),
  },
  {
    id: 'sample-2',
    name: 'Lincoln Memorial',
    description: 'Neoclassical monument featuring a colossal seated sculpture of Abraham Lincoln.',
    category: 'Historical',
    latitude: 38.8893,
    longitude: -77.0502,
    elevation: 20.0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'sample-3',
    name: 'United States Capitol',
    description: 'Seat of the United States Congress atop Capitol Hill.',
    category: 'Government',
    latitude: 38.8899,
    longitude: -77.0090,
    elevation: 27.0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'sample-4',
    name: 'National Air and Space Museum',
    description: 'Renowned museum containing historic aviation and space artifacts.',
    category: 'Culture',
    latitude: 38.8882,
    longitude: -77.0199,
    elevation: 10.0,
    created_at: new Date().toISOString(),
  }
];

const LOCAL_STORAGE_KEY = 'lokator_pois_cache';
const LOCAL_SUPABASE_URL_KEY = 'lokator_custom_supabase_url';
const LOCAL_SUPABASE_ANON_KEY = 'lokator_custom_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  // Allow custom override in preview if stored in localStorage
  const localUrl = localStorage.getItem(LOCAL_SUPABASE_URL_KEY) || '';
  const localKey = localStorage.getItem(LOCAL_SUPABASE_ANON_KEY) || '';

  const activeUrl = localUrl || envUrl;
  const activeKey = localKey || envKey;

  const isConfigured = Boolean(
    activeUrl &&
    activeKey &&
    activeUrl.startsWith('http') &&
    !activeUrl.includes('your-project') &&
    !activeKey.includes('your-anon-key')
  );

  return {
    url: activeUrl,
    anonKey: activeKey,
    isConfigured,
  };
}

export function saveCustomSupabaseCredentials(url: string, anonKey: string) {
  if (url.trim()) {
    localStorage.setItem(LOCAL_SUPABASE_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(LOCAL_SUPABASE_URL_KEY);
  }
  if (anonKey.trim()) {
    localStorage.setItem(LOCAL_SUPABASE_ANON_KEY, anonKey.trim());
  } else {
    localStorage.removeItem(LOCAL_SUPABASE_ANON_KEY);
  }
  cachedClient = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return null;
  }

  if (cachedClient && lastUsedUrl === url && lastUsedKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey);
    lastUsedUrl = url;
    lastUsedKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Local Storage Helpers
function getLocalPOIs(): POI[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_DC_POIS));
      return DEFAULT_DC_POIS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DC_POIS;
  }
}

function saveLocalPOIs(pois: POI[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pois));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

/**
 * Fetch all POIs from the `poi` table or fallback to local storage
 */
export async function fetchPOIs(): Promise<{ pois: POI[]; source: 'supabase' | 'local'; error?: string }> {
  const client = getSupabaseClient();

  if (!client) {
    return {
      pois: getLocalPOIs(),
      source: 'local',
    };
  }

  try {
    const { data, error } = await client
      .from('poi')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error, falling back to local cache:', error.message);
      return {
        pois: getLocalPOIs(),
        source: 'local',
        error: error.message,
      };
    }

    const formattedData: POI[] = (data || []).map((item) => ({
      id: String(item.id),
      name: item.name,
      description: item.description ?? null,
      category: item.category || 'General',
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      elevation: item.elevation !== null && item.elevation !== undefined ? Number(item.elevation) : null,
      created_at: item.created_at,
    }));

    // Cache to local for resilience
    saveLocalPOIs(formattedData);

    return {
      pois: formattedData,
      source: 'supabase',
    };
  } catch (err: any) {
    return {
      pois: getLocalPOIs(),
      source: 'local',
      error: err.message || 'Network error connecting to Supabase',
    };
  }
}

/**
 * Create a new POI in table `poi`
 */
export async function createPOI(
  poiData: Omit<POI, 'id' | 'created_at'>
): Promise<{ poi: POI; source: 'supabase' | 'local'; error?: string }> {
  const client = getSupabaseClient();

  const payload = {
    name: poiData.name,
    description: poiData.description || null,
    category: poiData.category || 'General',
    latitude: poiData.latitude,
    longitude: poiData.longitude,
    elevation: poiData.elevation !== null && poiData.elevation !== undefined ? poiData.elevation : null,
  };

  if (!client) {
    const newLocalPoi: POI = {
      ...payload,
      id: 'local-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    const current = getLocalPOIs();
    const updated = [newLocalPoi, ...current];
    saveLocalPOIs(updated);
    return { poi: newLocalPoi, source: 'local' };
  }

  try {
    const { data, error } = await client
      .from('poi')
      .insert([payload])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const created: POI = {
      id: String(data.id),
      name: data.name,
      description: data.description ?? null,
      category: data.category || 'General',
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      elevation: data.elevation !== null && data.elevation !== undefined ? Number(data.elevation) : null,
      created_at: data.created_at,
    };

    // Update local cache
    const current = getLocalPOIs();
    saveLocalPOIs([created, ...current]);

    return { poi: created, source: 'supabase' };
  } catch (err: any) {
    console.error('Error inserting into Supabase:', err);
    // Fallback to local
    const fallbackPoi: POI = {
      ...payload,
      id: 'local-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    const current = getLocalPOIs();
    saveLocalPOIs([fallbackPoi, ...current]);
    return {
      poi: fallbackPoi,
      source: 'local',
      error: `Could not write to Supabase (${err.message}). Saved to local session cache.`,
    };
  }
}

/**
 * Delete a POI from table `poi`
 */
export async function deletePOI(id: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  // Always update local cache
  const localList = getLocalPOIs().filter((p) => p.id !== id);
  saveLocalPOIs(localList);

  if (!client || id.startsWith('local-') || id.startsWith('sample-')) {
    return { success: true };
  }

  try {
    const { error } = await client.from('poi').delete().eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


/**
 * Update an existing POI in table `poi`
 */
export async function updatePOI(
  id: string,
  poiData: Partial<Omit<POI, 'id' | 'created_at'>>
): Promise<{ poi?: POI; success: boolean; source: 'supabase' | 'local'; error?: string }> {
  const client = getSupabaseClient();
  const currentLocal = getLocalPOIs();
  const index = currentLocal.findIndex(p => p.id === id);

  if (!client || id.startsWith('local-') || id.startsWith('sample-')) {
    if (index === -1) {
       return { success: false, source: 'local', error: 'POI not found in local cache' };
    }
    const updatedPoi = { ...currentLocal[index], ...poiData } as POI;
    currentLocal[index] = updatedPoi;
    saveLocalPOIs(currentLocal);
    return { poi: updatedPoi, success: true, source: 'local' };
  }

  try {
    const payload: any = {};
    if (poiData.name !== undefined) payload.name = poiData.name;
    if (poiData.description !== undefined) payload.description = poiData.description || null;
    if (poiData.category !== undefined) payload.category = poiData.category || 'General';
    if (poiData.latitude !== undefined) payload.latitude = poiData.latitude;
    if (poiData.longitude !== undefined) payload.longitude = poiData.longitude;
    if (poiData.elevation !== undefined) payload.elevation = poiData.elevation !== null && poiData.elevation !== undefined ? poiData.elevation : null;

    const { data, error } = await client
      .from('poi')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const updated: POI = {
      id: String(data.id),
      name: data.name,
      description: data.description ?? null,
      category: data.category || 'General',
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      elevation: data.elevation !== null && data.elevation !== undefined ? Number(data.elevation) : null,
      created_at: data.created_at,
    };

    if (index !== -1) {
      currentLocal[index] = updated;
      saveLocalPOIs(currentLocal);
    } else {
       saveLocalPOIs([updated, ...currentLocal]);
    }

    return { poi: updated, success: true, source: 'supabase' };
  } catch (err: any) {
    console.error('Error updating in Supabase:', err);
    // update local cache anyway if exists
    if (index !== -1) {
      const updatedPoi = { ...currentLocal[index], ...poiData } as POI;
      currentLocal[index] = updatedPoi;
      saveLocalPOIs(currentLocal);
      return { poi: updatedPoi, success: true, source: 'local', error: `Could not write to Supabase (${err.message}). Saved to local session cache.` };
    }
    return {
      success: false,
      source: 'local',
      error: `Could not write to Supabase (${err.message}). POI not found in local cache.`,
    };
  }
}
