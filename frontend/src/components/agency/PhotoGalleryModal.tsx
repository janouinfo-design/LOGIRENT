import React, { useState, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ScrollView, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPhotoUrl } from './vehicleTypes';

interface Props {
  visible: boolean;
  photos: string[];
  title: string;
  initialIndex?: number;
  onClose: () => void;
}

export default function PhotoGalleryModal({ visible, photos, title, initialIndex = 0, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);
  const { width: SW, height: SH } = Dimensions.get('window');

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= photos.length) return;
    setCurrentIndex(idx);
    scrollRef.current?.scrollTo({ x: idx * SW, animated: true });
  };

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SW);
    if (idx >= 0 && idx < photos.length) setCurrentIndex(idx);
  };

  if (!photos.length) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 12 : 40, paddingBottom: 8, zIndex: 10 }}>
          <View>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{currentIndex + 1} / {photos.length}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }} data-testid="close-gallery">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main photo - takes all remaining space */}
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            contentOffset={{ x: initialIndex * SW, y: 0 }}
            style={{ flex: 1 }}
          >
            {photos.map((photo, idx) => (
              <View key={idx} style={{ width: SW, flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8 }}>
                <Image
                  source={{ uri: getPhotoUrl(photo) }}
                  style={{ width: SW - 16, flex: 1 }}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity onPress={() => goTo(currentIndex - 1)} style={{ position: 'absolute', left: 12, top: '45%', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }} data-testid="gallery-prev">
                  <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
              )}
              {currentIndex < photos.length - 1 && (
                <TouchableOpacity onPress={() => goTo(currentIndex + 1)} style={{ position: 'absolute', right: 12, top: '45%', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }} data-testid="gallery-next">
                  <Ionicons name="chevron-forward" size={28} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8, gap: 8, alignItems: 'center' }}>
            {photos.map((photo, idx) => (
              <TouchableOpacity key={idx} onPress={() => goTo(idx)} style={{ borderWidth: 2, borderColor: currentIndex === idx ? '#7C3AED' : 'transparent', borderRadius: 8, overflow: 'hidden' }} data-testid={`gallery-thumb-${idx}`}>
                <Image source={{ uri: getPhotoUrl(photo) }} style={{ width: 60, height: 45, borderRadius: 6 }} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
