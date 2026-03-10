# ✅ Push Notification Implementation - COMPLETED!

---

## 🎉 สิ่งที่เราทำเสร็จแล้ว

### **Phase 1: Setup ✅**
- [x] 1.1 ติดตั้ง Packages
  - expo-notifications
  - expo-device
  - expo-server-sdk
- [x] 1.2 ตั้งค่า app.json

### **Phase 2: Mobile App ✅**
- [x] 2.1 สร้าง `notificationService.ts`
- [x] 2.2 สร้าง `NotificationContext.tsx`
- [x] 2.3 เพิ่ม `NotificationProvider` ใน `_layout.tsx`

### **Phase 3: Backend ✅**
- [x] 3.1 สร้าง `notificationService.js`
- [x] 3.2 สร้าง `notifications.js` (API Routes)
- [x] 3.3 เพิ่ม Routes ใน `app.ts`

---

## 📁 ไฟล์ที่สร้าง/แก้ไข

### **MobileApp/**
```
MobileApp/
├── app.json                              ✅ แก้ไข (เพิ่ม notification config)
├── app/_layout.tsx                       ✅ แก้ไข (เพิ่ม NotificationProvider)
├── context/
│   └── NotificationContext.tsx           ✅ สร้างใหม่
└── services/
    └── notificationService.ts            ✅ สร้างใหม่
```

### **Backend/**
```
backend/
├── src/
│   └── app.ts                            ✅ แก้ไข (เพิ่ม notification routes)
├── routes/
│   └── notifications.js                  ✅ สร้างใหม่
└── services/
    └── notificationService.js            ✅ สร้างใหม่
```

---

## 🧪 Phase 4: ทดสอบระบบ

### **Test 1: เช็คว่า Backend ทำงาน**

```bash
# เริ่ม Backend
cd backend
npm run dev

# ทดสอบ API (ใช้ browser หรือ Postman)
http://localhost:3000/api/notifications/test

# ควรได้:
{
  "success": true,
  "message": "Notification API is working!",
  "timestamp": "2025-12-03T..."
}
```

---

### **Test 2: ทดสอบ Mobile App (ลงทะเบียน Token)**

```bash
# เริ่ม Mobile App
cd MobileApp
npx expo start -c

# เปิดบนเครื่องจริง (Physical Device)
# - กด 's' เพื่อ Switch to Expo Go
# - สแกน QR Code
```

**ขั้นตอน:**
1. เปิดแอปบนมือถือ
2. Login เข้าระบบ
3. ดู Console:
```
🔔 Starting notification registration...
📋 Current permission status: granted
✓ Android notification channel created
✅ Expo Push Token: ExponentPushToken[...]
💾 Saving token to Firestore...
   Collection: Student
   User ID: 6510000001
   Token: ExponentPushToken[...]...
✅ Token saved to Firestore successfully
✅ Notification registration completed
```

4. เช็ค Firestore:
```
Student/6510000001
{
  ...existing fields...,
  fcmToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  fcmTokenUpdatedAt: Timestamp,
  notificationEnabled: true
}
```

---

### **Test 3: ทดสอบส่ง Notification**

#### **3.1 ใช้ Expo Push Tool (ทดสอบง่ายๆ)**

1. ไปที่: https://expo.dev/notifications
2. กรอก Token จาก Console: `ExponentPushToken[...]`
3. กรอก:
   - Title: "ทดสอบ"
   - Message: "นี่คือข้อความทดสอบ"
4. กด "Send a Notification"
5. มือถือควรได้รับ Notification! 🎉

---

#### **3.2 ใช้ Backend API (ทดสอบจริง)**

**ส่งหานักศึกษาทุกคน:**
```bash
POST http://localhost:3000/api/notifications/send
Content-Type: application/json

{
  "title": "ประกาศตารางสอบ",
  "body": "ตารางสอบกลางภาคประกาศแล้ว",
  "targetUsers": "students",
  "type": "exam"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notifications sent successfully",
  "results": {
    "totalUsers": 45,
    "successCount": 45,
    "errorCount": 0,
    "notificationId": "notif_abc123"
  }
}
```

---

**ส่งหาอาจารย์ทุกคน:**
```bash
POST http://localhost:3000/api/notifications/send

{
  "title": "ข่าวสำคัญ",
  "body": "มีประชุมคณะวันพรุ่งนี้",
  "targetUsers": "teachers",
  "type": "announcement"
}
```

