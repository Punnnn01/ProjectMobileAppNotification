// src/controllers/teacher.controller.ts
import { Request, Response } from 'express';
import { TeacherService } from '../services/teacher.service';

export const TeacherController = {
  getAll: async (_: Request, res: Response) => {
    const data = await TeacherService.getAll();
    res.json(data);
  },
};
