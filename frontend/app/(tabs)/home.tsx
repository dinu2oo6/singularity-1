import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, Image } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeIn, SlideInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { COLORS, SPACING, RADIUS } from '../../src/utils/theme';
import { apiCall, formatCurrency, formatNumber } from '../../src/utils/api';

const { width } = Dimensions.get('window');

function MiniChart({ data, color, w = 120, h = 40 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const pathD = `M${points.join(' L')}`;
  const fillD = `${pathD} L${w},${h} L0,${h} Z`;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgGrad id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgGrad>
      </Defs>
      <Path d={fillD} fill="url(#grad)" />
      <Path d={pathD} stroke={color} strokeWidth="2" fill="none" />
    </Svg>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [cryptoPrices, setCryptoPrices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [walletData, pricesData, txData] = await Promise.all([
        apiCall('/wallet/balance').catch(() => ({ wallet: { balance_usd: 0 } })),
        apiCall('/crypto/prices'),
        apiCall('/transfer/history').catch(() => ({ transactions: [] })),
      ]);
      setWallet(walletData.wallet);
      setCryptoPrices(pricesData.coins?.slice(0, 6) || []);
      setTransactions(txData.transactions?.slice(0, 5) || []);
    } catch (e) { console.log('Load error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return <SafeAreaView style={styles.container}><View style={styles.loadingWrap}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} testID="home-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
          <TouchableOpacity testID="notifications-btn" style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient colors={['#0D1A2D', '#152236', '#1A2840']} style={styles.balanceCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.balanceGlow1} />
            <View style={styles.balanceGlow2} />
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(wallet?.balance_usd || 0)}</Text>
            <View style={styles.balanceActions}>
              <TouchableOpacity testID="send-money-btn" style={styles.balanceAction} onPress={() => router.push('/send')}>
                <LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={styles.actionIcon}>
                  <Ionicons name="arrow-up" size={20} color={COLORS.primaryFg} />
                </LinearGradient>
                <Text style={styles.actionText}>Send</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="receive-money-btn" style={styles.balanceAction} onPress={() => router.push('/receive')}>
                <View style={[styles.actionIcon, styles.actionIconOutline]}>
                  <Ionicons name="arrow-down" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.actionText}>Receive</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="topup-home-btn" style={styles.balanceAction} onPress={() => router.push('/(tabs)/wallet')}>
                <View style={[styles.actionIcon, styles.actionIconOutline]}>
                  <Ionicons name="add" size={20} color={COLORS.cyan} />
                </View>
                <Text style={styles.actionText}>Top Up</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="trade-home-btn" style={styles.balanceAction} onPress={() => router.push('/(tabs)/trade')}>
                <View style={[styles.actionIcon, styles.actionIconOutline]}>
                  <MaterialCommunityIcons name="swap-horizontal" size={20} color={COLORS.orange} />
                </View>
                <Text style={styles.actionText}>Trade</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Market Overview */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Market Overview</Text>
            <TouchableOpacity testID="see-all-market-btn" onPress={() => router.push('/(tabs)/trade')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.marketScroll}>
            {cryptoPrices.map((coin, i) => {
              const isUp = (coin.price_change_24h || 0) >= 0;
              const chartColor = isUp ? COLORS.primary : COLORS.error;
              const sparkData = (coin.sparkline || []).slice(-40);
              return (
                <Animated.View key={coin.id} entering={SlideInRight.delay(80 * i).springify()}>
                  <TouchableOpacity style={styles.marketCard} activeOpacity={0.7} onPress={() => router.push('/(tabs)/trade')}>
                    <View style={styles.mcHeader}>
                      {coin.image ? (
                        <Image source={{ uri: coin.image }} style={styles.coinImgSm} />
                      ) : (
                        <View style={styles.coinAvatarSm}><Text style={styles.coinAvatarText}>{coin.symbol?.slice(0, 2)}</Text></View>
                      )}
                      <View style={[styles.changeBadge, { backgroundColor: isUp ? 'rgba(0,255,157,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                        <Text style={[styles.changeText, { color: isUp ? COLORS.success : COLORS.error }]}>
                          {isUp ? '+' : ''}{(coin.price_change_24h || 0).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.mcName}>{coin.name}</Text>
                    <Text style={styles.mcPrice}>${(coin.current_price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
                    <View style={styles.mcChart}>
                      <MiniChart data={sparkData} color={chartColor} w={130} h={36} />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          {transactions.length === 0 ? (
            <View style={styles.emptyTx}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Start by topping up your wallet</Text>
            </View>
          ) : (
            transactions.map((tx, i) => {
              const isCredit = tx.type === 'topup' || tx.type === 'crypto_sell';
              return (
                <Animated.View key={tx.id} entering={FadeInDown.delay(50 * i)}>
                  <View style={styles.txItem}>
                    <View style={[styles.txIcon, { backgroundColor: tx.type === 'topup' ? 'rgba(0,255,157,0.1)' : tx.type === 'send' ? 'rgba(0,240,255,0.1)' : 'rgba(112,0,255,0.1)' }]}>
                      <Ionicons name={tx.type === 'topup' ? 'add-circle' : tx.type === 'send' ? 'arrow-up-circle' : 'swap-horizontal'} size={22} color={tx.type === 'topup' ? COLORS.success : tx.type === 'send' ? COLORS.cyan : COLORS.secondary} />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle}>{tx.description || tx.type?.replace(/_/g, ' ')}</Text>
                      <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isCredit ? COLORS.success : COLORS.error }]}>
                      {isCredit ? '+' : '-'}${(tx.amount_usd || tx.amount || 0).toFixed(2)}
                    </Text>
                  </View>
                </Animated.View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 14, color: COLORS.textSecondary },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bgSubtle, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  balanceCard: { borderRadius: 20, padding: 24, marginBottom: 28, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  balanceGlow1: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.primaryGlow, opacity: 0.15 },
  balanceGlow2: { position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.secondaryGlow, opacity: 0.1 },
  balanceLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  balanceAmount: { fontSize: 42, fontWeight: '700', color: COLORS.text, marginBottom: 24, letterSpacing: -1 },
  balanceActions: { flexDirection: 'row', justifyContent: 'space-around' },
  balanceAction: { alignItems: 'center', gap: 8 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actionIconOutline: { backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border },
  actionText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  seeAll: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  marketScroll: { gap: 12, paddingRight: 20, marginBottom: 28 },
  marketCard: { width: 160, backgroundColor: COLORS.bgSubtle, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  mcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  coinAvatarSm: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,255,157,0.1)', alignItems: 'center', justifyContent: 'center' },
  coinImgSm: { width: 32, height: 32, borderRadius: 16 },
  coinAvatarText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  changeText: { fontSize: 11, fontWeight: '600' },
  mcName: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  mcPrice: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  mcChart: { overflow: 'hidden', borderRadius: 4 },
  emptyTx: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '500' },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  txIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, textTransform: 'capitalize' },
  txDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '600' },
});
