import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthContext';
import { db } from '@/config/firebase';
import {
  registerForPushNotificationsAsync,
  saveTokenToFirestore,
  removeTokenFromFirestore
} from '@/services/notificationService';

// ตั้งค่า Notification Handler — แสดง alert/sound/badge เมื่อแอปเปิดอยู่
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
  const [notification, setNotification]   = useState<Notifications.Notification | null>(null);
  const { user, userId, userProfile }     = useAuth();
  const router = useRouter();

  // ป้องกัน register ซ้ำ เมื่อ userProfile เปลี่ยนหลาย render
  const registeredRef = useRef<string | null>(null);

  // ── ฟังก์ชัน register / unregister ─────────────────────────────────────────
  const registerNotifications = async () => {
    try {
      if (!user || !userId || !userProfile) {
        console.log('❌ Waiting for user data before notification registration');
        return;
      }

      console.log('🔔 Starting notification registration...');
      console.log('   User ID:', userId);
      console.log('   Role:', userProfile.role?.role_id);

      const token = await registerForPushNotificationsAsync();

      if (token) {
        setExpoPushToken(token);
        const userType = userProfile.role?.role_id === 'student' ? 'student' : 'teacher';
        await saveTokenToFirestore(db, userId, userType, token);
        registeredRef.current = userId;
        console.log('✅ Notification registration completed successfully!');
      } else {
        console.log('⚠️ Failed to get push token');
      }
    } catch (error) {
      console.error('❌ Error registering notifications:', error);
    }
  };

  const unregisterNotifications = async () => {
    try {
      if (!user || !userId || !userProfile) return;
      const userType = userProfile.role?.role_id === 'student' ? 'student' : 'teacher';
      await removeTokenFromFirestore(db, userId, userType);
      setExpoPushToken(null);
      registeredRef.current = null;
      console.log('✅ Notification unregistered');
    } catch (error) {
      console.error('❌ Error unregistering notifications:', error);
    }
  };

  // ── ลงทะเบียนเมื่อ login (เฉพาะครั้งแรกต่อ user) ──────────────────────────
  useEffect(() => {
    if (user && userId && userProfile) {
      // ถ้า userId เปลี่ยน (เปลี่ยน account) ให้ register ใหม่
      if (registeredRef.current !== userId) {
        console.log('📱 User logged in, registering for notifications...');
        registerNotifications();
      }
    } else {
      if (registeredRef.current) {
        console.log('📱 User logged out, clearing token');
        registeredRef.current = null;
      }
      setExpoPushToken(null);
    }
  }, [user, userId, userProfile]);

  // ── Listeners: รับ notification + แตะ notification ─────────────────────────
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(notif => {
      console.log('📬 Notification received:', notif.request.content.title);
      setNotification(notif);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification Tapped!');
      const data = response.notification.request.content.data as any;

      if (data?.type === 'news' && data?.news_id) {
        router.push(`/news/${data.news_id}` as any);
      } else if (data?.type === 'exam') {
        router.push('/schedule' as any);
      } else {
        router.push('/(tabs)' as any);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
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
