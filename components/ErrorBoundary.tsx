import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  children: ReactNode;
  /** Optional custom fallback UI. Overrides the default error screen. */
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Catches render errors in the subtree and shows a recovery screen instead of
 * crashing the whole app. Wrap each major screen or navigator with one of these.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error.message, info.componentStack);
    }
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          {__DEV__
            ? (this.state.error?.message ?? 'Unknown error')
            : 'An unexpected error occurred. Please try again.'}
        </Text>
        <Pressable
          onPress={this.reset}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Try again">
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  emoji: { fontSize: 40 },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#1F8A5B',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
