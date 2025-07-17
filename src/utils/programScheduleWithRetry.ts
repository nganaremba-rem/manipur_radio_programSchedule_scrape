import axios from "axios";
import { format } from "date-fns";
import cron from "node-cron";
import { openBrowserAndScrape } from "../controller/scrapeProgramListController";
import { logger } from "./logger";
import { sanitizeData } from "./sanitizedJson";

// export const API_DAILY_PROGRAM =
// 	"http://ec2-34-208-96-17.us-west-2.compute.amazonaws.com:8080/radio_api/dailyProgram";
export const API_DAILY_PROGRAM =
	"http://167.71.226.228:8080/dailyProgram";

export interface ProgramSchedule {
	serialNumber: string;
	timeIn: string;
	timeOut: string;
	studio: string;
	programDescription: string;
	presenter: string;
	remarks: string;
	language: string;
	programType: string;
	contentType: string;
}

export interface ScrapeResult {
	isAvailable: boolean;
	programSchedule: ProgramSchedule[];
	isError: boolean;
	errorMessage: string;
}

type DataToSubmit = {
	insertBy: string;
	channel: string;
	date: string;
	programList: {
		id: number;
		startingTime: string;
		endingTime: string;
		programName: string;
		programDetails: string;
	}[];
};

export class ProgramScheduler {
	private retryTimer: NodeJS.Timeout | null = null;
	private isRetrying = false;
	private channel: string;
	private cronJob: cron.ScheduledTask | null;

	constructor(shouldSchedule = true, channel = "SANGAI") {
		// Initialize the daily schedule at 5 AM
		this.channel = channel;
		this.cronJob = null;

		if (shouldSchedule) this.initializeDailySchedule();
	}

	start() {
		logger.info("Starting program scheduler...");
		this.startScraping();
	}

	async startScraping(): Promise<ScrapeResult> {
		logger.info("Starting scraping");
		try {
			const result = await openBrowserAndScrape();
			if (result.isError) {
				return {
					isAvailable: false,
					programSchedule: [],
					isError: true,
					errorMessage: result.errorMessage,
				};
			}
			this.handleScrapeResult(result);
			return {
				isAvailable: true,
				programSchedule: result.programSchedule,
				isError: false,
				errorMessage: "",
			};
		} catch (error) {
			logger.error("Error during scraping:", error as Error);
			logger.info("Starting retry process");
			this.startRetryProcess();
			return {
				isAvailable: false,
				programSchedule: [],
				isError: true,
				errorMessage: (error as Error).message,
			};
		}
	}

	private initializeDailySchedule(): void {
		// Schedule the main task to run at 5 AM daily
		this.cronJob = cron.schedule(
			"0 5 * * *",
			() => {
				logger.info("Starting daily schedule check at 5 AM");
				this.startScraping()
					.then((result) => {
						if (result.isError) {
							this.handleScrapeResult(result);
							logger.error(result.errorMessage);
						}
						logger.info("Daily schedule check completed", result);
					})
					.catch((error) => {
						logger.error("Error during daily schedule check:", error as Error);
					});
			},
			{
				scheduled: true,
				timezone: "Asia/Kolkata",
			},
		);
	}

	stopCron() {
		if (this.cronJob) {
			this.cronJob.stop(); // Stops the cron job
			this.cronJob = null; // Clear the reference
			logger.info("Cron job stopped");
		}
	}

	private generateDataToSubmit(schedule: ProgramSchedule[]): DataToSubmit {
		logger.info("Generating data to submit");
		return {
			insertBy: "admin",
			channel: this.channel,
			date: format(new Date(), "yyyy-MM-dd"),
			programList: schedule.map((item) => {
				return {
					id: Number.parseInt(item.serialNumber),
					startingTime: item.timeIn,
					endingTime: item.timeOut,
					programName: item.programDescription,
					programDetails: item.programType,
				};
			}),
		};
	}

	private handleScrapeResult(result: ScrapeResult): void {
		logger.info("Handling scrape result");
		if (result.isAvailable) {
			logger.info(
				"Program schedule successfully retrieved:",
				result.programSchedule,
			);
			// Here you can process the program schedule data
			logger.info("Processing program schedule");
			this.processProgramSchedule(result.programSchedule);
			logger.info("Stopping retry process");
			this.stopRetryProcess();
		} else {
			logger.info("Program schedule not available, starting retry process");
			this.startRetryProcess();
		}
	}

