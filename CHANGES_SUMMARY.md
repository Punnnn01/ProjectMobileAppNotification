# ✅ สรุปการแก้ไข Database Structure

วันที่: 3 ธันวาคม 2567

---

## 📋 รายการไฟล์ที่แก้ไข/สร้างใหม่

### **1. Mobile App**
- ✅ `MobileApp/context/AuthContext.tsx` - ปรับโครงสร้าง Student/Teacher ให้ตรงกับภาพ

### **2. Backend**  
- ✅ `backend/utils/databaseHelper.js` - ฟังก์ชันสร้าง Collections ใหม่
- ✅ `backend/routes/newCollections.js` - API routes สำหรับ Collections ใหม่

### **3. เอกสาร**
- ✅ `DATABASE_STRUCTURE.md` - เอกสารอธิบาย Database ฉบับสมบูรณ์
- ✅ `CHANGES_SUMMARY.md` - ไฟล์นี้

---

## 🔄 การเปลี่ยนแปลงหลัก

### **Student/Teacher Collections**

**เดิม:**
```javascript
{
  notification: [],  // Array of objects
  adviser: "teacher_id"
}
```

**ใหม่:**
```javascript
{
  notification: ["notif_001", "notif_002"],  // Array of IDs
  adviser_id: "adviser_001",  // FK to Adviser collection
  subject: ["CS101", "CS102"],  // เพิ่ม field ใหม่
  chat_history: ["chat_001"]  // เพิ่ม field ใหม่
}
```

### **Collections ใหม่ที่เพิ่มเข้ามา**

1. ✅ **Admin** - ผู้ดูแลระบบ
2. ✅ **notification** - การแจ้งเตือน (แยก collection)
3. ✅ **Subject** - วิชาเรียน
4. ✅ **schedule** - ตารางเรียน/สอบ
5. ✅ **News** - ข่าวสาร
6. ✅ **Message** - ข้อความแชทบอท
7. ✅ **chat_history** - ประวัติการแชท
8. ✅ **Adviser** - ความสัมพันธ์นิสิต-ที่ปรึกษา (แยก collection)
9. ✅ **appointment** - การนัดหมาย

---

## 🎯 ขั้นตอนถัดไป (TODO)

### **1. Backend - เพิ่ม Routes ใน server.js**
```javascript
// เพิ่มบรรทัดนี้ใน server.js
const newRoutes = require('./routes/newCollections');
app.use(newRoutes);
```

### **2. ทดสอบ API**
```bash
# ทดสอบสร้างข่าว
POST http://localhost:8080/api/news
Content-Type: application/json

{
  "title": "ข่าวทดสอบ",
  "content": "เนื้อหาข่าว",
  "category": "general",
  "adminId": "admin_001",
  "adminName": "Admin Name"
}
```

### **3. อัปเดต Mobile App**

#### ✅ แก้แล้ว:
- AuthContext.tsx - โครงสร้าง Student/Teacher

#### ⏳ ยังต้องทำ:
- หน้าแสดง News (ข่าวสาร)
- หน้าแสดง Notification (การแจ้งเตือน)
- หน้าแชทบอท (Message)
- หน้าตารางเรียน (Subject/schedule)
- หน้านัดหมาย (appointment)

### **4. อัปเดต Admin App**

#### ⏳ ต้องทำ:
- หน้าจัดการข่าว (News)
- หน้าส่งการแจ้งเตือน (notification)
- หน้าจัดการวิชา (Subject)
- หน้าจัดการตารางสอบ (schedule)

---

## 📚 วิธีใช้งาน

### **สร้างข่าวใหม่**
```javascript
const { createNews } = require('./utils/databaseHelper');

const newsId = await createNews({
  title: 'ประกาศตารางสอบ',
  content: 'ตารางสอบกลางภาค...',
  category: 'exam',
  adminId: 'admin_001',
  adminName: 'Admin Name'
});
```

### **จับคู่นิสิต-ที่ปรึกษา**
```javascript
const { assignAdviserToStudent } = require('./utils/databaseHelper');

const adviserId = await assignAdviserToStudent(
  '6510000001',  // student_id
  '1234567890'   // teacher_id
);
```

### **สร้างการแจ้งเตือน**
```javascript
const { createNotification } = require('./utils/databaseHelper');

const notifId = await createNotification({
  title: 'ตารางสอบใหม่',
  body: 'ตารางสอบกลางภาคประกาศแล้ว',
  type: 'exam_schedule',
  read: false
});
```

---

## ⚠️ สิ่งที่ต้องระวัง

### **1. Migration ข้อมูลเก่า**
ข้อมูล Student/Teacher ที่มีอยู่แล้วในฐานข้อมูล จะยังใช้โครงสร้างเก่าอยู่

**วิธีแก้:**
- รัน migration script เพื่ออัปเดตข้อมูลเก่า
- หรือ ให้ user ลงทะเบียนใหม่

### **2. Firestore Rules**
ต้องอัปเดต Security Rules ให้รองรับ Collections ใหม่:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Student
    match /Student/{studentId} {
      allow read, write: if request.auth != null;
    }
    
    // Teacher
    match /Teacher/{teacherId} {
      allow read, write: if request.auth != null;
    }
    
    // Admin
    match /Admin/{adminId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // notification
    match /notification/{notifId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // News
    match /News/{newsId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // Subject
    match /Subject/{subjectId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // Adviser
    match /Adviser/{adviserId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // Message, appointment, schedule, chat_history
    match /{collection}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## ✅ Checklist

### โครงสร้าง Database
- [x] แก้ AuthContext.tsx
- [x] สร้าง databaseHelper.js
- [x] สร้าง newCollections.js (API routes)
- [x] สร้างเอกสาร DATABASE_STRUCTURE.md
- [ ] เพิ่ม routes ใน server.js
- [ ] อัปเดต Firestore Rules
- [ ] ทดสอบ API ทั้งหมด

### Frontend (Mobile App)
- [x] AuthContext ใช้โครงสร้างใหม่
- [ ] หน้าข่าวสาร (News)
- [ ] หน้าการแจ้งเตือน (notification)
- [ ] หน้าแชทบอท (Message)
- [ ] หน้าตารางเรียน (Subject)
- [ ] หน้านัดหมาย (appointment)

### Backend
- [ ] เพิ่ม routes ใน server.js
- [ ] ทดสอบ News API
- [ ] ทดสอบ notification API
- [ ] ทดสอบ Subject API
- [ ] ทดสอบ appointment API

### Admin App
- [ ] หน้าจัดการข่าว
- [ ] หน้าส่งการแจ้งเตือน
- [ ] หน้าจัดการวิชา
- [ ] หน้าจัดการตารางสอบ

---

## 📞 หากมีปัญหา

1. ดู Error logs ใน Console
2. ตรวจสอบ Firestore Rules
3. ตรวจสอบว่า firebase-admin initialize ถูกต้อง
4. ตรวจสอบว่า routes ถูก import ใน server.js

---

**เอกสารนี้สร้างโดยอัตโนมัติ - 3 ธันวาคม 2567**
