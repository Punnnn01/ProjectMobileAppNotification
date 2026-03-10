# 🔐 Firebase Firestore Security Rules - คำอธิบาย

อัปเดตล่าสุด: 3 ธันวาคม 2567

---

## 📋 สรุป Rules

| Collection | Read | Create | Update | Delete |
|-----------|------|--------|--------|--------|
| **Student** | 🟢 Login | 🟢 Owner | 🟡 Owner/Admin | 🔴 Admin |
| **Teacher** | 🟢 Login | 🟢 Owner | 🟡 Owner/Admin | 🔴 Admin |
| **Admin** | 🟢 Login | 🔴 Admin | 🔴 Admin | 🔴 Admin |
| **notification** | 🟢 Login | 🔴 Admin | 🔴 Admin | 🔴 Admin |
| **Subject** | 🟢 Login | 🔴 Admin | 🔴 Admin | 🔴 Admin |
| **schedule** | 🟢 Login | 🔴 Admin | 🔴 Admin | 🔴 Admin |
| **News** | 🟢 Login | 🔴 Admin | 🔴 Admin | 🔴 Admin |
| **Message** | 🟢 Login | 🟢 Login | 🔴 Admin | 🔴 Admin |
| **chat_history** | 🟢 Login | 🟢 Login | 🟢 Login | 🔴 Admin |
| **Adviser** | 🟢 Login | 🔴 Admin | 🔴 Admin | 🔴 Admin |
| **appointment** | 🟢 Login | 🟢 Login | 🔴 Admin | 🔴 Admin |

**สัญลักษณ์:**
- 🟢 = อนุญาตถ้า login แล้ว
- 🟡 = อนุญาตเฉพาะเจ้าของหรือ Admin
- 🔴 = อนุญาตเฉพาะ Admin

---

## 🔧 Helper Functions

### 1. `isAuthenticated()`
ตรวจสอบว่า user login แล้วหรือยัง
```javascript
function isAuthenticated() {
  return request.auth != null;
}
```

### 2. `isAdmin()`
ตรวจสอบว่า user เป็น Admin หรือไม่
```javascript
function isAdmin() {
  return isAuthenticated() && 
         exists(/databases/$(database)/documents/Admin/$(request.auth.uid));
}
```

### 3. `isOwnerByAuthUid()`
ตรวจสอบว่า `auth_uid` ใน document ตรงกับ user ที่ login หรือไม่
```javascript
function isOwnerByAuthUid() {
  return isAuthenticated() && resource.data.auth_uid == request.auth.uid;
}
```

---

## 📝 Rules แต่ละ Collection

### **1. Student/Teacher Collections**

**อ่านได้ (Read):**
- ✅ ทุกคนที่ login แล้ว
- เหตุผล: ให้ student/teacher เห็นข้อมูลกันได้

**สร้าง (Create):**
- ✅ ตอน register (auth_uid ตรงกับผู้สร้าง)
- เหตุผล: ให้สร้างข้อมูลตัวเองได้

**อัปเดต (Update):**
- ✅ เจ้าของเอง (auth_uid ตรงกัน)
- ✅ Admin
- เหตุผล: แก้ไขข้อมูลตัวเองได้

**ลบ (Delete):**
- ✅ Admin เท่านั้น
- เหตุผล: ป้องกันการลบข้อมูลโดยไม่ตั้งใจ

---

### **2. Admin Collection**

**อ่านได้:**
- ✅ ทุกคนที่ login แล้ว

**สร้าง/อัปเดต/ลบ:**
- ✅ Admin เท่านั้น
- เหตุผล: ควบคุมการสร้าง Admin ใหม่

---

### **3. notification Collection**

**อ่านได้:**
- ✅ ทุกคนที่ login แล้ว

**สร้าง/อัปเดต/ลบ:**
- ✅ Admin เท่านั้น
- เหตุผล: เฉพาะ Admin ส่งการแจ้งเตือนได้

---

### **4. Subject/schedule Collections**

**อ่านได้:**
- ✅ ทุกคนที่ login แล้ว

**สร้าง/อัปเดต/ลบ:**
- ✅ Admin เท่านั้น
- เหตุผล: เฉพาะ Admin จัดการวิชาและตารางสอบ

---

### **5. News Collection**

**อ่านได้:**
- ✅ ทุกคนที่ login แล้ว

**สร้าง/อัปเดต/ลบ:**
- ✅ Admin เท่านั้น
- เหตุผล: เฉพาะ Admin โพสต์ข่าว

---

### **6. Message Collection (Chatbot)**

**อ่านได้:**
- ✅ ทุกคนที่ login แล้ว

**สร้าง:**
- ✅ ทุกคนที่ login แล้ว
- เหตุผล: ให้ทุกคนส่งข้อความหาบอทได้

**อัปเดต/ลบ:**
- ✅ Admin เท่านั้น

---

### **7. chat_history Collection**

**อ่านได้:**
- ✅ ทุกคนที่ login แล้ว

