import { format } from "date-fns";
import express, { type Response } from "express";
import path from "node:path";
import apiRoutes from "./routes";
import { logEmitter } from "./utils/events";
import { logger } from "./utils/logger";
import { ProgramScheduler } from "./utils/programScheduleWithRetry";

const app = express();
const connectedClients: Response[] = [];

const PORT =
	(process?.env?.PORT && Number.parseInt(process?.env?.PORT)) || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Initialize the scheduler
const scheduler = new ProgramScheduler();

// Handle log clients
logEmitter.on("newLogClient", (client: Response) => {
	connectedClients.push(client);
});

logEmitter.on("removeLogClient", (client: Response) => {
	const index = connectedClients.indexOf(client);
	if (index > -1) {
		connectedClients.splice(index, 1);
	}
});

// Handle process termination
process.on("SIGTERM", () => {
	logger.info("Shutting down scheduler...");
	scheduler.stop();
	process.exit(0);
});

process.on("SIGINT", () => {
	logger.info("Shutting down scheduler...");
	scheduler.stop();
	process.exit(0);
});

app.use("/api", apiRoutes);
app.use("/", (_req, res) => {
	res.send("API Server is running");
});

app.listen(PORT, "0.0.0.0", () => {
	logger.info(`Server running at http://localhost:${PORT}`);
});

// Export for other modules to use
export const sendLogToClient = (log: string) => {
	const formattedLog = `data: ${JSON.stringify({ timestamp: format(new Date(), "dd/MM/yyyy hh:mm a"), message: log }, null, 2)}\n\n`;

	for (const client of connectedClients) {
		client.write(formattedLog);
	}
};
