import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/contexts/AppThemeContext';

type Props = ViewProps & {
  children: React.ReactNode;
  padded?: boolean;
};

export function SectionContainer({ children, padded = true, style, ...rest }: Props) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
        padded && styles.padded,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  padded: { padding: 16 },
});
