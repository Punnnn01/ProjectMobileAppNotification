import { db } from "../lib/firebase";

export type Teacher = {
  teacher_id: string;
  teacher_name: string;
  email: string;
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
  chat_history: any[];
  appointment: any[];
};

const col = () => db.collection("Teacher"); // เปลี่ยนเป็น "Teacher" ตัวใหญ่

export const TeacherService = {
  getAll: async (): Promise<Teacher[]> => {
    const snap = await col().orderBy("teacher_id").get();
    return snap.docs.map((d) => ({ ...d.data(), teacher_id: d.id } as Teacher));
  }
};
