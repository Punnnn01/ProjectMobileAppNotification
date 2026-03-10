# 🚀 Expo Push Notifications - Quick Start Guide

---

## 📱 Expo Push Notifications คืออะไร?

**Expo Push Notifications** เป็นระบบส่ง Push Notification ที่ Expo สร้างขึ้นมาเพื่อให้ง่ายกว่า FCM โดยตรง

### ✨ ข้อดี

✅ **ใช้งานง่ายกว่า FCM**  
✅ **ไม่ต้องตั้งค่า FCM แยก** (Expo จัดการให้)  
✅ **รองรับ iOS, Android, Web**  
✅ **ฟรี!** (ส่งได้ไม่จำกัด)  
✅ **มี Dashboard ทดสอบ**

---

## 🔄 เปรียบเทียบ Expo Push vs FCM โดยตรง

| Feature | Expo Push Notifications | Firebase FCM (โดยตรง) |
|---------|------------------------|----------------------|
| **ติดตั้ง Package** | `expo-notifications` (1 package) | หลาย packages |
| **Configuration** | ✅ ง่าย (แค่ใน app.json) | ⚠️ ซับซ้อน |
| **iOS Setup** | ✅ อัตโนมัติ | ⚠️ ต้องตั้งค่า APNs |
| **Android Setup** | ✅ อัตโนมัติ | ⚠️ ต้องตั้งค่า google-services.json |
| **Token Format** | `ExponentPushToken[...]` | `fcm-token-...` |
| **Backend** | Expo Push API | FCM API |
| **ราคา** | 🆓 ฟรี | 🆓 ฟรี |
| **แนะนำสำหรับ** | Expo Apps | Native Apps |

---

## 🏗️ สถาปัตยกรรม Expo Push Notifications

```
┌──────────────┐
│  Mobile App  │ (React Native/Expo)
└──────┬───────┘
       │ 1. ขอ Permission
       │ 2. รับ ExponentPushToken
       ▼
┌──────────────┐
│  Firestore   │ เก็บ Token
│  Database    │
└──────┬───────┘
       │ 3. Backend ดึง Tokens
       ▼
┌──────────────┐
│   Backend    │ (Node.js)
│   Server     │
└──────┬───────┘
       │ 4. ส่ง Request ไปที่ Expo
       ▼
┌──────────────┐
│  Expo Push   │ Expo's Server
│  Service     │
└──────┬───────┘
       │ 5. ส่งต่อไปที่ FCM/APNs
       ├──────────┬──────────┐
       ▼          ▼          ▼
   ┌──────┐  ┌──────┐  ┌──────┐
   │ iOS  │  │Android│ │Android│
   │Device│  │Device│  │Device│
   └──────┘  └──────┘  └──────┘
```

---

## 📦 Package ที่ต้องใช้

### Mobile App (React Native/Expo)

```bash
npx expo install expo-notifications
npx expo install expo-device
npx expo install expo-constants
```

### Backend (Node.js)

```bash
npm install expo-server-sdk
```

---

## ⚙️ การตั้งค่า

### 1. app.json Configuration

```json
{
  "expo": {
    "name": "KU Noti",
    "slug": "ku-noti",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#1B8B6A",
          "sounds": ["./assets/notification-sound.wav"],
          "mode": "production"
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#1B8B6A",
      "androidMode": "default",
      "androidCollapsedTitle": "{{unread_count}} ข้อความใหม่"
    },
    "android": {
      "package": "com.yourcompany.kunoti",
      "googleServicesFile": "./google-services.json",
      "permissions": [
        "NOTIFICATIONS"
      ]
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.kunoti",
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

## 📱 Mobile App Code Structure

### File Structure

```
MobileApp/
├── context/
│   └── NotificationContext.tsx    ← สร้างใหม่
├── hooks/
│   └── useNotifications.ts        ← สร้างใหม่
├── services/
│   └── notificationService.ts     ← สร้างใหม่
└── app/
    └── (tabs)/
        └── notifications.tsx       ← สร้างใหม่
