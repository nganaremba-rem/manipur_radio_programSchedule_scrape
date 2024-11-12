import { openBrowserAndScrape } from "@/controller/scrapeProgramListController";
import axios from "axios";
import { format } from "date-fns";
import cron from "node-cron";
import { sanitizeData } from "./sanitizedJson";

export const API_DAILY_PROGRAM =
	"http://ec2-34-208-96-17.us-west-2.compute.amazonaws.com:8080/radio_api/dailyProgram";

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

	constructor(shouldSchedule = true, channel = "SANGAI") {
		// Initialize the daily schedule at 5 AM
		this.channel = channel;

		if (shouldSchedule) this.initializeDailySchedule();
	}

	async startScraping(): Promise<void> {
		try {
			const result = await openBrowserAndScrape();
			this.handleScrapeResult(result);
		} catch (error) {
			console.error("Error during scraping:", error);
			this.startRetryProcess();
		}
	}

	private initializeDailySchedule(): void {
		// Schedule the main task to run at 5 AM daily
		cron.schedule("0 5 * * *", () => {
			console.log("Starting daily schedule check at 5 AM");
			this.startScraping();
		});
	}

	private generateDataToSubmit(schedule: ProgramSchedule[]): DataToSubmit {
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
		if (result.isAvailable) {
			console.log(
				"Program schedule successfully retrieved:",
				result.programSchedule,
			);
			this.stopRetryProcess();
			// Here you can process the program schedule data
			this.processProgramSchedule(result.programSchedule);
		} else {
			console.log("Program schedule not available, starting retry process");
			this.startRetryProcess();
		}
	}

	private startRetryProcess(): void {
		if (!this.isRetrying) {
			this.isRetrying = true;
			this.scheduleRetry();
		}
	}

	private scheduleRetry(): void {
		// Clear any existing retry timer
		if (this.retryTimer) {
			clearTimeout(this.retryTimer);
		}

		// Set up the 5-minute retry interval
		this.retryTimer = setInterval(
			async () => {
				console.log("Retrying scrape...");
				try {
					const result = await openBrowserAndScrape();
					if (result.isAvailable) {
						console.log("Retry successful, program schedule retrieved");
						this.handleScrapeResult(result);
					} else {
						console.log("Program schedule still not available");
					}
				} catch (error) {
					console.error("Error during retry:", error);
				}
			},
			5 * 60 * 1000,
		); // 5 minutes in milliseconds
	}

	private stopRetryProcess(): void {
		if (this.retryTimer) {
			clearInterval(this.retryTimer);
			this.retryTimer = null;
		}
		this.isRetrying = false;
		console.log(
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
			console.error("Error sending data:", error);
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
			console.error("Error sending data:", error);
			throw error;
		}
	}

	private async processProgramSchedule(schedule: ProgramSchedule[]) {
		try {
			// Process the retrieved schedule data
			const API_URL = `${API_DAILY_PROGRAM}/getData?date=${format(new Date(), "yyyy-MM-dd")}&channel=${this.channel}`;

			const listAvailable = await axios.get(API_URL);

			console.log(listAvailable?.data, "today");

			const isAvailable =
				!!listAvailable?.data?.data || !!listAvailable?.data?.data?.length;
			console.log(isAvailable, "isAvailable");

			const submitOrUpdate = isAvailable
				? this.updateDataUsingAxios
				: this.sendDataUsingAxios;
			console.log(submitOrUpdate, "fnc");
			const response = await submitOrUpdate(
				this.generateDataToSubmit(schedule),
			);

			if (response?.statusCode === 1) {
				console.log("Submitted successfully");
			} else {
				console.log("Submission failed!", response);
			}
			console.log(`Processing ${schedule.length} program entries`);
		} catch (err) {
			console.log(err);
		}
	}

	// Method to manually stop the scheduler if needed
	public stop(): void {
		this.stopRetryProcess();
	}
}
