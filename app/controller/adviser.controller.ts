// src/controllers/adviser.controller.ts
import { Request, Response } from 'express';
import { AdviserService } from '../services/adviser.service';

export const AdviserController = {
  list: async (_: Request, res: Response) => {
    const data = await AdviserService.list();
    res.json(data);
  },

  assignMany: async (req: Request, res: Response) => {
    const { teacherID, studentIDs } = req.body as { teacherID: string; studentIDs: string[] };
    if (!teacherID || !Array.isArray(studentIDs) || studentIDs.length === 0) {
      return res.status(400).json({ message: 'teacherID และ studentIDs จำเป็น' });
    }
    const result = await AdviserService.assignMany(teacherID, studentIDs);
    res.json(result);
  },

  reassign: async (req: Request, res: Response) => {
    const { studentID } = req.params;
    const { teacherID } = req.body as { teacherID: string };
    if (!teacherID) return res.status(400).json({ message: 'teacherID จำเป็น' });
    const data = await AdviserService.reassign(studentID, teacherID);
    res.json(data);
  },

  remove: async (req: Request, res: Response) => {
    const { studentID } = req.params;
    const data = await AdviserService.remove(studentID);
    res.json(data);
  },
};
