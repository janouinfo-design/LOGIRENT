import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, useWindowDimensions, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useThemeStore } from '../../src/store/themeStore';
import { getPhotoUrl } from '../../src/components/agency/vehicleTypes';
import AvailabilityCalendarModal from '../../src/components/AvailabilityCalendarModal';

const ACCENT = '#7C3AED';

export default function VehicleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors: C } = useThemeStore();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await api.get(`/api/vehicles/${id}`);
        setVehicle(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <View style={[p.center, { backgroundColor: C.bg }]}><ActivityIndicator size="large" color={ACCENT} /></View>;
  if (!vehicle) return <View style={[p.center, { backgroundColor: C.bg }]}><Text style={{ color: C.text }}>Vehicule introuvable</Text></View>;

  const photos = vehicle.photos || [];
  const photoUrl = photos[photoIdx] ? getPhotoUrl(photos[photoIdx]) : null;
  const fuelMap: any = { electric: 'Electrique', hybrid: 'Hybride', diesel: 'Diesel', gasoline: 'Essence' };
  const transMap: any = { automatic: 'Automatique', manual: 'Manuelle' };
  const fuelLabel = fuelMap[vehicle.fuel_type] || vehicle.fuel_type;
  const transLabel = transMap[vehicle.transmission] || vehicle.transmission;

  // Mock urgency data
  const fakeBookings = Math.floor(Math.random() * 8) + 3;
  const fakeAvailable = vehicle.status === 'available' ? Math.floor(Math.random() * 3) + 1 : 0;

  const specs = [
    { icon: 'people', label: `${vehicle.seats} places` },
    { icon: 'cog', label: transLabel },
    { icon: 'speedometer', label: fuelLabel },
    { icon: 'calendar', label: `${vehicle.year}` },
    { icon: 'car-sport', label: vehicle.type || 'Berline' },
    { icon: 'color-palette', label: vehicle.color || 'N/A' },
  ];

  const conditions = [
    { icon: 'person', label: 'Age minimum', value: '21 ans' },
    { icon: 'card', label: 'Caution', value: 'CHF 1\'500' },
    { icon: 'document-text', label: 'Permis', value: 'B valide depuis 2 ans' },
    { icon: 'shield-checkmark', label: 'Assurance', value: 'Incluse (RC + CDW)' },
    { icon: 'speedometer', label: 'Km inclus', value: '200 km/jour' },
  ];

  const reviews = [
    { name: 'Marc D.', rating: 5, text: 'Vehicule impeccable, service rapide et professionnel. Je recommande !', date: 'Il y a 2 semaines' },
    { name: 'Sophie L.', rating: 5, text: `${vehicle.brand} parfaite pour un week-end. Tres propre, bien entretenue.`, date: 'Il y a 1 mois' },
    { name: 'Pierre M.', rating: 4, text: 'Bonne experience, vehicule conforme aux photos. Petit retard a la livraison.', date: 'Il y a 2 mois' },
  ];

  const goPhoto = (dir: number) => {
    const next = photoIdx + dir;
    if (next >= 0 && next < photos.length) setPhotoIdx(next);
  };

  return (
    <View style={[p.container, { backgroundColor: C.bg }]}>
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} style={[p.backBtn, { backgroundColor: C.card, borderColor: C.border }]} data-testid="back-btn">
        <Ionicons name="arrow-back" size={20} color={C.text} />
        <Text style={[p.backText, { color: C.text }]}>Retour</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* === PHOTO GALLERY === */}
        <View style={[p.galleryWrap, isWide && { paddingHorizontal: width * 0.08 }]}>
          <TouchableOpacity onPress={() => setGalleryOpen(true)} activeOpacity={0.9} style={p.mainPhoto}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={p.mainPhotoImg} resizeMode="cover" />
            ) : (
              <View style={[p.mainPhotoPlaceholder, { backgroundColor: C.card }]}>
                <Ionicons name="car-sport-outline" size={64} color={C.textLight + '40'} />
              </View>
            )}
            {/* Photo counter */}
            {photos.length > 0 && (
              <View style={p.photoCounter}>
                <Ionicons name="camera" size={14} color="#fff" />
                <Text style={p.photoCounterText}>{photoIdx + 1} / {photos.length}</Text>
              </View>
            )}
            {/* Navigation */}
            {photoIdx > 0 && (
              <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); goPhoto(-1); }} style={[p.photoNav, p.photoNavLeft]}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            {photoIdx < photos.length - 1 && (
              <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); goPhoto(1); }} style={[p.photoNav, p.photoNavRight]}>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Thumbnails */}
          {photos.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={p.thumbRow}>
              {photos.map((ph: string, i: number) => (
                <TouchableOpacity key={i} onPress={() => setPhotoIdx(i)} style={[p.thumb, i === photoIdx && { borderColor: ACCENT, borderWidth: 2 }]}>
                  <Image source={{ uri: getPhotoUrl(ph) }} style={p.thumbImg} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* === CONTENT === */}
        <View style={[p.content, isWide && { flexDirection: 'row', paddingHorizontal: width * 0.08, gap: 32 }]}>
          {/* LEFT COLUMN */}
          <View style={[p.leftCol, isWide && { flex: 1 }]}>

            {/* Urgency */}
            {vehicle.status === 'available' && (
              <View style={p.urgencyRow}>
                <View style={p.urgencyBadge}>
                  <Ionicons name="flame" size={14} color="#EF4444" />
                  <Text style={p.urgencyText}>{fakeBookings} reservations cette semaine</Text>
                </View>
                <View style={[p.urgencyBadge, { backgroundColor: '#F59E0B18' }]}>
                  <Ionicons name="time" size={14} color="#F59E0B" />
                  <Text style={[p.urgencyText, { color: '#B45309' }]}>Plus que {fakeAvailable} disponible{fakeAvailable > 1 ? 's' : ''}</Text>
                </View>
              </View>
            )}

            {/* Header */}
            <Text style={[p.brandLine, { color: C.textLight }]}>{vehicle.brand} · {vehicle.year}</Text>
            <Text style={[p.modelTitle, { color: C.text }]}>{vehicle.model}</Text>

            {/* Badges */}
            <View style={p.badgesRow}>
              <View style={[p.badgePill, { backgroundColor: '#10B98118', borderColor: '#10B98140' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={[p.badgePillText, { color: '#059669' }]}>Disponible</Text>
              </View>
              <View style={[p.badgePill, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B40' }]}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={[p.badgePillText, { color: '#B45309' }]}>Populaire</Text>
              </View>
              <View style={[p.badgePill, { backgroundColor: ACCENT + '12', borderColor: ACCENT + '30' }]}>
                <Ionicons name="star" size={14} color={ACCENT} />
                <Text style={[p.badgePillText, { color: ACCENT }]}>4.8/5</Text>
              </View>
              {vehicle.location && (
                <View style={[p.badgePill, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <Ionicons name="location" size={14} color={C.textLight} />
                  <Text style={[p.badgePillText, { color: C.textLight }]}>{vehicle.location}</Text>
                </View>
              )}
            </View>

            {/* Specs Grid */}
            <Text style={[p.sectionTitle, { color: C.text }]}>Caracteristiques</Text>
            <View style={p.specsGrid}>
              {specs.map((s, i) => (
                <View key={i} style={[p.specCard, { backgroundColor: C.card, borderColor: C.border }]}>
                  <Ionicons name={s.icon as any} size={22} color={ACCENT} />
                  <Text style={[p.specLabel, { color: C.text }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Description */}
            {vehicle.description && (
              <>
                <Text style={[p.sectionTitle, { color: C.text }]}>Description</Text>
                <Text style={[p.descText, { color: C.textLight }]}>{vehicle.description}</Text>
                {vehicle.options && vehicle.options.length > 0 && (
                  <View style={p.optionsRow}>
                    {vehicle.options.map((opt: any, i: number) => (
                      <View key={i} style={[p.optionChip, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '25' }]}>
                        <Ionicons name="add-circle" size={14} color={ACCENT} />
                        <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '600' }}>{opt.name} +CHF {opt.price_per_day}/j</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Conditions */}
            <Text style={[p.sectionTitle, { color: C.text }]}>Conditions de location</Text>
            <View style={[p.conditionsCard, { backgroundColor: C.card, borderColor: C.border }]}>
              {conditions.map((c, i) => (
                <View key={i} style={[p.condRow, i < conditions.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                  <View style={[p.condIcon, { backgroundColor: ACCENT + '10' }]}>
                    <Ionicons name={c.icon as any} size={18} color={ACCENT} />
                  </View>
                  <Text style={[p.condLabel, { color: C.textLight }]}>{c.label}</Text>
                  <Text style={[p.condValue, { color: C.text }]}>{c.value}</Text>
                </View>
              ))}
            </View>

            {/* Reviews */}
            <Text style={[p.sectionTitle, { color: C.text }]}>Avis clients</Text>
            {reviews.map((r, i) => (
              <View key={i} style={[p.reviewCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={p.reviewHead}>
                  <View style={[p.reviewAvatar, { backgroundColor: ACCENT + '15' }]}>
                    <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '800' }}>{r.name[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[p.reviewName, { color: C.text }]}>{r.name}</Text>
                    <Text style={{ color: C.textLight, fontSize: 11 }}>{r.date}</Text>
                  </View>
                  <View style={p.reviewStars}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={14} color="#F59E0B" />
                    ))}
                  </View>
                </View>
                <Text style={[p.reviewText, { color: C.textLight }]}>{r.text}</Text>
              </View>
            ))}
          </View>

          {/* RIGHT COLUMN - Sticky booking card */}
          <View style={[p.rightCol, isWide && { width: 340 }]}>
            <View style={[p.bookingCard, { backgroundColor: C.card, borderColor: C.border }]}>
              {/* Price */}
              <Text style={[p.priceFrom, { color: C.textLight }]}>A partir de</Text>
              <View style={p.priceRow}>
                <Text style={[p.priceBig, { color: C.text }]}>CHF {vehicle.price_per_day}</Text>
                <Text style={[p.priceUnit, { color: C.textLight }]}> /jour</Text>
              </View>

              {/* Options hint */}
              {vehicle.options && vehicle.options.length > 0 && (
                <Text style={{ color: C.textLight, fontSize: 12, marginTop: 4 }}>+ {vehicle.options.length} options disponibles</Text>
              )}

              {/* CTA */}
              <TouchableOpacity style={p.ctaPrimary} data-testid="reserve-now-btn" activeOpacity={0.85} onPress={() => router.push({ pathname: '/booking/[id]', params: { id: vehicle.id } })}>
                <Text style={p.ctaPrimaryText}>Reserver maintenant</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[p.ctaSecondary, { borderColor: C.border }]} data-testid="check-availability-btn" activeOpacity={0.7} onPress={() => setAvailabilityOpen(true)}>
                <Ionicons name="calendar-outline" size={18} color={ACCENT} />
                <Text style={[p.ctaSecondaryText, { color: ACCENT }]}>Voir la disponibilite</Text>
              </TouchableOpacity>

              {/* Trust signals */}
              <View style={[p.trustRow, { borderTopColor: C.border }]}>
                <View style={p.trustItem}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text style={[p.trustText, { color: C.textLight }]}>Assurance incluse</Text>
                </View>
                <View style={p.trustItem}>
                  <Ionicons name="close-circle" size={16} color="#10B981" />
                  <Text style={[p.trustText, { color: C.textLight }]}>Annulation gratuite</Text>
                </View>
                <View style={p.trustItem}>
                  <Ionicons name="flash" size={16} color="#10B981" />
                  <Text style={[p.trustText, { color: C.textLight }]}>Confirmation instantanee</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* === AVAILABILITY CALENDAR === */}
      <AvailabilityCalendarModal
        visible={availabilityOpen}
        vehicleId={vehicle.id}
        vehicleName={`${vehicle.brand} ${vehicle.model}`}
        onClose={() => setAvailabilityOpen(false)}
        onSelectDate={(date) => {
          setAvailabilityOpen(false);
          router.push({ pathname: '/booking/[id]', params: { id: vehicle.id } });
        }}
        colors={C}
      />

      {/* === FULLSCREEN GALLERY MODAL === */}
      <Modal visible={galleryOpen} transparent animationType="fade" onRequestClose={() => setGalleryOpen(false)}>
        <View style={p.galModal}>
          <View style={p.galHeader}>
            <Text style={p.galTitle}>{vehicle.brand} {vehicle.model}</Text>
            <Text style={p.galCounter}>{photoIdx + 1} / {photos.length}</Text>
            <TouchableOpacity onPress={() => setGalleryOpen(false)} style={p.galClose} data-testid="close-gallery-detail">
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={p.galBody}>
            {photos[photoIdx] && (
              <Image source={{ uri: getPhotoUrl(photos[photoIdx]) }} style={p.galImg} resizeMode="contain" />
            )}
            {photoIdx > 0 && (
              <TouchableOpacity onPress={() => goPhoto(-1)} style={[p.galNav, p.galNavLeft]}>
                <Ionicons name="chevron-back" size={32} color="#fff" />
              </TouchableOpacity>
            )}
            {photoIdx < photos.length - 1 && (
              <TouchableOpacity onPress={() => goPhoto(1)} style={[p.galNav, p.galNavRight]}>
                <Ionicons name="chevron-forward" size={32} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          {photos.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={p.galThumbs}>
              {photos.map((ph: string, i: number) => (
                <TouchableOpacity key={i} onPress={() => setPhotoIdx(i)} style={[p.galThumb, i === photoIdx && { borderColor: '#fff', borderWidth: 2 }]}>
                  <Image source={{ uri: getPhotoUrl(ph) }} style={p.galThumbImg} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const p = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Back
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start', margin: 16 },
  backText: { fontSize: 14, fontWeight: '600' },

  // Gallery
  galleryWrap: { paddingHorizontal: 16 },
  mainPhoto: { width: '100%', height: 380, borderRadius: 16, overflow: 'hidden', position: 'relative', backgroundColor: '#111' },
  mainPhotoImg: { width: '100%', height: '100%' },
  mainPhotoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  photoCounter: { position: 'absolute', bottom: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  photoCounterText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  photoNav: { position: 'absolute', top: '42%', width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' } as any,
  photoNavLeft: { left: 12 },
  photoNavRight: { right: 12 },
  thumbRow: { gap: 8, paddingVertical: 12 },
  thumb: { width: 72, height: 50, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbImg: { width: '100%', height: '100%' },

  // Content
  content: { padding: 16 },
  leftCol: {},
  rightCol: { marginTop: 24 },

  // Urgency
  urgencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  urgencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EF444412', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  urgencyText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },

  // Header
  brandLine: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  modelTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 10 },

  // Badges
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgePillText: { fontSize: 12, fontWeight: '600' },

  // Specs
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, marginTop: 24 },
  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  specCard: { alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, minWidth: 100 },
  specLabel: { fontSize: 12, fontWeight: '600' },

  // Description
  descText: { fontSize: 14, lineHeight: 22 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  optionChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },

  // Conditions
  conditionsCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  condRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  condIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  condLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  condValue: { fontSize: 13, fontWeight: '700' },

  // Reviews
  reviewCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  reviewName: { fontSize: 14, fontWeight: '700' },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 13, lineHeight: 20 },

  // Booking Card
  bookingCard: { borderRadius: 16, borderWidth: 1, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' } as any,
  priceFrom: { fontSize: 12, fontWeight: '500' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  priceBig: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  priceUnit: { fontSize: 16, fontWeight: '500' },
  ctaPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 12, marginTop: 20 },
  ctaPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  ctaSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, marginTop: 10 },
  ctaSecondaryText: { fontSize: 14, fontWeight: '700' },
  trustRow: { borderTopWidth: 1, marginTop: 18, paddingTop: 14, gap: 10 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { fontSize: 12, fontWeight: '500' },

  // Gallery Modal
  galModal: { flex: 1, backgroundColor: '#000' },
  galHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 16 : 50, paddingBottom: 10, gap: 12 },
  galTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  galCounter: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  galClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  galBody: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  galImg: { width: '100%', height: '100%' },
  galNav: { position: 'absolute', top: '42%', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' } as any,
  galNavLeft: { left: 16 },
  galNavRight: { right: 16 },
  galThumbs: { gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  galThumb: { width: 64, height: 46, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  galThumbImg: { width: '100%', height: '100%' },
});
