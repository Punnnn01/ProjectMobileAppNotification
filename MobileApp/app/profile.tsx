import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, userProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.personal_info.firstName);
      setLastName(userProfile.personal_info.lastName);
      setPhone(userProfile.personal_info.phone || '');
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('กรอกข้อมูลไม่ครบ', 'กรุณากรอกชื่อและนามสกุล');
      return;
    }

    setIsSaving(true);
    try {
      if (!user || !userProfile) return;

      const collectionName = userProfile.role.role_id === 'student' ? 'Student' : 'Teacher';
      const docRef = doc(db, collectionName, user.uid);

      const nameField = userProfile.role.role_id === 'student' ? 'student_name' : 'teacher_name';

      await updateDoc(docRef, {
        'personal_info.firstName': firstName,
        'personal_info.lastName': lastName,
        'personal_info.phone': phone,
        [nameField]: `${firstName} ${lastName}`
      });

      console.log('Profile updated successfully');
      setIsEditing(false);
      setShowSuccessModal(true);

      // รอให้ modal แสดง 1.5 วินาทีแล้วปิด
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
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

  if (!userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B8B6A" />
      </View>
    );
  }

  const roleText = userProfile.role.role_id === 'student' ? 'นักศึกษา' : 'อาจารย์';

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Profile Content */}
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons 
              name={userProfile.role.role_id === 'student' ? 'school' : 'person'} 
              size={60} 
              color="#1B8B6A" 
            />
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleText}</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          {isEditing ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ชื่อ</Text>
                <TextInput
                  style={styles.textInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="กรอกชื่อ"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>นามสกุล</Text>
                <TextInput
                  style={styles.textInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="กรอกนามสกุล"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>เบอร์โทร</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="กรอกเบอร์โทร"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{userProfile.personal_info.email}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.label}>ชื่อ</Text>
                <Text style={styles.value}>{userProfile.personal_info.firstName}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>นามสกุล</Text>
                <Text style={styles.value}>{userProfile.personal_info.lastName}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>เบอร์โทร</Text>
                <Text style={styles.value}>
                  {userProfile.personal_info.phone || 'ไม่ได้ระบุ'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{userProfile.personal_info.email}</Text>
              </View>
            </>
          )}
        </View>

        {isEditing ? (
          <View style={styles.editButtonsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>บันทึก</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.editProfileButton} 
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="create-outline" size={24} color="#fff" />
            <Text style={styles.editProfileText}>แก้ไขโปรไฟล์</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={60} color="#1B8B6A" />
            <Text style={styles.modalText}>บันทึกข้อมูลสำเร็จ</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1B8B6A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 30,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1B8B6A',
  },
  roleBadge: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#1B8B6A',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#1B8B6A',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editProfileButton: {
    backgroundColor: '#1B8B6A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    gap: 10,
  },
  editProfileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
});
