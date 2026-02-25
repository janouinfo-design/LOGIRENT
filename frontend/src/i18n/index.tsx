import React, { createContext, useContext, useState, useCallback } from 'react';

type Lang = 'fr' | 'en';

const translations = {
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
};

interface I18nContextType {
  lang: Lang;
  t: (key: keyof typeof translations.fr) => string;
  toggleLang: () => void;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'fr',
  t: (key) => translations.fr[key],
  toggleLang: () => {},
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  const t = useCallback(
    (key: keyof typeof translations.fr) => translations[lang][key] || key,
    [lang]
  );

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'fr' ? 'en' : 'fr'));
  }, []);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
