import { db, Timestamp } from "../lib/firebase";
import { StudentService } from "./student.service";

export const AdviserService = {
  list: async () => {
    const [studentsSnap, teachersSnap] = await Promise.all([
      db.collection("students").where("adviserId", "!=", null).get(),
      db.collection("teachers").get()
    ]);

    const teachers = new Map(teachersSnap.docs.map((d) => [d.id, d.data() as any]));

    return studentsSnap.docs.map((s) => {
      const sd = s.data() as any;
      const t  = teachers.get(sd.adviserId);
      return {
        studentID: sd.studentID,
        studentName: `${sd.firstName} ${sd.lastName}`,
        teacherID: sd.adviserId,
        teacherName: t ? `${t.firstName} ${t.lastName}` : null,  // <- ใช้ firstName/lastName
        assignedAt: sd.assignedAt || null
      };
    });
  },

  assignMany: async (teacherID: string, studentIDs: string[]) => {
    const batch = db.batch();
    const now = Timestamp.now();
    const refs = studentIDs.map((sid) => db.collection("students").doc(sid));
    const snaps = await db.getAll(...refs);

    let created = 0, skipped = 0;
    snaps.forEach((doc, idx) => {
      if (!doc.exists) { skipped++; return; }
      const data = doc.data() as any;
      if (data?.adviserId) { skipped++; return; }
      batch.update(refs[idx], { adviserId: teacherID, assignedAt: now });
      created++;
    });

    await batch.commit();
    return { requested: studentIDs.length, created, skipped };
  },

  reassign: async (studentID: string, teacherID: string) => {
    await StudentService.setAdviser(studentID, teacherID);
    return { studentID, teacherID };
  },

  remove: async (studentID: string) => {
    await StudentService.setAdviser(studentID, null);
    return { studentID, removed: true };
  }
};
