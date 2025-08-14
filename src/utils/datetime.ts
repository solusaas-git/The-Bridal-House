export const formatUtcDate = (value: string | Date | number | null | undefined): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export const formatUtcDateTime = (value: string | Date | number | null | undefined): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// String-based ISO helpers (no timezone conversion). Use when you want exactly what's saved.
export const formatIsoDate = (iso?: string | null): string => {
  if (!iso) return '';
  const s = String(iso);
  const yyyy = s.substring(0, 4);
  const mm = s.substring(5, 7);
  const dd = s.substring(8, 10);
  if (!yyyy || !mm || !dd) return '';
  return `${dd}/${mm}/${yyyy}`;
};

export const formatIsoDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  const s = String(iso);
  const yyyy = s.substring(0, 4);
  const mm = s.substring(5, 7);
  const dd = s.substring(8, 10);
  const HH = s.substring(11, 13);
  const MI = s.substring(14, 16);
  if (!yyyy || !mm || !dd) return '';
  return `${dd}/${mm}/${yyyy}${HH && MI ? ` ${HH}:${MI}` : ''}`;
};

export const getTimeFromIso = (iso?: string | null): string => {
  if (!iso) return '';
  const s = String(iso);
  const HH = s.substring(11, 13);
  const MI = s.substring(14, 16);
  return HH && MI ? `${HH}:${MI}` : '';
};

export const getDateFromIso = (iso?: string | null): string => {
  if (!iso) return '';
  const s = String(iso);
  const yyyy = s.substring(0, 4);
  const mm = s.substring(5, 7);
  const dd = s.substring(8, 10);
  return yyyy && mm && dd ? `${yyyy}-${mm}-${dd}` : '';
};

