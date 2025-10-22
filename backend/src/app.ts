import cors from 'cors';
import 'dotenv/config';
import express from 'express';

// (ถ้าจะใช้ Firebase Admin ในภายหลัง ให้ย้ายไปไฟล์ config แยก)
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ตัวอย่าง health check
app.get('/test', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// ตัวอย่างเส้นทาง /api
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express + TypeScript!' });
});

// เริ่มฟังพอร์ต
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
