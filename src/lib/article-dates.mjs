const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
const koreaDate = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric',
});
const koreaParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function isDateOnly(value) {
  return typeof value === 'string' && DATE_ONLY.test(value);
}

export function normalizeArticleDate(value) {
  if (typeof value !== 'string' || (!isDateOnly(value) && !TIMESTAMP.test(value))) {
    throw new TypeError('Use YYYY-MM-DD or an ISO timestamp with seconds and an explicit timezone');
  }
  const day = value.slice(0, 10);
  const date = new Date(day);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== day) {
    throw new TypeError(`Invalid calendar date: ${day}`);
  }
  return isDateOnly(value) ? value : new Date(value).toISOString();
}

export function articleCalendarDate(value) {
  const iso = normalizeArticleDate(value);
  if (isDateOnly(iso)) return iso;
  const parts = Object.fromEntries(koreaParts.formatToParts(new Date(iso)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatArticleDate(value) {
  // Date-only input is a calendar day, not an instant at UTC midnight.
  return koreaDate.format(new Date(`${articleCalendarDate(value)}T00:00:00+09:00`));
}

export function articleRssDate(value) {
  const iso = normalizeArticleDate(value);
  // RSS pubDate requires a time; dc:date can retain the source's date-only precision.
  return isDateOnly(iso)
    ? { customData: `<dc:date>${iso}</dc:date>` }
    : { pubDate: new Date(iso) };
}

export function compareArticlePublication(a, b) {
  const byDate = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  // Concurrent glob loading must not decide feed order or its 50-item boundary.
  return byDate || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
