const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 27-Oct-2025 11:40 AM (local time) - the format used in the wireframe. */
export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours();
  const hour12 = h % 12 || 12;
  const mins = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}-${MONTHS[d.getMonth()]}-${d.getFullYear()} ${hour12}:${mins} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function relativeTime(iso) {
  if (!iso) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return 'just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}


