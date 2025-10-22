// src/services/student.service.ts
import { prisma } from '../lib/prisma';

export const StudentService = {
  // นิสิตที่ยังไม่มีที่ปรึกษา
  getUnassigned: () =>
    prisma.student.findMany({
      where: { adviser: null },
      orderBy: { studentID: 'asc' },
    }),
  // ใช้เวลาแก้ไข/ตรวจสอบ
  getAll: () => prisma.student.findMany({ orderBy: { studentID: 'asc' } }),
};
