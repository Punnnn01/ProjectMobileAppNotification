import { db } from "../lib/firebase";

export type Teacher = {
  teacherID: string;
  email: string;
  firstName: string;   // <- เปลี่ยนเป็น firstName
  lastName: string;    // <- เปลี่ยนเป็น lastName
  role: "teacher";
};

const col = () => db.collection("teachers");

export const TeacherService = {
  getAll: async (): Promise<Teacher[]> => {
    const snap = await col().orderBy("teacherID").get();
    return snap.docs.map((d) => d.data() as Teacher);
  }
};
