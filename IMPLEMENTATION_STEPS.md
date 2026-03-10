# 🚀 Push Notification Implementation - Step by Step

## Phase 1: Setup & Configuration

### Step 1.1: ติดตั้ง Packages

**MobileApp:**
```bash
cd MobileApp
npx expo install expo-notifications
npx expo install expo-device
```

**Backend:**
```bash
cd backend
npm install expo-server-sdk
```

---

### Step 1.2: ตั้งค่า app.json

เพิ่ม configuration ใน `MobileApp/app.json`:

```json
{
  "expo": {
    "name": "KU Noti",
    "slug": "ku-noti",
    "version": "1.0.0",
    "orientation": "portrait",
    
    // ⭐ เพิ่มส่วนนี้
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#1B8B6A",
          "sounds": [],
          "mode": "production"
        }
      ]
    ],
    
    "notification": {
      "icon": "./assets/images/notification-icon.png",
      "color": "#1B8B6A",
      "androidMode": "default"
    },
    
    "android": {
      "package": "com.yourcompany.kunoti",
      "permissions": [
        "NOTIFICATIONS",
        "POST_NOTIFICATIONS"
      ],
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#1B8B6A"
      }
    },
    
    "ios": {
      "bundleIdentifier": "com.yourcompany.kunoti",
      "supportsTablet": true,
      "infoPlist": {
        "UIBackgroundModes": [
          "remote-notification"
        ]
      }
    }
  }
}
```

---

## Phase 2: Mobile App Implementation

### Step 2.1: สร้าง Notification Service

สร้างไฟล์: `MobileApp/services/notificationService.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ตั้งค่าว่าจะแสดง Notification อย่างไร
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * ลงทะเบียนรับ Push Notifications
 * @returns Expo Push Token หรือ null
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // 1. เช็คว่าเป็น Physical Device
    if (!Device.isDevice) {
      console.log('⚠️ Push notifications ต้องใช้บนเครื่องจริง');
      return null;
    }

    // 2. เช็ค Permission ปัจจุบัน
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 3. ถ้ายังไม่ได้ Permission → ขอใหม่
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // 4. ถ้าไม่อนุญาต
    if (finalStatus !== 'granted') {
      console.log('❌ ไม่ได้รับอนุญาตให้ส่ง Notification');
      return null;
    }

    // 5. สร้าง Notification Channel (Android)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B8B6A',
      });
    }

    // 6. รับ Expo Push Token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.log('⚠️ ไม่พบ Project ID ใน app.json');
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined
    });

    console.log('✓ Expo Push Token:', token.data);
    return token.data;

  } catch (error) {
    console.error('❌ Error registering for push notifications:', error);
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
    const userRef = db.collection(collectionName).doc(userId);
    
    await userRef.update({
      fcmToken: token,
      fcmTokenUpdatedAt: new Date(),
      notificationEnabled: true
    });
    
    console.log('✓ Token saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving token:', error);
    throw error;
  }
}
```

---

### Step 2.2: สร้าง Notification Context

สร้างไฟล์: `MobileApp/context/NotificationContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { 
  registerForPushNotificationsAsync, 
  saveTokenToFirestore 
} from '@/services/notificationService';
import { useAuth } from './AuthContext';
import { db } from '@/config/firebase';

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  registerNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  notification: null,
  registerNotifications: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const { user } = useAuth();

  // ลงทะเบียนรับ Notifications
  const registerNotifications = async () => {
    if (!user) {
      console.log('⚠️ ต้อง Login ก่อนถึงจะลงทะเบียน Notification ได้');
      return;
    }

    try {
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        setExpoPushToken(token);
        
        // บันทึก Token ลง Firestore
        await saveTokenToFirestore(
          db,
          user.uid,
          user.role as 'student' | 'teacher',
          token
        );
      }
    } catch (error) {
      console.error('❌ Error in registerNotifications:', error);
    }
  };

  useEffect(() => {
    // ลงทะเบียนเมื่อ Login แล้ว
    if (user) {
      registerNotifications();
    }

    // ฟังเมื่อได้รับ Notification (แอปเปิดอยู่)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification Received:', notification);
      setNotification(notification);
    });

    // ฟังเมื่อ User แตะ Notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification Tapped:', response);
      
      const data = response.notification.request.content.data;
      
      // นำทางตาม type
      if (data.type === 'news') {
        router.push(`/news/${data.news_id}`);
      } else if (data.type === 'exam') {
        router.push('/schedule');
      } else if (data.type === 'message') {
        router.push(`/chat/${data.message_id}`);
      }
    });

    // Cleanup
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ 
      expoPushToken, 
      notification,
      registerNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
```

