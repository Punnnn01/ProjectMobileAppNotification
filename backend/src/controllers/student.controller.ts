import { Request, Response } from "express";
import { StudentService } from "../services/student.service";

export const StudentController = {
  getUnassigned: async (_: Request, res: Response) => {
    const data = await StudentService.getUnassigned();
    res.json(data);
  },

  getAll: async (_: Request, res: Response) => {
    const data = await StudentService.getAll();
    res.json(data);
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log('📚 Getting student by ID:', id);
      
      const student = await StudentService.getById(id);
      
      if (!student) {
        console.log('❌ Student not found:', id);
        return res.status(404).json({ 
          success: false,
          message: 'ไม่พบข้อมูลนิสิตนี้' 
        });
      }
      
      console.log('✅ Student found:', student.personal_info?.firstName);
      res.json({
        success: true,
        data: student
      });
    } catch (error) {
      console.error('❌ Error getting student:', error);
      res.status(500).json({ 
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' 
      });
    }
  }
};
