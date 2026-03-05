import React, { useState, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= photos.length) return;
    setCurrentIndex(idx);
    scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
  };

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_W);
    if (idx >= 0 && idx < photos.length) setCurrentIndex(idx);
  };

  if (!photos.length) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 40, paddingBottom: 12 }}>
          <View>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{currentIndex + 1} / {photos.length}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }} data-testid="close-gallery">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main photo scroll */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            contentOffset={{ x: initialIndex * SCREEN_W, y: 0 }}
          >
            {photos.map((photo, idx) => (
              <View key={idx} style={{ width: SCREEN_W, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 }}>
                <Image
                  source={{ uri: photo }}
                  style={{ width: SCREEN_W - 16, height: SCREEN_H * 0.6, borderRadius: 12 }}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity onPress={() => goTo(currentIndex - 1)} style={{ position: 'absolute', left: 12, top: '50%', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }} data-testid="gallery-prev">
                  <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
              )}
              {currentIndex < photos.length - 1 && (
                <TouchableOpacity onPress={() => goTo(currentIndex + 1)} style={{ position: 'absolute', right: 12, top: '50%', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }} data-testid="gallery-next">
                  <Ionicons name="chevron-forward" size={28} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12, gap: 8, alignItems: 'center' }}>
            {photos.map((photo, idx) => (
              <TouchableOpacity key={idx} onPress={() => goTo(idx)} style={{ borderWidth: 2, borderColor: currentIndex === idx ? '#6C63FF' : 'transparent', borderRadius: 8, overflow: 'hidden' }} data-testid={`gallery-thumb-${idx}`}>
                <Image source={{ uri: photo }} style={{ width: 60, height: 45, borderRadius: 6 }} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
