# ⚡ Quick Start - Build APK

## 🎯 คำสั่งทั้งหมด (Copy-Paste ได้เลย)

### 1️⃣ ติดตั้ง EAS CLI (ครั้งเดียว)
```powershell
npm install -g eas-cli
```

### 2️⃣ Login (ครั้งเดียว)
```powershell
eas login
```

### 3️⃣ ไปที่โฟลเดอร์ MobileApp
```powershell
cd D:\KU\!ProjectMobileAppNotification\ProjectMobileAppNotification\MobileApp
```

### 4️⃣ Build Production APK
```powershell
eas build --platform android --profile production
```

**คำถามที่จะถูกถาม:**
- Generate Keystore? → กด **Y**
- Upload? → กด **Y**

**รอ 20-40 นาที**

### 5️⃣ Download APK
คลิกลิงก์ที่แสดงใน Terminal หรือไปที่ https://expo.dev → Builds

### 6️⃣ ติดตั้งบนมือถือ
- ส่งไฟล์ไปมือถือ (Drive, Line, Email)
- เปิดไฟล์ → Install
- เปิดแอป → Login
- ทดสอบส่ง Notification!

---

## 📝 หมายเหตุ

**ครั้งแรก:** ต้องทำทุกขั้นตอน (30-55 นาที)  
**ครั้งต่อไป:** แค่ขั้นตอน 3-6 (20-30 นาที)

**ต้องการความช่วยเหลือ:** อ่าน BUILD_GUIDE.md

---

## ✅ สำเร็จ = ได้รับ Notification!

ถ้าติดปัญหา มี 2 ไฟล์ช่วย:
- `BUILD_GUIDE.md` - คู่มือละเอียด
- `QUICK_START.md` - คำสั่งสั้น ๆ (ไฟล์นี้)
