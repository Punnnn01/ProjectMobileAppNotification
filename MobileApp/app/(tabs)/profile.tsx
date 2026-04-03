import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  TextInput, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Ionicons } from '@expo/vector-icons';

const F = {
  light:  'IBMPlexSansThai_300Light',
  regular:'IBMPlexSansThai_400Regular',
  medium: 'IBMPlexSansThai_500Medium',
  semi:   'IBMPlexSansThai_600SemiBold',
} as const;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, userId, userProfile, refreshUserProfile } = useAuth();

  const [isEditing, setIsEditing]               = useState(false);
  const [isSaving, setIsSaving]                 = useState(false);
  const [firstName, setFirstName]               = useState('');
  const [lastName, setLastName]                 = useState('');
  const [phone, setPhone]                       = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user || !userId || !userProfile) return;
      const col     = userProfile.role.role_id === 'student' ? 'Student' : 'Teacher';
      const userRef = doc(db, col, userId);
      const unsub   = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const info = snap.data()?.personal_info;
        if (info) {
          setFirstName(info.firstName || '');
          setLastName(info.lastName   || '');
          setPhone(info.phone         || '');
        }
      });
      return () => unsub();
    }, [user, userId, userProfile])
  );

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณากรอกชื่อและนามสกุล');
      return;
    }
    setIsSaving(true);
    try {
      if (!user || !userProfile) return;
      const col  = userProfile.role.role_id === 'student' ? 'Student' : 'Teacher';
      const snap = await getDocs(query(collection(db, col), where('auth_uid', '==', user.uid)));
      if (snap.empty) throw new Error('ไม่พบข้อมูลผู้ใช้');
      const nameField = userProfile.role.role_id === 'student' ? 'student_name' : 'teacher_name';
      await updateDoc(doc(db, col, snap.docs[0].id), {
        'personal_info.firstName': firstName,
        'personal_info.lastName':  lastName,
        'personal_info.phone':     phone,
        [nameField]: `${firstName} ${lastName}`,
      });
      await refreshUserProfile();
      setIsEditing(false);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 1500);
    } catch {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (userProfile) {
      setFirstName(userProfile.personal_info.firstName);
      setLastName(userProfile.personal_info.lastName);
      setPhone(userProfile.personal_info.phone || '');
    }
    setIsEditing(false);
  };

  if (!userProfile) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#1B8B6A" />
    </View>
  );

  const isStudent = userProfile.role.role_id === 'student';
  const roleText  = isStudent ? 'นักศึกษา' : 'อาจารย์';

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'ไม่ได้ระบุ'}</Text>
    </View>
  );

  return (
    <View style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.displayName}>
            {userProfile.personal_info.firstName} {userProfile.personal_info.lastName}
          </Text>
          <View style={styles.roleBadge}>
            <Ionicons name={isStudent ? 'school-outline' : 'briefcase-outline'} size={14} color="#fff" />
            <Text style={styles.roleBadgeText}>{roleText}</Text>
          </View>
          {!isEditing && (
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={16} color="#1B8B6A" />
              <Text style={styles.editBtnText}>แก้ไขข้อมูล</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ข้อมูลส่วนตัว</Text>
          {isEditing ? (
            <>
              {[
                { label: 'ชื่อ',     val: firstName, set: setFirstName, ph: 'กรอกชื่อ' },
                { label: 'นามสกุล', val: lastName,  set: setLastName,  ph: 'กรอกนามสกุล' },
                { label: 'เบอร์โทร', val: phone, set: (v: string) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10)), ph: 'กรอกเบอร์โทร 10 หลัก', kb: 'phone-pad' },
              ].map(f => (
                <View key={f.label} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={f.val}
                    onChangeText={f.set}
                    placeholder={f.ph}
                    placeholderTextColor="#bbb"
                    keyboardType={(f as any).kb || 'default'}
                  />
                </View>
              ))}
              <InfoRow label="Email" value={userProfile.personal_info.email} />
            </>
          ) : (
            <>
              <InfoRow label="ชื่อ"     value={userProfile.personal_info.firstName} />
              <InfoRow label="นามสกุล"  value={userProfile.personal_info.lastName} />
              <InfoRow label="เบอร์โทร" value={userProfile.personal_info.phone || 'ไม่ได้ระบุ'} />
              <InfoRow label="Email"    value={userProfile.personal_info.email} />
            </>
          )}
        </View>

        {isEditing && (
          <View style={styles.btnArea}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={handleCancel} disabled={isSaving}>
              <Text style={styles.cancelBtnText}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave} disabled={isSaving}>
              {isSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>บันทึก</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.successBox}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={44} color="#1B8B6A" />
            </View>
            <Text style={styles.successText}>บันทึกสำเร็จ</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#1B8B6A' },
  scroll:  { flex: 1 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F4F7' },

  header: {
    backgroundColor: '#1B8B6A',
    alignItems: 'center',
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  displayName: {
    color: '#fff', fontSize: 22, fontWeight: '700',
    marginBottom: 8, textAlign: 'center',
    fontFamily: F.semi,
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    marginBottom: 16,
  },
  roleBadgeText: { color: '#fff', fontSize: 13, fontFamily: F.medium },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
  },
  editBtnText: { color: '#1B8B6A', fontSize: 13, fontFamily: F.semi },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: -1,
    borderRadius: 18, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 4,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, color: '#111', marginBottom: 16, fontFamily: F.semi },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  infoLabel: { fontSize: 14, color: '#777', fontFamily: F.regular },
  infoValue: { fontSize: 14, color: '#111', maxWidth: '60%', textAlign: 'right', fontFamily: F.medium },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, color: '#777', marginBottom: 6, fontFamily: F.regular },
  fieldInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#111', backgroundColor: '#F9FAFB',
    fontFamily: F.regular,
  },

  btnArea: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 8 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: '#555', fontSize: 15, fontFamily: F.medium },
  saveBtn: { backgroundColor: '#1B8B6A', borderWidth: 2, borderColor: '#fff' },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: F.semi },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  successBox: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', gap: 12 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  successText: { fontSize: 17, color: '#111', fontFamily: F.semi },
});
