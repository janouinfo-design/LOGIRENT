import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useI18n, Lang } from '../i18n';

const LANGS: Lang[] = ['fr', 'en', 'de'];

export function LanguageSelector({
  color = '#111827',
  activeColor = '#7C3AED',
  activeTextColor = '#FFFFFF',
  compact = false,
}: { color?: string; activeColor?: string; activeTextColor?: string; compact?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <View style={s.row} data-testid="language-selector">
      {LANGS.map((l) => {
        const active = lang === l;
        return (
          <TouchableOpacity
            key={l}
            onPress={() => setLang(l)}
            style={[
              s.btn,
              compact && s.btnCompact,
              { borderColor: active ? activeColor : color + '55' },
              active && { backgroundColor: activeColor },
            ]}
            testID={`lang-${l}`}
          >
            <Text
              style={[
                s.txt,
                compact && s.txtCompact,
                { color: active ? activeTextColor : color, opacity: active ? 1 : 0.85 },
              ]}
            >
              {l.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  btn: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5 },
  btnCompact: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 14 },
  txt: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  txtCompact: { fontSize: 11 },
});
