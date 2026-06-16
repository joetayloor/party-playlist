const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function createRoom(nickname) {
  const r = await fetch(`${API}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  if (!r.ok) throw new Error('Failed to create room');
  return r.json();
}

export async function getRoom(id) {
  const r = await fetch(`${API}/api/rooms/${id}`);
  if (!r.ok) throw new Error('Room not found');
  return r.json();
}

export async function resolveTrack(url) {
  const r = await fetch(`${API}/api/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!r.ok) {
    const e = await r.json();
    throw new Error(e.error || 'Cannot resolve track');
  }
  return r.json();
}

export function audioUrl(trackId) {
  return `${API}/api/audio/${trackId}`;
}

export function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function sourceLabel(src) {
  const map = { youtube: 'YouTube', vk: 'VK Music', yandex: 'Яндекс', soundcloud: 'SoundCloud' };
  return map[src] || src;
}

export function sourceClass(src) {
  const map = { youtube: 'src-yt', vk: 'src-vk', yandex: 'src-ym', soundcloud: 'src-sc' };
  return map[src] || '';
}
