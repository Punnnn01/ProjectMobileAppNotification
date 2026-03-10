import { db, admin } from "../lib/firebase";

export type Teacher = {
  teacher_id: string;
  teacher_name: string;
  email: string;
  is_verified: boolean;
  role: {
    role_id: string;
    roleName: string;
  };
  personal_info: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  notification: any[];
  chat_chatbot_history: string[];
  CMH: Record<string, any>;
};

const col = () => db.collection("Teacher");

export const TeacherService = {
  // ดึงอาจารย์ที่ verified แล้วทั้งหมด
  getAll: async (): Promise<Teacher[]> => {
    const snap = await col().orderBy("teacher_id").get();
    return snap.docs.map((d) => ({ ...d.data(), teacher_id: d.id } as Teacher));
  },

  // ดึงอาจารย์ที่รอยืนยัน (is_verified = false)
  getPending: async (): Promise<Teacher[]> => {
    const snap = await col().where("is_verified", "==", false).get();
    return snap.docs.map((d) => ({ ...d.data(), teacher_id: d.id } as Teacher));
  },

  // อนุมัติอาจารย์
  verify: async (teacherId: string): Promise<void> => {
    await col().doc(teacherId).update({ is_verified: true });
  },

  // ปฏิเสธอาจารย์ (เปลี่ยน status เป็น rejected)
  reject: async (teacherId: string): Promise<void> => {
    await col().doc(teacherId).update({
      is_verified: false,
      is_rejected: true,
      rejected_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  },
};
