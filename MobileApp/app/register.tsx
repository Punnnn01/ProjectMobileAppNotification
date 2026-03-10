import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView, Modal, SafeAreaView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// ── Field อยู่นอก component เพื่อไม่ให้ re-create ทุก render ──────────────────
interface FieldProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  keyboardType?: any;
  maxLength?: number;
  isPassword?: boolean;
  showPass?: boolean;
  onTogglePass?: () => void;
}

const Field = ({
  icon, placeholder, value, onChangeText,
  error, keyboardType, maxLength,
  isPassword, showPass, onTogglePass,
}: FieldProps) => (
  <View style={{ marginBottom: error ? 4 : 16 }}>
    <View style={[styles.inputWrap, error ? styles.inputWrapError : undefined]}>
      <Ionicons name={icon as any} size={20} color="#888" style={{ marginRight: 10 }} />
      <TextInput
        style={[styles.input, { flex: 1 }]}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
        secureTextEntry={isPassword ? !showPass : false}
        maxLength={maxLength}
      />
      {isPassword && (
        <TouchableOpacity onPress={onTogglePass} style={{ padding: 4 }}>
          <Ionicons
            name={showPass ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#888"
          />
        </TouchableOpacity>
      )}
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const [studentId, setStudentId]   = useState('');
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [role, setRole]             = useState<'student' | 'teacher'>('student');
  const [loading, setLoading]       = useState(false);
  const [showSuccess, setShowSuccess]         = useState(false);
  const [showEmailExists, setShowEmailExists] = useState(false);
  const [registeredName, setRegisteredName]   = useState('');
  const [duplicateEmail, setDuplicateEmail]   = useState('');
  const [studentIdError, setStudentIdError]   = useState('');
  const [emailError, setEmailError]           = useState('');
  const [passwordError, setPasswordError]     = useState('');
  const { register, logout } = useAuth();

  const handleStudentIdChange = (text: string) => {
    const v = text.replace(/[^0-9]/g, '').slice(0, 10);
    setStudentId(v);
    setStudentIdError(!v ? '' : v.length < 10 ? `รหัสต้องมี 10 หลัก (ปัจจุบัน ${v.length} หลัก)` : '');
  };
  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError(!text ? '' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? 'รูปแบบ Email ไม่ถูกต้อง' : '');
  };
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError(!text ? '' : text.length < 6 ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' : '');
  };

  const handleRegister = async () => {
    if (!studentId || !firstName || !lastName || !email || !password) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบทุกช่อง'); return;
    }
    if (studentId.length !== 10) { Alert.alert('รหัสไม่ถูกต้อง', 'รหัสต้องมี 10 หลักเท่านั้น'); return; }
    if (studentIdError || emailError || passwordError) { Alert.alert('ข้อมูลไม่ถูกต้อง', 'กรุณาแก้ไขข้อมูลก่อนลงทะเบียน'); return; }
    setLoading(true);
    try {
      await register(email, password, firstName, lastName, role, studentId);
      await logout();
      setRegisteredName(`${firstName} ${lastName}`);
      setShowSuccess(true);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setDuplicateEmail(email); setShowEmailExists(true); setLoading(false); return;
      }
      const map: Record<string, string> = {
        'auth/weak-password':          'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
        'auth/invalid-email':          'รูปแบบ Email ไม่ถูกต้อง',
        'auth/network-request-failed': 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้',
      };
      Alert.alert('ลงทะเบียนไม่สำเร็จ', map[error.code] || error.message || 'เกิดข้อผิดพลาด');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="notifications" size={36} color="#fff" />
          </View>
          <Text style={styles.logoText}>KU Noti</Text>
          <Text style={styles.logoSub}>สร้างบัญชีใหม่</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ลงทะเบียน</Text>

          <Text style={styles.sectionLabel}>ประเภทผู้ใช้</Text>
          <View style={styles.roleRow}>
            {(['student', 'teacher'] as const).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                onPress={() => setRole(r)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={r === 'student' ? 'school-outline' : 'person-outline'}
                  size={22}
                  color={role === r ? '#fff' : '#1B8B6A'}
                />
                <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                  {r === 'student' ? 'นักศึกษา' : 'อาจารย์'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field
            icon="card-outline"
            placeholder={role === 'student' ? 'รหัสนิสิต (10 หลัก)' : 'รหัสอาจารย์ (10 หลัก)'}
            value={studentId}
            onChangeText={handleStudentIdChange}
            error={studentIdError}
            keyboardType="numeric"
            maxLength={10}
          />
          <Field
            icon="person-outline"
            placeholder="ชื่อ"
            value={firstName}
            onChangeText={setFirstName}
          />
          <Field
            icon="person-outline"
            placeholder="นามสกุล"
            value={lastName}
            onChangeText={setLastName}
          />
          <Field
            icon="mail-outline"
            placeholder="Email"
            value={email}
            onChangeText={handleEmailChange}
            error={emailError}
            keyboardType="email-address"
          />
          <Field
            icon="lock-closed-outline"
            placeholder="Password (อย่างน้อย 6 ตัวอักษร)"
            value={password}
            onChangeText={handlePasswordChange}
            error={passwordError}
            isPassword
            showPass={showPass}
            onTogglePass={() => setShowPass(p => !p)}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ลงทะเบียน</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>มีบัญชีอยู่แล้ว?</Text>
            <Link href="/login" asChild>
              <TouchableOpacity><Text style={styles.link}>เข้าสู่ระบบ</Text></TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>

      {/* Modal: Email ซ้ำ */}
      <Modal visible={showEmailExists} transparent animationType="fade" onRequestClose={() => setShowEmailExists(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="mail" size={44} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Email นี้ถูกใช้งานแล้ว</Text>
            <Text style={styles.modalMsg}>"{duplicateEmail}"</Text>
            <Text style={styles.modalSub}>กรุณาใช้ Email อื่น หรือเข้าสู่ระบบหากมีบัญชีอยู่แล้ว</Text>
            <TouchableOpacity style={styles.btn} onPress={() => { setShowEmailExists(false); router.replace('/login'); }}>
              <Text style={styles.btnText}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowEmailExists(false)}>
              <Text style={styles.outlineBtnText}>ใช้ Email อื่น</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: สำเร็จ */}
      <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => { setShowSuccess(false); router.replace('/login'); }}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            {role === 'teacher' ? (
              <>
                <View style={[styles.modalIcon, { backgroundColor: '#FEF9C3' }]}>
                  <Ionicons name="time" size={44} color="#D97706" />
                </View>
                <Text style={[styles.modalTitle, { color: '#D97706' }]}>ลงทะเบียนสำเร็จ!</Text>
                <Text style={styles.modalMsg}>ยินดีต้อนรับ {registeredName}</Text>
                <Text style={styles.modalSub}>{`บัญชีอาจารย์ของคุณอยู่ระหว่างรอการยืนยันจากแอดมิน\nระบบจะแจ้งเตือนทางแอปเมื่อได้รับการอนุมัติ`}</Text>
              </>
            ) : (
              <>
                <View style={[styles.modalIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark-circle" size={44} color="#1B8B6A" />
                </View>
                <Text style={[styles.modalTitle, { color: '#1B8B6A' }]}>ลงทะเบียนสำเร็จ!</Text>
                <Text style={styles.modalMsg}>ยินดีต้อนรับ {registeredName}</Text>
                <Text style={styles.modalSub}>คุณสามารถเข้าสู่ระบบได้แล้ว</Text>
              </>
            )}
            <TouchableOpacity style={styles.btn} onPress={() => { setShowSuccess(false); router.replace('/login'); }}>
              <Text style={styles.btnText}>รับทราบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#1B8B6A' },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  logoWrap:   { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logoText:   { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  logoSub:    { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card:      { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 10 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 20 },
  sectionLabel:  { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 10 },
  roleRow:       { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderWidth: 1.5, borderColor: '#1B8B6A', borderRadius: 12, backgroundColor: '#fff' },
  roleBtnActive: { backgroundColor: '#1B8B6A' },
  roleText:       { fontSize: 15, color: '#1B8B6A', fontWeight: '600' },
  roleTextActive: { color: '#fff' },
  inputWrap:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#F9FAFB', minHeight: 52 },
  inputWrapError: { borderColor: '#EF4444' },
  input:          { fontSize: 15, color: '#222', paddingVertical: 14 },
  errorText:      { color: '#EF4444', fontSize: 12, marginBottom: 12, marginLeft: 4 },
  btn:            { backgroundColor: '#1B8B6A', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  btnDisabled:    { backgroundColor: '#8BC6B5' },
  btnText:        { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn:     { borderWidth: 1.5, borderColor: '#1B8B6A', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  outlineBtnText: { color: '#1B8B6A', fontSize: 16, fontWeight: '600' },
  footer:     { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 },
  footerText: { color: '#888', fontSize: 14 },
  link:       { color: '#1B8B6A', fontSize: 14, fontWeight: '700' },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:   { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center' },
  modalIcon:  { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalMsg:   { fontSize: 16, color: '#333', textAlign: 'center', fontWeight: '500', marginBottom: 6 },
  modalSub:   { fontSize: 14, color: '#777', textAlign: 'center', marginBottom: 24 },
});
