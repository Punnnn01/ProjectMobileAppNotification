# 🚀 KU Noti - Production Build Guide

## 📋 สิ่งที่ต้องเตรียม

### 1. บัญชี Expo (ฟรี)
- ไปที่: https://expo.dev/signup
- สมัครด้วย Email หรือ GitHub
- จดชื่อผู้ใช้ (username) ไว้

### 2. เครื่องมือ
- PowerShell (มีอยู่แล้วใน Windows)
- Internet connection (สำหรับ Build บน Cloud)
- มือถือ Android (สำหรับติดตั้งและทดสอบ)

---

## 📱 ขั้นตอนการ Build Production APK

### **ขั้นตอนที่ 1: ติดตั้ง EAS CLI**

เปิด PowerShell **ในฐานะ Administrator**:
1. กดปุ่ม Windows
2. พิมพ์ "PowerShell"
3. คลิกขวาที่ "Windows PowerShell"
4. เลือก "Run as administrator"

รันคำสั่ง:
```powershell
npm install -g eas-cli
```

รอจนเห็นข้อความเสร็จ (ประมาณ 1-2 นาที)

---

### **ขั้นตอนที่ 2: Login เข้า EAS**

```powershell
eas login
```

ระบบจะถาม:
- **Email or username:** พิมพ์ email หรือ username ที่สมัครไว้
- **Password:** พิมพ์รหัสผ่าน (จะไม่แสดงตัวอักษร - เป็นปกติ)

เห็น "Logged in" แสดงว่าสำเร็จ ✅

---

### **ขั้นตอนที่ 3: ไปที่โฟลเดอร์ MobileApp**

```powershell
cd D:\KU\!ProjectMobileAppNotification\ProjectMobileAppNotification\MobileApp
```

---

### **ขั้นตอนที่ 4: สร้าง EAS Project**

```powershell
eas build:configure
```

ระบบจะถาม:
1. **"Select platform"** 
   - กด Space เพื่อเลือก **Android**
   - กด Enter

2. **"Would you like to automatically create an EAS project for..."**
   - กด **Y** แล้ว Enter

รอจนเห็นข้อความ:
```
✔ Created EAS project
✔ Generated eas.json
```

---

### **ขั้นตอนที่ 5: Build Production APK**

```powershell
eas build --platform android --profile production
```

ระบบจะถาม:

**1. "Generate a new Android Keystore?"**
- กด **Y** แล้ว Enter
- (Keystore ใช้สำหรับ Sign แอป - สำคัญมาก!)

**2. "Would you like to upload..."**
- กด **Y** แล้ว Enter

จากนั้นระบบจะเริ่ม Build:
```
✔ Compressing project files
✔ Uploading to EAS Build
✔ Queued...
✔ Building...
```

**⏱️ รอ 20-40 นาที** (Build ครั้งแรกจะใช้เวลานาน)

คุณสามารถ:
- ปิด PowerShell ได้ (Build จะทำงานบน Cloud)
- ดูสถานะที่ https://expo.dev/accounts/[username]/builds

---

### **ขั้นตอนที่ 6: Download APK**

เมื่อ Build เสร็จ จะเห็นข้อความ:
```
✔ Build completed!
Download URL: https://expo.dev/artifacts/eas/...
```

**วิธี Download:**

**แบบที่ 1 - จาก Terminal:**
- คลิกลิงก์ที่แสดง
- Browser จะเปิด → กด Download

**แบบที่ 2 - จาก Website:**
1. ไปที่ https://expo.dev
2. Login
3. คลิก "Builds"
4. คลิก Build ล่าสุด
5. กด "Download" ปุ่มสีฟ้า

ไฟล์ชื่อ: `build-xxxxxxxxx.apk` (ขนาดประมาณ 50-80 MB)

---

### **ขั้นตอนที่ 7: ส่งไฟล์ไปมือถือ**

**วิธีที่ 1 - Google Drive (แนะนำ):**
1. Upload APK ไปที่ Google Drive
2. เปิด Drive บนมือถือ
3. Download APK
4. เปิดไฟล์ → ติดตั้ง

**วิธีที่ 2 - Line:**
1. ส่งไฟล์ให้ตัวเอง
2. Download จากมือถือ
3. เปิดไฟล์ → ติดตั้ง

**วิธีที่ 3 - USB Cable:**
```powershell
# ต่อมือถือกับคอม
# เปิด USB Debugging บนมือถือ
adb install build-xxxxxxxxx.apk
```

---

### **ขั้นตอนที่ 8: ติดตั้งบนมือถือ**

