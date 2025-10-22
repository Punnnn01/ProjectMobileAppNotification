// src/controllers/student.controller.ts
import { Request, Response } from 'express';
import { StudentService } from '../services/student.service';

export const StudentController = {
  getUnassigned: async (_: Request, res: Response) => {
    const data = await StudentService.getUnassigned();
    res.json(data);
  },
  getAll: async (_: Request, res: Response) => {
    const data = await StudentService.getAll();
    res.json(data);
  },
};
