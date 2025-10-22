// src/routes/adviser.routes.ts
import { Router } from 'express';
import { AdviserController } from '../controllers/adviser.controller';
const r = Router();
r.get('/', AdviserController.list);                    // GET /api/advisers
r.post('/', AdviserController.assignMany);             // POST /api/advisers  { teacherID, studentIDs[] }
r.put('/:studentID', AdviserController.reassign);      // PUT /api/advisers/:studentID  { teacherID }
r.delete('/:studentID', AdviserController.remove);     // DELETE /api/advisers/:studentID
export default r;
