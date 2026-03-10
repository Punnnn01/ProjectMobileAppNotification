# 🔔 คู่มือทดสอบ Push Notifications

## ⚠️ สำคัญ: Push Notifications ไม่ทำงานบน Web!

Push Notifications ทำงานเฉพาะ:
- ✅ Android App (APK)
- ✅ iOS App
- ❌ Web Browser (localhost)

---

## 📋 Checklist ก่อนทดสอบ

### ✅ **1. Mobile App ต้อง Build ใหม่**
```powershell
cd MobileApp
.\complete-fix-build.bat
```

### ✅ **2. ติดตั้ง APK ใหม่**
- Uninstall แอปเก่า
- ติดตั้ง APK ใหม่จาก EAS Build
- เปิดแอป

### ✅ **3. Login ใหม่**
- Login ด้วย user account
- App จะลงทะเบียน Expo Push Token

### ✅ **4. ตรวจสอบ Token ใน Firestore**
Firebase Console → Firestore Database:
```
Collection: Student หรือ Teacher
Document: [user_id]

ต้องมี:
{
  "pushToken": "ExponentPushToken[xxx...]",
  "tokenType": "expo",
  "notificationEnabled": true,
  "pushTokenUpdatedAt": [timestamp],
  "devicePlatform": "android"
}
```

❌ **ถ้าไม่มี** → App ยังใช้โค้ดเก่า, ต้อง Build ใหม่
❌ **ถ้า tokenType เป็น "fcm"** → App ยังใช้โค้ดเก่า, ต้อง Build ใหม่

---

## 🧪 วิธีทดสอบ

### **วิธีที่ 1: ใช้ Node.js Script (แนะนำ)**

```bash
# 1. ไปที่ backend folder
cd backend

# 2. รัน test script
node test-send-push.js
```

**Expected Output:**
```
🔔 Testing Push Notification...

✅ Response: {
  success: true,
  sentCount: 2,
  failedCount: 0,
  totalTokens: 2
}

Results:
  - Sent: 2
  - Failed: 0
  - Total Tokens: 2
```

---

### **วิธีที่ 2: ใช้ Postman/curl**

```bash
# POST request
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "title": "ทดสอบ",
    "body": "Hello World!",
    "targetGroup": "all"
  }'
```

---

### **วิธีที่ 3: ใช้ Admin Panel (ถ้ามี)**

1. เปิด Admin Panel
2. ไปที่หน้าส่ง Notifications
3. กรอก Title และ Body
4. เลือก Target Group
5. กดส่ง

---

## 📱 ตรวจสอบว่าได้รับ Notification

### **บน Mobile App:**

1. **App เปิดอยู่ (Foreground):**
   ```
   📬 Foreground Notification received
   [แสดง notification banner บน app]
   ```

2. **App ปิดอยู่/Background:**
   ```
   🔔 [Notification ปรากฏใน notification tray]
   ```

3. **แตะ Notification:**
   ```
   👆 Notification Tapped!
   → Navigating to news/xxx (ถ้ามี newsId)
   → Navigating to home (ถ้าไม่มี)
   ```

---

## 🔍 Troubleshooting

### **ปัญหา 1: ส่งแล้วไม่ได้รับ**

**เช็ค Backend Console:**
```
❌ No tokens found!
```

**วิธีแก้:**
1. ตรวจสอบ Firestore ว่ามี Token หรือไม่
2. ตรวจสอบว่า `notificationEnabled: true`
3. ตรวจสอบว่า `tokenType: "expo"`

---

### **ปัญหา 2: Error "Token is not valid"**

**Backend Response:**
```json
{
  "sentCount": 0,
  "failedCount": 2,
  "errors": ["Token is not a valid Expo push token"]
}
```

**สาเหตุ:** Token ยังเป็น FCM Token (โค้ดเก่า)

