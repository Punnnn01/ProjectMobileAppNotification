# 🔔 แก้ไข Push Notifications ไม่ทำงาน

## ❌ ปัญหา
Push Notifications ไม่ทำงานหลังจากแก้ไข Build

## 🔍 สาเหตุ
1. App ยังใช้โค้ดเก่า (FCM) แต่ Backend ใช้ Expo Push
2. ต้อง Build APK ใหม่และติดตั้งใหม่

---

## ✅ วิธีแก้ไข

### **Step 1: แก้ไข Backend (เสร็จแล้ว ✓)**

ไฟล์ที่แก้ไข:
- ✅ `backend/src/routes/notifications.routes.ts` - ใช้ Expo Push แล้ว

---

### **Step 2: Build APK ใหม่**

```powershell
cd D:\KU\!ProjectMobileAppNotification\ProjectMobileAppNotification\MobileApp

# รันสคริปต์
complete-fix-build.bat
```

หรือ manual:
```powershell
npm uninstall @react-native-firebase/app @react-native-firebase/messaging expo-sharing
npx expo install expo-sharing expo-file-system
npm install
npx expo prebuild --clean
eas build --platform android --profile preview --clear-cache
```

---

### **Step 3: ติดตั้ง APK ใหม่**

1. ดาวน์โหลด APK จาก EAS Build
2. Uninstall แอปเก่า (สำคัญ!)
3. ติดตั้ง APK ใหม่
4. เปิดแอป → Login

---

### **Step 4: ตรวจสอบว่า Token ถูกบันทึก**

เปิด Firebase Console:
1. ไปที่ Firestore Database
2. เปิด collection `Student` หรือ `Teacher`
3. ดู document ของ user ที่ login
4. ตรวจสอบว่ามี:
   - `pushToken`: เริ่มต้นด้วย `ExponentPushToken[...]`
   - `tokenType`: `"expo"`
   - `notificationEnabled`: `true`

---

### **Step 5: ทดสอบส่ง Push Notification**

#### **วิธีที่ 1: ใช้ Script**
```bash
cd backend
test-push-notification.bat
```

#### **วิธีที่ 2: ใช้ Postman/curl**
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "title": "ทดสอบ",
    "body": "Hello from Expo Push!",
    "targetGroup": "all"
  }'
```

---

## 📊 ตรวจสอบผลลัพธ์

### **ใน Backend Console:**
```
📤 Sending notification via Expo Push...
📱 Found 2 Expo Push Tokens
✓ Created 2 valid messages
✓ Sent chunk of 2 notifications
📊 Results: 2 success, 0 errors
```

### **ใน App:**
- ได้รับ notification
- แตะแล้วเปิด App ได้

---

## 🔄 เปรียบเทียบ FCM vs Expo Push

| Feature | FCM (เก่า) | Expo Push (ใหม่) |
|---------|-----------|------------------|
| Token Format | `f...` (long) | `ExponentPushToken[...]` |
| Native Module | ต้องมี | ไม่ต้องมี |
| Build | ซับซ้อน | ง่ายกว่า |
| Backend API | Firebase Admin SDK | Expo Server SDK |
| Cost | Free | Free |

---

## 🆘 Troubleshooting

### **ปัญหา 1: Token ไม่ถูกบันทึก**
```
ตรวจสอบ:
1. App เปิด Permission แล้วหรือยัง
2. ดู Console ว่ามี error หรือไม่
3. ตรวจสอบว่า userId ถูกต้อง
```

### **ปัญหา 2: Backend ส่งไม่ได้**
```
Error: Token is not a valid Expo push token
Solution: User ต้อง Login ใหม่ด้วย App ใหม่
```

### **ปัญหา 3: ได้ Notification แต่เปิด App ไม่ได้**
```
ตรวจสอบ:
1. data.type และ data.news_id ถูกส่งมาหรือไม่
2. NotificationContext มี responseListener หรือไม่
```

---

## 📝 Backend API Endpoints

### **POST /api/notifications/send**
ส่งให้หลายคน
```json
{
  "title": "ข่าวสาร",
  "body": "มีข่าวใหม่",
  "targetGroup": "all",  // "all" | "students" | "teachers"
  "newsId": "news123"    // optional
}
```

### **POST /api/notifications/send-to-user**
ส่งให้คนใดคนหนึ่ง
```json
{
  "userId": "6511111111",
  "userType": "student",  // "student" | "teacher"
  "title": "แจ้งเตือน",
  "body": "Hello!",
  "data": {              // optional
    "type": "message"
  }
}
```

---

## ✅ Checklist

- [ ] Backend แก้แล้ว (notifications.routes.ts)
- [ ] Build APK ใหม่
- [ ] Uninstall แอปเก่า
- [ ] ติดตั้ง APK ใหม่
- [ ] Login ใหม่
- [ ] เช็ค Token ใน Firestore
- [ ] ทดสอบส่ง Push
- [ ] ได้รับ Notification

---

## 🎯 Expected Result

หลังทำตามขั้นตอน:
```
✅ App ลงทะเบียน Expo Push Token
✅ Backend ส่ง Notification ผ่าน Expo API
✅ User ได้รับ Notification
✅ แตะแล้วเปิด App ได้
```

---

**Updated:** 2025-12-08
**Status:** Backend แก้แล้ว - รอ Build APK ใหม่
