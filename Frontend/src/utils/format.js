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

