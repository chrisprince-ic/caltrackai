import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  IDEA_SORT_OPTIONS,
  type IdeaSortId,
} from '@/constants/mealCategories';
import { Fonts } from '@/constants/theme';
import { Palette } from '@/constants/palette';
import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  sort: IdeaSortId;
  onSelect: (id: IdeaSortId) => void;
};

export function MealPlanSortSheet({ visible, onClose, sort, onSelect }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.38)' }]}
          onPress={onClose}
          accessibilityLabel="Dismiss sort"
        />
        <View
          style={[
            styles.sheet,
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
              maxHeight: height * 0.45,
            },
          ]}
          accessibilityViewIsModal>
        <View style={styles.grabberWrap}>
          <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
        </View>
        <Text style={[styles.sheetTitle, { color: colors.text }]}>Sort ideas</Text>
        {IDEA_SORT_OPTIONS.map((opt) => {
          const active = opt.id === sort;
          return (
            <Pressable
              key={opt.id}
              onPress={() => {
                onSelect(opt.id);
                onClose();
              }}
              style={({ pressed }) => [
                styles.optionRow,
                { borderBottomColor: colors.border },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
              {active ? (
                <Ionicons name="checkmark-circle" size={22} color={Palette.iris} />
              ) : (
                <View style={{ width: 22 }} />
              )}
            </Pressable>
          );
        })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  grabberWrap: { alignItems: 'center', paddingVertical: 6 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  sheetTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: { fontFamily: Fonts.medium, fontSize: 16 },
});
