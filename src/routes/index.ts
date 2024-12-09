import { Router } from "express";
import logsRouter from "./logs.routes";
import scrapeProgramListRouter from "./scrapeProgramList.routes";

const router = Router();

router.use("/scrapeNow", scrapeProgramListRouter);
router.use("/logs", logsRouter);

export default router;
