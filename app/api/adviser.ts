import { http } from "./http";

export type Teacher = {
  teacherID: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type Student = {
  studentID: string;
  studentCode?: string;
  email: string;
  firstName: string;
  lastName: string;
  adviserId: string | null;
  assignedAt: any | null;
};

export const AdviserAPI = {
  getTeachers: async (): Promise<Teacher[]> =>
    (await http.get("/teachers")).data,

  getUnassignedStudents: async (): Promise<Student[]> =>
    (await http.get("/students/unassigned")).data,

  assignMany: async (teacherID: string, studentIDs: string[]) =>
    (await http.post("/advisers", { teacherID, studentIDs })).data,

  listPairs: async () =>
    (await http.get("/advisers")).data,

  reassign: async (studentID: string, teacherID: string) =>
    (await http.put(`/advisers/${studentID}`, { teacherID })).data,

  remove: async (studentID: string) =>
    (await http.delete(`/advisers/${studentID}`)).data,
};
