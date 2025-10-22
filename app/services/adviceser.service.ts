// src/services/adviser.service.ts
import { prisma } from '../lib/prisma';

export const AdviserService = {
  list: () =>
    prisma.adviser.findMany({
      include: { student: true, teacher: true },
      orderBy: [{ teacherID: 'asc' }, { studentID: 'asc' }],
    }),

  // assign หลายคนในครั้งเดียว (transaction)
  assignMany: async (teacherID: string, studentIDs: string[]) => {
    return prisma.$transaction(async (tx) => {
      // ตรวจคนที่ถูกจับคู่ไปแล้ว (กันซ้ำ)
      const existing = await tx.adviser.findMany({
        where: { studentID: { in: studentIDs } },
        select: { studentID: true },
      });
      const already = new Set(existing.map((e) => e.studentID));
      const toCreate = studentIDs.filter((id) => !already.has(id));

      // สร้างคู่ใหม่
      const created = await tx.adviser.createMany({
        data: toCreate.map((sid) => ({ studentID: sid, teacherID })),
        skipDuplicates: true,
      });

      return { requested: studentIDs.length, created: created.count, skipped: already.size };
    });
  },

  // ย้ายที่ปรึกษา (แก้ไข)
  reassign: (studentID: string, teacherID: string) =>
    prisma.adviser.upsert({
      where: { studentID },
      update: { teacherID },
      create: { studentID, teacherID },
    }),

  // ลบความสัมพันธ์
  remove: (studentID: string) =>
    prisma.adviser.delete({ where: { studentID } }),
};
