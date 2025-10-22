// src/routes/student.routes.ts
import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
const r = Router();
r.get('/unassigned', StudentController.getUnassigned); // GET /api/students/unassigned
r.get('/', StudentController.getAll);                  // GET /api/students (option เผื่อใช้)
export default r;
