import { Request, Response } from "express";
import { ChatbotService } from "../services/chatbot.service";

export const ChatbotController = {

  // GET /api/chatbot/history/:userId
  getHistory: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const data = await ChatbotService.getByUser(userId);
      res.json({ success: true, count: data.length, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/chatbot/:cmhId
  getById: async (req: Request, res: Response) => {
    try {
      const { cmhId } = req.params;
      const data = await ChatbotService.getById(cmhId);
      if (!data) return res.status(404).json({ success: false, message: "ไม่พบประวัติการสนทนานี้" });
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/chatbot/message
  saveMessage: async (req: Request, res: Response) => {
    try {
      const { user, userText, botText } = req.body;

      if (!user?.user_id || !user?.user_type || !user?.user_name) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุ user (user_id, user_type, user_name)"
        });
      }
      if (!["student", "teacher"].includes(user.user_type)) {
        return res.status(400).json({
          success: false,
          error: "user_type ต้องเป็น 'student' หรือ 'teacher' เท่านั้น"
        });
      }
      if (!userText || !botText) {
        return res.status(400).json({
          success: false,
          error: "กรุณาระบุ userText และ botText"
        });
      }

      const cmhId = await ChatbotService.saveMessage(user, userText, botText);
      res.status(201).json({ success: true, cmh_id: cmhId });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // DELETE /api/chatbot/:cmhId
  deleteMessage: async (req: Request, res: Response) => {
    try {
      const { cmhId } = req.params;
      const { userId, userType } = req.body;

      if (!userId || !userType) {
        return res.status(400).json({ success: false, error: "กรุณาระบุ userId และ userType" });
      }

      await ChatbotService.deleteMessage(cmhId, userId, userType);
      res.json({ success: true, message: "ลบประวัติการสนทนาแล้ว" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // DELETE /api/chatbot/history/:userId/clear
  clearHistory: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { userType } = req.body;

      if (!userType) {
        return res.status(400).json({ success: false, error: "กรุณาระบุ userType" });
      }

      const count = await ChatbotService.clearHistory(userId, userType);
      res.json({ success: true, message: `ลบประวัติทั้งหมด ${count} รายการแล้ว`, deletedCount: count });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
