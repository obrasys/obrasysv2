import { useEffect, useState, useCallback } from 'react';

const ZONES_KEY = 'essencial_custom_zones_v1';
const TIPOLOGIAS_KEY = 'essencial_custom_tipologias_v1';

export interface PersistedZone {
  key: string;
  label: string;
}

export interface PersistedTipologia {
  value: string;
  label: string;
}

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function useCustomZones() {
  const [zones, setZones] = useState<PersistedZone[]>(() => read<PersistedZone>(ZONES_KEY));

  useEffect(() => {
    write(ZONES_KEY, zones);
  }, [zones]);

  const addZone = useCallback((label: string) => {
    const clean = label.trim();
    if (!clean) return null;
    const key = `custom_zone_${Date.now()}`;
    setZones((prev) => {
      if (prev.some((z) => z.label.toLowerCase() === clean.toLowerCase())) return prev;
      return [...prev, { key, label: clean }];
    });
    return { key, label: clean };
  }, []);

  const removeZone = useCallback((key: string) => {
    setZones((prev) => prev.filter((z) => z.key !== key));
  }, []);

  return { zones, addZone, removeZone };
}

export function useCustomTipologias() {
  const [tipologias, setTipologias] = useState<PersistedTipologia[]>(() =>
    read<PersistedTipologia>(TIPOLOGIAS_KEY)
  );

  useEffect(() => {
    write(TIPOLOGIAS_KEY, tipologias);
  }, [tipologias]);

  const addTipologia = useCallback((label: string) => {
    const clean = label.trim();
    if (!clean) return null;
    const value = `custom_${clean.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`;
    setTipologias((prev) => {
      if (prev.some((t) => t.label.toLowerCase() === clean.toLowerCase())) return prev;
      return [...prev, { value, label: clean }];
    });
    return { value, label: clean };
  }, []);

  const removeTipologia = useCallback((value: string) => {
    setTipologias((prev) => prev.filter((t) => t.value !== value));
  }, []);

  return { tipologias, addTipologia, removeTipologia };
}
