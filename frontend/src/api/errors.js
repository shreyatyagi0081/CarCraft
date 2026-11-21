export function getApiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.error === 'string') return data.error;

  const messages = Object.entries(data || {}).flatMap(([field, value]) => {
    if (typeof value === 'string') return [`${field}: ${value}`];
    if (Array.isArray(value)) return value.map((message) => `${field}: ${message}`);
    return [];
  });

  return messages.length ? messages.join(' ') : fallback;
}
