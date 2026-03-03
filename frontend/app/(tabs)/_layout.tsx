import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

function MyTabBar({ state, descriptors, navigation }: any) {
  const iconMap: Record<string, [string, string]> = {
    index: ['home', 'home-outline'],
    vehicles: ['car', 'car-outline'],
    reservations: ['calendar', 'calendar-outline'],
    profile: ['person', 'person-outline'],
  };

  return (
    <View style={tabStyles.container}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.title || route.name;
        const isFocused = state.index === index;
        const [iconFilled, iconOutline] = iconMap[route.name] || ['ellipse', 'ellipse-outline'];

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={() => {
              if (!isFocused) {
                navigation.navigate(route.name);
              }
            }}
            style={[tabStyles.tab, isFocused && tabStyles.tabActive]}
          >
            <Ionicons
              name={(isFocused ? iconFilled : iconOutline) as any}
              size={24}
              color={isFocused ? '#7C3AED' : '#6B7280'}
            />
            <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <MyTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="vehicles" options={{ title: 'Véhicules' }} />
      <Tabs.Screen name="reservations" options={{ title: 'Locations' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabActive: {
    backgroundColor: '#F3EEFF',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 3,
  },
  labelActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
});
