import { db, Timestamp } from "../lib/firebase";

export type Student = {
  student_id: string;
  student_name: string;
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
  adviser: string;
  notification: any[];
  chat_history: any[];
  appointment: any[];
};

const col = () => db.collection("Student"); // เปลี่ยนเป็น "Student" ตัวใหญ่

export const StudentService = {
  // ดึงนิสิตที่ยังไม่มีที่ปรึกษา
  getUnassigned: async (): Promise<Student[]> => {
    const snap = await col().where("adviser", "==", "").get();
    return snap.docs.map((d) => ({ ...d.data(), student_id: d.id } as Student));
  },

  // ดึงนิสิตทั้งหมด
  getAll: async (): Promise<Student[]> => {
    const snap = await col().orderBy("student_id").get();
    return snap.docs.map((d) => ({ ...d.data(), student_id: d.id } as Student));
  },

  // เซ็ต/เคลียร์ที่ปรึกษา
  setAdviser: async (studentID: string, teacherID: string) => {
    await col().doc(studentID).update({
      adviser: teacherID || ""
    });
  }
};
