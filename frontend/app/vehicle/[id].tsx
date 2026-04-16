import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, useWindowDimensions, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useThemeStore } from '../../src/store/themeStore';
import { getPhotoUrl } from '../../src/utils/photoUrl';
import AvailabilityCalendarModal from '../../src/components/AvailabilityCalendarModal';

const ACCENT = '#7C3AED';

export default function ClientVehicleDetail() {
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
      try { const res = await api.get(`/api/vehicles/${id}`); setVehicle(res.data); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <View style={[st.center, { backgroundColor: C.bg }]}><ActivityIndicator size="large" color={ACCENT} /></View>;
  if (!vehicle) return <View style={[st.center, { backgroundColor: C.bg }]}><Text style={{ color: C.text }}>Vehicule introuvable</Text></View>;

  const photos = vehicle.photos || [];
  const photoUrl = photos[photoIdx] ? getPhotoUrl(photos[photoIdx]) : null;
  const fuelMap: any = { electric: 'Electrique', hybrid: 'Hybride', diesel: 'Diesel', gasoline: 'Essence' };
  const transMap: any = { automatic: 'Automatique', manual: 'Manuelle' };
  const fuelLabel = fuelMap[vehicle.fuel_type] || vehicle.fuel_type;
  const transLabel = transMap[vehicle.transmission] || vehicle.transmission;
  const fakeBookings = Math.floor(Math.random() * 8) + 3;
  const fakeAvail = vehicle.status === 'available' ? Math.floor(Math.random() * 3) + 1 : 0;

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

  const goPhoto = (dir: number) => { const n = photoIdx + dir; if (n >= 0 && n < photos.length) setPhotoIdx(n); };
  const goBook = (prefillDate?: string) => {
    const params = prefillDate ? `?date=${prefillDate}` : '';
    router.push(`/booking/${vehicle.id}${params}` as any);
  };

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      <TouchableOpacity onPress={() => router.back()} style={[st.backBtn, { backgroundColor: C.card, borderColor: C.border }]} data-testid="back-btn">
        <Ionicons name="arrow-back" size={20} color={C.text} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>Retour</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* GALLERY */}
        <View style={isWide ? { paddingHorizontal: width * 0.08 } : { paddingHorizontal: 16 }}>
          <TouchableOpacity onPress={() => setGalleryOpen(true)} activeOpacity={0.9} style={st.mainPhoto}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            ) : (
              <View style={[st.mainPhotoPlaceholder, { backgroundColor: C.card }]}>
                <Ionicons name="car-sport-outline" size={64} color={C.textLight + '40'} />
              </View>
            )}
            {photos.length > 0 && <View style={st.counter}><Ionicons name="camera" size={14} color="#fff" /><Text style={st.counterText}>{photoIdx + 1} / {photos.length}</Text></View>}
            {photoIdx > 0 && <TouchableOpacity onPress={() => goPhoto(-1)} style={[st.nav, { left: 12 }]}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>}
            {photoIdx < photos.length - 1 && <TouchableOpacity onPress={() => goPhoto(1)} style={[st.nav, { right: 12 }]}><Ionicons name="chevron-forward" size={24} color="#fff" /></TouchableOpacity>}
          </TouchableOpacity>
          {photos.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
              {photos.map((ph: string, i: number) => (
                <TouchableOpacity key={i} onPress={() => setPhotoIdx(i)} style={{ width: 72, height: 50, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: i === photoIdx ? ACCENT : 'transparent' }}>
                  <Image source={{ uri: getPhotoUrl(ph) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* CONTENT */}
        <View style={[{ padding: 16 }, isWide && { flexDirection: 'row', paddingHorizontal: width * 0.08, gap: 32 }]}>
          {/* LEFT */}
          <View style={isWide ? { flex: 1 } : {}}>
            {/* Urgency */}
            {vehicle.status === 'available' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <View style={st.urgency}><Ionicons name="flame" size={14} color="#EF4444" /><Text style={st.urgencyText}>{fakeBookings} reservations cette semaine</Text></View>
                <View style={[st.urgency, { backgroundColor: '#F59E0B18' }]}><Ionicons name="time" size={14} color="#F59E0B" /><Text style={[st.urgencyText, { color: '#B45309' }]}>Plus que {fakeAvail} disponible{fakeAvail > 1 ? 's' : ''}</Text></View>
              </View>
            )}

            <Text style={{ fontSize: 14, fontWeight: '500', color: C.textLight, marginBottom: 2 }}>{vehicle.brand} · {vehicle.year}</Text>
            <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -0.5, color: C.text, marginBottom: 10 }}>{vehicle.model}</Text>

            {/* Badges */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              <View style={[st.pill, { backgroundColor: '#10B98118', borderColor: '#10B98140' }]}><Ionicons name="checkmark-circle" size={14} color="#10B981" /><Text style={[st.pillText, { color: '#059669' }]}>Disponible</Text></View>
              <View style={[st.pill, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B40' }]}><Ionicons name="star" size={14} color="#F59E0B" /><Text style={[st.pillText, { color: '#B45309' }]}>Populaire</Text></View>
              <View style={[st.pill, { backgroundColor: ACCENT + '12', borderColor: ACCENT + '30' }]}><Ionicons name="star" size={14} color={ACCENT} /><Text style={[st.pillText, { color: ACCENT }]}>4.8/5</Text></View>
              {vehicle.location && <View style={[st.pill, { backgroundColor: C.bg, borderColor: C.border }]}><Ionicons name="location" size={14} color={C.textLight} /><Text style={[st.pillText, { color: C.textLight }]}>{vehicle.location}</Text></View>}
            </View>

            {/* Specs */}
            <Text style={[st.section, { color: C.text }]}>Caracteristiques</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {specs.map((s, i) => (
                <View key={i} style={[st.specCard, { backgroundColor: C.card, borderColor: C.border }]}>
                  <Ionicons name={s.icon as any} size={22} color={ACCENT} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Description */}
            {vehicle.description && <>
              <Text style={[st.section, { color: C.text }]}>Description</Text>
              <Text style={{ fontSize: 14, lineHeight: 22, color: C.textLight }}>{vehicle.description}</Text>
            </>}

            {/* Conditions */}
            <Text style={[st.section, { color: C.text }]}>Conditions de location</Text>
            <View style={[st.condCard, { backgroundColor: C.card, borderColor: C.border }]}>
              {conditions.map((c, i) => (
                <View key={i} style={[st.condRow, i < conditions.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                  <View style={[st.condIcon, { backgroundColor: ACCENT + '10' }]}><Ionicons name={c.icon as any} size={18} color={ACCENT} /></View>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: C.textLight }}>{c.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{c.value}</Text>
                </View>
              ))}
            </View>

            {/* Reviews */}
            <Text style={[st.section, { color: C.text }]}>Avis clients</Text>
            {reviews.map((r, i) => (
              <View key={i} style={[st.reviewCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={[st.avatar, { backgroundColor: ACCENT + '15' }]}><Text style={{ color: ACCENT, fontSize: 14, fontWeight: '800' }}>{r.name[0]}</Text></View>
                  <View style={{ flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{r.name}</Text><Text style={{ color: C.textLight, fontSize: 11 }}>{r.date}</Text></View>
                  <View style={{ flexDirection: 'row', gap: 2 }}>{[1,2,3,4,5].map(s => <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={14} color="#F59E0B" />)}</View>
                </View>
                <Text style={{ fontSize: 13, lineHeight: 20, color: C.textLight }}>{r.text}</Text>
              </View>
            ))}
          </View>

          {/* RIGHT - Booking Card */}
          <View style={isWide ? { width: 340 } : { marginTop: 24 }}>
            <View style={[st.bookCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: C.textLight }}>A partir de</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontSize: 32, fontWeight: '900', letterSpacing: -0.5, color: C.text }}>CHF {vehicle.price_per_day}</Text>
                <Text style={{ fontSize: 16, fontWeight: '500', color: C.textLight }}> /jour</Text>
              </View>
              <TouchableOpacity style={st.ctaPrim} onPress={() => goBook()} data-testid="reserve-now-btn" activeOpacity={0.85}>
                <Text style={st.ctaPrimText}>Reserver maintenant</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[st.ctaSec, { borderColor: C.border }]} onPress={() => setAvailabilityOpen(true)} data-testid="check-availability-btn" activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={18} color={ACCENT} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: ACCENT }}>Voir la disponibilite</Text>
              </TouchableOpacity>
              <View style={{ borderTopWidth: 1, borderTopColor: C.border, marginTop: 18, paddingTop: 14, gap: 10 }}>
                <View style={st.trust}><Ionicons name="shield-checkmark" size={16} color="#10B981" /><Text style={{ fontSize: 12, fontWeight: '500', color: C.textLight }}>Assurance incluse</Text></View>
                <View style={st.trust}><Ionicons name="close-circle" size={16} color="#10B981" /><Text style={{ fontSize: 12, fontWeight: '500', color: C.textLight }}>Annulation gratuite</Text></View>
                <View style={st.trust}><Ionicons name="flash" size={16} color="#10B981" /><Text style={{ fontSize: 12, fontWeight: '500', color: C.textLight }}>Confirmation instantanee</Text></View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* AVAILABILITY CALENDAR */}
      <AvailabilityCalendarModal
        visible={availabilityOpen}
        vehicleId={vehicle.id}
        vehicleName={`${vehicle.brand} ${vehicle.model}`}
        onClose={() => setAvailabilityOpen(false)}
        onSelectDate={(date) => goBook(date)}
        colors={C}
      />

      {/* FULLSCREEN GALLERY */}
      <Modal visible={galleryOpen} transparent animationType="fade" onRequestClose={() => setGalleryOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 16 : 50, paddingBottom: 10, gap: 12 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 }}>{vehicle.brand} {vehicle.model}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }}>{photoIdx + 1} / {photos.length}</Text>
            <TouchableOpacity onPress={() => setGalleryOpen(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            {photos[photoIdx] && <Image source={{ uri: getPhotoUrl(photos[photoIdx]) }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />}
            {photoIdx > 0 && <TouchableOpacity onPress={() => goPhoto(-1)} style={[st.galNav, { left: 16 }]}><Ionicons name="chevron-back" size={32} color="#fff" /></TouchableOpacity>}
            {photoIdx < photos.length - 1 && <TouchableOpacity onPress={() => goPhoto(1)} style={[st.galNav, { right: 16 }]}><Ionicons name="chevron-forward" size={32} color="#fff" /></TouchableOpacity>}
          </View>
          {photos.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 14 }}>
              {photos.map((ph: string, i: number) => (
                <TouchableOpacity key={i} onPress={() => setPhotoIdx(i)} style={{ width: 64, height: 46, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: i === photoIdx ? '#fff' : 'transparent' }}>
                  <Image source={{ uri: getPhotoUrl(ph) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start', margin: 16 },
  mainPhoto: { width: '100%', height: 380, borderRadius: 16, overflow: 'hidden', position: 'relative', backgroundColor: '#F8FAFC' },
  mainPhotoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  counter: { position: 'absolute', bottom: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  counterText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  nav: { position: 'absolute', top: '42%', width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' } as any,
  urgency: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EF444412', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  urgencyText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: '600' },
  section: { fontSize: 18, fontWeight: '800', marginBottom: 12, marginTop: 24 },
  specCard: { alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, minWidth: 100 },
  condCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  condRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  condIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  reviewCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  bookCard: { borderRadius: 16, borderWidth: 1, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' } as any,
  ctaPrim: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 12, marginTop: 20 },
  ctaPrimText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  ctaSec: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, marginTop: 10 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  galNav: { position: 'absolute', top: '42%', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' } as any,
});
