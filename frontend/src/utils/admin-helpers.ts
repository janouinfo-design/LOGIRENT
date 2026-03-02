import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const getStatusColor = (status: string, C: any) => {
  switch (status) {
    case 'confirmed': return C.success;
    case 'active': return C.accent;
    case 'pending': return C.warning;
    case 'pending_cash': return '#D97706';
    case 'cancelled': return C.error;
    case 'completed': return C.textLight;
    default: return C.textLight;
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'confirmed': return 'Confirmee';
    case 'active': return 'Active';
    case 'pending': return 'En attente';
    case 'pending_cash': return 'Especes';
    case 'cancelled': return 'Annulee';
    case 'completed': return 'Terminee';
    default: return status;
  }
};

export const getPaymentColor = (status: string, C: any) => {
  switch (status) {
    case 'paid': return C.success;
    case 'pending': return C.warning;
    case 'unpaid': return C.error;
    case 'refunded': return '#6B7280';
    default: return C.textLight;
  }
};

export const getPaymentLabel = (status: string) => {
  switch (status) {
    case 'paid': return 'Paye';
    case 'pending': return 'En attente';
    case 'unpaid': return 'Non paye';
    case 'refunded': return 'Rembourse';
    default: return status;
  }
};

export const formatDate = (dateString: string) => {
  try {
    return format(parseISO(dateString), 'dd MMM yyyy', { locale: fr });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string) => {
  try {
    return format(parseISO(dateString), "dd MMM yyyy 'a' HH:mm", { locale: fr });
  } catch {
    return dateString;
  }
};

export const STATUS_OPTIONS = [
  { value: null, label: 'Toutes', icon: 'list' },
  { value: 'pending', label: 'En attente', icon: 'time' },
  { value: 'pending_cash', label: 'Especes', icon: 'cash' },
  { value: 'confirmed', label: 'Confirmees', icon: 'checkmark-circle' },
  { value: 'active', label: 'Actives', icon: 'car' },
  { value: 'completed', label: 'Terminees', icon: 'checkmark-done' },
  { value: 'cancelled', label: 'Annulees', icon: 'close-circle' },
];

export const VEHICLE_TYPES = [
  { value: 'berline', label: 'Berline' },
  { value: 'SUV', label: 'SUV' },
  { value: 'citadine', label: 'Citadine' },
  { value: 'utilitaire', label: 'Utilitaire' },
  { value: 'luxe', label: 'Luxe' },
  { value: 'sport', label: 'Sport' },
];

export const TRANSMISSIONS = [
  { value: 'automatic', label: 'Automatique' },
  { value: 'manual', label: 'Manuelle' },
];

export const FUEL_TYPES = [
  { value: 'essence', label: 'Essence' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybrid', label: 'Hybride' },
  { value: 'electric', label: 'Electrique' },
];

export const USER_RATINGS = [
  { value: 'vip', label: 'VIP', color: '#8B5CF6', icon: 'star' },
  { value: 'good', label: 'Bon client', color: '#10B981', icon: 'thumbs-up' },
  { value: 'neutral', label: 'Neutre', color: '#6B7280', icon: 'remove' },
  { value: 'bad', label: 'Mauvais client', color: '#F59E0B', icon: 'thumbs-down' },
  { value: 'blocked', label: 'Bloque', color: '#EF4444', icon: 'ban' },
];
