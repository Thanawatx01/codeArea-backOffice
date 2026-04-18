const normalizeInArray = (value) => {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];

  const raw = String(value).trim();

  // Support query styles like ["1","2"] or ['1','2']
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const jsonLike = raw.replace(/'/g, '"');
    try {
      const parsed = JSON.parse(jsonLike);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((item) => item.trim()).filter(Boolean);
      }
    } catch (_) {
      // Fallback to comma split below.
    }
  }

  return raw
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
};

module.exports = { normalizeInArray };
