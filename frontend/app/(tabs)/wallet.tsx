import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../src/utils/theme';
import { apiCall, formatCurrency } from '../../src/utils/api';

const COUNTRY_FLAGS: Record<string, string> = { US: '🇺🇸', EU: '🇪🇺', GB: '🇬🇧', IN: '🇮🇳', JP: '🇯🇵', CA: '🇨🇦', AU: '🇦🇺', MX: '🇲🇽', PH: '🇵🇭', BR: '🇧🇷', NG: '🇳🇬', KE: '🇰🇪', CN: '🇨🇳', KR: '🇰🇷', SG: '🇸🇬', AE: '🇦🇪', CH: '🇨🇭', ZA: '🇿🇦' };
const METHOD_ICONS: Record<string, string> = { singularity: 'flash', paypal: 'logo-paypal', bank: 'business', interac: 'swap-horizontal' };

export default function WalletScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [wallet, setWallet] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [walletData, benData, watchData] = await Promise.all([
        apiCall('/wallet/balance'),
        apiCall('/transfer/beneficiaries').catch(() => ({ beneficiaries: [] })),
        apiCall('/wallet/watchlist').catch(() => ({ watchlist: [] })),
      ]);
      setWallet(walletData.wallet);
      setPortfolio(walletData.crypto_portfolio || []);
      setBeneficiaries(benData.beneficiaries || []);
      setWatchlist(watchData.watchlist || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const sessionId = params.session_id as string;
    if (sessionId) {
      let attempts = 0;
      const poll = async () => {
        if (attempts >= 5) return;
        attempts++;
        try {
          const status = await apiCall(`/wallet/topup/status/${sessionId}`);
          if (status.payment_status === 'paid') {
            Alert.alert('Success', `$${status.amount.toFixed(2)} added to your wallet!`);
            loadData();
            return;
          }
        } catch (e) { console.log(e); }
        setTimeout(poll, 2000);
      };
      poll();
    }
  }, [params.session_id]);

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount < 1 || amount > 10000) { Alert.alert('Error', 'Enter amount between $1 and $10,000'); return; }
    setTopupLoading(true);
    try {
      const originUrl = typeof window !== 'undefined' ? window.location.origin : process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const data = await apiCall('/wallet/topup', { method: 'POST', body: { amount, origin_url: originUrl } });
      if (data.url) {
        if (typeof window !== 'undefined') { window.location.href = data.url; } else { await Linking.openURL(data.url); }
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setTopupLoading(false); }
  };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.loadingWrap}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} testID="wallet-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <Text style={styles.pageTitle}>Wallet</Text>
          </Animated.View>

          {/* Balance Card */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <LinearGradient colors={['#0D1A2D', '#162236', '#1A2840']} style={styles.balanceCard}>
              <View style={styles.glow1} />
              <View style={styles.glow2} />
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(wallet?.balance_usd || 0)}</Text>
              <View style={styles.currencyRow}>
                <View style={styles.currencyTag}><Text style={styles.currencyText}>USD</Text></View>
                <Text style={styles.walletId}>ID: {wallet?.id?.slice(0, 8)}...</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Beneficiaries */}
          {beneficiaries.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Frequent Contacts</Text>
                <TouchableOpacity onPress={() => router.push('/send')}><Text style={styles.seeAll}>Send</Text></TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.benScroll}>
                {beneficiaries.map((ben, i) => (
                  <Animated.View key={ben.id} entering={FadeInRight.delay(50 * i).springify()}>
                    <TouchableOpacity style={styles.benCard} onPress={() => router.push({ pathname: '/send', params: { email: ben.email, country: ben.country, currency: ben.currency } })}>
                      <View style={styles.benAvatar}>
                        <Text style={styles.benAvatarText}>{ben.name?.[0]?.toUpperCase() || '?'}</Text>
                      </View>
                      <Text style={styles.benName} numberOfLines={1}>{ben.name}</Text>
                      <View style={styles.benMeta}>
                        <Text style={styles.benFlag}>{COUNTRY_FLAGS[ben.country] || '🌍'}</Text>
                        <Ionicons name={(METHOD_ICONS[ben.method] || 'flash') as any} size={12} color={COLORS.textMuted} />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Top Up */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text style={styles.sectionTitle}>Top Up Wallet</Text>
            <View style={styles.topupCard}>
              <View style={styles.topupInputRow}>
                <Text style={styles.topupDollar}>$</Text>
                <TextInput testID="topup-amount-input" style={styles.topupInput} value={topupAmount} onChangeText={setTopupAmount} keyboardType="decimal-pad" placeholder="Enter amount" placeholderTextColor={COLORS.textMuted} />
              </View>
              <View style={styles.quickTopups}>
                {[25, 50, 100, 250, 500, 1000].map((a) => (
                  <TouchableOpacity key={a} style={[styles.quickTopBtn, topupAmount === String(a) && styles.quickTopBtnActive]} onPress={() => setTopupAmount(String(a))}>
                    <Text style={[styles.quickTopText, topupAmount === String(a) && styles.quickTopTextActive]}>${a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity testID="topup-submit-btn" onPress={handleTopup} disabled={topupLoading}>
                <LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={styles.topupBtn}>
                  {topupLoading ? <ActivityIndicator color={COLORS.primaryFg} /> : (
                    <>
                      <Ionicons name="card" size={18} color={COLORS.primaryFg} />
                      <Text style={styles.topupBtnText}>Pay with Stripe</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Watchlist */}
          {watchlist.length > 0 && (
            <Animated.View entering={FadeInDown.delay(250).springify()}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Watchlist</Text>
              </View>
              {watchlist.map((item) => (
                <View key={item.id || item.coin_id} style={styles.watchItem}>
                  <View style={styles.watchAvatar}><Text style={styles.watchAvatarText}>{item.symbol?.slice(0, 2)}</Text></View>
                  <View style={styles.watchInfo}>
                    <Text style={styles.watchName}>{item.name}</Text>
                    <Text style={styles.watchSymbol}>{item.symbol}</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/trade')}>
                    <Ionicons name="trending-up" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Crypto Holdings */}
          {portfolio.length > 0 && (
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <Text style={styles.sectionTitle}>Crypto Holdings</Text>
              {portfolio.map((p) => (
                <View key={p.id || p.coin_id} style={styles.holdingItem}>
                  <View style={styles.holdingAvatar}><Text style={styles.holdingAvatarText}>{p.coin_id?.slice(0, 2).toUpperCase()}</Text></View>
                  <View style={styles.holdingInfo}>
                    <Text style={styles.holdingName}>{p.coin_id?.toUpperCase()}</Text>
                    <Text style={styles.holdingAmount}>{p.amount?.toFixed(6)} coins</Text>
                  </View>
                  <Text style={styles.holdingValue}>${p.total_invested_usd?.toFixed(2)}</Text>
                </View>
              ))}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  balanceCard: { borderRadius: 20, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  glow1: { position: 'absolute', top: -40, left: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.primaryGlow, opacity: 0.12 },
  glow2: { position: 'absolute', bottom: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.secondaryGlow, opacity: 0.08 },
  balanceLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  balanceAmount: { fontSize: 44, fontWeight: '700', color: COLORS.text, marginBottom: 16, letterSpacing: -1 },
  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currencyTag: { backgroundColor: 'rgba(0,255,157,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  currencyText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  walletId: { fontSize: 12, color: COLORS.textMuted },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  seeAll: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  // Beneficiaries
  benScroll: { gap: 12, paddingRight: 10, marginBottom: 24 },
  benCard: { width: 80, alignItems: 'center', gap: 6 },
  benAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,255,157,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,255,157,0.2)' },
  benAvatarText: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  benName: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', textAlign: 'center' },
  benMeta: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  benFlag: { fontSize: 12 },
  // Top Up
  topupCard: { backgroundColor: COLORS.bgSubtle, borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  topupInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0E17', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, height: 64, marginBottom: 16 },
  topupDollar: { fontSize: 28, fontWeight: '700', color: COLORS.primary, paddingLeft: 16 },
  topupInput: { flex: 1, fontSize: 28, fontWeight: '700', color: COLORS.text, paddingHorizontal: 8, height: 64 },
  quickTopups: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickTopBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0A0E17', borderWidth: 1, borderColor: COLORS.border },
  quickTopBtnActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(0,255,157,0.1)' },
  quickTopText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  quickTopTextActive: { color: COLORS.primary },
  topupBtn: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  topupBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primaryFg },
  // Watchlist
  watchItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  watchAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,240,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  watchAvatarText: { fontSize: 12, fontWeight: '700', color: COLORS.cyan },
  watchInfo: { flex: 1 },
  watchName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  watchSymbol: { fontSize: 12, color: COLORS.textMuted },
  // Holdings
  holdingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  holdingAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,179,64,0.1)', alignItems: 'center', justifyContent: 'center' },
  holdingAvatarText: { fontSize: 12, fontWeight: '700', color: COLORS.warning },
  holdingInfo: { flex: 1 },
  holdingName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  holdingAmount: { fontSize: 12, color: COLORS.textMuted },
  holdingValue: { fontSize: 16, fontWeight: '600', color: COLORS.text },
});
