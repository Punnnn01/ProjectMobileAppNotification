# System Testing Checklist - ProjectMobileAppNotification

วันที่ตรวจสอบ: 26 พฤศจิกายน 2567

## 1. Mobile App Features

### Authentication ✅
- [x] Register (รหัส 10 หลัก, email, password)
- [x] Login
- [x] Logout
- [x] Auto-login check

### Home Screen ✅
- [x] แสดง firstName ของ user
- [x] แสดงข่าวแบบสุ่ม 5 รายการ
- [x] Menu icons (Profile, Schedule, Bookmark) - วงกลมเต็มสีเขียว
- [x] Logout modal with confirmation
- [x] ไม่มีไอคอนบ้าน (ลบแล้ว)

### Profile Screen ✅ (แก้ไขแล้ว)
- [x] แสดงข้อมูลส่วนตัว (ชื่อ, นามสกุล, เบอร์โทร, email)
- [x] แก้ไขโปรไฟล์ได้
- [x] บันทึกลง Firestore ถูกต้อง (ใช้ auth_uid query)
- [x] Success modal เมื่อบันทึกสำเร็จ

### Schedule Screen ⚠️ (ยังไม่ได้ทดสอบ)
- [ ] แสดงตารางสอบ
- [ ] ดึงข้อมูลจาก Firestore

### Bookmark Screen ⚠️ (ยังไม่ได้ทดสอบ)
- [ ] บันทึกข่าวที่สนใจ
- [ ] แสดงรายการบุ๊คมาร์ค

---

## 2. Backend API (Port 8080)

### Student API ✅
- [x] GET /api/students - ดึงนิสิตทั้งหมด
- [x] GET /api/students/unassigned - ดึงนิสิตที่ยังไม่มีที่ปรึกษา
- [x] Collection: "Student" (ตัวใหญ่)
- [x] Schema มี personal_info

### Teacher API ✅
- [x] GET /api/teachers - ดึงอาจารย์ทั้งหมด
- [x] Collection: "Teacher" (ตัวใหญ่)
- [x] Schema มี personal_info

### Adviser API ✅
- [x] PUT /api/advisers/:studentId - จับคู่นิสิต-ที่ปรึกษา
- [x] ใช้ Student/Teacher collections
- [x] ดึงชื่อจาก personal_info หรือ student_name/teacher_name

### News API ⚠️ (ยังไม่ได้ทดสอบ)
- [ ] POST /api/news - เพิ่มข่าว
- [ ] GET /api/news - ดึงข่าว

### Exam Schedule API ⚠️ (ยังไม่ได้ทดสอบ)
- [ ] POST /api/exam-schedule - เพิ่มตารางสอบ
- [ ] GET /api/exam-schedule - ดึงตารางสอบ

---

## 3. Admin App (Port 5173)

### UI ✅
- [x] หน้าจับคู่นิสิต/ที่ปรึกษา - centered card layout
- [x] หน้าเพิ่มข่าวสาร - centered card layout
- [x] หน้าเพิ่มตารางสอบ - centered card layout
- [x] Tab title: "AdminPages"
- [x] Favicon: admin icon

### จับคู่นิสิต/ที่ปรึกษา ✅
- [x] Dropdown แสดงชื่อนิสิตถูกต้อง (จาก personal_info)
- [x] Dropdown แสดงชื่ออาจารย์ถูกต้อง (จาก personal_info)
- [x] Confirmation modal ก่อนจับคู่
- [x] Success modal หลังจับคู่สำเร็จ (popup กลางจอ พร้อมติ๊กถูก)
- [x] ไม่แสดงรายการจับคู่ (ลบออกแล้ว)

### เพิ่มข่าวสาร ⚠️ (ยังไม่ได้ทดสอบ Backend)
- [x] UI Form สวยงาม
- [ ] Upload ไฟล์ได้
- [ ] บันทึกลง Firestore