---

### Step 2.3: เพิ่ม NotificationProvider ใน _layout.tsx

แก้ไขไฟล์: `MobileApp/app/_layout.tsx`

```typescript
import { NotificationProvider } from '@/context/NotificationContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>  {/* ← เพิ่มตรงนี้ */}
        <Stack>
          {/* ... routes ... */}
        </Stack>
      </NotificationProvider>
    </AuthProvider>
  );
}
```

---

## Phase 3: Backend Implementation

### Step 3.1: สร้าง Notification Service

สร้างไฟล์: `backend/services/notificationService.js`

```javascript
const { Expo } = require('expo-server-sdk');

// สร้าง Expo client
const expo = new Expo();

/**
 * ส่ง Push Notification ไปยังหลายคน
 * @param {Array<string>} tokens - Array ของ ExponentPushTokens
 * @param {Object} notification - { title, body, data }
 * @returns {Promise<Array>} tickets
 */
async function sendPushNotifications(tokens, notification) {
  const messages = [];
  
  // สร้าง messages array
  for (let token of tokens) {
    // เช็คว่า token ถูกต้องหรือไม่
    if (!Expo.isExpoPushToken(token)) {
      console.error(`❌ Token ${token} is not a valid Expo push token`);
      continue;
    }

    messages.push({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: 'high',
      channelId: 'default'
    });
  }

  // แบ่ง messages เป็น chunks (100 messages/chunk)
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  // ส่งแต่ละ chunk
  for (let chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
      console.log(`✓ Sent ${chunk.length} notifications`);
    } catch (error) {
      console.error('❌ Error sending chunk:', error);
    }
  }

  return tickets;
}

/**
 * ตรวจสอบสถานะการส่ง
 */
async function checkNotificationReceipts(tickets) {
  const receiptIds = tickets
    .filter(ticket => ticket.id)
    .map(ticket => ticket.id);

  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
  
  for (let chunk of receiptIdChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      
      for (let receiptId in receipts) {
        const receipt = receipts[receiptId];
        
        if (receipt.status === 'ok') {
          console.log('✓ Notification delivered');
        } else if (receipt.status === 'error') {
          console.error('✗ Error:', receipt.message);
          
          if (receipt.details?.error === 'DeviceNotRegistered') {
            console.log('⚠️ Token expired, should remove from DB');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking receipts:', error);
    }
  }
}

module.exports = {
  sendPushNotifications,
  checkNotificationReceipts
};
```

---

### Step 3.2: สร้าง API Routes

สร้างไฟล์: `backend/routes/notifications.js`

