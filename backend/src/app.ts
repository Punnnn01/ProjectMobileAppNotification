import cors from 'cors';
import 'dotenv/config';
import express from 'express';

import adviserRoutes from './routes/adviser.routes';
import studentRoutes from './routes/student.routes';
import teacherRoutes from './routes/teacher.routes';

// (ถ้าจะใช้ Firebase Admin ในภายหลัง ให้ย้ายไปไฟล์ config แยก)
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/advisers', adviserRoutes);



// เริ่มฟังพอร์ต
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
