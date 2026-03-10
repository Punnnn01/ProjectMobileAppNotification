# 📰 News Detail & Bookmark Feature

## 🎯 ฟีเจอร์ที่เพิ่ม

### **1. หน้ารายละเอียดข่าว**
- แสดงหัวข้อข่าว
- แสดงเนื้อหาแบบเต็ม
- แสดงหมวดหมู่ (Category Badge)
- แสดงวันที่เผยแพร่
- แสดงผู้เขียน (Admin)

### **2. ระบบ Bookmark**
- ปุ่มบันทึกข่าว (💾)
- เช็คสถานะว่า bookmark แล้วหรือยัง
- บันทึกลง `user.bookmarks[]` ใน Firestore
- ยกเลิก Bookmark ได้

---

## 📂 ไฟล์ที่สร้าง

1. ✅ `MobileApp/app/news/[id].tsx` - หน้า News Detail
2. ✅ `backend/scripts/addBookmarksField.js` - Migration Script

---

## 🗄️ Database Structure

### **Student Collection:**
```javascript
Student/{student_id}
{
  student_id: String,
  personal_info: Map,
  role: Map,
  subject: Array,
  notification: Array,
  fcmToken: String,
  fcmTokenUpdatedAt: Timestamp,
  notificationEnabled: Boolean,
  
  // ⭐ เพิ่มใหม่:
  bookmarks: Array<String>  // Array of news_id
}
```

### **Teacher Collection:**
```javascript
Teacher/{teacher_id}
{
  teacher_id: String,
  personal_info: Map,
  role: Map,
  subject: Array,
  notification: Array,
  fcmToken: String,
  fcmTokenUpdatedAt: Timestamp,
  notificationEnabled: Boolean,
  
  // ⭐ เพิ่มใหม่:
  bookmarks: Array<String>  // Array of news_id
}
```

---

## 🚀 การใช้งาน

### **Step 1: Run Migration Script**

เพิ่ม field `bookmarks[]` ให้ทุก users:

```bash
cd backend
node scripts/addBookmarksField.js
```

ผลลัพธ์:
```
=====================================
🚀 MIGRATION: Add Bookmarks Field
=====================================

📚 Processing Student Collection...
   Found 47 students
✅ Updated 47 students

👨‍🏫 Processing Teacher Collection...
   Found 15 teachers
✅ Updated 15 teachers

=====================================
✅ MIGRATION COMPLETED
=====================================
Students updated: 47
Teachers updated: 15
Total updated: 62
=====================================
```

---

### **Step 2: ทดสอบบน Mobile App**

1. **เปิดแอป → Login**
2. **ไปหน้า Notifications หรือ News List**
3. **แตะข่าวที่ต้องการ**
4. **จะเปิดหน้ารายละเอียดข่าว**
5. **กดปุ่ม "บันทึกข่าว"**

---

## 📱 UI/UX

### **หน้า News Detail:**

```
┌─────────────────────────────────┐
│  ← รายละเอียดข่าว               │
├─────────────────────────────────┤
│                                 │
│  [ทั่วไป]                       │
│                                 │
│  ประกาศตารางสอบกลางภาค          │
│                                 │
│  🕐 3 ธ.ค. 2568, 12:00          │
│  👤 Admin User                  │
│                                 │
├─────────────────────────────────┤
│                                 │
│  ตารางสอบกลางภาคเทอม 1/2568    │
│  ได้ประกาศแล้ว กรุณาตรวจสอบ    │
│  ตารางสอบของท่านในระบบ...      │
│                                 │
├─────────────────────────────────┤
│                                 │
│  [💾 บันทึกข่าว]                │
│                                 │
└─────────────────────────────────┘
```

### **เมื่อ Bookmark แล้ว:**

```
┌─────────────────────────────────┐
│  [🔖 บันทึกแล้ว] ✅             │
└─────────────────────────────────┘
```

---

## 🔄 Flow การทำงาน

### **1. เปิดหน้า News Detail:**
```
User แตะข่าว
    ↓
Navigate to /news/[id]
    ↓
ดึงข้อมูลจาก News/{news_id}
    ↓
เช็คว่า user bookmark แล้วหรือยัง
    ↓
แสดงข้อมูลข่าว + สถานะ Bookmark
```

