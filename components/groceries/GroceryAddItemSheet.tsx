import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AISLE_ORDER,
  AISLE_VISUAL,
  type GroceryAisleId,
} from '@/constants/aisleCategories';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialName?: string;
  onSave: (payload: { name: string; qty: string; aisle: GroceryAisleId }) => void;
};

export function GroceryAddItemSheet({ visible, onClose, initialName = '', onSave }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [name, setName] = useState(initialName);
  const [qty, setQty] = useState('');
  const [aisle, setAisle] = useState<GroceryAisleId>('other');

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setQty('');
      setAisle('other');
    }
  }, [visible, initialName]);

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    onSave({ name: n, qty: qty.trim(), aisle });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.38)' }]}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
              maxHeight: height * 0.88,
            },
          ]}>
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Add custom item</Text>

          <Text style={[styles.label, { color: colors.textMuted }]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Bell peppers"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Quantity (optional)</Text>
          <TextInput
            value={qty}
            onChangeText={setQty}
            placeholder="e.g. 2 lb"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Aisle</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.aisleScroll}>
            {AISLE_ORDER.map((id) => {
              const meta = AISLE_VISUAL[id];
              const active = aisle === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setAisle(id)}
                  style={[
                    styles.aisleChip,
                    {
                      borderColor: active ? meta.hex : colors.border,
                      backgroundColor: active ? meta.hex : colors.surface,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.aisleChipText,
                      { color: active ? '#FFFFFF' : colors.text },
                    ]}
                    numberOfLines={1}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={submit}
            disabled={!name.trim()}
            style={({ pressed }) => [
              styles.saveBtn,
              !name.trim() && { opacity: 0.45 },
              pressed && name.trim() && { opacity: 0.92 },
            ]}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  grabberRow: { alignItems: 'center', paddingVertical: 6 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  title: { fontFamily: Fonts.semiBold, fontSize: 18, marginBottom: 8 },
  label: { fontFamily: Fonts.medium, fontSize: 12, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 15,
  },
  aisleScroll: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  aisleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  aisleChipText: { fontFamily: Fonts.semiBold, fontSize: 12 },
  saveBtn: {
    marginTop: 12,
    backgroundColor: Palette.iris,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: Palette.white },
});
