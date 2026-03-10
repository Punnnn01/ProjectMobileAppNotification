import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import admin from 'firebase-admin';

import adviserRoutes from './routes/adviser.routes';
import newsRoutes from './routes/news.routes';
import notificationRoutes from './routes/notifications.routes';
import studentRoutes from './routes/student.routes';
import teacherRoutes from './routes/teacher.routes';
import groupNotificationRoutes from './routes/group_notification.routes';
import chatbotRoutes from './routes/chatbot.routes';
import scheduleRoutes from './routes/schedule.routes';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (serviceAccountBase64) {
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountBase64, 'base64').toString('utf-8')
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized');
    } else {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT_BASE64 not found in .env');
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
}

const app = express();

// Middlewares
app.use(cors({ origin: '*' })); // อนุญาตทุก origin สำหรับ mobile app
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // เพิ่มบรรทัดนี้!

app.use('/api/students',            studentRoutes);
app.use('/api/teachers',            teacherRoutes);
app.use('/api/advisers',            adviserRoutes);
app.use('/api/news',                newsRoutes);
app.use('/api/notifications',       notificationRoutes);
app.use('/api/group-notifications', groupNotificationRoutes);
app.use('/api/chatbot',             chatbotRoutes);
app.use('/api/schedule',            scheduleRoutes);

// เริ่มฟังพอร์ต
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// ป้องกันไม่ให้ process exit ทันที
process.stdin.resume();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
