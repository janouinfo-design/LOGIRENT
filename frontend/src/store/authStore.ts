import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Compress image on web using Canvas and return base64 data URI
const compressToBase64 = (file: File | Blob, maxSize = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
        else { width = Math.round((width * maxSize) / height); height = maxSize; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUri = canvas.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(img.src);
      resolve(dataUri);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  id_photo?: string;
  license_photo?: string;
  role?: string;  // client, admin, super_admin
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
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  registerAdmin: (email: string, password: string, name: string, agencyName: string, phone?: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadLicense: (imageUriOrFile: string | File) => Promise<void>;
  uploadIdCard: (imageUriOrFile: string | File) => Promise<void>;
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

      if (imageUriOrFile instanceof File) {
        // Web: compress and convert to base64 data URI
        imageData = await compressToBase64(imageUriOrFile);
      } else if (typeof window !== 'undefined' && window.document) {
        // Web: string URI → fetch blob → compress
        const resp = await fetch(imageUriOrFile);
        const blob = await resp.blob();
        imageData = await compressToBase64(blob);
      } else {
        // Native: send via multipart (old way)
        const formData = new FormData();
        const filename = imageUriOrFile.split('/').pop() || 'license.jpg';
        const match = /\.([\w]+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('file', { uri: imageUriOrFile, name: filename, type } as any);
        const response = await axios.post(`${API_URL}/api/auth/upload-license`, formData);
        const { user } = get();
        if (user) set({ user: { ...user, license_photo: response.data.license_photo } });
        return;
      }

      // Web: send as JSON with base64
      const response = await axios.post(`${API_URL}/api/auth/upload-license-b64`, {
        image_data: imageData
      });
      const { user } = get();
      if (user) set({ user: { ...user, license_photo: response.data.license_photo } });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Upload failed');
    }
  },

  uploadIdCard: async (imageUriOrFile: string | File) => {
    try {
      let imageData: string;

      if (imageUriOrFile instanceof File) {
        // Web: compress and convert to base64 data URI
        imageData = await compressToBase64(imageUriOrFile);
      } else if (typeof window !== 'undefined' && window.document) {
        // Web: string URI → fetch blob → compress
        const resp = await fetch(imageUriOrFile);
        const blob = await resp.blob();
        imageData = await compressToBase64(blob);
      } else {
        // Native: send via multipart (old way)
        const formData = new FormData();
        const filename = imageUriOrFile.split('/').pop() || 'id_card.jpg';
        const match = /\.([\w]+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('file', { uri: imageUriOrFile, name: filename, type } as any);
        const response = await axios.post(`${API_URL}/api/auth/upload-id`, formData);
        const { user } = get();
        if (user) set({ user: { ...user, id_photo: response.data.id_photo } });
        return;
      }

      // Web: send as JSON with base64
      const response = await axios.post(`${API_URL}/api/auth/upload-id-b64`, {
        image_data: imageData
      });
      const { user } = get();
      if (user) set({ user: { ...user, id_photo: response.data.id_photo } });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Upload failed');
    }
  },
}));
