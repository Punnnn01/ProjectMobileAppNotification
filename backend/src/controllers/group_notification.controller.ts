import { Request, Response } from "express";
import { GroupNotificationService } from "../services/group_notification.service";

export const GroupNotificationController = {

  // GET /api/group-notifications
  getAll: async (_: Request, res: Response) => {
    try {
      const data = await GroupNotificationService.getAll();
      res.json({ success: true, count: data.length, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/group-notifications/:id
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = await GroupNotificationService.getById(id);
      if (!data) return res.status(404).json({ success: false, message: "ไม่พบกลุ่มนี้" });
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/group-notifications/creator/:createdById
  getByCreator: async (req: Request, res: Response) => {
    try {
      const { createdById } = req.params;
      const data = await GroupNotificationService.getByCreator(createdById);
      res.json({ success: true, count: data.length, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/group-notifications/student/:studentId
  getByStudent: async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const data = await GroupNotificationService.getByStudent(studentId);
      res.json({ success: true, count: data.length, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/group-notifications
  create: async (req: Request, res: Response) => {
    try {
      const { created_by_id, created_by_role, student_id, news_id, name_group } = req.body;

      if (!created_by_id || !created_by_role || !name_group) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุ created_by_id, created_by_role และ name_group"
        });
      }
      if (!["teacher", "admin"].includes(created_by_role)) {
        return res.status(400).json({
          success: false,
          error: "created_by_role ต้องเป็น 'teacher' หรือ 'admin' เท่านั้น"
        });
      }

      const groupId = await GroupNotificationService.create({
        created_by_id,
        created_by_role,
        student_id: student_id || [],
        news_id: news_id || "",
        name_group
      });

      res.status(201).json({ success: true, group_id: groupId });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/group-notifications/:id/add-students
  addStudents: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { studentIds } = req.body;

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, error: "กรุณาระบุ studentIds เป็น Array" });
      }

      await GroupNotificationService.addStudents(id, studentIds);
      res.json({ success: true, message: `เพิ่ม ${studentIds.length} สมาชิกเข้ากลุ่มแล้ว` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/group-notifications/:id/remove-students
  removeStudents: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { studentIds } = req.body;

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, error: "กรุณาระบุ studentIds เป็น Array" });
      }

      await GroupNotificationService.removeStudents(id, studentIds);
      res.json({ success: true, message: `ลบ ${studentIds.length} สมาชิกออกจากกลุ่มแล้ว` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // PUT /api/group-notifications/:id
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await GroupNotificationService.update(id, req.body);
      res.json({ success: true, message: "อัปเดตกลุ่มแล้ว" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // DELETE /api/group-notifications/:id
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await GroupNotificationService.delete(id);
      res.json({ success: true, message: "ลบกลุ่มแล้ว" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
