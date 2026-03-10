# 🔧 แก้ไข EAS Build Failed - UPDATED v2

## ✅ สิ่งที่แก้ไขแล้ว:

### 1. **ลบ React Native Firebase Plugin**
   - ลบ `@react-native-firebase/app` plugin ออกจาก `app.json`
   - เปลี่ยนมาใช้ **Expo Notifications** แทน

### 2. **ปิด New Architecture**
   - เปลี่ยน `newArchEnabled` จาก `true` เป็น `false`
   - New Architecture ยังไม่เสถียรพอใน Expo 52

### 3. **แก้ไข notificationService.ts**
   - เปลี่ยนจาก Firebase Cloud Messaging
   - มาใช้ **Expo Push Notifications** แทน
   - รองรับทั้ง Android และ iOS

---

## 🚀 ขั้นตอนถัดไป:

### **วิธีที่ 1: ใช้ Script ใหม่ (แนะนำ)**

Double-click:
```
fix-and-build-v2.bat
```

สคริปต์จะทำให้อัตโนมัติ:
1. ✅ Uninstall React Native Firebase
2. ✅ Install expo-file-system
3. ✅ Install dependencies
4. ✅ Clean cache
5. ✅ Build APK

---

### **วิธีที่ 2: Manual Commands**

```powershell
# 1. Uninstall React Native Firebase
npm uninstall @react-native-firebase/app @react-native-firebase/messaging

# 2. Install dependencies
npx expo install expo-file-system
npm install

# 3. Clean และ Build
npx expo prebuild --clean
eas build --platform android --profile preview --clear-cache
```

---

## 📝 Changes Summary:

### **app.json**
```diff
- "newArchEnabled": true,
+ "newArchEnabled": false,

- plugins: [
-   "@react-native-firebase/app"
- ]
```

### **notificationService.ts**
```diff
- import messaging from '@react-native-firebase/messaging';
- const fcmToken = await messaging().getToken();

+ import * as Notifications from 'expo-notifications';
+ const tokenData = await Notifications.getExpoPushTokenAsync();
```

### **package.json**
```diff
- "@react-native-firebase/app": "^23.5.0"
- "@react-native-firebase/messaging": "^23.5.0"
+ (ลบออก - ใช้ Expo Notifications แทน)
```

---

## ⚠️ สำคัญ:

### **Push Notifications ยังใช้งานได้ปกติ!**
- Expo Push Notifications รองรับทั้ง Android และ iOS
- ส่ง Push ได้จาก Backend โดยใช้ Expo Push Token
- ไม่ต้องมี Firebase Cloud Messaging

### **Backend ต้องแก้ไข:**
- เปลี่ยนจากส่ง FCM
- มาส่งผ่าน Expo Push API: https://docs.expo.dev/push-notifications/sending-notifications/

---

## 🎯 Expected Result:

หลัง Build สำเร็จจะได้:
- ✅ APK ไฟล์สำหรับติดตั้งบน Android
- ✅ Push Notifications ใช้งานได้ (ผ่าน Expo)
- ✅ ไม่มี Gradle build error

---

## 📖 Documentation:

- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo Push API: https://docs.expo.dev/push-notifications/overview/
- Sending Push: https://docs.expo.dev/push-notifications/sending-notifications/

---

**Updated:** 2025-12-08 (v2)
**Status:** Ready to Build
