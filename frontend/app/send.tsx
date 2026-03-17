import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../src/utils/theme';
import { apiCall } from '../src/utils/api';

const METHODS = [
  { id: 'singularity', label: 'Singularity', icon: 'flash', color: COLORS.primary, desc: 'Instant, zero fees' },
  { id: 'bank', label: 'Bank Transfer', icon: 'business', color: COLORS.cyan, desc: '1-3 business days' },
  { id: 'paypal', label: 'PayPal', icon: 'logo-paypal', color: '#0070BA', desc: 'Instant via PayPal' },
  { id: 'interac', label: 'Interac', icon: 'swap-horizontal', color: COLORS.warning, desc: 'Canada only' },
];

export default function SendScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState((params.email as string) || '');
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState((params.currency as string) || 'USD');
  const [note, setNote] = useState('');
  const [method, setMethod] = useState('singularity');
  const [currencies, setCurrencies] = useState<any>({});
  const [rates, setRates] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  // OTP
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpPreview, setOtpPreview] = useState('');

  useEffect(() => {
    apiCall('/transfer/currencies').then((d) => { setCurrencies(d.currencies || {}); setRates(d.exchange_rates || {}); }).catch(console.log);
  }, []);

  const convertedAmount = () => {
    if (!amount || !rates[fromCurrency] || !rates[toCurrency]) return 0;
    return (parseFloat(amount) / rates[fromCurrency]) * rates[toCurrency];
  };

  const requestOTP = async () => {
    if (!email || !amount || parseFloat(amount) <= 0) { Alert.alert('Error', 'Please fill all fields'); return; }
    setOtpSending(true);
    try {
      const data = await apiCall('/auth/otp/send', { method: 'POST', body: { purpose: 'transfer' } });
      setOtpPreview(data.otp_preview || '');
      setOtpStep(true);
      Alert.alert('OTP Sent', `Verification code sent to your email.${data.otp_preview ? `\n(Demo: ${data.otp_preview})` : ''}`);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setOtpSending(false); }
  };

  const verifyAndSend = async () => {
    if (!otpCode || otpCode.length !== 6) { Alert.alert('Error', 'Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      // Verify OTP first
      await apiCall(`/auth/otp/verify?code=${otpCode}&purpose=transfer`, { method: 'POST' });
      // Then send
      const data = await apiCall('/transfer/send', {
        method: 'POST',
        body: { recipient_email: email, amount: parseFloat(amount), from_currency: fromCurrency, to_currency: toCurrency, note, method, otp_code: otpCode },
      });
      const sym = currencies[toCurrency]?.symbol || '$';
      Alert.alert('Transfer Sent!', `${currencies[fromCurrency]?.symbol || '$'}${parseFloat(amount).toFixed(2)} sent to ${email}\nRecipient receives: ${sym}${data.transfer.received_amount.toFixed(2)}\nMethod: ${METHODS.find(m => m.id === method)?.label}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const CurrencyPicker = ({ visible, onSelect, onClose }: any) => {
    if (!visible) return null;
    return (
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContent}>
          <View style={styles.pickerHeader}><Text style={styles.pickerTitle}>Select Currency</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity></View>
          <ScrollView style={styles.pickerList}>
            {Object.entries(currencies).map(([code, info]: [string, any]) => (
              <TouchableOpacity key={code} style={styles.pickerItem} onPress={() => { onSelect(code); onClose(); }}>
                <Text style={styles.pickerCode}>{code}</Text>
                <Text style={styles.pickerName}>{info.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} testID="send-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
            <TouchableOpacity testID="send-back-btn" onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
            <Text style={styles.pageTitle}>Send Money</Text>
            <View style={{ width: 44 }} />
          </Animated.View>

          {!otpStep ? (
            <>
              {/* Transfer Method */}
              <Animated.View entering={FadeInDown.delay(80).springify()}>
                <Text style={styles.label}>Transfer Method</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodScroll}>
                  {METHODS.map((m) => (
                    <TouchableOpacity key={m.id} testID={`method-${m.id}-btn`} style={[styles.methodCard, method === m.id && styles.methodCardActive]} onPress={() => setMethod(m.id)}>
                      <Ionicons name={m.icon as any} size={22} color={method === m.id ? m.color : COLORS.textMuted} />
                      <Text style={[styles.methodLabel, method === m.id && { color: COLORS.text }]}>{m.label}</Text>
                      <Text style={styles.methodDesc}>{m.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>

              {/* Recipient */}
              <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
                <Text style={styles.label}>Recipient Email</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={{ paddingLeft: 16 }} />
                  <TextInput testID="send-email-input" style={styles.input} value={email} onChangeText={setEmail} placeholder="recipient@email.com" placeholderTextColor={COLORS.textMuted} keyboardType="email-address" autoCapitalize="none" />
                </View>
              </Animated.View>

              {/* Amount */}
              <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
                <Text style={styles.label}>You Send</Text>
                <View style={styles.amountRow}>
                  <TextInput testID="send-amount-input" style={styles.amountInput} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={COLORS.textMuted} />
                  <TouchableOpacity testID="from-currency-btn" style={styles.currencyBtn} onPress={() => setShowFromPicker(true)}>
                    <Text style={styles.currencyBtnText}>{fromCurrency}</Text><Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              <View style={styles.swapRow}><View style={styles.swapLine} /><View style={styles.swapIcon}><Ionicons name="swap-vertical" size={20} color={COLORS.primary} /></View><View style={styles.swapLine} /></View>

              <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
                <Text style={styles.label}>Recipient Gets</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.convertedAmount}>{convertedAmount().toFixed(2)}</Text>
                  <TouchableOpacity testID="to-currency-btn" style={styles.currencyBtn} onPress={() => setShowToPicker(true)}>
                    <Text style={styles.currencyBtnText}>{toCurrency}</Text><Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Fee Card */}
              <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.feeCard}>
                <View style={styles.feeRow}><Text style={styles.feeLabel}>Transfer Fee</Text><Text style={[styles.feeValue, { color: COLORS.primary }]}>$0.00 (Free!)</Text></View>
                <View style={styles.feeRow}><Text style={styles.feeLabel}>Exchange Rate</Text><Text style={styles.feeValue}>1 {fromCurrency} = {((rates[toCurrency] || 1) / (rates[fromCurrency] || 1)).toFixed(4)} {toCurrency}</Text></View>
                <View style={styles.feeRow}><Text style={styles.feeLabel}>Delivery</Text><Text style={[styles.feeValue, { color: COLORS.primary }]}>Instant</Text></View>
              </Animated.View>

              {/* Note */}
              <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
                <Text style={styles.label}>Note (Optional)</Text>
                <TextInput testID="send-note-input" style={styles.noteInput} value={note} onChangeText={setNote} placeholder="Add a note..." placeholderTextColor={COLORS.textMuted} multiline />
              </Animated.View>

              {/* Send - Request OTP */}
              <Animated.View entering={FadeInDown.delay(350).springify()}>
                <TouchableOpacity testID="request-otp-btn" onPress={requestOTP} disabled={otpSending}>
                  <LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={styles.sendBtn}>
                    {otpSending ? <ActivityIndicator color={COLORS.primaryFg} /> : (
                      <><Ionicons name="shield-checkmark" size={20} color={COLORS.primaryFg} /><Text style={styles.sendBtnText}>Verify & Send</Text></>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </>
          ) : (
            /* OTP Step */
            <Animated.View entering={FadeInDown.springify()} style={styles.otpSection}>
              <View style={styles.otpIconWrap}>
                <LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={styles.otpIcon}><Ionicons name="shield-checkmark" size={36} color={COLORS.primaryFg} /></LinearGradient>
              </View>
              <Text style={styles.otpTitle}>Enter Verification Code</Text>
              <Text style={styles.otpDesc}>A 6-digit code was sent to your email</Text>
              <TextInput testID="otp-input" style={styles.otpInput} value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor={COLORS.textMuted} />
              <TouchableOpacity testID="confirm-send-btn" onPress={verifyAndSend} disabled={loading}>
                <LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={styles.sendBtn}>
                  {loading ? <ActivityIndicator color={COLORS.primaryFg} /> : <Text style={styles.sendBtnText}>Confirm Transfer</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resendBtn} onPress={() => { setOtpStep(false); setOtpCode(''); }}>
                <Text style={styles.resendText}>Go Back</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <CurrencyPicker visible={showFromPicker} onSelect={setFromCurrency} onClose={() => setShowFromPicker(false)} />
      <CurrencyPicker visible={showToPicker} onSelect={setToCurrency} onClose={() => setShowToPicker(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bgSubtle, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  pageTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  label: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8, fontWeight: '500' },
  section: { marginBottom: 16 },
  methodScroll: { gap: 10, paddingBottom: 16 },
  methodCard: { width: 120, backgroundColor: COLORS.bgSubtle, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border },
  methodCardActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(0,255,157,0.05)' },
  methodLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  methodDesc: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F141F', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, height: 56 },
  input: { flex: 1, color: COLORS.text, fontSize: 16, paddingHorizontal: 12, height: 56 },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F141F', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, height: 64 },
  amountInput: { flex: 1, color: COLORS.text, fontSize: 28, fontWeight: '700', paddingHorizontal: 16, height: 64 },
  convertedAmount: { flex: 1, color: COLORS.textSecondary, fontSize: 28, fontWeight: '700', paddingHorizontal: 16 },
  currencyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bgSubtle, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: COLORS.border },
  currencyBtnText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  swapRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  swapLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  swapIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bgSubtle, alignItems: 'center', justifyContent: 'center', marginHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  feeCard: { backgroundColor: COLORS.bgSubtle, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel: { fontSize: 13, color: COLORS.textMuted },
  feeValue: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  noteInput: { backgroundColor: '#0F141F', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, color: COLORS.text, fontSize: 15, minHeight: 60, textAlignVertical: 'top' },
  sendBtn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.primaryFg },
  // OTP
  otpSection: { alignItems: 'center', paddingTop: 40 },
  otpIconWrap: { marginBottom: 24 },
  otpIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  otpTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  otpDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 32 },
  otpInput: { width: '80%', height: 64, backgroundColor: '#0F141F', borderRadius: 16, borderWidth: 2, borderColor: COLORS.primary, paddingHorizontal: 20, color: COLORS.text, fontSize: 32, fontWeight: '700', textAlign: 'center', letterSpacing: 12, marginBottom: 24 },
  resendBtn: { marginTop: 16, padding: 12 },
  resendText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  // Currency picker
  pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  pickerContent: { backgroundColor: COLORS.bgSubtle, borderRadius: 20, maxHeight: 500, overflow: 'hidden' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  pickerList: { maxHeight: 400 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerCode: { fontSize: 15, fontWeight: '600', color: COLORS.text, width: 50 },
  pickerName: { fontSize: 14, color: COLORS.textSecondary, flex: 1 },
});
