# 📱 Firebase Push Notification - คู่มือฉบับสมบูรณ์

---

## 📚 สารบัญ

1. [Push Notification คืออะไร?](#1-push-notification-คืออะไร)
2. [Firebase Cloud Messaging (FCM) คืออะไร?](#2-firebase-cloud-messaging-fcm-คืออะไร)
3. [ระบบทำงานของ Push Notification](#3-ระบบทำงานของ-push-notification)
4. [ขั้นตอนการตั้งค่า Firebase](#4-ขั้นตอนการตั้งค่า-firebase)
5. [ส่วนประกอบที่ต้องใช้](#5-ส่วนประกอบที่ต้องใช้)
6. [วิธีการทำงาน (Flow)](#6-วิธีการทำงาน-flow)
7. [ตัวอย่าง Use Cases](#7-ตัวอย่าง-use-cases)
8. [แผนภาพระบบ](#8-แผนภาพระบบ)

---

## 1. Push Notification คืออะไร?

**Push Notification** คือ ข้อความแจ้งเตือนที่แอปส่งมาให้ผู้ใช้ **แม้ว่าแอปจะไม่ได้เปิดอยู่**

### ✨ ตัวอย่างที่เห็นในชีวิตจริง:

```
📱 LINE
"คุณมี 3 ข้อความใหม่"

📱 Facebook
"มี 5 การแจ้งเตือนใหม่"

📱 Shopee
"Flash Sale กำลังจะเริ่ม!"

📱 KU Noti (แอปของคุณ)
"มีตารางสอบใหม่ประกาศแล้ว"
```

---

## 2. Firebase Cloud Messaging (FCM) คืออะไร?

**FCM** คือบริการส่ง Push Notification ของ Google **ฟรี!** ที่รองรับ:

✅ **Android**  
✅ **iOS**  
✅ **Web**  
✅ **ส่งได้ไม่จำกัดจำนวน**  
✅ **ไม่มีค่าใช้จ่าย**

---

## 3. ระบบทำงานของ Push Notification

### 📊 Diagram: ขั้นตอนการส่ง Notification

```
┌─────────────┐
│   Admin     │ กดส่งการแจ้งเตือน
│ (my_Admin)  │
└──────┬──────┘
       │
       │ 1. POST /api/send-notification
       ▼
┌─────────────┐
│   Backend   │ รับคำขอและเตรียมข้อมูล
│  (Node.js)  │
└──────┬──────┘
       │
       │ 2. ส่งข้อมูลไปที่ FCM
       ▼
┌─────────────┐
│   Firebase  │ ระบบ FCM ของ Google
│     FCM     │
└──────┬──────┘
       │
       │ 3. ส่ง notification ไปยังอุปกรณ์
       ├───────────┬───────────┬───────────┐
       ▼           ▼           ▼           ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │ Phone1 │ │ Phone2 │ │ Phone3 │ │ Phone4 │
   │ Student│ │ Student│ │ Teacher│ │ Student│
   └────────┘ └────────┘ └────────┘ └────────┘
   แสดง         แสดง        แสดง        แสดง
   Notification Notification Notification Notification
```

---

## 4. ขั้นตอนการตั้งค่า Firebase

### 📝 ขั้นตอนที่ 1: เปิดใช้งาน FCM

1. ไปที่ https://console.firebase.google.com
2. เลือกโปรเจค "ProjectMobileAppNotification"
3. ไปที่ **Cloud Messaging** (เมนูซ้าย)
4. คลิก **"Enable Cloud Messaging API"**

### 📝 ขั้นตอนที่ 2: ดาวน์โหลด Server Key

```
Firebase Console → Project Settings → Cloud Messaging → Server key
```

คัดลอก **Server Key** (เก็บไว้ในไฟล์ .env)

### 📝 ขั้นตอนที่ 3: ติดตั้ง Package (ยังไม่ทำ แค่ดู)

**สำหรับ Mobile App (React Native/Expo):**
```bash
npx expo install expo-notifications
npx expo install expo-device
npx expo install expo-constants
```

**สำหรับ Backend (Node.js):**
```bash
npm install firebase-admin
```

---

## 5. ส่วนประกอบที่ต้องใช้

### 🔑 5.1 FCM Token

**FCM Token** คือ "รหัสอุปกรณ์" ที่ Firebase สร้างให้กับแต่ละเครื่อง

```javascript
ตัวอย่าง FCM Token:
"ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
// หรือ
"fcm-token-1234567890abcdef..."
```

**แต่ละเครื่องมี Token ต่างกัน**

```
Student A (iPhone)  → Token: "abc123..."
Student B (Android) → Token: "def456..."
Teacher (iPad)      → Token: "ghi789..."
```

---

### 📦 5.2 Notification Payload

**Payload** คือข้อมูลที่ส่งไปกับ Notification

```javascript
{
  "title": "ตารางสอบใหม่",              // หัวข้อ
  "body": "ตารางสอบกลางภาคประกาศแล้ว",  // ข้อความ
  "data": {                             // ข้อมูลเพิ่มเติม (optional)
    "type": "exam_schedule",
    "examId": "exam_001",
    "link": "/schedule"
  }
}
```

---

### 🔔 5.3 ประเภทของ Notification

#### **1. Notification Message** (แสดงบนหน้าจอ)
```javascript
{
  notification: {
    title: "ข่าวใหม่",
    body: "มีข่าวใหม่ 5 รายการ"
  }
}
```
✅ แสดงโดยอัตโนมัติ  
✅ ไม่ต้องเขียนโค้ดจัดการ  
❌ จัดการ data ไม่ได้

#### **2. Data Message** (ส่ง data เงียบๆ)
```javascript
{
  data: {
    type: "news",
    newsId: "123",
    action: "refresh"
  }
}
```
❌ ไม่แสดงอัตโนมัติ  
✅ ต้องเขียนโค้ดจัดการเอง  
✅ ควบคุมได้ทุกอย่าง

---

## 6. วิธีการทำงาน (Flow)

### 📱 Flow 1: ลงทะเบียนรับ Notification (ครั้งแรก)

```
1. User เปิดแอป
   ↓
2. แอปขอ Permission ให้ส่ง Notification
   "อนุญาตให้ส่งการแจ้งเตือนไหม?"
   [อนุญาต] [ไม่อนุญาต]
   ↓
3. ถ้าอนุญาต → FCM สร้าง Token
   Token: "ExponentPushToken[abc123...]"
   ↓
4. แอปส่ง Token ไปเก็บใน Firestore
   Student/6510000001 → { fcmToken: "ExponentPushToken[abc123...]" }
```

**Code Concept (ยังไม่ต้องเขียน):**
```javascript
// 1. ขอ Permission
const { status } = await Notifications.requestPermissionsAsync();

// 2. รับ Token
const token = await Notifications.getExpoPushTokenAsync();

// 3. บันทึก Token ลง Firestore
await db.collection('Student').doc(studentId).update({
  fcmToken: token.data
});
```

---

### 🔔 Flow 2: ส่ง Notification

```
1. Admin เปิดหน้า Admin App
   ↓
2. กรอกข้อมูล:
   - หัวข้อ: "ตารางสอบใหม่"
   - ข้อความ: "ตารางสอบกลางภาคประกาศแล้ว"
   - ส่งถึง: [นักศึกษาทุกคน]
   ↓
3. กดปุ่ม "ส่งการแจ้งเตือน"
   ↓
4. Admin App ส่ง POST /api/send-notification
   ↓
5. Backend ดึง FCM Tokens ของนักศึกษาทั้งหมด
   [
     "ExponentPushToken[abc123...]",
     "ExponentPushToken[def456...]",
     "ExponentPushToken[ghi789...]"
   ]
   ↓
6. Backend เรียก Firebase Admin SDK
   admin.messaging().sendMulticast({
     tokens: [...],
     notification: { title, body }
   })
   ↓
7. Firebase ส่ง Notification ไปยังอุปกรณ์ทั้งหมด
   ↓
8. มือถือแสดง Notification 🔔
```

---

### 📲 Flow 3: รับ Notification บนมือถือ

```
1. FCM ส่ง Notification มาที่มือถือ
   ↓
2. แอปมี 3 สถานะ:

   ┌─────────────────────────────────────┐
   │ สถานะ 1: แอปปิดอยู่ (Background)     │
   │ → แสดง Notification บนหน้าจอ        │
   │ → User แตะ → เปิดแอป                 │
   └─────────────────────────────────────┘

   ┌─────────────────────────────────────┐
   │ สถานะ 2: แอปเปิดอยู่แต่ไม่ Focus     │
   │ → แสดง Notification บนหน้าจอ        │
   │ → User แตะ → เปิดแอปและไปหน้าที่ต้องการ│
   └─────────────────────────────────────┘

   ┌─────────────────────────────────────┐
   │ สถานะ 3: แอปเปิดอยู่และ Focus        │
   │ → ไม่แสดง Notification บนหน้าจอ     │
   │ → เรียก Event Handler                │
   │ → แสดง Alert/Modal ภายในแอป         │
   └─────────────────────────────────────┘
```

**Code Concept:**
```javascript
// ฟังเมื่อมี Notification เข้ามา
Notifications.addNotificationReceivedListener(notification => {
  console.log('Notification:', notification);
  // แสดง Modal หรือ Alert
});

// ฟังเมื่อ User แตะ Notification
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  // นำทางไปหน้าที่ต้องการ
  if (data.type === 'exam_schedule') {
    router.push('/schedule');
  }
});
```

---

## 7. ตัวอย่าง Use Cases

### 🎯 Use Case 1: แจ้งเตือนตารางสอบใหม่

```
Admin → กด "ประกาศตารางสอบ"
      ↓
Backend → ส่ง Notification ไปยัง "นักศึกษาทุกคน"
      ↓
นักศึกษา → รับ Notification "ตารางสอบกลางภาคประกาศแล้ว"
      ↓
แตะ Notification → เปิดแอป → ไปหน้า Schedule
```

---

### 🎯 Use Case 2: แจ้งเตือนข่าวใหม่

```
Admin → โพสต์ข่าวใหม่
      ↓
Backend → ส่ง Notification ไปยัง "ทุกคน"
      ↓
User → รับ Notification "มีข่าวใหม่: ปิดเทอม 2 สัปดาห์"
      ↓
แตะ Notification → เปิดแอป → ไปหน้า News
```

---

### 🎯 Use Case 3: แจ้งเตือนนิสิตเฉพาะคน

```
อาจารย์ → ส่งข้อความหานิสิต
      ↓
Backend → ส่ง Notification ไปยัง "นิสิตคนนั้นเท่านั้น"
      ↓
นิสิต → รับ Notification "อาจารย์ส่งข้อความหาคุณ"
      ↓
แตะ Notification → เปิดแอป → ไปหน้าแชท
```

---

## 8. แผนภาพระบบ

### 🏗️ สถาปัตยกรรมระบบ Push Notification

```
┌───────────────────────────────────────────────────────────────┐
│                     Firebase Console                          │
│  - Cloud Messaging API                                        │
│  - Server Key Management                                      │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             │ Server Key
                             ▼
┌───────────────────────────────────────────────────────────────┐
│                     Backend Server (Node.js)                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Firebase Admin SDK                                   │   │
│  │  - admin.messaging().send()                          │   │
│  │  - admin.messaging().sendMulticast()                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes                                           │   │
│  │  - POST /api/send-notification                       │   │
│  │  - POST /api/send-to-student/:id                     │   │
│  │  - POST /api/send-to-teachers                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             │ HTTP Request
                             ▼
┌───────────────────────────────────────────────────────────────┐
│                     Firestore Database                        │
│                                                               │
│  Student/{studentId}                                          │
│  {                                                            │
│    personal_info: {...},                                      │
│    fcmToken: "ExponentPushToken[...]",  ← เก็บ Token        │
│    ...                                                        │
│  }                                                            │
│                                                               │
│  Teacher/{teacherId}                                          │
│  {                                                            │
│    personal_info: {...},                                      │
│    fcmToken: "ExponentPushToken[...]",  ← เก็บ Token        │
│    ...                                                        │
│  }                                                            │
└───────────────────────────────────────────────────────────────┘
                             │
                             │ Query Tokens
                             ▼
┌───────────────────────────────────────────────────────────────┐
│                   Firebase Cloud Messaging                    │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Queue 1    │    │   Queue 2    │    │   Queue 3    │  │
│  │  iOS Devices │    │Android Device│    │ Web Browsers │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │ Student  │ │ Teacher  │ │ Student  │
         │  Phone   │ │  Phone   │ │  Phone   │
         │          │ │          │ │          │
         │  iOS 📱  │ │Android 📱│ │Android 📱│
         └──────────┘ └──────────┘ └──────────┘
              │            │            │
              │            │            │
              ▼            ▼            ▼
         ┌──────────────────────────────────┐
         │  Mobile App (React Native/Expo)  │
         │                                  │
         │  ┌────────────────────────────┐ │
         │  │ expo-notifications         │ │
         │  │ - Register FCM Token       │ │
         │  │ - Listen for Notifications │ │
         │  │ - Handle User Interactions │ │
         │  └────────────────────────────┘ │
         └──────────────────────────────────┘
```

---

### 🔄 Flow การส่ง Notification แบบละเอียด

```
     ┌─────────┐
     │  Admin  │
     │   Web   │
     └────┬────┘
          │ 1. กรอกข้อมูล + กดส่ง
          ▼
     ┌─────────────────────────┐
     │  Admin Frontend         │
     │  - Title: "ตารางสอบ"   │
     │  - Body: "ประกาศแล้ว"  │
     │  - Target: "Students"   │
     └────┬────────────────────┘
          │ 2. POST /api/send-notification
          ▼
     ┌─────────────────────────┐
     │   Backend API           │
     │   /api/send-notification│
     └────┬────────────────────┘
          │ 3. ดึง Tokens จาก Firestore
          ▼
     ┌─────────────────────────┐
     │  Firestore Query        │
     │  db.collection('Student')│
     │    .get()               │
     └────┬────────────────────┘
          │ 4. Return Tokens
          │    ["Token1", "Token2", ...]
          ▼
     ┌─────────────────────────┐
     │  Backend Processing     │
     │  - สร้าง Payload        │
     │  - เรียก Firebase Admin │
     └────┬────────────────────┘
          │ 5. admin.messaging().sendMulticast()
          ▼
     ┌─────────────────────────┐
     │  Firebase Cloud         │
     │  Messaging (FCM)        │
     └────┬────────────────────┘
          │ 6. ส่ง Notification ไปยังอุปกรณ์
          ├──────────┬──────────┐
          ▼          ▼          ▼
     ┌────────┐ ┌────────┐ ┌────────┐
     │Phone 1 │ │Phone 2 │ │Phone 3 │
     └────┬───┘ └────┬───┘ └────┬───┘
          │          │          │
          │ 7. แสดง Notification
          ▼          ▼          ▼
     ┌────────┐ ┌────────┐ ┌────────┐
     │  🔔    │ │  🔔    │ │  🔔    │
     │ตาราง  │ │ตาราง  │ │ตาราง  │
     │สอบ...│ │สอบ...│ │สอบ...│
     └────────┘ └────────┘ └────────┘
```

---

## 9. ข้อมูลที่ต้องเก็บใน Database

### 📊 เพิ่ม Field ใน Student/Teacher Collections

```javascript
Student/{studentId}
{
  student_id: "6510000001",
  personal_info: {...},
  fcmToken: "ExponentPushToken[abc123...]",  // ← เพิ่มใหม่
  fcmTokenUpdatedAt: Timestamp,              // ← เพิ่มใหม่
  notificationEnabled: true,                 // ← เพิ่มใหม่
  ...
}

Teacher/{teacherId}
{
  teacher_id: "1234567890",
  personal_info: {...},
  fcmToken: "ExponentPushToken[def456...]",  // ← เพิ่มใหม่
  fcmTokenUpdatedAt: Timestamp,              // ← เพิ่มใหม่
  notificationEnabled: true,                 // ← เพิ่มใหม่
  ...
}
```

---

## 10. ตัวอย่าง API Request/Response

### 📤 Request: ส่ง Notification

```javascript
POST /api/send-notification
Content-Type: application/json

{
  "title": "ตารางสอบใหม่",
  "body": "ตารางสอบกลางภาคประกาศแล้ว",
  "targetUsers": "students",  // "students", "teachers", "all"
  "data": {
    "type": "exam_schedule",
    "link": "/schedule"
  }
}
```

### 📥 Response: ผลการส่ง

```javascript
{
  "success": true,
  "message": "Sent notifications successfully",
  "results": {
    "successCount": 45,
    "failureCount": 2,
    "totalUsers": 47,
    "failedTokens": [
      "ExpiredToken[xyz...]",
      "InvalidToken[abc...]"
    ]
  }
}
```

---

## 11. ข้อควรรู้และข้อจำกัด

### ⚠️ ข้อจำกัดของ FCM

1. **Token หมดอายุ**
   - FCM Token อาจหมดอายุเมื่อ:
     - ผู้ใช้ลบแอป
     - ผู้ใช้ Clear app data
     - Token ไม่ถูกใช้งานนาน (>70 วัน)
   
   **แก้ไข:** ต้องมีระบบ Refresh Token

2. **Rate Limit**
   - ส่งได้ไม่เกิน **500 devices ต่อ request**
   - ต้อง batch ถ้าส่งมากกว่านี้

3. **Delivery ไม่รับประกัน**
   - ถ้ามือถือปิด → จะได้เมื่อเปิดใหม่
   - ถ้าไม่มี internet → จะได้เมื่อมี internet

---

### ✅ Best Practices

1. **เก็บ Token ให้ถูกต้อง**
   ```javascript
   // บันทึก Token ทุกครั้งที่แอปเปิด
   useEffect(() => {
     updateFCMToken();
   }, []);
   ```

2. **จัดการ Permission**
   ```javascript
   // ขอ Permission แบบสุภาพ
   Alert.alert(
     'การแจ้งเตือน',
     'เราต้องการส่งการแจ้งเตือนข่าวสารและตารางสอบให้คุณ',
     [
       { text: 'ไม่ต้องการ', style: 'cancel' },
       { text: 'อนุญาต', onPress: requestPermission }
     ]
   );
   ```

3. **Handle Error**
   ```javascript
   try {
     await sendNotification(...);
   } catch (error) {
     // ลบ Token ที่ invalid
     if (error.code === 'messaging/invalid-registration-token') {
       await removeInvalidToken(token);
     }
   }
   ```

---

## 12. เปรียบเทียบ Push Notification vs In-App Notification

| Feature | Push Notification | In-App Notification |
|---------|------------------|-------------------|
| **แสดงเมื่อ** | แอปปิดอยู่ก็ได้ | เฉพาะเมื่อเปิดแอป |
| **ต้องการ Permission** | ✅ ต้อง | ❌ ไม่ต้อง |
| **ทำงานผ่าน** | Firebase FCM | แอปเอง |
| **ข้อจำกัด** | อาจไม่ส่งถึง | ต้องเปิดแอป |
| **Use Case** | ข่าวสำคัญ | การแจ้งเตือนทั่วไป |

**ในโปรเจคนี้ควรใช้ทั้ง 2 แบบ:**
- **Push Notification**: ข่าวสำคัญ, ตารางสอบ
- **In-App Notification**: การแจ้งเตือนทั่วไป, อัปเดตเล็กๆ น้อยๆ

---

## 13. สรุป

### ✅ สิ่งที่ต้องทำ (ลำดับขั้นตอน)

1. **เปิดใช้งาน FCM** ใน Firebase Console
2. **ติดตั้ง Package** (expo-notifications, firebase-admin)
3. **แก้ไข Mobile App**:
   - ขอ Permission
   - รับ FCM Token
   - บันทึก Token ลง Firestore
   - ฟัง Notification เข้ามา
4. **แก้ไข Backend**:
   - ติดตั้ง Firebase Admin SDK
   - สร้าง API /api/send-notification
   - ดึง Tokens จาก Firestore
   - ส่ง Notification ผ่าน FCM
5. **แก้ไข Admin App**:
   - สร้างหน้าส่ง Notification
   - เชื่อมต่อกับ Backend API
6. **ทดสอบ**:
   - ทดสอบส่ง Notification
   - ทดสอบรับ Notification
   - ทดสอบ Navigation เมื่อแตะ

---

## 📚 ขั้นตอนถัดไป

เมื่อคุณพร้อมแล้ว บอกผมได้เลยครับ ผมจะช่วย:

1. ✅ ตั้งค่า Firebase Cloud Messaging
2. ✅ แก้ไข Mobile App (รับ Notification)
3. ✅ แก้ไข Backend (ส่ง Notification)
4. ✅ สร้างหน้า Admin (UI สำหรับส่ง Notification)

**พร้อมเริ่มเมื่อไหร่บอกได้เลยครับ! 😊**
