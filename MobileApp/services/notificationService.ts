import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

/**
 * ลงทะเบียนและรับ FCM Token ผ่าน expo-notifications
 * (ใช้ได้ทั้ง Expo Go และ APK build)
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  console.log('🔔 Starting notification registration...');

  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) {
    console.log('⚠️ Must use physical device for Push Notifications');
    return null;
  }

  try {
    // ขอ permission ผ่าน expo-notifications
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Permission denied by user');
      Alert.alert(
        'ไม่ได้รับอนุญาต',
        'กรุณาเปิดการแจ้งเตือนในการตั้งค่าเครื่องเพื่อรับข่าวสาร',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          { text: 'เปิดการตั้งค่า', onPress: () => Linking.openSettings() },
        ]
      );
      return null;
    }

    console.log('✓ Permission granted');

    // สร้าง Android Notification Channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B8B6A',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      console.log('✓ Android notification channel created');
    }

    // ดึง FCM Token โดยตรง (ใช้ได้กับ APK ที่ build เองและ EAS Build)
    console.log('📤 Getting Device Push Token (FCM)...');
    const tokenData = await Notifications.getDevicePushTokenAsync();

    const token = tokenData.data;
    console.log('✅ FCM Token:', token);
    console.log('   Platform:', Platform.OS);

    return token;
  } catch (error: any) {
    console.error('❌ Error getting push token:', error);
    console.error('   Error message:', error.message);
    return null;
  }
}

/**
 * บันทึก Token ลง Firestore
 */
export async function saveTokenToFirestore(
  db: any,
  userId: string,
  userType: 'student' | 'teacher',
  token: string
): Promise<void> {
  try {
    const collectionName = userType === 'student' ? 'Student' : 'Teacher';

    console.log('💾 Saving token to Firestore...');
    console.log('   Collection:', collectionName);
    console.log('   User ID:', userId);
    console.log('   Token:', token.substring(0, 50) + '...');

    const userDocRef = doc(db, collectionName, userId);

    await updateDoc(userDocRef, {
      pushToken: token,
      pushTokenUpdatedAt: new Date(),
      notificationEnabled: true,
      devicePlatform: Platform.OS,
      tokenType: 'expo',
    });

    console.log('✅ Token saved to Firestore successfully');
  } catch (error: any) {
    console.error('❌ Error saving token:', error);

    // ถ้า document ไม่มี fields ให้ใช้ set with merge
    if (error.code === 'not-found' || error.message?.includes('No document to update')) {
      console.log('📝 Document not found, using setDoc with merge...');
      const collectionName = userType === 'student' ? 'Student' : 'Teacher';
      const userDocRef = doc(db, collectionName, userId);

      await setDoc(userDocRef, {
        pushToken: token,
        pushTokenUpdatedAt: new Date(),
        notificationEnabled: true,
        devicePlatform: Platform.OS,
        tokenType: 'expo',
      }, { merge: true });

      console.log('✅ Token saved successfully (with merge)');
    } else {
      // ไม่ throw เพื่อไม่ให้แอปพัง — แค่ log
      console.warn('⚠️ Could not save token, continuing without notification support');
    }
  }
}

/**
 * ลบ Token จาก Firestore (เมื่อ Logout)
 */
export async function removeTokenFromFirestore(
  db: any,
  userId: string,
  userType: 'student' | 'teacher'
): Promise<void> {
  try {
    const collectionName = userType === 'student' ? 'Student' : 'Teacher';
    const userDocRef = doc(db, collectionName, userId);

    console.log('🗑️ Removing token from Firestore...');

    await updateDoc(userDocRef, {
      pushToken: null,
      notificationEnabled: false,
    });

    console.log('✅ Token removed successfully');
  } catch (error) {
    // ไม่ throw — logout ต้องสำเร็จเสมอแม้ลบ token ไม่ได้
    console.warn('⚠️ Could not remove token from Firestore:', error);
  }
}
