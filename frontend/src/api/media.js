export function getMediaUrl(source) {
  const path = typeof source === 'string' ? source : source?.image || source?.image_url;
  if (!path) return '';

  try {
    return new URL(path, import.meta.env.VITE_API_URL || window.location.origin).toString();
  } catch {
    return path;
  }
}