### **2. กดปุ่ม Bookmark:**
```
User กดปุ่ม "บันทึกข่าว"
    ↓
เช็คว่า Login แล้วหรือยัง
    ↓
ถ้า Bookmark แล้ว → arrayRemove(news_id)
ถ้ายัง → arrayUnion(news_id)
    ↓
Update Firestore: user.bookmarks[]
    ↓
แสดง Alert "✅ บันทึกข่าวแล้ว"
    ↓
อัปเดตสถานะปุ่ม
```

---

## 🧪 การทดสอบ

### **Test 1: ดูรายละเอียดข่าว**

1. เปิดแอป → Login
2. ไปหน้า Notifications
3. แตะข่าวใดก็ได้
4. ควรเห็นหน้า News Detail

**Expected:**
- ✅ แสดงหัวข้อข่าว
- ✅ แสดงเนื้อหาเต็ม
- ✅ แสดงวันที่
- ✅ แสดงผู้เขียน
- ✅ มีปุ่ม "บันทึกข่าว"

---

### **Test 2: Bookmark ข่าว**

1. เปิดหน้า News Detail
2. กดปุ่ม "บันทึกข่าว"
3. ควรเห็น Alert "✅ บันทึกข่าวแล้ว"
4. ปุ่มเปลี่ยนเป็น "🔖 บันทึกแล้ว"

**Expected:**
- ✅ Alert แสดงขึ้น
- ✅ ปุ่มเปลี่ยนสถานะ
- ✅ ข้อมูลบันทึกลง Firestore

**เช็ค Firestore:**
```
Student/6510000001
{
  ...existing fields...,
  bookmarks: ["news_abc123"]  ← เพิ่มเข้ามา
}
```

---

### **Test 3: ยกเลิก Bookmark**

1. เปิดหน้าข่าวที่ bookmark แล้ว
2. กดปุ่ม "🔖 บันทึกแล้ว"
3. ควรเห็น Alert "ยกเลิกการบันทึกข่าวแล้ว"
4. ปุ่มเปลี่ยนกลับเป็น "💾 บันทึกข่าว"

**Expected:**
- ✅ Alert แสดงขึ้น
- ✅ ปุ่มเปลี่ยนกลับ
- ✅ ข้อมูลลบจาก Firestore

---

### **Test 4: Navigation จาก Notification**

1. ส่ง Notification จาก Admin
2. แตะ Notification บนมือถือ
3. ควรเปิดหน้า News Detail

**Expected:**
- ✅ เปิดหน้าข่าวที่ถูกต้อง
- ✅ แสดงข้อมูลครบ

---

## 🎨 Styling

### **สี:**
- Primary: `#1B8B6A` (เขียว)
- Background: `#F5F5F5` (เทาอ่อน)
- Card: `#FFFFFF` (ขาว)
- Text Primary: `#1F2937` (ดำเข้ม)
- Text Secondary: `#666666` (เทา)
- Badge: `#E6F4FE` (ฟ้าอ่อน)

### **Typography:**
- Title: 24px, Bold
- Content: 16px, Regular
- Meta: 14px, Regular
- Button: 16px, SemiBold

---

## 🔮 ฟีเจอร์เพิ่มเติม (Optional)

### **1. หน้า Bookmarks (ข่าวที่บันทึก)**
- แสดงรายการข่าวที่ bookmark ไว้
- เข้าถึงได้จากเมนู Profile

### **2. แชร์ข่าว**
- ปุ่มแชร์ข่าวไปยัง Social Media
- Copy link ข่าว

### **3. แนบไฟล์**
- แสดงไฟล์ที่แนบมากับข่าว
- Download ไฟล์ได้

### **4. Related News**
- แสดงข่าวที่เกี่ยวข้อง
- อิงจาก Category

---

## ✅ Checklist

- [x] สร้างหน้า News Detail
- [x] เพิ่ม Bookmark Button
- [x] เชื่อมต่อ Firestore
- [x] สร้าง Migration Script
- [x] เพิ่ม field bookmarks[]
- [x] เช็คสถานะ Bookmark
- [x] บันทึก/ยกเลิก Bookmark
- [x] Navigation จาก Notification
- [ ] สร้างหน้า Bookmarks List (Optional)

---

**พร้อมใช้งานแล้วครับ! 🚀**
