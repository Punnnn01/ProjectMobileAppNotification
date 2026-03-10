import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';

export default function NotificationTestScreen() {
  const [status, setStatus] = useState<string>('ยังไม่ได้ทดสอบ');
  const [token, setToken] = useState<string>('');

  const testNotificationPermission = async () => {
    try {
      setStatus('🔄 กำลังทดสอบ...');

      // 1. เช็คว่าเป็น Physical Device หรือไม่
      if (!Device.isDevice) {
        setStatus('❌ ต้องใช้มือถือจริง (ไม่ใช่ Simulator)');
        Alert.alert('ข้อผิดพลาด', 'ต้องใช้มือถือจริงเพื่อทดสอบ Push Notification');
        return;
      }

      setStatus('✅ เป็นมือถือจริง\n🔄 กำลังขอ Permission...');

      // 2. ขอ Permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setStatus('❌ ไม่ได้รับ Permission\nกรุณาเปิดในการตั้งค่า');
        Alert.alert('ไม่ได้รับ Permission', 'กรุณาเปิด Notification Permission ในการตั้งค่ามือถือ');
        return;
      }

      setStatus('✅ ได้รับ Permission แล้ว\n🔄 กำลังสร้าง Notification Channel...');

      // 3. สร้าง Android Notification Channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B8B6A',
      });

      setStatus('✅ สร้าง Channel แล้ว\n🔄 กำลังดึง Token...');

      // 4. ดึง Device Push Token
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const pushToken = tokenData.data;

      setToken(pushToken);
      setStatus(
        `✅ สำเร็จ!\n\n` +
        `Platform: ${Device.osName}\n` +
        `Token Type: ${tokenData.type}\n` +
        `Token: ${pushToken.substring(0, 50)}...`
      );

      Alert.alert(
        'สำเร็จ! 🎉',
        'ระบบ Notification พร้อมใช้งาน\n\nToken ได้บันทึกไว้แล้ว',
        [{ text: 'OK' }]
      );

      console.log('✅ Full Token:', pushToken);

    } catch (error: any) {
      console.error('❌ Test Error:', error);
      setStatus(`❌ เกิดข้อผิดพลาด:\n${error.message}`);
      Alert.alert('ข้อผิดพลาด', error.message);
    }
  };

  const sendTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "ทดสอบ Notification 📬",
          body: 'ระบบ Notification ทำงานปกติ!',
          data: { test: true },
        },
        trigger: { seconds: 2 },
      });

      Alert.alert('ส่งแล้ว!', 'จะได้รับ Notification ในอีก 2 วินาที');
    } catch (error: any) {
      Alert.alert('ข้อผิดพลาด', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ทดสอบ Push Notification</Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {token ? (
        <View style={styles.tokenBox}>
          <Text style={styles.tokenLabel}>Token:</Text>
          <Text style={styles.tokenText} selectable>
            {token}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={testNotificationPermission}>
        <Text style={styles.buttonText}>🔔 ทดสอบ Permission & Token</Text>
      </TouchableOpacity>

      {token ? (
        <TouchableOpacity style={styles.buttonSecondary} onPress={sendTestNotification}>
          <Text style={styles.buttonText}>📬 ส่ง Notification ทดสอบ</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← กลับ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B8B6A',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusBox: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    minHeight: 150,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  tokenBox: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  tokenText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#1B8B6A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
