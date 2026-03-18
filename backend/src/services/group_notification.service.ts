import { db, admin } from "../lib/firebase";

export type GroupNotification = {
  group_id: string;
  created_by_id: string;
  created_by_role: string;
  student_id: string[];
  news_id: string;
  name_group: string;
  description?: string;
};

const col = () => db.collection("Group_Notification");

// ── helper: sync group_ids ลง Student documents ──────────────────────────────
// เมื่อเพิ่ม/ลบสมาชิก ต้องอัปเดต group_ids array ใน Student document ด้วย
// เพื่อให้ mobile filter ข่าวกลุ่มได้ถูกต้อง
async function addGroupToStudents(groupId: string, studentIds: string[]): Promise<void> {
  if (!studentIds.length) return;
  const batch = db.batch();
  for (const sid of studentIds) {
    // ลอง document ID ก่อน
    const byId = await db.collection('Student').doc(sid).get();
    if (byId.exists) {
      batch.update(byId.ref, {
        group_ids: admin.firestore.FieldValue.arrayUnion(groupId)
      });
    } else {
      // fallback: ค้นหาจาก student_id field
      const snap = await db.collection('Student').where('student_id', '==', sid).get();
      snap.docs.forEach(d => {
        batch.update(d.ref, {
          group_ids: admin.firestore.FieldValue.arrayUnion(groupId)
        });
      });
    }
  }
  await batch.commit();
}

async function removeGroupFromStudents(groupId: string, studentIds: string[]): Promise<void> {
  if (!studentIds.length) return;
  const batch = db.batch();
  for (const sid of studentIds) {
    const byId = await db.collection('Student').doc(sid).get();
    if (byId.exists) {
      batch.update(byId.ref, {
        group_ids: admin.firestore.FieldValue.arrayRemove(groupId)
      });
    } else {
      const snap = await db.collection('Student').where('student_id', '==', sid).get();
      snap.docs.forEach(d => {
        batch.update(d.ref, {
          group_ids: admin.firestore.FieldValue.arrayRemove(groupId)
        });
      });
    }
  }
  await batch.commit();
}
// ─────────────────────────────────────────────────────────────────────────────

export const GroupNotificationService = {

  getAll: async (): Promise<GroupNotification[]> => {
    const snap = await col().get();
    return snap.docs.map((d) => ({ ...d.data(), group_id: d.id } as GroupNotification));
  },

  getById: async (groupId: string): Promise<GroupNotification | null> => {
    const doc = await col().doc(groupId).get();
    if (!doc.exists) return null;
    return { ...doc.data(), group_id: doc.id } as GroupNotification;
  },

  getByCreator: async (createdById: string): Promise<GroupNotification[]> => {
    const snap = await col().where("created_by_id", "==", createdById).get();
    return snap.docs.map((d) => ({ ...d.data(), group_id: d.id } as GroupNotification));
  },

  getByStudent: async (studentId: string): Promise<GroupNotification[]> => {
    const snap = await col().where("student_id", "array-contains", studentId).get();
    return snap.docs.map((d) => ({ ...d.data(), group_id: d.id } as GroupNotification));
  },

  // สร้างกลุ่มใหม่ + sync group_ids ลง Student
  create: async (data: Omit<GroupNotification, "group_id">): Promise<string> => {
    const ref = col().doc();
    await ref.set({ ...data, group_id: ref.id });
    // sync group_ids ลง Student documents
    if (data.student_id?.length) {
      await addGroupToStudents(ref.id, data.student_id);
    }
    return ref.id;
  },

  // เพิ่มสมาชิก + sync group_ids
  addStudents: async (groupId: string, studentIds: string[]): Promise<void> => {
    await col().doc(groupId).update({
      student_id: admin.firestore.FieldValue.arrayUnion(...studentIds)
    });
    await addGroupToStudents(groupId, studentIds);
  },

  // ลบสมาชิก + sync group_ids
  removeStudents: async (groupId: string, studentIds: string[]): Promise<void> => {
    await col().doc(groupId).update({
      student_id: admin.firestore.FieldValue.arrayRemove(...studentIds)
    });
    await removeGroupFromStudents(groupId, studentIds);
  },

  // อัปเดตข้อมูลกลุ่ม (ชื่อ, คำอธิบาย)
  update: async (groupId: string, data: Partial<GroupNotification>): Promise<void> => {
    const { group_id, ...updateData } = data;
    await col().doc(groupId).update(updateData);
  },

  // ลบกลุ่ม + ลบ group_ids จาก Student ทุกคนในกลุ่ม
  delete: async (groupId: string): Promise<void> => {
    const groupDoc = await col().doc(groupId).get();
    if (groupDoc.exists) {
      const studentIds: string[] = groupDoc.data()?.student_id || [];
      await removeGroupFromStudents(groupId, studentIds);
    }
    await col().doc(groupId).delete();
  }
};
