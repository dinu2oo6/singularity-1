import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withDelay, withSequence, Easing, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/utils/theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0);
  const ring2Opacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslate = useSharedValue(30);
  const taglineOpacity = useSharedValue(0);
  const bgGlow = useSharedValue(0);

  useEffect(() => {
    // Animate sequence
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    logoOpacity.value = withTiming(1, { duration: 600 });
    
    ringScale.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 80 }));
    ringOpacity.value = withDelay(200, withTiming(0.6, { duration: 800 }));
    
    ring2Scale.value = withDelay(400, withSpring(1, { damping: 15, stiffness: 60 }));
    ring2Opacity.value = withDelay(400, withTiming(0.3, { duration: 800 }));
    
    bgGlow.value = withDelay(300, withTiming(1, { duration: 1000 }));
    
    textOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    textTranslate.value = withDelay(600, withSpring(0, { damping: 15 }));
    
    taglineOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));

    // Navigate after splash
    const timer = setTimeout(async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslate.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: bgGlow.value * 0.4,
  }));

  return (
    <View style={styles.container} testID="splash-screen">
      {/* Background glow */}
      <Animated.View style={[styles.bgGlow, glowStyle]}>
        <LinearGradient
          colors={['transparent', COLORS.primaryGlow, 'transparent']}
          style={styles.bgGlowGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Rings */}
      <Animated.View style={[styles.ring, styles.ring2, ring2Style]} />
      <Animated.View style={[styles.ring, ringStyle]} />

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.cyan]}
          style={styles.logoGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.logoText}>S</Text>
        </LinearGradient>
      </Animated.View>

      {/* Title */}
      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.title}>SINGULARITY</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={taglineStyle}>
        <Text style={styles.tagline}>Beyond Borders. Beyond Limits.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgGlow: {
    position: 'absolute',
    width: width * 2,
    height: height,
  },
  bgGlowGradient: {
    flex: 1,
  },
  ring: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  ring2: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderColor: COLORS.secondary,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 32,
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.primaryFg,
    letterSpacing: -2,
  },
  textContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
});
