# 📚 Database Structure

อัปเดตล่าสุด: กุมภาพันธ์ 2569

---

## 🗂️ Collections ทั้งหมด

### 1. **Student** (นิสิต)
```javascript
{
  student_id: "6510000001",           // Document ID
  auth_uid: "firebase-auth-uid",      // FK to Firebase Auth
  personal_info: {                    // Map
    firstName: "ชื่อ",
    lastName: "นามสกุล",
    email: "test@test.com",
    phone: "0812345678"
  },
  role: {                             // Map
    role_id: "student",
    roleName: "Student"
  },
  notification: [],                   // Array of notification_id
  chat_chatbot_history: [],           // Array of cmh_id (ref → Chatbot_Message_History)
  CMH: {}                             // Map ref ไปหา Chatbot_Message_History
}
```

---

### 2. **Teacher** (อาจารย์)
```javascript
{
  teacher_id: "1234567890",           // Document ID
  auth_uid: "firebase-auth-uid",      // FK to Firebase Auth
  personal_info: {                    // Map
    firstName: "ชื่อ",
    lastName: "นามสกุล",
    email: "teacher@test.com",
    phone: "0812345678"
  },
  role: {                             // Map
    role_id: "teacher",
    roleName: "Teacher"
  },
  notification: [],                   // Array of notification_id
  chat_chatbot_history: [],           // Array of cmh_id (ref → Chatbot_Message_History)
  CMH: {}                             // Map ref ไปหา Chatbot_Message_History
}
```

---

### 3. **Admin** (ผู้ดูแลระบบ)
```javascript
{
  admin_id: "admin_001",              // Document ID
  auth_uid: "firebase-auth-uid",      // FK to Firebase Auth
  personal_info: {                    // Map
    firstName: "Admin",
    lastName: "User",
    email: "admin@test.com",
    phone: "0812345678"
  },
  role: {                             // Map
    role_id: "admin",
    roleName: "Admin"
  }
}
```

---

### 4. **notification** (การแจ้งเตือนส่วนตัว)
```javascript
{
  notification_id: "notif_001",       // Document ID (auto-generated)
  time: Timestamp
}
```

---

### 5. **Group_Notification** (การแจ้งเตือนแบบกลุ่ม)
```javascript
{
  group_id: "group_001",              // Document ID (auto-generated)
  created_by_id: "teacher_001",       // teacher_id หรือ admin_id ของผู้สร้างกลุ่ม
  created_by_role: "teacher",         // "teacher" หรือ "admin"
  student_id: [                       // Array of student_id (สมาชิกในกลุ่ม)
    "6510000001",
    "6510000002"
  ],
  news_id: "news_001",                // ข่าว/การแจ้งเตือนที่ส่งให้กลุ่มนี้
  name_group: "กลุ่มนิสิตปี 1"
}
```

---

### 6. **News** (ข่าวสาร)
```javascript
{
  news_id: "news_001",                // Document ID (auto-generated)
  title: "ข่าวประกาศ",
  content: "เนื้อหาข่าว...",
  category: "general",
  time: Timestamp,
  author: {                           // Map (Obj)
    admin_id: "admin_001",
    admin_name: "Admin Name"
  },
  files: [                            // Array of News_Files (Embedded)
    {
      file_id: "file_001",
      news_id: "news_001",
      file_name: "เอกสาร.pdf",
      fileURL: "https://...",
      upload_time: Timestamp,
      upload_by: "admin_001"
    }
  ]
}
```

---

### 7. **News_Files** (ไฟล์แนบของข่าว — Separate Collection)
```javascript
{
  file_id: "file_001"                 // Document ID เท่านั้น
}
```
> หมายเหตุ: Collection นี้ใช้เป็น index สำหรับค้นหาไฟล์ รายละเอียดทั้งหมดอยู่ใน `News.files` Array

---

### 8. **Chatbot_Message_History** (ประวัติการสนทนากับแชทบอท)
```javascript
{
  cmh_id: "cmh_001",                  // Document ID (auto-generated)
  user: {                             // Map (Obj)
    user_id: "6510000001",
    user_type: "student",             // "student" หรือ "teacher"
    user_name: "ชื่อ นามสกุล"
  },
  userText: "คำถามที่ผู้ใช้ถาม",
  botText: "คำตอบที่บอทตอบกลับ",
  time: Timestamp
}
```

---

## 📊 ความสัมพันธ์ (Relationships)

```
Student ──────────── notification (Array of notification_id)
Student ──────────── chat_chatbot_history (Array of cmh_id → Chatbot_Message_History)

Teacher ──────────── notification (Array of notification_id)
Teacher ──────────── chat_chatbot_history (Array of cmh_id → Chatbot_Message_History)

Group_Notification ─ created_by_id → Teacher หรือ Admin
Group_Notification ─ student_id[] → Student (หลายคน)
Group_Notification ─ news_id → News

News ──────────────── files[] (Embedded News_Files)
News_Files ────────── file_id (Separate Collection สำหรับ index)

Chatbot_Message_History ─ user.user_id → Student หรือ Teacher
```

---

## ✅ สรุป Collections ทั้งหมด

| Collection | ใช้งาน |
|---|---|
| Student | ข้อมูลนิสิต |
| Teacher | ข้อมูลอาจารย์ |
| Admin | ข้อมูลผู้ดูแลระบบ |
| notification | การแจ้งเตือนส่วนตัว |
| Group_Notification | การแจ้งเตือนแบบกลุ่ม |
| News | ข่าวสาร |
| News_Files | Index ไฟล์แนบของข่าว |
| Chatbot_Message_History | ประวัติการสนทนากับแชทบอท |
