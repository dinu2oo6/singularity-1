import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, RADIUS } from '../src/utils/theme';

export default function ReceiveScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('user_data').then((d) => { if (d) setUser(JSON.parse(d)); });
  }, []);

  return (
    <SafeAreaView style={styles.container} testID="receive-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <TouchableOpacity testID="receive-back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Receive Money</Text>
          <View style={{ width: 44 }} />
        </Animated.View>

        {/* Share Info */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient colors={['#121826', '#1A2235']} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.cardGlow} />
            <View style={styles.iconCircle}>
              <Ionicons name="arrow-down-circle" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Share Your Details</Text>
            <Text style={styles.cardSub}>Send your email to receive money from anyone on Singularity</Text>

            <View style={styles.emailBox}>
              <Ionicons name="mail" size={20} color={COLORS.primary} />
              <Text style={styles.emailText}>{user?.email || 'Loading...'}</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.infoTitle}>How it works</Text>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
              <Text style={styles.stepText}>Share your email with the sender</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
              <Text style={styles.stepText}>They send money via Singularity app</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
              <Text style={styles.stepText}>Funds arrive instantly in your wallet</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="flash" size={24} color={COLORS.primary} />
            <Text style={styles.featureTitle}>Instant</Text>
            <Text style={styles.featureSub}>Zero wait time</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.cyan} />
            <Text style={styles.featureTitle}>Secure</Text>
            <Text style={styles.featureSub}>Bank-grade encryption</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="globe" size={24} color={COLORS.secondary} />
            <Text style={styles.featureTitle}>Global</Text>
            <Text style={styles.featureSub}>18+ currencies</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bgSubtle, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  pageTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  card: { borderRadius: RADIUS.lg, padding: 28, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', overflow: 'hidden' },
  cardGlow: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.primaryGlow, opacity: 0.1 },
  iconCircle: { marginBottom: 16 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  cardSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emailBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0F141F', paddingHorizontal: 20, paddingVertical: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderActive, width: '100%' },
  emailText: { fontSize: 16, color: COLORS.text, fontWeight: '500', flex: 1 },
  divider: { height: 1, backgroundColor: COLORS.border, width: '100%', marginVertical: 24 },
  infoTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 16, alignSelf: 'flex-start' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, alignSelf: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,255,157,0.15)', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  stepText: { fontSize: 14, color: COLORS.textSecondary },
  features: { flexDirection: 'row', gap: 12 },
  feature: { flex: 1, backgroundColor: COLORS.bgSubtle, borderRadius: RADIUS.md, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border },
  featureTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  featureSub: { fontSize: 11, color: COLORS.textMuted },
});
