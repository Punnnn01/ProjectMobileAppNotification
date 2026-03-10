import { Router } from "express";
import { GroupNotificationController } from "../controllers/group_notification.controller";

const router = Router();

router.get("/",                           GroupNotificationController.getAll);
router.get("/creator/:createdById",       GroupNotificationController.getByCreator);
router.get("/student/:studentId",         GroupNotificationController.getByStudent);
router.get("/:id",                        GroupNotificationController.getById);
router.post("/",                          GroupNotificationController.create);
router.post("/:id/add-students",          GroupNotificationController.addStudents);
router.post("/:id/remove-students",       GroupNotificationController.removeStudents);
router.put("/:id",                        GroupNotificationController.update);
router.delete("/:id",                     GroupNotificationController.delete);

export default router;
