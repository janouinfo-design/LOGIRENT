import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './translations.en';
import de from './translations.de';

export type Lang = 'fr' | 'en' | 'de';
const LANG_KEY = 'app_lang';

const legacy: Record<Lang, Record<string, string>> = {
  fr: {
    greeting: 'Bienvenue chez',
    heroTitle: 'Location de véhicules premium',
    heroSubtitle: 'Trouvez le véhicule parfait pour vos besoins. Service premium, prix compétitifs.',
    searchPlaceholder: 'Rechercher un véhicule...',
    categories: 'Catégories',
    all: 'Tous',
    suv: 'SUV',
    sedan: 'Berline',
    city: 'Citadine',
    utility: 'Utilitaire',
    ourFleet: 'Notre Flotte',
    vehiclesCount: 'véhicules disponibles',
    viewAll: 'Voir tout',
    details: 'Détails',
    perDay: '/jour',
    seats: 'Places',
    automatic: 'Automatique',
    manual: 'Manuel',
    available: 'Disponible',
    unavailable: 'Indisponible',
    newBadge: 'NOUVEAU',
    whyUs: 'Pourquoi LogiRent ?',
    benefit1Title: 'Véhicules récents',
    benefit1Desc: 'Flotte renouvelée chaque année',
    benefit2Title: 'Assistance 24/7',
    benefit2Desc: 'Support disponible à tout moment',
    benefit3Title: 'Meilleur prix',
    benefit3Desc: 'Tarifs compétitifs garantis',
    benefit4Title: 'Flexibilité',
    benefit4Desc: 'Annulation gratuite 24h avant',
    ctaTitle: 'Prêt à prendre la route ?',
    ctaSubtitle: 'Réservez votre véhicule en quelques clics',
    ctaButton: 'Réserver maintenant',
    home: 'Accueil',
    vehicles: 'Véhicules',
    rentals: 'Locations',
    profile: 'Profil',
    fleet: 'Notre Flotte',
    myReservations: 'Mes Réservations',
    myProfile: 'Mon Profil',
  },
  en: {
    greeting: 'Welcome to',
    heroTitle: 'Premium Vehicle Rental',
    heroSubtitle: 'Find the perfect vehicle for your needs. Premium service, competitive prices.',
    searchPlaceholder: 'Search a vehicle...',
    categories: 'Categories',
    all: 'All',
    suv: 'SUV',
    sedan: 'Sedan',
    city: 'City Car',
    utility: 'Utility',
    ourFleet: 'Our Fleet',
    vehiclesCount: 'vehicles available',
    viewAll: 'View all',
    details: 'Details',
    perDay: '/day',
    seats: 'Seats',
    automatic: 'Automatic',
    manual: 'Manual',
    available: 'Available',
    unavailable: 'Unavailable',
    newBadge: 'NEW',
    whyUs: 'Why LogiRent?',
    benefit1Title: 'Recent Vehicles',
    benefit1Desc: 'Fleet renewed every year',
    benefit2Title: '24/7 Support',
    benefit2Desc: 'Assistance available anytime',
    benefit3Title: 'Best Price',
    benefit3Desc: 'Competitive rates guaranteed',
    benefit4Title: 'Flexibility',
    benefit4Desc: 'Free cancellation 24h before',
    ctaTitle: 'Ready to hit the road?',
    ctaSubtitle: 'Book your vehicle in a few clicks',
    ctaButton: 'Book now',
    home: 'Home',
    vehicles: 'Vehicles',
    rentals: 'Rentals',
    profile: 'Profile',
    fleet: 'Our Fleet',
    myReservations: 'My Reservations',
    myProfile: 'My Profile',
  },
  de: {
    greeting: 'Willkommen bei',
    heroTitle: 'Premium-Fahrzeugvermietung',
    heroSubtitle: 'Finden Sie das perfekte Fahrzeug für Ihre Bedürfnisse. Premium-Service, wettbewerbsfähige Preise.',
    searchPlaceholder: 'Fahrzeug suchen...',
    categories: 'Kategorien',
    all: 'Alle',
    suv: 'SUV',
    sedan: 'Limousine',
    city: 'Kleinwagen',
    utility: 'Nutzfahrzeug',
    ourFleet: 'Unsere Flotte',
    vehiclesCount: 'Fahrzeuge verfügbar',
    viewAll: 'Alle ansehen',
    details: 'Details',
    perDay: '/Tag',
    seats: 'Sitze',
    automatic: 'Automatik',
    manual: 'Schaltgetriebe',
    available: 'Verfügbar',
    unavailable: 'Nicht verfügbar',
    newBadge: 'NEU',
    whyUs: 'Warum LogiRent?',
    benefit1Title: 'Neue Fahrzeuge',
    benefit1Desc: 'Flotte wird jedes Jahr erneuert',
    benefit2Title: '24/7 Support',
    benefit2Desc: 'Unterstützung jederzeit verfügbar',
    benefit3Title: 'Bester Preis',
    benefit3Desc: 'Wettbewerbsfähige Preise garantiert',
    benefit4Title: 'Flexibilität',
    benefit4Desc: 'Kostenlose Stornierung 24h vorher',
    ctaTitle: 'Bereit loszufahren?',
    ctaSubtitle: 'Buchen Sie Ihr Fahrzeug mit wenigen Klicks',
    ctaButton: 'Jetzt buchen',
    home: 'Startseite',
    vehicles: 'Fahrzeuge',
    rentals: 'Mieten',
    profile: 'Profil',
    fleet: 'Unsere Flotte',
    myReservations: 'Meine Buchungen',
    myProfile: 'Mein Profil',
  },
};

const dicts: Record<string, Record<string, string>> = { en, de };

function detectLang(): Lang {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(LANG_KEY);
      if (stored === 'fr' || stored === 'en' || stored === 'de') return stored;
      const nav = (window.navigator.language || 'fr').slice(0, 2).toLowerCase();
      if (nav === 'en' || nav === 'de') return nav as Lang;
    }
  } catch {}
  return 'fr';
}

let currentLang: Lang = detectLang();

export function t(text: any): string {
  if (typeof text !== 'string') return text;
  const lg = legacy[currentLang][text];
  if (lg !== undefined) return lg;
  if (currentLang !== 'fr') {
    const d = dicts[currentLang];
    if (d && d[text] !== undefined) return d[text];
    const frLegacy = legacy.fr[text];
    if (frLegacy !== undefined) return frLegacy;
  }
  return text;
}

export function getLang(): Lang {
  return currentLang;
}

interface I18nContextType {
  lang: Lang;
  t: (key: string) => string;
  toggleLang: () => void;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'fr',
  t: (key) => t(key),
  toggleLang: () => {},
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(currentLang);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      AsyncStorage.getItem(LANG_KEY).then((s) => {
        if (s === 'fr' || s === 'en' || s === 'de') {
          currentLang = s;
          setLangState(s);
        }
      }).catch(() => {});
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    currentLang = l;
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
    AsyncStorage.getItem('token').then((tok) => {
      if (tok) {
        import('../api/axios').then(({ default: api }) => {
          api.put('/api/auth/profile', { preferred_language: l }).catch(() => {});
        });
      }
    }).catch(() => {});
  }, []);

  const toggleLang = useCallback(() => {
    setLang(currentLang === 'fr' ? 'en' : currentLang === 'en' ? 'de' : 'fr');
  }, [setLang]);

  const tFn = useCallback((key: string) => t(key), [lang]);

  return (
    <I18nContext.Provider value={{ lang, t: tFn, toggleLang, setLang }}>
      <React.Fragment key={lang}>{children}</React.Fragment>
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
