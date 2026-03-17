import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch, TextInput, Modal, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../src/utils/theme';
import { apiCall, clearToken } from '../../src/utils/api';

const CURRENCIES = ['USD','EUR','GBP','INR','JPY','CAD','AUD','MXN','PHP','BRL','NGN','KES','CNY','KRW','SGD','AED','CHF','ZAR'];
const LANGUAGES = [{ code: 'en', label: 'English' },{ code: 'es', label: 'Español' },{ code: 'fr', label: 'Français' },{ code: 'de', label: 'Deutsch' },{ code: 'pt', label: 'Português' },{ code: 'zh', label: '中文' },{ code: 'ja', label: '日本語' },{ code: 'ko', label: '한국어' },{ code: 'ar', label: 'العربية' },{ code: 'hi', label: 'हिन्दी' }];
const LOCK_OPTIONS = [{ value: 0, label: 'Never' },{ value: 1, label: '1 min' },{ value: 5, label: '5 min' },{ value: 15, label: '15 min' },{ value: 30, label: '30 min' }];
const METHODS = [{ id: 'singularity', label: 'Singularity' },{ id: 'bank', label: 'Bank' },{ id: 'paypal', label: 'PayPal' },{ id: 'interac', label: 'Interac' }];

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  // Modals
  const [showKYC, setShowKYC] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [passcode, setPasscode] = useState('');
  const [kycForm, setKycForm] = useState({ full_name: '', date_of_birth: '', nationality: '', id_type: 'passport', id_number: '', address: '', city: '', country: '', postal_code: '' });

  const loadData = useCallback(async () => {
    try {
      const ud = await AsyncStorage.getItem('user_data');
      if (ud) setUser(JSON.parse(ud));
      const sd = await apiCall('/settings');
      setSettings(sd.settings);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, []);

  const handleLogout = () => Alert.alert('Logout', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' },{ text: 'Logout', style: 'destructive', onPress: async () => { await clearToken(); router.replace('/(auth)/login'); } }]);

  const updateSetting = async (key: string, val: any) => {
    try {
      await apiCall('/settings', { method: 'PUT', body: { [key]: val } });
      setSettings((s: any) => ({ ...s, [key]: val }));
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const setPasscodeHandler = async () => {
    if (passcode.length < 4) { Alert.alert('Error', 'Min 4 digits'); return; }
    setActionLoading('passcode');
    try {
      await apiCall('/settings', { method: 'PUT', body: { passcode } });
      Alert.alert('Success', 'Passcode set');
      setShowPasscode(false); setPasscode(''); loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setActionLoading(''); }
  };

  const generateRecoveryCodes = async () => {
    setActionLoading('recovery');
    try {
      const d = await apiCall('/settings/recovery-codes', { method: 'POST' });
      setRecoveryCodes(d.codes || []); setShowRecovery(true);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setActionLoading(''); }
  };

  const submitKYC = async () => {
    if (!kycForm.full_name || !kycForm.id_number) { Alert.alert('Error', 'Fill required fields'); return; }
    setActionLoading('kyc');
    try {
      const d = await apiCall('/kyc/submit', { method: 'POST', body: kycForm });
      Alert.alert('KYC Approved', d.message); setShowKYC(false); loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setActionLoading(''); }
  };

  if (loading) return <SafeAreaView style={s.container}><View style={s.loadingWrap}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;

  const PickerModal = ({ visible, onClose, title, items, onSelect, valueKey, labelKey }: any) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.modalOverlay}><View style={s.modalContent}>
        <View style={s.modalHandle} /><Text style={s.modalTitle}>{title}</Text>
        <ScrollView style={{ maxHeight: 350 }}>
          {items.map((item: any) => {
            const v = typeof item === 'string' ? item : item[valueKey || 'code'];
            const l = typeof item === 'string' ? item : item[labelKey || 'label'];
            return <TouchableOpacity key={v} style={s.pickerItem} onPress={() => { onSelect(v); onClose(); }}><Text style={s.pickerText}>{l}</Text></TouchableOpacity>;
          })}
        </ScrollView>
        <TouchableOpacity style={s.modalCancelFull} onPress={onClose}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
      </View></View>
    </Modal>
  );

  return (
    <SafeAreaView style={s.container} testID="profile-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <Text style={s.pageTitle}>Settings</Text>
        </Animated.View>

        {/* User Card */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <LinearGradient colors={['#121826', '#1A2235']} style={s.userCard}>
            <LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={s.avatar}><Text style={s.avatarText}>{(user?.full_name || user?.email || 'U')[0].toUpperCase()}</Text></LinearGradient>
            <Text style={s.userName}>{user?.full_name || 'User'}</Text>
            <Text style={s.userEmail}>{user?.email || ''}</Text>
            <View style={s.badges}>
              <View style={s.badge}><Ionicons name="checkmark-circle" size={14} color={COLORS.primary} /><Text style={s.badgeText}>Verified</Text></View>
              {settings?.kyc_status === 'approved' && <View style={[s.badge, { backgroundColor: 'rgba(0,240,255,0.1)' }]}><Ionicons name="shield-checkmark" size={14} color={COLORS.cyan} /><Text style={[s.badgeText, { color: COLORS.cyan }]}>KYC</Text></View>}
              {settings?.two_factor_enabled && <View style={[s.badge, { backgroundColor: 'rgba(112,0,255,0.1)' }]}><Ionicons name="lock-closed" size={14} color={COLORS.secondary} /><Text style={[s.badgeText, { color: COLORS.secondary }]}>2FA</Text></View>}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* SECURITY */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={s.sectionLabel}>Security</Text>
          <SettingRow icon="shield-checkmark" color={COLORS.primary} title="Two-Factor Authentication" desc="Extra layer of security" toggle value={settings?.two_factor_enabled} onChange={(v: boolean) => updateSetting('two_factor_enabled', v)} />
          <SettingRow icon="keypad" color={COLORS.secondary} title="Passcode Lock" desc={settings?.has_passcode ? 'Passcode enabled' : 'Set a PIN code'} onPress={() => setShowPasscode(true)} />
          <SettingRow icon="finger-print" color={COLORS.cyan} title="Biometric Login" desc="Fingerprint or Face ID" toggle value={settings?.biometric_enabled} onChange={(v: boolean) => updateSetting('biometric_enabled', v)} />
          <SettingRow icon="key" color={COLORS.warning} title="Recovery Codes" desc={settings?.has_recovery_codes ? '8 codes generated' : 'Generate backup codes'} onPress={generateRecoveryCodes} loading={actionLoading === 'recovery'} />
          <SettingRow icon="time" color={COLORS.orange} title="Auto-Lock" desc={`After ${settings?.auto_lock_minutes || 0} minutes`} onPress={() => setShowLock(true)} />
          <SettingRow icon="eye-off" color={COLORS.textSecondary} title="Hide Balance" desc="Mask your balance on home" toggle value={settings?.hide_balance} onChange={(v: boolean) => updateSetting('hide_balance', v)} />
        </Animated.View>

        {/* VERIFICATION */}
        <Animated.View entering={FadeInDown.delay(130).springify()}>
          <Text style={s.sectionLabel}>Verification</Text>
          <SettingRow icon="card" color={COLORS.primary} title="KYC Verification" desc={settings?.kyc_status === 'approved' ? `Approved — $${(settings.transfer_limit || 50000).toLocaleString()} limit` : 'Verify to increase limits'} onPress={() => setShowKYC(true)} rightIcon={settings?.kyc_status === 'approved' ? 'checkmark-circle' : undefined} rightColor={COLORS.primary} />
        </Animated.View>

        {/* NOTIFICATIONS */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <Text style={s.sectionLabel}>Notifications</Text>
          <SettingRow icon="notifications" color={COLORS.orange} title="Push Notifications" desc="Alerts on your device" toggle value={settings?.push_alerts !== false} onChange={(v: boolean) => updateSetting('push_alerts', v)} />
          <SettingRow icon="mail" color={COLORS.cyan} title="Email Alerts" desc="Transaction summaries" toggle value={settings?.email_alerts !== false} onChange={(v: boolean) => updateSetting('email_alerts', v)} />
          <SettingRow icon="trending-up" color={COLORS.primary} title="Trade Alerts" desc="Buy/sell confirmations" toggle value={settings?.trade_alerts !== false} onChange={(v: boolean) => updateSetting('trade_alerts', v)} />
          <SettingRow icon="pulse" color={COLORS.error} title="Price Alerts" desc="Watchlist price movements" toggle value={settings?.price_alerts !== false} onChange={(v: boolean) => updateSetting('price_alerts', v)} />
        </Animated.View>

        {/* PREFERENCES */}
        <Animated.View entering={FadeInDown.delay(190).springify()}>
          <Text style={s.sectionLabel}>Preferences</Text>
          <SettingRow icon="cash" color={COLORS.primary} title="Default Currency" desc={settings?.default_currency || 'USD'} onPress={() => setShowCurrency(true)} />
          <SettingRow icon="flash" color={COLORS.warning} title="Default Transfer Method" desc={METHODS.find(m => m.id === (settings?.default_transfer_method || 'singularity'))?.label || 'Singularity'} onPress={() => setShowMethod(true)} />
          <SettingRow icon="language" color={COLORS.cyan} title="Language" desc={LANGUAGES.find(l => l.code === (settings?.language || 'en'))?.label || 'English'} onPress={() => setShowLanguage(true)} />
          <SettingRow icon="moon" color={COLORS.secondary} title="Theme" desc="Dark (Default)" />
        </Animated.View>

        {/* DATA & PRIVACY */}
        <Animated.View entering={FadeInDown.delay(220).springify()}>
          <Text style={s.sectionLabel}>Data & Privacy</Text>
          <SettingRow icon="download" color={COLORS.primary} title="Export Transactions" desc="Download as CSV" onPress={() => Alert.alert('Export', 'Transaction history will be sent to your email.')} />
          <SettingRow icon="document-text" color={COLORS.textSecondary} title="Privacy Policy" desc="How we handle your data" />
          <SettingRow icon="book" color={COLORS.textSecondary} title="Terms of Service" desc="Usage terms & conditions" />
        </Animated.View>

        {/* SUPPORT */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <Text style={s.sectionLabel}>Support</Text>
          <SettingRow icon="chatbubbles" color={COLORS.primary} title="Help Center" desc="FAQ & guides" />
          <SettingRow icon="headset" color={COLORS.cyan} title="Contact Support" desc="Live chat & email" />
          <SettingRow icon="bug" color={COLORS.warning} title="Report a Bug" desc="Help us improve" />
          <SettingRow icon="star" color={COLORS.orange} title="Rate the App" desc="Share your feedback" />
        </Animated.View>

        {/* ABOUT */}
        <Animated.View entering={FadeInDown.delay(280).springify()}>
          <Text style={s.sectionLabel}>About</Text>
          <SettingRow icon="information-circle" color={COLORS.textSecondary} title="App Version" desc="2.0.0 (Build 2026.02)" />
          <SettingRow icon="code-slash" color={COLORS.textSecondary} title="Open Source Licenses" desc="Third-party acknowledgments" />
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.delay(310).springify()}>
          <Text style={[s.sectionLabel, { color: COLORS.error }]}>Danger Zone</Text>
          <TouchableOpacity testID="logout-btn" style={s.dangerBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} /><Text style={s.dangerBtnText}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="delete-account-btn" style={[s.dangerBtn, { borderColor: 'rgba(255,59,48,0.4)', marginTop: 10 }]} onPress={() => Alert.alert('Delete Account', 'This action is permanent. Contact support@singularity.app to proceed.', [{ text: 'OK' }])}>
            <Ionicons name="trash" size={20} color={COLORS.error} /><Text style={s.dangerBtnText}>Delete Account</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={s.version}>Singularity v2.0.0</Text>
      </ScrollView>

      {/* KYC Modal */}
      <Modal visible={showKYC} transparent animationType="slide">
        <View style={s.modalOverlay}><View style={s.modalContent}>
          <View style={s.modalHandle} /><Text style={s.modalTitle}>KYC Verification</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {[{ key: 'full_name', label: 'Full Legal Name', ph: 'John Doe' },{ key: 'date_of_birth', label: 'Date of Birth', ph: 'YYYY-MM-DD' },{ key: 'nationality', label: 'Nationality', ph: 'American' },{ key: 'id_number', label: 'ID Number', ph: 'Passport or ID #' },{ key: 'address', label: 'Address', ph: 'Street address' },{ key: 'city', label: 'City', ph: 'City' },{ key: 'country', label: 'Country', ph: 'Country' },{ key: 'postal_code', label: 'Postal Code', ph: '12345' }].map((f) => (
              <View key={f.key} style={s.kycField}><Text style={s.kycLabel}>{f.label}</Text><TextInput style={s.kycInput} value={(kycForm as any)[f.key]} onChangeText={(v) => setKycForm({ ...kycForm, [f.key]: v })} placeholder={f.ph} placeholderTextColor={COLORS.textMuted} /></View>
            ))}
          </ScrollView>
          <View style={s.modalActions}>
            <TouchableOpacity style={s.modalCancel} onPress={() => setShowKYC(false)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity testID="kyc-submit-btn" onPress={submitKYC} disabled={actionLoading === 'kyc'}><LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={s.modalSubmit}>{actionLoading === 'kyc' ? <ActivityIndicator color={COLORS.primaryFg} /> : <Text style={s.modalSubmitText}>Submit</Text>}</LinearGradient></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* Passcode Modal */}
      <Modal visible={showPasscode} transparent animationType="slide">
        <View style={s.modalOverlay}><View style={s.modalContent}>
          <View style={s.modalHandle} /><Text style={s.modalTitle}>Set Passcode</Text><Text style={s.modalDesc}>Enter a 4-6 digit PIN</Text>
          <TextInput testID="passcode-input" style={s.passcodeInput} value={passcode} onChangeText={setPasscode} keyboardType="number-pad" maxLength={6} secureTextEntry placeholder="••••••" placeholderTextColor={COLORS.textMuted} />
          <View style={s.modalActions}>
            <TouchableOpacity style={s.modalCancel} onPress={() => { setShowPasscode(false); setPasscode(''); }}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity testID="passcode-submit-btn" onPress={setPasscodeHandler}><LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={s.modalSubmit}>{actionLoading === 'passcode' ? <ActivityIndicator color={COLORS.primaryFg} /> : <Text style={s.modalSubmitText}>Set</Text>}</LinearGradient></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* Recovery Modal */}
      <Modal visible={showRecovery} transparent animationType="slide">
        <View style={s.modalOverlay}><View style={s.modalContent}>
          <View style={s.modalHandle} /><Text style={s.modalTitle}>Recovery Codes</Text><Text style={s.modalDesc}>Save these securely. They cannot be retrieved again.</Text>
          <View style={s.codesGrid}>{recoveryCodes.map((c, i) => <View key={i} style={s.codeItem}><Text style={s.codeText}>{c}</Text></View>)}</View>
          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setShowRecovery(false)}><LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={s.modalSubmit}><Text style={s.modalSubmitText}>I've Saved These</Text></LinearGradient></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Picker Modals */}
      <PickerModal visible={showCurrency} onClose={() => setShowCurrency(false)} title="Default Currency" items={CURRENCIES} onSelect={(v: string) => updateSetting('default_currency', v)} />
      <PickerModal visible={showLanguage} onClose={() => setShowLanguage(false)} title="Language" items={LANGUAGES} onSelect={(v: string) => updateSetting('language', v)} />
      <PickerModal visible={showLock} onClose={() => setShowLock(false)} title="Auto-Lock Timeout" items={LOCK_OPTIONS} onSelect={(v: number) => updateSetting('auto_lock_minutes', v)} valueKey="value" />
      <PickerModal visible={showMethod} onClose={() => setShowMethod(false)} title="Default Transfer Method" items={METHODS} onSelect={(v: string) => updateSetting('default_transfer_method', v)} valueKey="id" />
    </SafeAreaView>
  );
}

function SettingRow({ icon, color, title, desc, toggle, value, onChange, onPress, loading, rightIcon, rightColor }: any) {
  return (
    <TouchableOpacity style={s.settingItem} onPress={onPress} disabled={toggle && !onPress} activeOpacity={0.7}>
      <View style={[s.settingIcon, { backgroundColor: `${color}15` }]}><Ionicons name={icon as any} size={20} color={color} /></View>
      <View style={s.settingInfo}><Text style={s.settingTitle}>{title}</Text><Text style={s.settingDesc}>{desc}</Text></View>
      {toggle ? <Switch value={value || false} onValueChange={onChange} trackColor={{ false: COLORS.border, true: `${color}40` }} thumbColor={value ? color : COLORS.textMuted} /> : loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : rightIcon ? <Ionicons name={rightIcon} size={22} color={rightColor} /> : onPress ? <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} /> : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  userCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: COLORS.primaryFg },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  userEmail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 10 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,255,157,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, marginTop: 12 },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  settingIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  settingDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,59,48,0.08)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' },
  dangerBtnText: { fontSize: 15, color: COLORS.error, fontWeight: '600' },
  version: { textAlign: 'center', marginTop: 24, fontSize: 12, color: COLORS.textMuted },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0D1220', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  modalDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancel: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border },
  modalCancelFull: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border, marginTop: 12 },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  modalSubmit: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: COLORS.primaryFg },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerText: { fontSize: 16, color: COLORS.text },
  kycField: { marginBottom: 12 },
  kycLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  kycInput: { height: 46, backgroundColor: '#0A0E17', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, color: COLORS.text, fontSize: 15 },
  passcodeInput: { height: 64, backgroundColor: '#0A0E17', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 20, color: COLORS.text, fontSize: 32, fontWeight: '700', textAlign: 'center', letterSpacing: 12 },
  codesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  codeItem: { width: '47%', backgroundColor: '#0A0E17', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  codeText: { fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'monospace' },
});
