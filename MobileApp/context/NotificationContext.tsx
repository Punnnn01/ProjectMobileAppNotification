import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthContext';
import { db } from '@/config/firebase';
import { 
  registerForPushNotificationsAsync, 
  saveTokenToFirestore,
  removeTokenFromFirestore 
} from '@/services/notificationService';

// ตั้งค่า Notification Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  registerNotifications: () => Promise<void>;
  unregisterNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const { user, userId, userProfile } = useAuth();
  const router = useRouter();

  // ฟังก์ชันลงทะเบียน Push Notification
  const registerNotifications = async () => {
    try {
      if (!user || !userId || !userProfile) {
        console.log('❌ Waiting for user data before notification registration');
        console.log('   user:', !!user, 'userId:', userId, 'userProfile:', !!userProfile);
        return;
      }

      console.log('🔔 Starting notification registration...');
      console.log('   User ID:', userId);
      console.log('   Role:', userProfile.role?.role_id);
      
      // ขอ permission และรับ token
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        setExpoPushToken(token);
        
        // บันทึก token ลง Firestore
        const userType = userProfile.role?.role_id === 'student' ? 'student' : 'teacher';
        console.log('   User Type:', userType);
        console.log('   Saving token to Firestore...');
        
        await saveTokenToFirestore(db, userId, userType, token);
        
        console.log('✅ Notification registration completed successfully!');
      } else {
        console.log('⚠️ Failed to get push token');
      }
    } catch (error) {
      console.error('❌ Error registering notifications:', error);
    }
  };

  // ฟังก์ชันยกเลิก Push Notification
  const unregisterNotifications = async () => {
    try {
      if (!user || !userId || !userProfile) {
        console.log('⚠️ No user data to unregister');
        return;
      }

      const userType = userProfile.role?.role_id === 'student' ? 'student' : 'teacher';
      await removeTokenFromFirestore(db, userId, userType);
      
      setExpoPushToken(null);
      console.log('✅ Notification unregistered');
    } catch (error) {
      console.error('❌ Error unregistering notifications:', error);
    }
  };

  // ลงทะเบียนเมื่อ user login และมี userProfile แล้ว
  useEffect(() => {
    if (user && userId && userProfile) {
      console.log('📱 User logged in, registering for notifications...');
      registerNotifications();
    } else {
      console.log('📱 User logged out or profile not ready, clearing token');
      setExpoPushToken(null);
    }
  }, [user, userId, userProfile]);

  // Listener สำหรับ notification ที่ได้รับ (แอปเปิดอยู่)
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
      console.log('   Title:', notification.request.content.title);
      console.log('   Body:', notification.request.content.body);
      console.log('   Data:', notification.request.content.data);
      
      setNotification(notification);
    });

    // Listener สำหรับเมื่อ user แตะ notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification Tapped!');
      const data = response.notification.request.content.data;
      console.log('   Data:', data);

      // Navigate ตาม type
      if (data.type === 'news' && data.news_id) {
        console.log('   → Navigating to news:', data.news_id);
        router.push(`/news/${data.news_id}`);
      } else if (data.type === 'exam') {
        console.log('   → Navigating to schedule');
        router.push('/schedule');
      } else if (data.type === 'message' && data.message_id) {
        console.log('   → Navigating to chat:', data.message_id);
        router.push(`/chat/${data.message_id}`);
      } else {
        console.log('   → Navigating to home');
        router.push('/(tabs)');
      }
    });

    return () => {
      // ลบ listeners (ใช้ .remove() แทน removeNotificationSubscription)
      if (notificationListener && typeof (notificationListener as any).remove === 'function') {
        (notificationListener as any).remove();
      }
      if (responseListener && typeof (responseListener as any).remove === 'function') {
        (responseListener as any).remove();
      }
    };
  }, [router]);

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        registerNotifications,
        unregisterNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
