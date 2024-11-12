import { Router } from "express";
import scrapeProgramList from "./scrapeProgramList.routes";

const router = Router();

router.get("/", (_req, res) => {
	res.send("API Server is running");
});
router.use("/scrapeNow", scrapeProgramList);

export default router;