**สร้าง/อัปเดต:**
- ✅ ทุกคนที่ login แล้ว
- เหตุผล: ให้สร้างและอัปเดตประวัติแชทได้

**ลบ:**
- ✅ Admin เท่านั้น

---

### **8. Adviser Collection**

**อ่านได้:**
- ✅ ทุกคนที่ login แล้ว

**สร้าง/อัปเดต/ลบ:**
- ✅ Admin เท่านั้น
- เหตุผล: เฉพาะ Admin จับคู่นิสิต-ที่ปรึกษา

---

### **9. appointment Collection**

**อ่านได้:**
- ✅ ทุกคนที่ login แล้ว

**สร้าง:**
- ✅ ทุกคนที่ login แล้ว
- เหตุผล: ให้นิสิตนัดหมายได้

**อัปเดต/ลบ:**
- ✅ Admin เท่านั้น
- เหตุผล: ควบคุมการแก้ไข/ยกเลิกนัดหมาย

---

## 🚀 วิธีอัปโหลด Rules

### **1. ผ่าน Firebase Console (ง่ายสุด)**
```
1. ไปที่ https://console.firebase.google.com
2. เลือกโปรเจค
3. ไปที่ Firestore Database → Rules
4. คัดลอก Rules จากไฟล์ firestore.rules
5. กด Publish
```

### **2. ผ่าน Firebase CLI**
```bash
# ติดตั้ง Firebase CLI (ถ้ายังไม่มี)
npm install -g firebase-tools

# Login
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

---

## ⚠️ สิ่งที่ต้องระวัง

### **1. การสร้าง Admin**
ตอนนี้ `isAdmin()` function ตรวจสอบว่ามี document ใน Admin collection หรือไม่

**วิธีสร้าง Admin แรก:**
```javascript
// ใช้ Firebase Admin SDK (Backend)
const admin = require('firebase-admin');
const db = admin.firestore();

// สร้าง Admin user
await db.collection('Admin').doc('admin_001').set({
  admin_id: 'admin_001',
  auth_uid: 'firebase-auth-uid-ของ-admin',
  personal_info: {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    phone: ''
  },
  role: {
    role_id: 'admin',
    roleName: 'Admin'
  }
});
```

หรือ **ชั่วคราว** เปิด Rules สำหรับสร้าง Admin:
```javascript
match /Admin/{adminId} {
  allow create: if isAuthenticated();  // เปิดชั่วคราว
}
```
หลังสร้าง Admin แล้ว เปลี่ยนกลับเป็น:
```javascript
allow create: if isAdmin();
```

### **2. ทดสอบ Rules**

ใน Firebase Console → Firestore → Rules → Rules Playground:
```javascript
// ทดสอบอ่าน Student
Location: /Student/6510000001
Operation: get
Auth: Authenticated (ใส่ auth_uid)
→ Should: Allow ✅

// ทดสอบสร้าง News โดย non-admin
Location: /News/news_001
Operation: create
Auth: Authenticated (ใส่ auth_uid ที่ไม่ใช่ admin)
→ Should: Deny ❌
```

---

## 📊 เปรียบเทียบ Rules เก่ากับใหม่

### **Rules เก่า (ไม่ปลอดภัย):**
```javascript
match /{document=**} {
  allow read, write: if true;  // อนุญาตทุกคน ❌
}
```

**ปัญหา:**
- ❌ ทุกคนสามารถอ่าน/เขียนได้โดยไม่ต้อง login
- ❌ ไม่มีการควบคุมสิทธิ์
- ❌ ข้อมูลรั่วไหลได้

### **Rules ใหม่ (ปลอดภัย):**
```javascript
match /Student/{studentId} {
  allow read: if isAuthenticated();
  allow update: if isOwnerByAuthUid() || isAdmin();
  // ... มีการควบคุมสิทธิ์แต่ละ action
}
```

**ข้อดี:**
- ✅ ต้อง login ก่อนถึงจะใช้งานได้
- ✅ แยก permission ตาม role (Admin, Owner)
- ✅ ปลอดภัยกับข้อมูล sensitive

---

## ✅ Checklist

- [ ] คัดลอก Rules จาก `firestore.rules`
- [ ] อัปโหลดไปที่ Firebase Console
- [ ] สร้าง Admin user แรก
- [ ] ทดสอบ login/register
- [ ] ทดสอบ CRUD operations
- [ ] ทดสอบสิทธิ์ Admin

---

## 🔍 การ Debug

### ถ้า Rules ไม่ทำงาน:
```javascript
// เปิด Debug mode ชั่วคราว
match /{document=**} {
  allow read, write: if request.auth != null;  // อนุญาตทุกคนที่ login
}
```

### ตรวจสอบ Error:
1. เช็ค Console ใน Browser (F12)
2. ดู Error message ใน Firestore
3. ทดสอบใน Rules Playground

---

**Rules เหล่านี้ปลอดภัยและพร้อมใช้งาน Production! 🔒**
