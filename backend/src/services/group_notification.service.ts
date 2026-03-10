import { db, admin } from "../lib/firebase";

export type GroupNotification = {
  group_id: string;
  created_by_id: string;       // teacher_id หรือ admin_id
  created_by_role: string;     // "teacher" หรือ "admin"
  student_id: string[];        // Array of student_id (สมาชิกในกลุ่ม)
  news_id: string;
  name_group: string;
};

const col = () => db.collection("Group_Notification");

export const GroupNotificationService = {

  // ดึงกลุ่มทั้งหมด
  getAll: async (): Promise<GroupNotification[]> => {
    const snap = await col().get();
    return snap.docs.map((d) => ({ ...d.data(), group_id: d.id } as GroupNotification));
  },

  // ดึงกลุ่มตาม ID
  getById: async (groupId: string): Promise<GroupNotification | null> => {
    const doc = await col().doc(groupId).get();
    if (!doc.exists) return null;
    return { ...doc.data(), group_id: doc.id } as GroupNotification;
  },

  // ดึงกลุ่มที่สร้างโดย teacher หรือ admin คนนั้น
  getByCreator: async (createdById: string): Promise<GroupNotification[]> => {
    const snap = await col().where("created_by_id", "==", createdById).get();
    return snap.docs.map((d) => ({ ...d.data(), group_id: d.id } as GroupNotification));
  },

  // ดึงกลุ่มที่ student คนนั้นเป็นสมาชิก
  getByStudent: async (studentId: string): Promise<GroupNotification[]> => {
    const snap = await col().where("student_id", "array-contains", studentId).get();
    return snap.docs.map((d) => ({ ...d.data(), group_id: d.id } as GroupNotification));
  },

  // สร้างกลุ่มใหม่
  create: async (data: Omit<GroupNotification, "group_id">): Promise<string> => {
    const ref = col().doc();
    await ref.set({ ...data, group_id: ref.id });
    return ref.id;
  },

  // เพิ่มสมาชิกเข้ากลุ่ม
  addStudents: async (groupId: string, studentIds: string[]): Promise<void> => {
    await col().doc(groupId).update({
      student_id: admin.firestore.FieldValue.arrayUnion(...studentIds)
    });
  },

  // ลบสมาชิกออกจากกลุ่ม
  removeStudents: async (groupId: string, studentIds: string[]): Promise<void> => {
    await col().doc(groupId).update({
      student_id: admin.firestore.FieldValue.arrayRemove(...studentIds)
    });
  },

  // อัปเดตกลุ่ม
  update: async (groupId: string, data: Partial<GroupNotification>): Promise<void> => {
    const { group_id, ...updateData } = data;
    await col().doc(groupId).update(updateData);
  },

  // ลบกลุ่ม
  delete: async (groupId: string): Promise<void> => {
    await col().doc(groupId).delete();
  }
};
