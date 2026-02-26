import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface VehicleOption {
  name: string;
  price_per_day: number;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  price_per_day: number;
  photos: string[];
  description?: string;
  seats: number;
  transmission: string;
  fuel_type: string;
  options: VehicleOption[];
  status: string;
  location: string;
  agency_id?: string;
  created_at: string;
}

interface VehicleFilters {
  type?: string;
  min_price?: number;
  max_price?: number;
  location?: string;
  transmission?: string;
  start_date?: string;
  end_date?: string;
  agency_id?: string;
}

interface VehicleState {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  isLoading: boolean;
  filters: VehicleFilters;
  fetchVehicles: (filters?: VehicleFilters) => Promise<void>;
  fetchVehicle: (id: string) => Promise<void>;
  setFilters: (filters: VehicleFilters) => void;
  clearFilters: () => void;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  isLoading: false,
  filters: {},

  fetchVehicles: async (filters?: VehicleFilters) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      const activeFilters = filters || get().filters;
      
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await axios.get(`${API_URL}/api/vehicles?${params.toString()}`);
      set({ vehicles: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Error fetching vehicles:', error);
    }
  },

  fetchVehicle: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await axios.get(`${API_URL}/api/vehicles/${id}`);
      set({ selectedVehicle: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Error fetching vehicle:', error);
    }
  },

  setFilters: (filters: VehicleFilters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  clearFilters: () => {
    set({ filters: {} });
  },
}));
