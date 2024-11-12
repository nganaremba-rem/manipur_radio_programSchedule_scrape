import { Router } from "express";
import { scrapeProgramListController } from "../controller/scrapeProgramListController";

const router = Router();

router.get("/", scrapeProgramListController);

export default router;
