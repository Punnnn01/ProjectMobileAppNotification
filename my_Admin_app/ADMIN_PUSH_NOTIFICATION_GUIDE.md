# 🔔 เพิ่ม Push Notification ให้ Admin Panel

## ✅ สิ่งที่แก้ไขให้แล้ว

### 1. **AddNews.tsx** (เพิ่มข่าวสาร)
- ✅ เพิ่มฟังก์ชัน `sendPushNotification()`
- ✅ ส่ง Push อัตโนมัติหลังบันทึกข่าวสำเร็จ
- ✅ แสดงผลว่าส่งสำเร็จหรือไม่

### 2. **AddExamSchedule.tsx** (เพิ่มตารางสอบ)
- ⏳ ต้องแก้ไขเพิ่มเติม (ดูขั้นตอนด้านล่าง)

---

## 📝 ขั้นตอนแก้ไข AddExamSchedule.tsx

### **Step 1: เปิดไฟล์**
```
D:\KU\!ProjectMobileAppNotification\ProjectMobileAppNotification\my_Admin_app\src\AddExamSchedule.tsx
```

### **Step 2: เพิ่ม BACKEND_URL ที่บรรทัดต้นๆ**

หาบรรทัดนี้:
```typescript
type SubmitResult = { ok: true; id?: string } | { ok: false, message: string };
```

เพิ่มด้านล่างมัน:
```typescript
const BACKEND_URL = 'http://localhost:3000'; // Node.js Backend
```

### **Step 3: แทนที่ฟังก์ชัน handleSubmit**

ค้นหา:
```typescript
const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // ... (โค้ดเดิม)
    
    const result = await postExamSchedule(fd);
    setSubmitting(false);

    if (!result.ok) return setError(result.message || 'ไม่สามารถบันทึกตารางสอบได้');
    
    setSuccess('บันทึกตารางสอบสำเร็จ!');
    
    // Reset
```

แก้เป็น:
```typescript
const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // ใช้ชื่อไฟล์เป็นหัวข้อ (ตัดนามสกุลออก)
    const title = fileName.replace(/\.[^/.]+$/, '');
    const content = contentRef.current?.value.trim() ?? '';
    const file = filesRef.current?.files?.[0];

    if (!file) return setError('กรุณาอัปโหลดไฟล์ตารางสอบ');

    const fd = new FormData();
    fd.append('title', title);
    fd.append('content', content);
    fd.append('files', file);

    setSubmitting(true);
    
    // Step 1: บันทึกตารางสอบ
    const result = await postExamSchedule(fd);
    
    if (!result.ok) {
      setSubmitting(false);
      return setError(result.message || 'ไม่สามารถบันทึกตารางสอบได้');
    }

    // Step 2: ส่ง Push Notification
    const newsId = result.id || '';
    const pushResult = await sendPushNotification(title, newsId);
    
    setSubmitting(false);

    if (pushResult.ok) {
      setSuccess(`บันทึกตารางสอบสำเร็จ! ✅ ส่ง Push Notification แล้ว (${pushResult.count} คน)`);
    } else {
      setSuccess('บันทึกตารางสอบสำเร็จ! ⚠️ แต่ส่ง Push Notification ไม่สำเร็จ');
    }
    
    // Reset
    if (contentRef.current) contentRef.current.value = '';
    if (filesRef.current) filesRef.current.value = '';
    setRows([]);
    setColumns([]);
    setGroupedData([]);
    setFileName('');
    setFileType(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };
```

### **Step 4: เพิ่มฟังก์ชัน sendPushNotification**

ด้านล่าง `async function postExamSchedule()` ให้เพิ่ม:

```typescript
async function sendPushNotification(examTitle: string, newsId: string): Promise<{ ok: boolean; count?: number }> {
  try {
    console.log('📤 Sending push notification for exam schedule:', examTitle);
    
    const res = await fetch(`${BACKEND_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '📅 ตารางสอบใหม่',
        body: examTitle,
        targetGroup: 'all',
        newsId: newsId
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log('✅ Push notification sent:', data);
    
    return { 
      ok: true, 
      count: data.sentCount || 0 
    };
  } catch (e: any) {
    console.error('❌ Failed to send push notification:', e);
    return { ok: false };
  }
}
```

---

## 🧪 ทดสอบ

### **1. Start Backend (Port 3000)**
```bash
cd backend
npm run dev
```

### **2. Start Admin Panel (Port 5173)**
```bash
cd my_Admin_app
npm run dev
```

### **3. ทดสอบเพิ่มข่าวสาร**
1. เปิด http://localhost:5173/#/add-news
2. กรอกข้อมูล
3. กดบันทึก
4. ควรเห็น: "บันทึกข่าวสำเร็จ! ✅ ส่ง Push Notification แล้ว (X คน)"

### **4. ทดสอบเพิ่มตารางสอบ**
1. เปิด http://localhost:5173/#/add-exam
2. อัปโหลดไฟล์
3. กดบันทึก
4. ควรเห็น: "บันทึกตารางสอบสำเร็จ! ✅ ส่ง Push Notification แล้ว (X คน)"

### **5. เช็คบน Mobile App**
- ควรได้รับ Notification
- แตะแล้วเปิด App ได้

---

## 🔍 ตรวจสอบ Console Logs

### **Admin Panel Console (Browser F12):**
```
📤 Sending push notification for news: ข่าวทดสอบ
✅ Push notification sent: { sentCount: 2, failedCount: 0 }
```

### **Backend Console:**
```
📤 Sending notification via Expo Push...
📱 Found 2 Expo Push Tokens
✓ Created 2 valid messages
📊 Results: 2 success, 0 errors
```

### **Mobile App:**
```
📬 Foreground Notification received
   Title: 📰 ข่าวสารใหม่
   Body: ข่าวทดสอบ
```

---

## ⚠️ Common Issues

### **ปัญหา 1: CORS Error**
```
Access to fetch at 'http://localhost:3000/api/notifications/send' 
from origin 'http://localhost:5173' has been blocked by CORS
```

**วิธีแก้:**
ใน `backend/src/app.ts` ต้องมี:
```typescript
import cors from 'cors';
app.use(cors());
```

### **ปัญหา 2: Backend ไม่ตอบ**
```
Failed to send push notification: Network error
```

**วิธีแก้:**
1. ตรวจสอบว่า Backend รันอยู่ที่ port 3000
2. ลอง curl:
```bash
curl http://localhost:3000/api/notifications/test
```

### **ปัญหา 3: ส่งได้แต่ไม่มี Token**
```
⚠️ No tokens found!
```

**วิธีแก้:**
1. User ต้อง Login ด้วย App ใหม่ (APK ที่ Build ใหม่)
2. เช็ค Firestore ว่ามี `pushToken` และ `tokenType: "expo"`

---

## 📊 Flow Diagram

```
Admin Panel (เพิ่มข่าว/ตารางสอบ)
         ↓
  1. บันทึกข้อมูล (port 8080)
         ↓
  2. ส่ง Push Notification (port 3000)
         ↓
  Node.js Backend
         ↓
  3. ดึง Tokens จาก Firestore
         ↓
  4. ส่งผ่าน Expo Push API
         ↓
  Mobile App รับ Notification 🔔
```

---

## ✅ Checklist

- [ ] AddNews.tsx แก้แล้ว (✅ เสร็จแล้ว)
- [ ] AddExamSchedule.tsx แก้แล้ว (ทำตามขั้นตอนด้านบน)
- [ ] Backend รันอยู่ (port 3000)
- [ ] Admin Panel รันอยู่ (port 5173)
- [ ] Mobile App Build ใหม่และติดตั้งแล้ว
- [ ] User Login และมี Expo Push Token
- [ ] ทดสอบส่ง Push สำเร็จ

---

## 🎯 Expected Result

หลังจากแก้ไขเสร็จ:

1. **Admin เพิ่มข่าว** → Mobile รับ Push: "📰 ข่าวสารใหม่"
2. **Admin เพิ่มตารางสอบ** → Mobile รับ Push: "📅 ตารางสอบใหม่"
3. **User แตะ Notification** → เปิด App และดูรายละเอียด

---

**Updated:** 2025-12-08
**Status:** AddNews.tsx เสร็จแล้ว | AddExamSchedule.tsx รอแก้ไข