```

---

## 🔔 ขั้นตอนการทำงาน (Step by Step)

### Step 1: ขอ Permission

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

async function registerForPushNotifications() {
  // 1. เช็คว่าเป็น Physical Device หรือไม่
  if (!Device.isDevice) {
    alert('Push notifications ต้องใช้บนเครื่องจริง');
    return;
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
    alert('ไม่สามารถส่งการแจ้งเตือนได้');
    return;
  }

  // 5. รับ Expo Push Token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-project-id' // จาก app.json
  });

  console.log('Expo Push Token:', token.data);
  return token.data;
}
```

---

### Step 2: บันทึก Token ลง Firestore

```typescript
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

async function saveTokenToFirestore(userId: string, userType: 'student' | 'teacher', token: string) {
  try {
    const collectionName = userType === 'student' ? 'Student' : 'Teacher';
    const userRef = doc(db, collectionName, userId);
    
    await updateDoc(userRef, {
      fcmToken: token,
      fcmTokenUpdatedAt: new Date(),
      notificationEnabled: true
    });
    
    console.log('✓ Token saved to Firestore');
  } catch (error) {
    console.error('Error saving token:', error);
  }
}
```

---

### Step 3: ฟัง Notification เข้ามา

```typescript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

// ตั้งค่าว่าจะทำอะไรเมื่อ Notification เข้ามา
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,    // แสดง Alert
    shouldPlaySound: true,    // เล่นเสียง
    shouldSetBadge: true,     // แสดงตัวเลขแบดจ์
  }),
});

export function useNotifications() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // ฟังเมื่อได้รับ Notification (แอปเปิดอยู่)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification Received:', notification);
      
      // แสดง Alert หรือ Modal ใน App
      const { title, body } = notification.request.content;
      Alert.alert(title || 'การแจ้งเตือน', body || '');
    });

    // ฟังเมื่อ User แตะ Notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification Tapped:', response);
      
      const data = response.notification.request.content.data;
      
      // นำทางตาม data.type
      if (data.type === 'exam_schedule') {
        router.push('/schedule');
      } else if (data.type === 'news') {
        router.push('/news');
      } else if (data.type === 'message') {
        router.push('/chat');
      }
    });

    // Cleanup
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);
}
```

---

## 🖥️ Backend Code

### Setup Expo Server SDK

```javascript
// backend/services/notificationService.js
const { Expo } = require('expo-server-sdk');

// สร้าง Expo client
const expo = new Expo();

/**
 * ส่ง Push Notification ไปยังหลายคน
 * @param {Array<string>} tokens - Array ของ ExponentPushTokens
 * @param {Object} notification - { title, body, data }
 */
async function sendPushNotifications(tokens, notification) {
  // สร้าง messages array
  const messages = [];
  
  for (let token of tokens) {
    // เช็คว่า token ถูกต้องหรือไม่
    if (!Expo.isExpoPushToken(token)) {
      console.error(`Token ${token} is not a valid Expo push token`);
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
    } catch (error) {
      console.error('Error sending chunk:', error);
    }
  }

  return tickets;
}

module.exports = { sendPushNotifications };
```

---

### API Route

```javascript
// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { sendPushNotifications } = require('../services/notificationService');

/**
 * POST /api/notifications/send
 * ส่ง notification ไปยัง target users
 */
router.post('/send', async (req, res) => {
  try {
    const { title, body, targetUsers, data } = req.body;

    // Validation
    if (!title || !body || !targetUsers) {
      return res.status(400).json({
        error: 'Missing required fields: title, body, targetUsers'
      });
    }

    // ดึง tokens จาก Firestore
    let tokens = [];

    if (targetUsers === 'students') {
      const studentsSnapshot = await db.collection('Student')
        .where('notificationEnabled', '==', true)
        .get();
      
      tokens = studentsSnapshot.docs
        .map(doc => doc.data().fcmToken)
        .filter(token => token); // กรองเฉพาะที่มี token
        
    } else if (targetUsers === 'teachers') {
      const teachersSnapshot = await db.collection('Teacher')
        .where('notificationEnabled', '==', true)
        .get();
      
      tokens = teachersSnapshot.docs
        .map(doc => doc.data().fcmToken)
        .filter(token => token);
        
    } else if (targetUsers === 'all') {
      const studentsSnapshot = await db.collection('Student')
        .where('notificationEnabled', '==', true)
        .get();
      const teachersSnapshot = await db.collection('Teacher')
        .where('notificationEnabled', '==', true)
        .get();
      
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

    // ส่ง notifications
    const tickets = await sendPushNotifications(tokens, {
      title,
      body,
      data: data || {}
    });

    // นับผลลัพธ์
    const successCount = tickets.filter(t => t.status === 'ok').length;
    const errorCount = tickets.filter(t => t.status === 'error').length;

    res.json({
      success: true,
      message: 'Notifications sent',
      results: {
        totalUsers: tokens.length,
        successCount,
        errorCount,
        tickets
      }
    });

  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({
      error: 'Failed to send notifications',
      details: error.message
    });
  }
});

module.exports = router;
```

