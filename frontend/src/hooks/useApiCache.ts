import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

const memoryCache: Record<string, { data: any; ts: number }> = {};
const STALE_MS = 60_000; // 1 min stale

export function useApiCache<T = any>(key: string, url: string, opts?: { enabled?: boolean; ttl?: number }) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const enabled = opts?.enabled !== false;
  const ttl = opts?.ttl || STALE_MS;
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Load from memory cache first, then disk cache
  useEffect(() => {
    if (!enabled) return;
    const mem = memoryCache[key];
    if (mem) { setData(mem.data); setLoading(false); }
    else {
      AsyncStorage.getItem(`cache_${key}`).then(raw => {
        if (raw && mounted.current) {
          try {
            const parsed = JSON.parse(raw);
            setData(parsed.data);
            memoryCache[key] = parsed;
          } catch {}
          setLoading(false);
        }
      }).catch(() => {});
    }
  }, [key, enabled]);

  const fetchFresh = useCallback(async (silent = false) => {
    if (!enabled) return;
    if (!silent) setRefreshing(true);
    try {
      const res = await api.get(url);
      const freshData = res.data;
      if (mounted.current) {
        setData(freshData);
        setLoading(false);
        setRefreshing(false);
      }
      const entry = { data: freshData, ts: Date.now() };
      memoryCache[key] = entry;
      AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry)).catch(() => {});
    } catch (e) {
      if (mounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, [key, url, enabled]);

  // Auto-fetch on mount or when stale
  useEffect(() => {
    if (!enabled) return;
    const mem = memoryCache[key];
    if (!mem || Date.now() - mem.ts > ttl) { fetchFresh(!!mem); }
    else { setLoading(false); }
  }, [key, enabled, fetchFresh, ttl]);

  return { data, loading, refreshing, refresh: () => fetchFresh(false) };
}

// Invalidate cache for a key
export function invalidateCache(key: string) {
  delete memoryCache[key];
  AsyncStorage.removeItem(`cache_${key}`).catch(() => {});
}
