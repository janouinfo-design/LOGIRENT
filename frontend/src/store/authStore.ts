import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Read file as base64 data URI - works on all mobile browsers
const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });
};

// Compress via Canvas if possible, fallback to raw base64
const compressToBase64 = async (file: File | Blob, maxSize = 800, quality = 0.6): Promise<string> => {
  try {
    if (typeof document === 'undefined') return fileToBase64(file);
    const blobUrl = URL.createObjectURL(file);
    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = blobUrl;
    });
    let { width, height } = img;
    if (width > maxSize || height > maxSize) {
      if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
      else { width = Math.round((width * maxSize) / height); height = maxSize; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fileToBase64(file);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(blobUrl);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    // Fallback: send raw base64 without compression
    return fileToBase64(file);
  }
};

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  id_photo?: string;
  license_photo?: string;
  profile_photo?: string;
  birth_place?: string;
  date_of_birth?: string;
  license_number?: string;
  license_issue_date?: string;
  license_expiry_date?: string;
  nationality?: string;
  id_photo_back?: string;
  license_photo_back?: string;
  id_verification?: any;
  license_verification?: any;
  client_rating?: string;
  admin_notes?: string;
  role?: string;
  agency_id?: string;
  agency_name?: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string, agencyId?: string) => Promise<void>;
  registerAdmin: (email: string, password: string, name: string, agencyName: string, phone?: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadLicense: (imageUriOrFile: string | File) => Promise<any>;
  uploadLicenseBack: (imageUriOrFile: string | File) => Promise<any>;
  uploadIdCard: (imageUriOrFile: string | File) => Promise<any>;
  uploadIdCardBack: (imageUriOrFile: string | File) => Promise<any>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });
      const { access_token, user } = response.data;
      await AsyncStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  register: async (email: string, password: string, name: string, phone?: string, agencyId?: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
        name,
        phone,
        agency_id: agencyId || null,
      });
      const { access_token, user } = response.data;
      await AsyncStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  },

  registerAdmin: async (email: string, password: string, name: string, agencyName: string, phone?: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register-admin`, {
        email,
        password,
        name,
        agency_name: agencyName,
        phone,
      });
      const { access_token, user } = response.data;
      await AsyncStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  },

  adminLogin: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, {
        email,
        password,
      });
      const { access_token, user } = response.data;
      await AsyncStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get(`${API_URL}/api/auth/profile`);
        set({ user: response.data, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      await AsyncStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (data: Partial<User>) => {
    try {
      const response = await axios.put(`${API_URL}/api/auth/profile`, data);
      set({ user: response.data });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Update failed');
    }
  },

  uploadLicense: async (imageUriOrFile: string | File) => {
    try {
      let imageData: string;

      if (typeof imageUriOrFile === 'object' && imageUriOrFile instanceof File) {
        // Web: File object - compress and convert to base64
        imageData = await compressToBase64(imageUriOrFile);
      } else if (typeof imageUriOrFile === 'string' && imageUriOrFile.startsWith('data:')) {
        // Already base64 data URI (from native with base64: true)
        imageData = imageUriOrFile;
      } else if (typeof imageUriOrFile === 'string' && Platform.OS === 'web') {
        // Web: string URI → fetch blob → compress
        const resp = await fetch(imageUriOrFile);
        const blob = await resp.blob();
        imageData = await compressToBase64(blob);
      } else {
        // Native fallback: use multipart upload
        const formData = new FormData();
        const filename = imageUriOrFile.split('/').pop() || 'license.jpg';
        formData.append('file', { uri: imageUriOrFile, name: filename, type: 'image/jpeg' } as any);
        const response = await axios.post(`${API_URL}/api/auth/upload-license`, formData);
        const { user } = get();
        if (user) set({ user: { ...user, license_photo: response.data.license_photo } });
        return;
      }

      const response = await axios.post(`${API_URL}/api/auth/upload-license-b64`, {
        image_data: imageData
      });
      const { user } = get();
      if (user) set({ user: { ...user, license_photo: response.data.license_photo } });
      return response.data.verification;
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Upload failed';
      throw new Error(msg);
    }
  },

  uploadIdCard: async (imageUriOrFile: string | File) => {
    try {
      let imageData: string;

      if (typeof imageUriOrFile === 'object' && imageUriOrFile instanceof File) {
        // Web: File object - compress and convert to base64
        imageData = await compressToBase64(imageUriOrFile);
      } else if (typeof imageUriOrFile === 'string' && imageUriOrFile.startsWith('data:')) {
        // Already base64 data URI (from native with base64: true)
        imageData = imageUriOrFile;
      } else if (typeof imageUriOrFile === 'string' && Platform.OS === 'web') {
        // Web: string URI → fetch blob → compress
        const resp = await fetch(imageUriOrFile);
        const blob = await resp.blob();
        imageData = await compressToBase64(blob);
      } else {
        // Native fallback: use multipart upload
        const formData = new FormData();
        const filename = imageUriOrFile.split('/').pop() || 'id_card.jpg';
        formData.append('file', { uri: imageUriOrFile, name: filename, type: 'image/jpeg' } as any);
        const response = await axios.post(`${API_URL}/api/auth/upload-id`, formData);
        const { user } = get();
        if (user) set({ user: { ...user, id_photo: response.data.id_photo } });
        return;
      }

      const response = await axios.post(`${API_URL}/api/auth/upload-id-b64`, {
        image_data: imageData
      });
      const { user } = get();
      if (user) set({ user: { ...user, id_photo: response.data.id_photo } });
      return response.data.verification;
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Upload failed';
      throw new Error(msg);
    }
  },

  uploadIdCardBack: async (imageUriOrFile: string | File) => {
    try {
      let imageData: string;
      if (typeof imageUriOrFile === 'object' && imageUriOrFile instanceof File) {
        imageData = await compressToBase64(imageUriOrFile);
      } else if (typeof imageUriOrFile === 'string' && imageUriOrFile.startsWith('data:')) {
        imageData = imageUriOrFile;
      } else {
        const resp = await fetch(imageUriOrFile);
        const blob = await resp.blob();
        imageData = await compressToBase64(blob);
      }
      const response = await axios.post(`${API_URL}/api/auth/upload-id-back-b64`, { image_data: imageData });
      const { user } = get();
      if (user) set({ user: { ...user, id_photo_back: response.data.id_photo_back } });
      return response.data.verification;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message || 'Upload failed');
    }
  },

  uploadLicenseBack: async (imageUriOrFile: string | File) => {
    try {
      let imageData: string;
      if (typeof imageUriOrFile === 'object' && imageUriOrFile instanceof File) {
        imageData = await compressToBase64(imageUriOrFile);
      } else if (typeof imageUriOrFile === 'string' && imageUriOrFile.startsWith('data:')) {
        imageData = imageUriOrFile;
      } else {
        const resp = await fetch(imageUriOrFile);
        const blob = await resp.blob();
        imageData = await compressToBase64(blob);
      }
      const response = await axios.post(`${API_URL}/api/auth/upload-license-back-b64`, { image_data: imageData });
      const { user } = get();
      if (user) set({ user: { ...user, license_photo_back: response.data.license_photo_back } });
      return response.data.verification;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message || 'Upload failed');
    }
  },
}));
