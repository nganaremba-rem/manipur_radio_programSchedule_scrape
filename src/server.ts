import express from "express";
import path from "node:path";
import apiRoutes from "./routes";
import { ProgramScheduler } from "./utils/programScheduleWithRetry";

const app = express();

const PORT =
	(process?.env?.PORT && Number.parseInt(process?.env?.PORT)) || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Initialize the scheduler
const scheduler = new ProgramScheduler();

// Handle process termination
process.on("SIGTERM", () => {
	console.log("Shutting down scheduler...");
	scheduler.stop();
	process.exit(0);
});

process.on("SIGINT", () => {
	console.log("Shutting down scheduler...");
	scheduler.stop();
	process.exit(0);
});

app.use("/api", apiRoutes);

app.listen(PORT, "0.0.0.0", () =>
	console.log(`Server running at http://localhost:${PORT}`),
);