```javascript
const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const { sendPushNotifications } = require('../services/notificationService');

/**
 * POST /api/notifications/send
 * ส่ง notification ไปยัง target users
 */
router.post('/send', async (req, res) => {
  try {
    const { title, body, targetUsers, type, related_id } = req.body;

    // Validation
    if (!title || !body || !targetUsers) {
      return res.status(400).json({
        error: 'Missing required fields: title, body, targetUsers'
      });
    }

    console.log('📤 Sending notification:', { title, targetUsers });

    // ดึง tokens จาก Firestore
    let tokens = [];
    let userDocs = [];

    if (targetUsers === 'students') {
      const snapshot = await db.collection('Student')
        .where('notificationEnabled', '==', true)
        .get();
      
      userDocs = snapshot.docs;
      tokens = snapshot.docs
        .map(doc => doc.data().fcmToken)
        .filter(token => token);
        
    } else if (targetUsers === 'teachers') {
      const snapshot = await db.collection('Teacher')
        .where('notificationEnabled', '==', true)
        .get();
      
      userDocs = snapshot.docs;
      tokens = snapshot.docs
        .map(doc => doc.data().fcmToken)
        .filter(token => token);
        
    } else if (targetUsers === 'all') {
      const studentsSnapshot = await db.collection('Student')
        .where('notificationEnabled', '==', true)
        .get();
      const teachersSnapshot = await db.collection('Teacher')
        .where('notificationEnabled', '==', true)
        .get();
      
      userDocs = [...studentsSnapshot.docs, ...teachersSnapshot.docs];
      tokens = [
        ...studentsSnapshot.docs.map(doc => doc.data().fcmToken),
        ...teachersSnapshot.docs.map(doc => doc.data().fcmToken)
      ].filter(token => token);
    }

    if (tokens.length === 0) {
      return res.status(404).json({
        error: 'No users with notification tokens found'
      });
    }

    console.log(`📊 Found ${tokens.length} users with tokens`);

    // สร้าง notification document
    const notificationRef = db.collection('notification').doc();
    await notificationRef.set({
      notification_id: notificationRef.id,
      time: admin.firestore.FieldValue.serverTimestamp(),
      type: type || 'announcement',
      related_id: related_id || null,
      preview: {
        title: title,
        body: body
      }
    });

    console.log('✓ Created notification document:', notificationRef.id);

    // ส่ง Push Notifications
    const tickets = await sendPushNotifications(tokens, {
      title,
      body,
      data: {
        type: type || 'announcement',
        related_id: related_id || null,
        notification_id: notificationRef.id
      }
    });

    // เพิ่ม notification_id ลง user.notification[]
    const batch = db.batch();
    userDocs.forEach(doc => {
      batch.update(doc.ref, {
        notification: admin.firestore.FieldValue.arrayUnion(notificationRef.id)
      });
    });
    await batch.commit();

    console.log('✓ Updated user notification arrays');

    // นับผลลัพธ์
    const successCount = tickets.filter(t => t.status === 'ok').length;
    const errorCount = tickets.filter(t => t.status === 'error').length;

    res.json({
      success: true,
      message: 'Notifications sent successfully',
      results: {
        totalUsers: tokens.length,
        successCount,
        errorCount,
        notificationId: notificationRef.id
      }
    });

  } catch (error) {
    console.error('❌ Error sending notifications:', error);
    res.status(500).json({
      error: 'Failed to send notifications',
      details: error.message
    });
  }
});

/**
 * POST /api/notifications/send-to-user
 * ส่ง notification ไปยัง user คนเดียว
 */
router.post('/send-to-user', async (req, res) => {
  try {
    const { userId, userType, title, body, type, related_id } = req.body;

    if (!userId || !userType || !title || !body) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    const collectionName = userType === 'student' ? 'Student' : 'Teacher';
    const userDoc = await db.collection(collectionName).doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    if (!userData.fcmToken || !userData.notificationEnabled) {
      return res.status(400).json({ 
        error: 'User has no token or notifications disabled' 
      });
    }

    // สร้าง notification document
    const notificationRef = db.collection('notification').doc();
    await notificationRef.set({
      notification_id: notificationRef.id,
      time: admin.firestore.FieldValue.serverTimestamp(),
      type: type || 'message',
      related_id: related_id || null,
      preview: { title, body }
    });

    // ส่ง Push Notification
    const tickets = await sendPushNotifications([userData.fcmToken], {
      title,
      body,
      data: {
        type: type || 'message',
        related_id: related_id || null,
        notification_id: notificationRef.id
      }
    });

    // เพิ่ม notification_id
    await userDoc.ref.update({
      notification: admin.firestore.FieldValue.arrayUnion(notificationRef.id)
    });

    res.json({
      success: true,
      message: 'Notification sent',
      notificationId: notificationRef.id,
      ticket: tickets[0]
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      details: error.message
    });
  }
});

module.exports = router;
```

---

### Step 3.3: เพิ่ม Routes ใน server.js

แก้ไขไฟล์: `backend/server.js`

```javascript
const notificationRoutes = require('./routes/notifications');

// เพิ่ม route
app.use('/api/notifications', notificationRoutes);
```

---

## Phase 4: ทดสอบ

### Test 1: ทดสอบลงทะเบียน Token

```bash
# เปิด Mobile App
cd MobileApp
npx expo start

# เข้าสู่ระบบ → ควรเห็น Token ใน Console
```

### Test 2: ทดสอบส่ง Notification

```bash
# ใช้ Postman หรือ curl
POST http://localhost:8080/api/notifications/send

{
  "title": "ทดสอบ",
  "body": "นี่คือข้อความทดสอบ",
  "targetUsers": "students",
  "type": "test"
}
```

---

**เริ่มจาก Step 1.1 ก่อนนะครับ - ติดตั้ง Packages! 🚀**
