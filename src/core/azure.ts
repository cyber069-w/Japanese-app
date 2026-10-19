/**
 * Azure Speech settings. The key lives in private/azure-speech.json (served by the dev server only) or is
 * typed into Settings (device storage, never synced, never in git). Never print it.
 */
import { storage } from './db';

export interface AzureConfig { key: string; region: string }
export type AzureSource = 'device' | 'file' | null;

/** private/azure-speech.json uses { azureSpeechKey, azureSpeechRegion } (or { key, region }). */
export const parseAzureFile = (j: unknown): AzureConfig | null => {
  const o = (j ?? {}) as Record<string, unknown>;
  const key = String(o.azureSpeechKey ?? o.key ?? '').trim();
  const region = String(o.azureSpeechRegion ?? o.region ?? '').trim();
  return key && region ? { key, region } : null;
};

export async function loadAzure(): Promise<{ config: AzureConfig | null; source: AzureSource }> {
  const own = await storage.get<AzureConfig>('azure');
  if (own?.key && own.region) return { config: own, source: 'device' };
  try {
    const res = await fetch('azure-speech.json', { cache: 'no-store' });
    if (res.ok) {
      const config = parseAzureFile(await res.json());
      if (config) return { config, source: 'file' };
    }
  } catch { /* no dev server */ }
  return { config: null, source: null };
}
export const saveAzure = (c: AzureConfig | null) => storage.set('azure', c);
