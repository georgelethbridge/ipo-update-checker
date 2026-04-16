const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

export const normalizeTitle = (value: string | null | undefined) =>
  value ? normalizeWhitespace(value).toLowerCase() : '';

export const normalizeUrl = (value: string | null | undefined) => {
  if (!value) return '';
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    const path = url.pathname.replace(/\/$/, '').toLowerCase();
    return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}${url.hash}`;
  } catch {
    return trimmed.replace(/\/$/, '').toLowerCase();
  }
};

export const normalizeDate = (value: string | null | undefined) => (value ? value.slice(0, 10) : '');

export const articlesMatch = (a: { title?: string | null; date?: string | null; url?: string | null }, b: { title?: string | null; date?: string | null; url?: string | null }) => {
  const titleMatch = normalizeTitle(a.title) === normalizeTitle(b.title);
  const aDate = normalizeDate(a.date);
  const bDate = normalizeDate(b.date);
  const dateMatch = (!aDate && !bDate) || aDate === bDate;
  const urlMatch = normalizeUrl(a.url) === normalizeUrl(b.url);
  return titleMatch && dateMatch && urlMatch;
};
