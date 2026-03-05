/**
 * Convert a photo path to a full URL.
 * Handles proxy paths (/api/...) and external URLs (https://...).
 */
export const getPhotoUrl = (photo: string): string => {
  if (!photo) return '';
  if (photo.startsWith('http')) return photo;
  if (photo.startsWith('/api/')) {
    const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    return `${baseUrl}${photo}`;
  }
  return photo;
};
