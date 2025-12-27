import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface TypingIndicatorProps {
  typingUsers: Map<string, { status: 'active' | 'paused' | 'done'; timestamp: number }>;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  const { colors } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));

  // Get list of users who are actively typing
  const activeTypers = Array.from(typingUsers.entries())
    .filter(([_, data]) => data.status === 'active')
    .map(([nick]) => nick);

  useEffect(() => {
    if (activeTypers.length > 0) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [activeTypers.length, fadeAnim]);

  if (activeTypers.length === 0) {
    return null;
  }

  // Format the typing message
  let typingText = '';
  if (activeTypers.length === 1) {
    typingText = `${activeTypers[0]} is typing...`;
  } else if (activeTypers.length === 2) {
    typingText = `${activeTypers[0]} and ${activeTypers[1]} are typing...`;
  } else if (activeTypers.length === 3) {
    typingText = `${activeTypers[0]}, ${activeTypers[1]}, and ${activeTypers[2]} are typing...`;
  } else {
    typingText = `${activeTypers[0]}, ${activeTypers[1]}, and ${activeTypers.length - 2} others are typing...`;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          opacity: fadeAnim,
        }
      ]}
    >
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {typingText}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginRight: 8,
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  text: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
