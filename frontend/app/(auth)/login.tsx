import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, RADIUS } from '../../src/utils/theme';
import { apiCall, setToken } from '../../src/utils/api';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill all fields'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      await setToken(data.access_token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data));
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={styles.logoCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.logoText}>S</Text>
          </LinearGradient>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to Singularity</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                testID="login-email-input"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                testID="login-password-input"
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity testID="toggle-password-btn" onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity testID="login-submit-btn" onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? <ActivityIndicator color={COLORS.primaryFg} /> : <Text style={styles.btnText}>Sign In</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity testID="go-to-register-btn" onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}> Create Account</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 60 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoText: { fontSize: 36, fontWeight: '700', color: COLORS.primaryFg },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary },
  form: { gap: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,59,48,0.1)', padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,59,48,0.3)' },
  errorText: { color: COLORS.error, fontSize: 14, flex: 1 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F141F', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, height: 56 },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, color: COLORS.text, fontSize: 16, paddingHorizontal: 12, height: 56 },
  eyeBtn: { padding: 16 },
  btn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { fontSize: 16, fontWeight: '700', color: COLORS.primaryFg },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  footerLink: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});
