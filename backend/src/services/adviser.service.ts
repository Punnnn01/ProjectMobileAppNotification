import { db } from "../lib/firebase";
import { StudentService } from "./student.service";

export const AdviserService = {
  list: async () => {
    const [studentsSnap, teachersSnap] = await Promise.all([
      db.collection("Student").where("adviser", "!=", "").get(),
      db.collection("Teacher").get()
    ]);

    const teachers = new Map(teachersSnap.docs.map((d) => [d.id, d.data() as any]));

    return studentsSnap.docs.map((s) => {
      const sd = s.data() as any;
      const t  = teachers.get(sd.adviser);
      return {
        studentID: s.id,
        studentName: sd.student_name || `${sd.personal_info?.firstName || ''} ${sd.personal_info?.lastName || ''}`.trim(),
        teacherID: sd.adviser,
        teacherName: t ? (t.teacher_name || `${t.personal_info?.firstName || ''} ${t.personal_info?.lastName || ''}`.trim()) : null,
        assignedAt: null
      };
    });
  },

  assignMany: async (teacherID: string, studentIDs: string[]) => {
    const batch = db.batch();
    const refs = studentIDs.map((sid) => db.collection("Student").doc(sid));
    const snaps = await db.getAll(...refs);

    let created = 0, skipped = 0;
    snaps.forEach((doc, idx) => {
      if (!doc.exists) { skipped++; return; }
      const data = doc.data() as any;
      if (data?.adviser && data.adviser !== "") { skipped++; return; }
      batch.update(refs[idx], { adviser: teacherID });
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
    await StudentService.setAdviser(studentID, "");
    return { studentID, removed: true };
  }
};
