import { scrapeProgramListController } from "@/controller/scrapeProgramListController";
import { Router } from "express";

const router = Router();

router.get("/", scrapeProgramListController);

export default router;
