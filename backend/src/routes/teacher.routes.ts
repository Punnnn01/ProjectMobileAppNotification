import { Router } from 'express';
import { TeacherController } from '../controllers/teacher.controller';
const r = Router();

r.get('/',              TeacherController.getAll);     // GET  /api/teachers
r.get('/pending',       TeacherController.getPending); // GET  /api/teachers/pending
r.post('/:id/verify',  TeacherController.verify);     // POST /api/teachers/:id/verify
r.post('/:id/reject',  TeacherController.reject);     // POST /api/teachers/:id/reject

export default r;