	private startRetryProcess(): void {
		logger.info("Starting retry process");
		if (!this.isRetrying) {
			this.isRetrying = true;
			this.scheduleRetry();
		}
	}

	private scheduleRetry(): void {
		logger.info("Scheduling retry");
		// Clear any existing retry timer
		if (this.retryTimer) {
			clearTimeout(this.retryTimer);
		}

		// Set up the 5-minute retry interval
		this.retryTimer = setInterval(
			async () => {
				logger.info("Retrying scrape...");
				try {
					const result = await openBrowserAndScrape();
					if (result.isAvailable) {
						logger.info("Retry successful, program schedule retrieved");
						await this.processProgramSchedule(result.programSchedule); // Direct call to avoid double processing
						this.stopRetryProcess();
					} else {
						logger.info("Program schedule still not available");
					}
				} catch (error) {
					logger.error("Error during retry:", error as Error);
				}
			},
			5 * 60 * 1000,
		); // 5 minutes in milliseconds
	}

	private stopRetryProcess(): void {
		logger.info("Stopping retry process");
		if (this.retryTimer) {
			clearInterval(this.retryTimer);
			this.retryTimer = null;
		}
		this.isRetrying = false;
		logger.info(
			"Retry process stopped. Waiting for next daily schedule at 5 AM",
		);
	}

	private async updateDataUsingAxios(data: DataToSubmit) {
		const sanitizedData = sanitizeData(data);
		const API_URL = `${API_DAILY_PROGRAM}/updateData`;
		try {
			const response = await axios.put(API_URL, sanitizedData, {
				headers: {
					"Content-Type": "application/json",
					// Add any auth headers if needed
					// 'Authorization': 'Bearer your-token'
				},
			});

			return response.data;
		} catch (error) {
			logger.error("Error sending data:", error as Error);
			throw error;
		}
	}

	private async sendDataUsingAxios(data: DataToSubmit) {
		const sanitizedData = sanitizeData(data);

		const API_URL = `${API_DAILY_PROGRAM}/setData`;
		try {
			const response = await axios.post(API_URL, sanitizedData, {
				headers: {
					"Content-Type": "application/json",
				},
			});

			return response?.data;
		} catch (error) {
			logger.error("Error sending data:", error as Error);
			throw error;
		}
	}

	private async processProgramSchedule(schedule: ProgramSchedule[]) {
		logger.info("Processing program schedule");
		try {
			// Process the retrieved schedule data
			const API_URL = `${API_DAILY_PROGRAM}/getData?date=${format(new Date(), "yyyy-MM-dd")}&channel=${this.channel}`;
			logger.info("Fetching data from API", API_URL);
			const listAvailable = await axios.get(API_URL);

			logger.info(listAvailable?.data, "today");

			const isAvailable =
				!!listAvailable?.data?.data || !!listAvailable?.data?.data?.length;

			// The issue was here - we weren't binding 'this' context to the methods
			// When called directly, 'this' context was lost causing the methods to fail
			const submitOrUpdate = isAvailable
				? this.updateDataUsingAxios.bind(this)
				: this.sendDataUsingAxios.bind(this);

			logger.info(submitOrUpdate.toString(), "fnc");

			const dataToSubmit = this.generateDataToSubmit(schedule);
			logger.info(JSON.stringify(dataToSubmit, null, 2), "dataToSubmit");

			logger.info("Submitting data");
			const response = await submitOrUpdate(dataToSubmit);

			if (response?.statusCode === 1) {
				logger.info("Submitted successfully");
			} else {
				logger.info("Submission failed!", response);
			}
			logger.info(`Processing ${schedule.length} program entries`);
		} catch (err) {
			logger.error(
				`Error in processProgramSchedule: ${JSON.stringify(err)}`,
				err as Error,
			);
		}
	}

	// Method to manually stop the scheduler if needed
	public stop(): void {
		logger.info("Stopping program scheduler...");
		this.stopRetryProcess();
	}
}
