import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface ReservationOption {
  name: string;
  price_per_day: number;
  total_price: number;
}

export interface Reservation {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  options: ReservationOption[];
  total_days: number;
  base_price: number;
  options_price: number;
  total_price: number;
  status: string;
  payment_session_id?: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

interface ReservationState {
  reservations: Reservation[];
  currentReservation: Reservation | null;
  isLoading: boolean;
  fetchReservations: () => Promise<void>;
  createReservation: (data: { vehicle_id: string; start_date: string; end_date: string; options: string[]; payment_method?: string }) => Promise<Reservation>;
  cancelReservation: (id: string) => Promise<void>;
  initiatePayment: (reservationId: string, originUrl: string) => Promise<{ url: string; session_id: string }>;
  checkPaymentStatus: (sessionId: string) => Promise<any>;
}

export const useReservationStore = create<ReservationState>((set, get) => ({
  reservations: [],
  currentReservation: null,
  isLoading: false,

  fetchReservations: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get(`${API_URL}/api/reservations`);
      set({ reservations: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Error fetching reservations:', error);
    }
  },

  createReservation: async (data) => {
    set({ isLoading: true });
    try {
      const response = await axios.post(`${API_URL}/api/reservations`, data);
      set({ currentReservation: response.data, isLoading: false });
      return response.data;
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.detail || 'Failed to create reservation');
    }
  },

  cancelReservation: async (id: string) => {
    try {
      await axios.post(`${API_URL}/api/reservations/${id}/cancel`);
      const { reservations } = get();
      set({
        reservations: reservations.map(r =>
          r.id === id ? { ...r, status: 'cancelled' } : r
        ),
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to cancel reservation');
    }
  },

  initiatePayment: async (reservationId: string, originUrl: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/payments/checkout`, {
        reservation_id: reservationId,
        origin_url: originUrl,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to initiate payment');
    }
  },

  checkPaymentStatus: async (sessionId: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/payments/status/${sessionId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to check payment status');
    }
  },
}));
