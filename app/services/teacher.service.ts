// src/services/teacher.service.ts
import { prisma } from '../lib/prisma';

export const TeacherService = {
  getAll: () => prisma.teacher.findMany({ orderBy: { teacherID: 'asc' } }),
};