---

## 🧪 ทดสอบ Push Notification

### วิธีที่ 1: ผ่าน Expo Push Tool

1. ไปที่ https://expo.dev/notifications
2. กรอก Token (ExponentPushToken[...])
3. กรอก Title, Message
4. กด "Send a Notification"

### วิธีที่ 2: ผ่าน Postman

```bash
POST https://exp.host/--/api/v2/push/send

Headers:
Content-Type: application/json

Body:
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "ทดสอบ",
  "body": "นี่คือข้อความทดสอบ",
  "data": {
    "type": "test"
  }
}
```

---

## 📊 Notification Status

### ตรวจสอบสถานะการส่ง

```javascript
async function checkNotificationStatus(tickets) {
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
            // Token หมดอายุ → ลบออกจาก Database
            console.log('Token expired, should remove from DB');
          }
        }
      }
    } catch (error) {
      console.error('Error checking receipts:', error);
    }
  }
}
```

---

## 🎯 ตัวอย่าง Use Cases

### Use Case 1: ส่งหาทุกคน

```javascript
// Admin กดส่งข่าว
POST /api/notifications/send
{
  "title": "ข่าวสำคัญ",
  "body": "มหาวิทยาลัยปิดวันพรุ่งนี้",
  "targetUsers": "all"
}
```

### Use Case 2: ส่งหานักศึกษาเท่านั้น

```javascript
POST /api/notifications/send
{
  "title": "ตารางสอบ",
  "body": "ตารางสอบกลางภาคประกาศแล้ว",
  "targetUsers": "students",
  "data": {
    "type": "exam_schedule",
    "link": "/schedule"
  }
}
```

### Use Case 3: ส่งหาคนเดียว

```javascript
POST /api/notifications/send-to-user
{
  "userId": "6510000001",
  "userType": "student",
  "title": "ข้อความใหม่",
  "body": "อาจารย์ส่งข้อความหาคุณ"
}
```

---

## ⚠️ ข้อควรระวัง

### 1. Token หมดอายุ

```javascript
// ตรวจสอบและลบ invalid tokens
if (receipt.details?.error === 'DeviceNotRegistered') {
  await db.collection('Student').doc(userId).update({
    fcmToken: null,
    notificationEnabled: false
  });
}
```

### 2. Rate Limiting

- Expo จำกัดไม่เกิน **100 notifications ต่อ second**
- ใช้ `expo.chunkPushNotifications()` เพื่อแบ่ง batch

### 3. Android Channel ID

```typescript
// สร้าง Notification Channel (Android)
await Notifications.setNotificationChannelAsync('default', {
  name: 'Default',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#1B8B6A',
});
```

---

## ✅ Checklist

- [ ] ติดตั้ง `expo-notifications`
- [ ] ตั้งค่า `app.json`
- [ ] สร้าง NotificationContext
- [ ] ขอ Permission
- [ ] รับและบันทึก Token
- [ ] ฟัง Notification
- [ ] ติดตั้ง `expo-server-sdk` ใน Backend
- [ ] สร้าง API Route
- [ ] ทดสอบส่ง Notification
- [ ] Handle Navigation

---

**พร้อมเริ่มทำจริงเมื่อไหร่บอกได้เลยครับ! 🚀**