### เพิ่มตารางสอบ ⚠️ (ยังไม่ได้ทดสอบ Backend)
- [x] UI Form สวยงาม
- [x] อ่านไฟล์ Excel/CSV ได้
- [x] แสดง Preview table
- [ ] บันทึกลง Firestore

---

## 4. Firebase Configuration

### Firestore Collections ✅
- [x] Student (ตัวใหญ่)
- [x] Teacher (ตัวใหญ่)
- [x] News
- [ ] ExamSchedule (ยังไม่แน่ใจ)

### Firestore Rules ✅
- [x] อนุญาตให้ create Student/Teacher (สำหรับ register)
- [x] อนุญาตให้ read/write เมื่อ authenticated
- [x] Test mode enabled

### Authentication ✅
- [x] Email/Password enabled
- [x] User สามารถ register ได้
- [x] User สามารถ login ได้

---

## 5. Data Structure

### Student Document ✅
```javascript
{
  student_id: "6510000001",  // รหัสนิสิต 10 หลัก
  student_name: "Test User",
  email: "test@test.com",
  auth_uid: "firebase-auth-uid",
  role: {
    role_id: "student",
    roleName: "Student"
  },
  personal_info: {
    firstName: "Test",
    lastName: "User",
    email: "test@test.com",
    phone: "0812345678"
  },
  adviser: "teacher-id" | "",
  notification: [],
  chat_history: [],
  appointment: []
}
```

### Teacher Document ✅
```javascript
{
  teacher_id: "1234567890",
  teacher_name: "Teacher Name",
  email: "teacher@test.com",
  auth_uid: "firebase-auth-uid",
  role: {
    role_id: "teacher",
    roleName: "Teacher"
  },
  personal_info: {
    firstName: "Teacher",
    lastName: "Name",
    email: "teacher@test.com",
    phone: ""
  },
  notification: [],
  chat_history: [],
  appointment: []
}
```

---

## 6. Known Issues & Fixes

### ✅ Fixed Issues:
1. ~~Permission denied error~~ - แก้ไข Firestore Rules แล้ว
2. ~~Home แสดง "User" แทน firstName~~ - ใช้ personal_info.firstName แล้ว
3. ~~Profile update ใช้ user.uid ผิด~~ - แก้เป็นใช้ query auth_uid แล้ว
4. ~~Dropdown แสดง "ไม่มีที่ปรึกษา"~~ - แก้ nameOf() function แล้ว
5. ~~รหัสนิสิตไม่ validate~~ - เพิ่ม real-time validation แล้ว
6. ~~Success popup ไม่มี~~ - เพิ่ม Success Modal แล้ว

### ⚠️ To Test:
1. Schedule Screen - ยังไม่ได้ทดสอบ
2. Bookmark Screen - ยังไม่ได้ทดสอบ
3. News API - ยังไม่ได้ทดสอบ Backend integration
4. Exam Schedule API - ยังไม่ได้ทดสอบ Backend integration

---

## 7. Testing Commands

### Start Backend:
```powershell
cd E:\KU\ProjectMobileAppNoti\ProjectMobileAppNotification\backend
npm run dev
# Should see: Server running on http://localhost:8080
```

### Start Admin App:
```powershell
cd E:\KU\ProjectMobileAppNoti\ProjectMobileAppNotification\my_Admin_app
npm run dev
# Open: http://localhost:5173
```

### Start Mobile App:
```powershell
cd E:\KU\ProjectMobileAppNoti\ProjectMobileAppNotification\MobileApp
npx expo start -c
# Press 'w' for web
```

---

## 8. Production Checklist

### Before Deploy:
- [ ] เปลี่ยน Firestore Rules เป็นแบบ Production (ปลอดภัยกว่า)
- [ ] ตรวจสอบ API endpoints ทั้งหมด
- [ ] Test ทุก feature กับ real data
- [ ] เพิ่ม error handling ครบทุก function
- [ ] เพิ่ม loading states
- [ ] Test บน mobile device จริง
- [ ] Backup database

---

**Status: 🟢 Most features working**
**Last Updated: 2024-11-26 23:30**
