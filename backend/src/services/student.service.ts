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
  notification: any[];             // Array of notification_id
  chat_chatbot_history: string[];  // Array of cmh_id → Chatbot_Message_History
  CMH: Record<string, any>;        // Map ref ไปหา Chatbot_Message_History
};

const col = () => db.collection("Student"); // เปลี่ยนเป็น "Student" ตัวใหญ่

export const StudentService = {
  // ดึงนิสิตที่ยังไม่มีที่ปรึกษา
  getUnassigned: async (): Promise<Student[]> => {
    console.log('📚 Getting unassigned students...');
    
    // ดึงนิสิตทั้งหมด
    const snap = await col().get();
    
    // กรองเฉพาะนิสิตที่ยังไม่มีที่ปรึกษา
    const unassigned = snap.docs
      .map((d) => ({ ...d.data(), student_id: d.id } as Student))
      .filter((student) => {
        const adviser = student.adviser;
        // ถือว่า "ไม่มีที่ปรึกษา" ถ้า adviser เป็น: "", null, undefined, หรือ "-"
        return !adviser || adviser === '' || adviser === '-';
      });
    
    console.log(`   Found ${unassigned.length} unassigned students`);
    return unassigned;
  },

  // ดึงนิสิตทั้งหมด
  getAll: async (): Promise<Student[]> => {
    const snap = await col().orderBy("student_id").get();
    return snap.docs.map((d) => ({ ...d.data(), student_id: d.id } as Student));
  },

  // ดึงนิสิตตาม ID
  getById: async (studentId: string): Promise<Student | null> => {
    const doc = await col().doc(studentId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return { ...doc.data(), student_id: doc.id } as Student;
  },

  // เซ็ต/เคลียร์ที่ปรึกษา
  setAdviser: async (studentID: string, teacherID: string) => {
    await col().doc(studentID).update({
      adviser: teacherID || ""
    });
  }
};