**วิธีแก้:**
1. Build APK ใหม่
2. ติดตั้ง APK ใหม่
3. Login ใหม่

---

### **ปัญหา 3: Permission Denied**

**Mobile App Console:**
```
❌ Permission denied
```

**วิธีแก้:**
1. เปิด Settings → Apps → [App Name] → Notifications
2. เปิดการแจ้งเตือน (Allow)
3. Login ใหม่

---

### **ปัญหา 4: Token ไม่ถูกบันทึก**

**Mobile App Console:**
```
⚠️ Failed to get push token
```

**วิธีแก้:**
1. ตรวจสอบว่า `projectId` ใน notificationService.ts ถูกต้อง
2. ตรวจสอบว่าใช้ Physical Device (ไม่ใช่ Emulator)
3. ตรวจสอบ network connection

---

## 📊 Expected Flow

### **1. App Start:**
```
🔔 Starting notification registration...
✓ Permission granted
✓ Android notification channel created
📤 Getting Expo Push Token...
✅ Expo Push Token: ExponentPushToken[xxx...]
💾 Saving token to Firestore...
✅ Token saved to Firestore successfully
```

### **2. Backend Send:**
```
📤 Sending notification via Expo Push...
📱 Found 2 Expo Push Tokens
✓ Created 2 valid messages
✓ Sent chunk of 2 notifications
📊 Results: 2 success, 0 errors
```

### **3. App Receive:**
```
📬 Foreground Notification received
   Title: ทดสอบ
   Body: Hello World!
👆 User tapped notification
→ Navigating to home
```

---

## 🎯 Testing Scenarios

### **Scenario 1: Send to All**
```bash
{
  "title": "ข่าวสาร",
  "body": "ทดสอบส่งให้ทุกคน",
  "targetGroup": "all"
}
```

### **Scenario 2: Send to Students Only**
```bash
{
  "title": "แจ้งนิสิต",
  "body": "ทดสอบส่งให้นิสิต",
  "targetGroup": "students"
}
```

### **Scenario 3: Send with News Link**
```bash
{
  "title": "ข่าวใหม่",
  "body": "มีข่าวสารใหม่",
  "targetGroup": "all",
  "newsId": "news123"
}
```

### **Scenario 4: Send to Specific User**
```bash
POST /api/notifications/send-to-user
{
  "userId": "6511111111",
  "userType": "student",
  "title": "แจ้งเฉพาะบุคคล",
  "body": "Hello!"
}
```

---

## 📝 Debug Checklist

เมื่อ Push ไม่ทำงาน ให้เช็ค:

**Mobile App:**
- [ ] Build APK ใหม่แล้ว
- [ ] ติดตั้ง APK ใหม่แล้ว
- [ ] Login ใหม่แล้ว
- [ ] Permission อนุญาตแล้ว
- [ ] ใช้ Physical Device (ไม่ใช่ Emulator)
- [ ] Console แสดง "Token saved successfully"

**Firestore:**
- [ ] มี pushToken field
- [ ] tokenType เป็น "expo"
- [ ] notificationEnabled เป็น true
- [ ] Token format: "ExponentPushToken[...]"

**Backend:**
- [ ] Backend กำลังรันอยู่ (port 3000)
- [ ] Routes แก้ไขแล้ว (ใช้ Expo Push)
- [ ] Firebase Admin SDK initialized
- [ ] ส่งได้โดยไม่มี error

---

## 🆘 ยังไม่ได้?

1. **ส่ง Console Logs มาให้ดู:**
   - Mobile App Console (Expo DevTools)
   - Backend Console
   - Firestore Screenshot (Token fields)

2. **ตรวจสอบ Network:**
   ```bash
   # Test API endpoint
   curl http://localhost:3000/api/notifications/test
   ```

3. **ลอง Development Build:**
   ```bash
   eas build --platform android --profile development
   ```

---

**Updated:** 2025-12-08
**Status:** Ready for Testing
