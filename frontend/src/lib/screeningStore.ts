import { STORAGE_KEYS } from "@/lib/constants";
import type { ScreeningRecord } from "@/types";

type ScreeningStore = Record<string, ScreeningRecord[]>; // userId → records

function read(): ScreeningStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCREENING);
    return raw ? (JSON.parse(raw) as ScreeningStore) : {};
  } catch {
    return {};
  }
}

function write(store: ScreeningStore) {
  localStorage.setItem(STORAGE_KEYS.SCREENING, JSON.stringify(store));
}

/** Saves a screening result (one per calendar day; replaces if already exists). */
export function saveScreeningRecord(
  userId: string,
  record: Omit<ScreeningRecord, "date">
) {
  const store = read();
  const existing = store[userId] ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const updated = [
    ...existing.filter((r) => r.date !== today),
    { ...record, date: today },
  ].slice(-30); // keep last 30 records

  store[userId] = updated;
  write(store);
}

export function readScreeningRecords(userId: string): ScreeningRecord[] {
  return read()[userId] ?? [];
}

export function readLatestScreening(userId: string): ScreeningRecord | null {
  const records = readScreeningRecords(userId);
  return records.length > 0 ? records[records.length - 1] : null;
}
