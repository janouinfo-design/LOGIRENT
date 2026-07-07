import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useI18n, Lang } from '../i18n';

const LANGS: Lang[] = ['fr', 'en', 'de'];

export function LanguageSelector({ color = '#111827', activeColor = '#7C3AED', compact = false }: { color?: string; activeColor?: string; compact?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <View style={s.row} data-testid="language-selector">
      {LANGS.map((l) => (
        <TouchableOpacity
          key={l}
          onPress={() => setLang(l)}
          style={[s.btn, compact && s.btnCompact, lang === l && { backgroundColor: activeColor + '1F' }]}
          testID={`lang-${l}`}
        >
          <Text style={[s.txt, { color: lang === l ? activeColor : color, opacity: lang === l ? 1 : 0.55 }, compact && { fontSize: 10 }, lang === l && s.txtActive]}>
            {l.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btn: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  btnCompact: { paddingHorizontal: 4, paddingVertical: 3 },
  txt: { fontSize: 12, fontWeight: '600' },
  txtActive: { fontWeight: '800' },
});
