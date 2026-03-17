import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, Dimensions, Image } from 'react-native';
import Animated, { FadeInDown, FadeInUp, SlideInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import { COLORS, RADIUS } from '../../src/utils/theme';
import { apiCall, formatNumber } from '../../src/utils/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 72;
const CHART_H = 180;

function PriceChart({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return <View style={{ height: CHART_H }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = CHART_W / (data.length - 1);
  const points = data.map((v, i) => ({ x: i * step, y: CHART_H - ((v - min) / range) * (CHART_H - 20) - 10 }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const fillD = `${pathD} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  const lastPoint = points[points.length - 1];
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
    y: CHART_H - pct * (CHART_H - 20) - 10,
    label: `$${(min + pct * range).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
  }));

  return (
    <Svg width={CHART_W} height={CHART_H + 10}>
      <Defs>
        <SvgGrad id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.25" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgGrad>
      </Defs>
      {gridLines.map((g, i) => (
        <React.Fragment key={i}>
          <Line x1={0} y1={g.y} x2={CHART_W} y2={g.y} stroke={COLORS.border} strokeWidth="0.5" strokeDasharray="4,4" />
          <SvgText x={CHART_W - 2} y={g.y - 4} fill={COLORS.textMuted} fontSize="9" textAnchor="end">{g.label}</SvgText>
        </React.Fragment>
      ))}
      <Path d={fillD} fill="url(#chartGrad)" />
      <Path d={pathD} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill={color} />
      <Circle cx={lastPoint.x} cy={lastPoint.y} r="8" fill={color} opacity="0.3" />
    </Svg>
  );
}

export default function TradeScreen() {
  const [coins, setCoins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedCoin, setExpandedCoin] = useState<string | null>(null);

  const loadPrices = useCallback(async () => {
    try {
      const data = await apiCall('/crypto/prices');
      setCoins(data.coins || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadPrices(); const i = setInterval(loadPrices, 120000); return () => clearInterval(i); }, []);

  const handleTrade = async () => {
    if (!selectedCoin || !amount || parseFloat(amount) <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    setTradeLoading(true);
    try {
      const data = await apiCall('/crypto/trade', {
        method: 'POST',
        body: { coin_id: selectedCoin.id, amount_usd: parseFloat(amount), action: tradeAction },
      });
      Alert.alert('Success', `${tradeAction === 'buy' ? 'Bought' : 'Sold'} ${data.trade.coin_amount.toFixed(6)} ${selectedCoin.symbol} for $${parseFloat(amount).toFixed(2)}`);
      setShowModal(false);
      setAmount('');
      loadPrices();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setTradeLoading(false); }
  };

  const openTrade = (coin: any, action: 'buy' | 'sell') => {
    setSelectedCoin(coin);
    setTradeAction(action);
    setAmount('');
    setShowModal(true);
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><View style={styles.loadingWrap}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} testID="trade-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPrices(); }} tintColor={COLORS.primary} />}>
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <Text style={styles.pageTitle}>Markets</Text>
          <Text style={styles.pageSub}>Live prices from CoinGecko</Text>
        </Animated.View>

        {/* Market Stats */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Active Coins</Text>
            <Text style={styles.statValue}>{coins.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Top Gainer</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {coins.sort((a, b) => (b.price_change_24h || 0) - (a.price_change_24h || 0))[0]?.symbol || '-'}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>24h Volume</Text>
            <Text style={styles.statValue}>${formatNumber(coins.reduce((s, c) => s + (c.total_volume || 0), 0))}</Text>
          </View>
        </Animated.View>

        {/* Coin Cards */}
        {coins.map((coin, i) => {
          const isUp = (coin.price_change_24h || 0) >= 0;
          const chartColor = isUp ? COLORS.primary : COLORS.error;
          const sparkData = (coin.sparkline || []).slice(-60);
          const isExpanded = expandedCoin === coin.id;
          return (
            <Animated.View key={coin.id} entering={FadeInDown.delay(40 * i).springify()}>
              <TouchableOpacity style={styles.coinCard} activeOpacity={0.9} onPress={() => setExpandedCoin(isExpanded ? null : coin.id)}>
                {/* Header */}
                <View style={styles.coinHeader}>
                  <View style={styles.coinLeft}>
                    {coin.image ? (
                      <Image source={{ uri: coin.image }} style={styles.coinImg} />
                    ) : (
                      <View style={[styles.coinAvatar, { backgroundColor: `${chartColor}15` }]}>
                        <Text style={[styles.coinAvatarText, { color: chartColor }]}>{coin.symbol?.slice(0, 2)}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.coinName}>{coin.name}</Text>
                      <Text style={styles.coinSymbol}>{coin.symbol}</Text>
                    </View>
                  </View>
                  <View style={styles.coinRight}>
                    <Text style={styles.coinPrice}>${(coin.current_price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
                    <View style={[styles.changePill, { backgroundColor: isUp ? 'rgba(0,255,157,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                      <Ionicons name={isUp ? 'caret-up' : 'caret-down'} size={12} color={isUp ? COLORS.success : COLORS.error} />
                      <Text style={[styles.changePillText, { color: isUp ? COLORS.success : COLORS.error }]}>
                        {Math.abs(coin.price_change_24h || 0).toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Chart */}
                <View style={styles.chartWrap}>
                  <PriceChart data={sparkData} color={chartColor} />
                </View>

                {/* Time labels */}
                <View style={styles.timeLabels}>
                  {['1h', '24h', '7d'].map((t) => {
                    const val = t === '1h' ? coin.price_change_1h : t === '24h' ? coin.price_change_24h : coin.price_change_7d;
                    const up = (val || 0) >= 0;
                    return (
                      <View key={t} style={styles.timeBadge}>
                        <Text style={styles.timeBadgeLabel}>{t}</Text>
                        <Text style={[styles.timeBadgeValue, { color: up ? COLORS.success : COLORS.error }]}>
                          {up ? '+' : ''}{(val || 0).toFixed(1)}%
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Trade Buttons */}
                <View style={styles.tradeButtons}>
                  <TouchableOpacity testID={`buy-${coin.id}-btn`} style={styles.buyBtn} onPress={() => openTrade(coin, 'buy')}>
                    <LinearGradient colors={['rgba(0,255,157,0.2)', 'rgba(0,255,157,0.05)']} style={styles.tradeBtnGrad}>
                      <Ionicons name="arrow-down" size={16} color={COLORS.primary} />
                      <Text style={styles.buyBtnText}>Buy</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity testID={`sell-${coin.id}-btn`} style={styles.sellBtn} onPress={() => openTrade(coin, 'sell')}>
                    <LinearGradient colors={['rgba(255,59,48,0.15)', 'rgba(255,59,48,0.03)']} style={styles.tradeBtnGrad}>
                      <Ionicons name="arrow-up" size={16} color={COLORS.error} />
                      <Text style={styles.sellBtnText}>Sell</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Stats */}
                {isExpanded && (
                  <Animated.View entering={FadeInDown.duration(200)} style={styles.expandedStats}>
                    <View style={styles.statRow}>
                      <Text style={styles.eStatLabel}>Market Cap</Text>
                      <Text style={styles.eStatValue}>${formatNumber(coin.market_cap || 0)}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.eStatLabel}>24h Volume</Text>
                      <Text style={styles.eStatValue}>${formatNumber(coin.total_volume || 0)}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.eStatLabel}>24h High</Text>
                      <Text style={[styles.eStatValue, { color: COLORS.success }]}>${(coin.high_24h || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.eStatLabel}>24h Low</Text>
                      <Text style={[styles.eStatValue, { color: COLORS.error }]}>${(coin.low_24h || 0).toLocaleString()}</Text>
                    </View>
                  </Animated.View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Trade Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
            <Animated.View entering={SlideInUp.springify()} style={styles.modalContent}>
              <TouchableOpacity activeOpacity={1}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <View style={[styles.modalCoinAvatar, { backgroundColor: tradeAction === 'buy' ? 'rgba(0,255,157,0.15)' : 'rgba(255,59,48,0.15)' }]}>
                    <Text style={[styles.modalCoinText, { color: tradeAction === 'buy' ? COLORS.primary : COLORS.error }]}>{selectedCoin?.symbol?.slice(0, 2)}</Text>
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>{tradeAction === 'buy' ? 'Buy' : 'Sell'} {selectedCoin?.name}</Text>
                    <Text style={styles.modalPrice}>Price: ${(selectedCoin?.current_price || 0).toLocaleString()}</Text>
                  </View>
                </View>

                {/* Tabs */}
                <View style={styles.modalTabs}>
                  <TouchableOpacity style={[styles.modalTab, tradeAction === 'buy' && styles.modalTabActiveBuy]} onPress={() => setTradeAction('buy')}>
                    <Text style={[styles.modalTabText, tradeAction === 'buy' && { color: COLORS.primary }]}>Buy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalTab, tradeAction === 'sell' && styles.modalTabActiveSell]} onPress={() => setTradeAction('sell')}>
                    <Text style={[styles.modalTabText, tradeAction === 'sell' && { color: COLORS.error }]}>Sell</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Amount (USD)</Text>
                <TextInput testID="trade-amount-input" style={styles.modalInput} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={COLORS.textMuted} />
                {amount && parseFloat(amount) > 0 && selectedCoin?.current_price ? (
                  <Text style={styles.estimateText}>{(parseFloat(amount) / selectedCoin.current_price).toFixed(8)} {selectedCoin.symbol}</Text>
                ) : null}

                <View style={styles.quickAmounts}>
                  {[25, 50, 100, 250, 500].map((a) => (
                    <TouchableOpacity key={a} style={styles.quickBtn} onPress={() => setAmount(String(a))}>
                      <Text style={styles.quickBtnText}>${a}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity testID="confirm-trade-btn" onPress={handleTrade} disabled={tradeLoading}>
                  <LinearGradient colors={tradeAction === 'buy' ? [COLORS.primary, COLORS.cyan] : [COLORS.error, '#FF6B6B']} style={styles.tradeConfirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {tradeLoading ? <ActivityIndicator color="#fff" /> : (
                      <Text style={styles.tradeConfirmText}>{tradeAction === 'buy' ? 'Confirm Buy' : 'Confirm Sell'}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  pageSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: COLORS.bgSubtle, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  coinCard: { backgroundColor: COLORS.bgSubtle, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  coinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  coinLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coinAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  coinImg: { width: 42, height: 42, borderRadius: 21 },
  coinAvatarText: { fontSize: 14, fontWeight: '700' },
  coinName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  coinSymbol: { fontSize: 12, color: COLORS.textMuted },
  coinRight: { alignItems: 'flex-end' },
  coinPrice: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  changePillText: { fontSize: 12, fontWeight: '600' },
  chartWrap: { marginBottom: 12, paddingLeft: 4 },
  timeLabels: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  timeBadge: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0D1220', padding: 8, borderRadius: 8 },
  timeBadgeLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  timeBadgeValue: { fontSize: 11, fontWeight: '600' },
  tradeButtons: { flexDirection: 'row', gap: 10 },
  buyBtn: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,255,157,0.2)' },
  sellBtn: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' },
  tradeBtnGrad: { flexDirection: 'row', height: 44, alignItems: 'center', justifyContent: 'center', gap: 6 },
  buyBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  sellBtnText: { color: COLORS.error, fontWeight: '600', fontSize: 14 },
  expandedStats: { marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 14, gap: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  eStatLabel: { fontSize: 13, color: COLORS.textMuted },
  eStatValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0D1220', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  modalCoinAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  modalCoinText: { fontSize: 18, fontWeight: '700' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalPrice: { fontSize: 14, color: COLORS.textSecondary },
  modalTabs: { flexDirection: 'row', gap: 8, marginBottom: 20, backgroundColor: '#0A0E17', borderRadius: 12, padding: 4 },
  modalTab: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalTabActiveBuy: { backgroundColor: 'rgba(0,255,157,0.15)' },
  modalTabActiveSell: { backgroundColor: 'rgba(255,59,48,0.1)' },
  modalTabText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
  inputLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  modalInput: { height: 60, backgroundColor: '#0A0E17', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, color: COLORS.text, fontSize: 26, fontWeight: '700', marginBottom: 8 },
  estimateText: { fontSize: 14, color: COLORS.cyan, marginBottom: 16, fontWeight: '500' },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickBtn: { flex: 1, height: 38, borderRadius: 19, backgroundColor: '#0A0E17', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  quickBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  tradeConfirmBtn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  tradeConfirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
