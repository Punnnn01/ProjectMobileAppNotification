# 🔧 แก้ปัญหา TypeScript Cannot Find Module

## ปัญหา
```
error TS2307: Cannot find module './routes/news.routes'
error TS2307: Cannot find module './routes/notifications.routes'
```

## 🛠️ วิธีแก้ (ลองทีละขั้นตอน)

### **วิธีที่ 1: Restart TypeScript Server**

```bash
# หยุด Backend (Ctrl+C)
# จากนั้นลบ cache และรันใหม่
cd backend
rm -rf node_modules/.cache
npm run dev
```

---

### **วิธีที่ 2: ตรวจสอบว่าไฟล์มีจริง**

```bash
cd backend/src/routes
ls -la
```

ควรเห็น:
```
adviser.routes.ts
index.ts
student.routes.ts
teacher.routes.ts
news.routes.ts          ← ต้องมี
notifications.routes.ts  ← ต้องมี
```

---

### **วิธีที่ 3: แก้ Import ใน app.ts**

ให้ลอง import แบบไม่มี extension:

**ไฟล์: backend/src/app.ts**

แก้จาก:
```typescript
import newsRoutes from './routes/news.routes';
import notificationRoutes from './routes/notifications.routes';
```

เป็น:
```typescript
import newsRoutes from './routes/news.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
```

หรือ:
```typescript
// ไม่ใส่ .routes
import newsRoutes from './routes/news';
import notificationRoutes from './routes/notifications';
```

---

### **วิธีที่ 4: ตรวจสอบ tsconfig.json**

**ไฟล์: backend/tsconfig.json**

ต้องมี:
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

---

### **วิธีที่ 5: ลบและติดตั้ง node_modules ใหม่**

```bash
cd backend
rm -rf node_modules
rm package-lock.json
npm install
npm run dev
```

---

## 🚀 แก้ปัญหาแน่นอน: แก้ Import Path

ให้เปลี่ยนตามนี้:

**ไฟล์: backend/src/app.ts**

```typescript
import cors from 'cors';
import 'dotenv/config';
import express from 'express';

import adviserRoutes from './routes/adviser.routes';
import studentRoutes from './routes/student.routes';
import teacherRoutes from './routes/teacher.routes';

// ⭐ แก้ตรงนี้ - ไม่ใส่ .routes
import newsRoutes from './routes/news';
import notificationRoutes from './routes/notifications';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/advisers', adviserRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/notifications', notificationRoutes);

// เริ่มฟังพอร์ต
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## 📝 หรือเปลี่ยนชื่อไฟล์

เปลี่ยนชื่อไฟล์ให้ตรงกับ pattern เดิม:

```bash
# เปลี่ยนชื่อไฟล์
cd backend/src/routes
mv news.routes.ts news.ts
mv notifications.routes.ts notifications.ts
```

แล้วแก้ app.ts:
```typescript
import newsRoutes from './routes/news';
import notificationRoutes from './routes/notifications';
```

---

**ลองวิธีที่ 3 หรือ 6 ก่อนนะครับ!**
