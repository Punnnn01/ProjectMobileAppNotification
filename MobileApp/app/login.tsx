import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'กรุณากรอก email และ password');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      let message = 'เกิดข้อผิดพลาด';
      if (error.code === 'auth/user-not-found') {
        message = 'ไม่พบบัญชีผู้ใช้นี้';
      } else if (error.code === 'auth/wrong-password') {
        message = 'รหัสผ่านไม่ถูกต้อง';
      } else if (error.code === 'auth/invalid-email') {
        message = 'รูปแบบ email ไม่ถูกต้อง';
      } else if (error.code === 'auth/invalid-credential') {
        message = 'email หรือ password ไม่ถูกต้อง';
      }
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>KU Noti</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>หากคุณยังไม่มีบัญชี?</Text>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>ลงทะเบียน</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingTop: 80,
  },
  header: {
    backgroundColor: '#1B8B6A',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
    alignSelf: 'center',
    marginBottom: 50,
  },
  headerText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  form: {
    width: '100%',
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
  button: {
    backgroundColor: '#1B8B6A',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
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
});