**บน Android:**
1. เปิดไฟล์ APK
2. ถ้าเห็น "Install blocked"
   - ไปที่ Settings → Security
   - เปิด "Install unknown apps" สำหรับ Browser/Files
3. กด "Install"
4. รอจนติดตั้งเสร็จ
5. กด "Open"

---

### **ขั้นตอนที่ 9: ทดสอบ Push Notification** 🎉

**บนมือถือ:**
1. เปิดแอป KU Noti
2. Login (หรือ Register)
3. ดูว่าเปิดแอปได้ปกติไหม

**เช็ค Token:**
1. เปิด Firebase Console
2. Firestore Database → Student
3. เปิด Document ของ User ที่ Login
4. ต้องเห็น field `pushToken: ExponentPushToken[...]`

**ทดสอบส่ง Notification:**
1. เปิด Admin Web (http://localhost:5173)
2. คลิก "📤 ส่ง Notification"
3. กรอก:
   - หัวข้อ: "ทดสอบแอป Production"
   - ข้อความ: "ถ้าเห็น Notification นี้แสดงว่าสำเร็จ!"
4. กด "ส่ง Notification"

**บนมือถือ:**
- ภายใน 5-10 วินาที ต้องเห็น Notification เด้งขึ้นมา! 🎊

---

## 🔧 แก้ปัญหา

### ปัญหา: Build Failed

**ดูที่ Build Logs:**
```powershell
# คลิกลิงก์ Build Logs ใน Terminal
# หรือดูที่ expo.dev → Builds → คลิก Build → ดู Logs
```

**สาเหตุที่พบบ่อย:**
1. Dependencies ไม่ตรงกัน
   - **แก้:** `npm install --legacy-peer-deps`
   - Build ใหม่

2. Node version ไม่รองรับ
   - **แก้:** ใช้ Node 18 หรือ 20

3. Out of memory
   - **แก้:** Build ใหม่ (บางครั้งเป็นปัญหาชั่วคราว)

---

### ปัญหา: ติดตั้งไม่ได้บนมือถือ

**"App not installed":**
- ลบแอปเก่าออก (ถ้ามี)
- ติดตั้งใหม่

**"Install blocked":**
- Settings → Security → เปิด "Unknown sources"

---

### ปัญหา: ไม่ได้รับ Notification

**เช็ค Checklist:**
- [ ] มือถือต้องเปิด Internet
- [ ] ต้อง Login แล้ว
- [ ] Firestore ต้องมี `pushToken`
- [ ] Token ต้องขึ้นต้นด้วย `ExponentPushToken[...]`
- [ ] Backend ต้องรันอย่่ (port 8080)
- [ ] Admin Web ต้องรันอยู่ (port 5173)

**ถ้ายังไม่ได้:**
1. Logout + Login ใหม่
2. เช็ค Firestore ว่ามี `pushToken` ใหม่
3. ส่ง Notification ใหม่

---

## 📊 สรุป Timeline

| ขั้นตอน | เวลา |
|---------|------|
| ติดตั้ง EAS CLI | 1-2 นาที |
| Login + Configure | 2-3 นาที |
| Build (Cloud) | 20-40 นาที |
| Download APK | 1-2 นาที |
| ส่ง + ติดตั้ง | 3-5 นาที |
| ทดสอบ | 2-3 นาที |
| **รวม** | **30-55 นาที** |

---

## ✅ Checklist สำเร็จ

- [ ] ติดตั้ง EAS CLI สำเร็จ
- [ ] Login EAS สำเร็จ
- [ ] Configure Project สำเร็จ
- [ ] Build APK สำเร็จ
- [ ] Download APK สำเร็จ
- [ ] ติดตั้งบนมือถือสำเร็จ
- [ ] Login แอปสำเร็จ
- [ ] เห็น pushToken ใน Firestore
- [ ] **ได้รับ Notification สำเร็จ!** 🎉

---

## 🎯 หลังจากนี้

**ถ้าต้องการแก้ไข:**

**แก้โค้ดธรรมดา (JS/TS):**
```powershell
# แก้โค้ด แล้วรัน
eas update --branch production --message "Fixed bug"
```
→ User เปิดแอปใหม่ → Code Update อัตโนมัติ!

**แก้ Native / Permissions:**
```powershell
# เพิ่ม version ใน app.json
# "version": "1.0.1"

# Build ใหม่
eas build --platform android --profile production

# Upload ใหม่
```

---

## 📞 ติดปัญหา?

เก็บ Screenshots ของ:
1. Error message
2. Build logs
3. Console logs
4. Firestore data

แล้วบอกได้เลยครับ ผมจะช่วยแก้!

---

**สำเร็จแน่นอนครับ! ขอให้โชคดี!** 🚀✨
