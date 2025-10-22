// src/routes/teacher.routes.ts
import { Router } from 'express';
import { TeacherController } from '../controllers/teacher.controller';
const r = Router();
r.get('/', TeacherController.getAll); // GET /api/teachers
export default r;
