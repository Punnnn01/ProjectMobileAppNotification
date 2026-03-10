# 🔧 แก้ไข EAS Build Failed - Android

## ❌ Error ที่พบ
```
Gradle build failed with unknown error
```

## ✅ วิธีแก้ไข (ทำตามลำดับ)

### 🔥 Step 1: ติดตั้ง Missing Dependencies

```bash
cd MobileApp

# ติดตั้ง expo-file-system (ใช้ใน news detail)
npx expo install expo-file-system

# Update dependencies
npm install
```

---

### 🔥 Step 2: แก้ไข eas.json (แก้แล้ว ✓)

เพิ่ม `appVersionSource`:

```json
{
  "cli": {
    "version": ">= 5.2.0",
    "appVersionSource": "remote"
  }
}
```

---

### 🔥 Step 3: Clean Build และ Build ใหม่

```bash
# Clear cache
npx expo prebuild --clean

# Build ใหม่
eas build --platform android --profile production --clear-cache
```

---

## 🎯 Alternative: Build แบบ Preview (เร็วกว่า)

```bash
# Build APK ในโหมด preview (ทดสอบได้)
eas build --platform android --profile preview
```

---

## 🔍 ดู Detailed Logs

1. เปิด link จาก error:
   https://expo.dev/accounts/krittanat/projects/ku-noti-app/builds/

2. กด "Run gradlew" phase

3. ดู error ที่แท้จริง

---

## 🚀 Build Profile แนะนำ

### Development (ทดสอบ)
```bash
eas build --platform android --profile development
```

### Preview (APK เร็ว)
```bash
eas build --platform android --profile preview
```

### Production (Release)
```bash
eas build --platform android --profile production
```

---

## ⚠️ Common Issues

### 1. Firebase Plugin Error
ถ้า error เกี่ยวกับ @react-native-firebase:

แก้ `app.json`:
```json
"plugins": [
  "expo-router",
  "expo-splash-screen",
  "expo-notifications"
  // ลบ @react-native-firebase/app plugin ออก
]
```

### 2. Memory Error
เพิ่ม memory ใน `eas.json`:
```json
"env": {
  "NODE_OPTIONS": "--max-old-space-size=8192"
}
```

### 3. Node Version
ลอง downgrade node:
```json
"node": "18.19.0"
```

---

## 📝 Checklist ก่อน Build

- [ ] `npm install` เสร็จแล้ว
- [ ] `expo-file-system` ติดตั้งแล้ว
- [ ] `google-services.json` มีอยู่
- [ ] `package_name` ตรงกัน
- [ ] Clear cache แล้ว
- [ ] EAS CLI update แล้ว: `npm install -g eas-cli`

---

**Updated:** 2025-12-08
