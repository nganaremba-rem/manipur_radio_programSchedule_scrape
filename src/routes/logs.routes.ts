import { type Request, type Response, Router } from "express";
import { logEmitter } from "../utils/events";

const router = Router();

router.get("/", (req: Request, res: Response) => {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");

	// Add client to connected clients
	logEmitter.emit("newLogClient", res);

	// Send initial connection message
	res.write("data: Connected to log stream\n\n");

	// Keep connection alive
	const keepAlive = setInterval(() => {
		res.write(": keepalive\n\n");
	}, 20000);

	// Handle client disconnect
	req.on("close", () => {
		clearInterval(keepAlive);
		logEmitter.emit("removeLogClient", res);
	});
});

export default router;
