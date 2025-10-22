import { Router } from "express";
import { AdviserController } from "../controllers/adviser.controller";

const r = Router();
r.get("/", AdviserController.list);
r.post("/", AdviserController.assignMany);
r.put("/:studentID", AdviserController.reassign);
r.delete("/:studentID", AdviserController.remove);

export default r;
