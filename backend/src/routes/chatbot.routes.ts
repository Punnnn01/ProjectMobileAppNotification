import { Router } from "express";
import { ChatbotController } from "../controllers/chatbot.controller";

const router = Router();

router.get("/history/:userId",            ChatbotController.getHistory);
router.get("/:cmhId",                     ChatbotController.getById);
router.post("/message",                   ChatbotController.saveMessage);
router.delete("/history/:userId/clear",   ChatbotController.clearHistory);
router.delete("/:cmhId",                  ChatbotController.deleteMessage);

export default router;
