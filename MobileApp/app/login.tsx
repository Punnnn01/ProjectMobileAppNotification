import { useAuth } from '@/context/AuthContext';
import { registerForPushNotificationsAsync } from '@/services/notificationService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const ASKED_NOTIFY_PERM_KEY = '@app:asked_notification_permission';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    (async () => {
      try {
        const alreadyAsked = await AsyncStorage.getItem(ASKED_NOTIFY_PERM_KEY);
        if (alreadyAsked) return;

        await registerForPushNotificationsAsync();
        await AsyncStorage.setItem(ASKED_NOTIFY_PERM_KEY, '1');
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('แจ้งเตือน', 'กรุณากรอก Email และ Password'); return; }
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      if (error.code === 'teacher/pending') {
        Alert.alert('⏳ รอการยืนยัน', 'บัญชีอาจารย์ของคุณยังรอการยืนยันจากแอดมิน\nระบบจะแจ้งเตือนทางแอปเมื่อได้รับการอนุมัติ', [{ text: 'รับทราบ' }]);
        return;
      }
      if (error.code === 'teacher/rejected') {
        Alert.alert('❌ ไม่ได้รับการยืนยัน', 'บัญชีอาจารย์ของคุณไม่ได้รับการยืนยัน\nกรุณาติดต่อผู้ดูแลระบบ', [{ text: 'รับทราบ' }]);
        return;
      }
      const map: Record<string, string> = {
        'auth/user-not-found':    'ไม่พบบัญชีผู้ใช้นี้',
        'auth/wrong-password':    'รหัสผ่านไม่ถูกต้อง',
        'auth/invalid-email':     'รูปแบบ Email ไม่ถูกต้อง',
        'auth/invalid-credential':'Email หรือ Password ไม่ถูกต้อง',
      };
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', map[error.code] || 'เกิดข้อผิดพลาด');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="notifications" size={40} color="#fff" />
            </View>
            <Text style={styles.logoText}>KU Noti</Text>
            <Text style={styles.logoSub}>ระบบแจ้งเตือนข่าวสาร</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>เข้าสู่ระบบ</Text>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin} disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>เข้าสู่ระบบ</Text>
              }
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>ยังไม่มีบัญชี?</Text>
              <Link href="/register" asChild>
                <TouchableOpacity><Text style={styles.link}>ลงทะเบียน</Text></TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#1B8B6A' },
  kav:       { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  logoWrap:   { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoText:   { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  logoSub:    { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card:      { backgroundColor: '#fff', borderRadius: 24, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 24 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, marginBottom: 16, backgroundColor: '#F9FAFB', minHeight: 52 },
  inputIcon: { marginRight: 10 },
  input:     { flex: 1, fontSize: 15, color: '#222', paddingVertical: 14 },
  eyeBtn:    { padding: 4 },
  btn:         { backgroundColor: '#1B8B6A', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDisabled: { backgroundColor: '#8BC6B5' },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:     { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 },
  footerText: { color: '#888', fontSize: 14 },
  link:       { color: '#1B8B6A', fontSize: 14, fontWeight: '700' },
});
