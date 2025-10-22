import { db, Timestamp } from "../lib/firebase";

export type Student = {
  studentID: string;
  studentCode?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "student";
  adviserId: string | null;
  assignedAt: FirebaseFirestore.Timestamp | null;
};

const col = () => db.collection("students");

export const StudentService = {
  // ดึงนิสิตที่ยังไม่มีที่ปรึกษา (ต้องมีฟิลด์ adviserId = null จริงๆ)
  getUnassigned: async (): Promise<Student[]> => {
    const snap = await col().where("adviserId", "==", null).get();
    return snap.docs.map((d) => d.data() as Student);
  },

  // เผื่อใช้ในหน้าแก้ไข/ตรวจสอบ
  getAll: async (): Promise<Student[]> => {
    const snap = await col().orderBy("studentID").get();
    return snap.docs.map((d) => d.data() as Student);
  },

  // เซ็ต/เคลียร์ที่ปรึกษา
  setAdviser: async (studentID: string, teacherID: string | null) => {
    await col().doc(studentID).update({
      adviserId: teacherID,
      assignedAt: teacherID ? Timestamp.now() : null
    });
  }
};
