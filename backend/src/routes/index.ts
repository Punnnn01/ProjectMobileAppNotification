import { Router } from "express";
import adviserRoutes from "./adviser.routes";
import studentRoutes from "./student.routes";
import teacherRoutes from "./teacher.routes";
import newsRoutes from "./news.routes";
import newsFilesRoutes from "./news-files.routes";
import scheduleRoutes from "./schedule.routes";
import notificationsRoutes from "./notifications.routes";
import groupNotificationRoutes from "./group_notification.routes";
import chatbotRoutes from "./chatbot.routes";

const r = Router();
r.use("/students",            studentRoutes);
r.use("/teachers",            teacherRoutes);
r.use("/advisers",            adviserRoutes);
r.use("/news",                newsRoutes);
r.use("/news-files",          newsFilesRoutes);
r.use("/schedule",            scheduleRoutes);
r.use("/notifications",       notificationsRoutes);
r.use("/group-notifications", groupNotificationRoutes);
r.use("/chatbot",             chatbotRoutes);

export default r;