---

**ส่งหาทุกคน:**
```bash
POST http://localhost:3000/api/notifications/send

{
  "title": "มหาวิทยาลัยปิด",
  "body": "มหาวิทยาลัยปิดวันพรุ่งนี้เนื่องจากวันหยุด",
  "targetUsers": "all",
  "type": "announcement"
}
```

---

**ส่งหาคนเดียว:**
```bash
POST http://localhost:3000/api/notifications/send-to-user

{
  "userId": "6510000001",
  "userType": "student",
  "title": "ข้อความส่วนตัว",
  "body": "อาจารย์ต้องการพบคุณ",
  "type": "message"
}
```

---

### **Test 4: ทดสอบการแตะ Notification**

1. ปิดแอป (หรือทำให้ Background)
2. ส่ง Notification ผ่าน API
3. Notification ปรากฏบนหน้าจอ
4. แตะ Notification
5. แอปเปิดขึ้นมา → Console แสดง:
```
👆 Notification Tapped!
   Data: { type: 'exam', ... }
   → Navigating to schedule
```

---

## 🎨 UI ที่เห็น

### **บนมือถือ (แอปปิดอยู่):**
```
┌─────────────────────────────┐
│ 🔔 KU Noti                  │
│                             │
│ ประกาศตารางสอบ              │
│ ตารางสอบกลางภาคประกาศแล้ว    │
│                             │
│ ตอนนี้                      │
└─────────────────────────────┘
```

### **บนมือถือ (แอปเปิดอยู่):**
แสดงแบบ In-App Alert หรือ Banner

---

## 🔧 การ Debug

### **ถ้า Token ไม่ได้:**
1. เช็คว่าใช้ Physical Device (ไม่ใช่ Simulator)
2. เช็ค Permission: Settings → KU Noti → Notifications
3. ดู Console: มี Error อะไรไหม?

### **ถ้าส่ง Notification ไม่ได้:**
1. เช็คว่า Token บันทึกใน Firestore แล้ว
2. เช็คว่า `notificationEnabled: true`
3. เช็ค Backend Console: มี Error อะไรไหม?
4. ลองใช้ Expo Push Tool ทดสอบก่อน

### **ถ้า Notification ไม่แสดง:**
1. เช็ค Permission บนมือถือ
2. เช็คว่าแอปอยู่ Background/Closed
3. ดู Backend Response: `successCount` เท่าไหร่?

---

## 📊 ตรวจสอบใน Firebase Console

1. ไปที่ Firestore Database
2. เปิด Student Collection
3. เลือก Document ใดก็ได้
4. ควรเห็น:
```
fcmToken: "ExponentPushToken[...]"
fcmTokenUpdatedAt: Timestamp(...)
notificationEnabled: true
notification: ["notif_001", "notif_002"]
```

5. เปิด notification Collection
6. ควรเห็น Documents:
```
notification/notif_001
{
  notification_id: "notif_001",
  time: Timestamp(...),
  type: "exam",
  related_id: null,
  preview: {
    title: "ประกาศตารางสอบ",
    body: "ตารางสอบกลางภาค..."
  }
}
```

---

## ✅ Checklist สุดท้าย

- [ ] Backend API ทำงาน (`/api/notifications/test`)
- [ ] Mobile App ได้รับ Token
- [ ] Token บันทึกใน Firestore
- [ ] ส่ง Notification ผ่าน Expo Push Tool ได้
- [ ] ส่ง Notification ผ่าน Backend API ได้
- [ ] Notification แสดงบนมือถือ
- [ ] แตะ Notification แล้วเปิดแอปได้
- [ ] notification Document ถูกสร้างใน Firestore
- [ ] notification_id ถูกเพิ่มใน user.notification[]

---

## 🚀 ขั้นตอนถัดไป (Optional)

### **1. สร้างหน้า Notifications List**
แสดงรายการ Notifications ทั้งหมดของ User

### **2. สร้างหน้า Admin สำหรับส่ง Notification**
UI สำหรับ Admin กด Send Notification

### **3. เพิ่ม Notification Badge**
แสดงจำนวน Notifications ที่ยังไม่อ่าน

### **4. เพิ่ม Settings หน้า Profile**
ให้ User เปิด/ปิด Notifications ได้

---

**ทดสอบดูนะครับ! 🎉**
