import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import messaging from '@react-native-firebase/messaging';

// ตั้งค่าให้แสดง Notification แม้ว่าแอปจะเปิดอยู่
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * ลงทะเบียนและรับ FCM Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  console.log('🔔 Starting notification registration...');
  
  // Web ไม่รองรับ Push Notifications
  if (Platform.OS === 'web') {
    console.log('⚠️ Push notifications not supported on web');
    return null;
  }
  
  // เช็คว่าเป็น Physical Device หรือไม่
  if (!Device.isDevice) {
    console.log('⚠️ Must use physical device for Push Notifications');
    return null;
  }

  try {
    // ขอ Permission จาก Firebase Messaging
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('❌ Permission denied');
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

    // ดึง FCM Token
    console.log('📤 Getting FCM Token...');
    const fcmToken = await messaging().getToken();
    
    console.log('✅ FCM Token:', fcmToken);
    console.log('   Platform:', Platform.OS);

    // ตั้งค่า Foreground Notification Handler
    setupForegroundNotificationHandler();
    
    return fcmToken;

  } catch (error: any) {
    console.error('❌ Error getting FCM token:', error);
    console.error('   Error message:', error.message);
    return null;
  }
}

/**
 * ตั้งค่า Foreground Notification Handler
 * แสดง Notification แม้ว่าแอปจะเปิดอยู่
 */
function setupForegroundNotificationHandler() {
  // จัดการ Notification เมื่อแอปเปิดอยู่ (Foreground)
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log('📬 Foreground Notification received:', remoteMessage);

    // แสดง Local Notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: remoteMessage.notification?.title || 'แจ้งเตือน',
        body: remoteMessage.notification?.body || '',
        data: remoteMessage.data,
        sound: 'default',
      },
      trigger: null, // แสดงทันที
    });
  });

  console.log('✅ Foreground notification handler set up');
  return unsubscribe;
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
      tokenType: 'fcm',
    });

    console.log('✅ Token saved to Firestore successfully');
  } catch (error: any) {
    console.error('❌ Error saving token:', error);
    
    // ถ้า document ไม่มี fields ให้ใช้ set with merge
    if (error.code === 'not-found') {
      console.log('📝 Document fields not found, using set with merge...');
      const collectionName = userType === 'student' ? 'Student' : 'Teacher';
      const userDocRef = doc(db, collectionName, userId);
      
      await setDoc(userDocRef, {
        pushToken: token,
        pushTokenUpdatedAt: new Date(),
        notificationEnabled: true,
        devicePlatform: Platform.OS,
        tokenType: 'fcm',
      }, { merge: true });
      
      console.log('✅ Token saved successfully (with merge)');
    } else {
      throw error;
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
    console.error('❌ Error removing token:', error);
    throw error;
  }
}
