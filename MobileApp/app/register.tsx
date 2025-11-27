import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  
  // Validation errors
  const [studentIdError, setStudentIdError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const { register, logout } = useAuth();

  // Validate Student ID - ตัวเลขเท่านั้น และต้องครบ 10 หลัก
  const handleStudentIdChange = (text: string) => {
    // ยอมให้พิมพ์เฉพาะตัวเลข และไม่เกิน 10 หลัก
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 10);
    setStudentId(numericText);
    
    if (numericText.length === 0) {
      setStudentIdError('');
    } else if (numericText.length < 10) {
      setStudentIdError(`❌ รหัสต้องมี 10 หลัก (ปัจจุบัน ${numericText.length} หลัก)`);
    } else {
      setStudentIdError('');
    }
  };

  // Validate Email
  const handleEmailChange = (text: string) => {
    setEmail(text);
    
    if (text.length === 0) {
      setEmailError('');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      setEmailError('❌ รูปแบบ Email ไม่ถูกต้อง');
    } else {
      setEmailError('');
    }
  };

  // Validate Password
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    
    if (text.length === 0) {
      setPasswordError('');
    } else if (text.length < 6) {
      setPasswordError('❌ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    } else {
      setPasswordError('');
    }
  };

  const handleRegister = async () => {
    console.log('=== Register Button Pressed ===');
    console.log('Student ID:', studentId);
    console.log('First Name:', firstName);
    console.log('Last Name:', lastName);
    console.log('Email:', email);
    console.log('Password length:', password.length);
    console.log('Role:', role);
    
    // Final validation
    if (!studentId || !firstName || !lastName || !email || !password) {
      Alert.alert('❌ กรอกข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    if (studentId.length !== 10) {
      Alert.alert('❌ รหัสไม่ถูกต้อง', 'รหัสต้องมี 10 หลักเท่านั้น');
      return;
    }

    if (studentIdError || emailError || passwordError) {
      Alert.alert('❌ ข้อมูลไม่ถูกต้อง', 'กรุณาแก้ไขข้อมูลให้ถูกต้องก่อนลงทะเบียน');
      return;
    }

    console.log('✓ Validation passed, calling register...');
    setLoading(true);
    
    try {
      await register(email, password, firstName, lastName, role, studentId);
      console.log('✓ Register completed successfully');
      
      // Logout ทันทีเพื่อไม่ให้ auto-login
      await logout();
      console.log('✓ Logged out after registration');
      
      // เก็บชื่อและแสดง success modal
      setRegisteredName(`${firstName} ${lastName}`);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('❌ Register error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let message = 'เกิดข้อผิดพลาดในการลงทะเบียน';
      
      if (error.code === 'auth/email-already-in-use') {
        message = 'Email นี้ถูกใช้งานแล้ว กรุณาใช้ email อื่น';
      } else if (error.code === 'auth/weak-password') {
        message = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      } else if (error.code === 'auth/invalid-email') {
        message = 'รูปแบบ email ไม่ถูกต้อง';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้';
      } else if (error.message?.includes('รหัส')) {
        message = error.message;
      } else if (error.message) {
        message = error.message;
      }
      
      Alert.alert('❌ ลงทะเบียนไม่สำเร็จ', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    setShowSuccessModal(false);
    router.replace('/login');
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>KU Noti</Text>
      </View>

      <View style={styles.form}>
        {/* Role Selection */}
        <Text style={styles.label}>ประเภทผู้ใช้</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'student' && styles.roleButtonActive]}
            onPress={() => setRole('student')}
          >
            <Ionicons 
              name="school" 
              size={24} 
              color={role === 'student' ? '#fff' : '#1B8B6A'} 
            />
            <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>
              นักศึกษา
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, role === 'teacher' && styles.roleButtonActive]}
            onPress={() => setRole('teacher')}
          >
            <Ionicons 
              name="person" 
              size={24} 
              color={role === 'teacher' ? '#fff' : '#1B8B6A'} 
            />
            <Text style={[styles.roleText, role === 'teacher' && styles.roleTextActive]}>
              อาจารย์
            </Text>
          </TouchableOpacity>
        </View>

        {/* รหัสนิสิต/อาจารย์ */}
        <TextInput
          style={[styles.input, studentIdError && styles.inputError]}
          placeholder={role === 'student' ? 'รหัสนิสิต (10 หลัก)' : 'รหัสอาจารย์ (10 หลัก)'}
          value={studentId}
          onChangeText={handleStudentIdChange}
          keyboardType="numeric"
          maxLength={10}
        />
        {studentIdError ? (
          <Text style={styles.errorText}>{studentIdError}</Text>
        ) : null}

        {/* ชื่อ */}
        <TextInput
          style={styles.input}
          placeholder="ชื่อ (Firstname)"
          value={firstName}
          onChangeText={setFirstName}
        />

        {/* นามสกุล */}
        <TextInput
          style={styles.input}
          placeholder="นามสกุล (Lastname)"
          value={lastName}
          onChangeText={setLastName}
        />

        {/* Email */}
        <TextInput
          style={[styles.input, emailError && styles.inputError]}
          placeholder="Email"
          value={email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {emailError ? (
          <Text style={styles.errorText}>{emailError}</Text>
        ) : null}

        {/* Password */}
        <TextInput
          style={[styles.input, passwordError && styles.inputError]}
          placeholder="Password (อย่างน้อย 6 ตัวอักษร)"
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry
        />
        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : null}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>หากคุณมีบัญชีอยู่แล้ว</Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleGoToLogin}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#1B8B6A" />
            </View>
            
            <Text style={styles.modalTitle}>ลงทะเบียนสำเร็จ!</Text>
            <Text style={styles.modalMessage}>
              ยินดีต้อนรับ {registeredName}
            </Text>
            <Text style={styles.modalSubMessage}>
              คุณสามารถเข้าสู่ระบบได้แล้ว
            </Text>

            <TouchableOpacity 
              style={styles.successButton}
              onPress={handleGoToLogin}
            >
              <Text style={styles.successButtonText}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#1B8B6A',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
    alignSelf: 'center',
    marginBottom: 40,
  },
  headerText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    fontWeight: '500',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: '#1B8B6A',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  roleButtonActive: {
    backgroundColor: '#1B8B6A',
  },
  roleText: {
    fontSize: 16,
    color: '#1B8B6A',
    fontWeight: '500',
  },
  roleTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#1B8B6A',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
    marginBottom: 5,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 15,
    marginLeft: 4,
    marginTop: -10,
  },
  button: {
    backgroundColor: '#1B8B6A',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#8BC6B5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  footerText: {
    color: '#333',
    fontSize: 14,
  },
  linkText: {
    color: '#1B8B6A',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B8B6A',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalSubMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  successButton: {
    backgroundColor: '#1B8B6A',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
