import { Router } from "express";
import adviserRoutes from "./adviser.routes";
import studentRoutes from "./student.routes";
import teacherRoutes from "./teacher.routes";

const r = Router();
r.use("/students", studentRoutes);
r.use("/teachers", teacherRoutes);
r.use("/advisers", adviserRoutes);
export default r;
