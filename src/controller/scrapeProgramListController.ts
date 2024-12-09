import type { Request, Response } from "express";
import puppeteer, { type Browser } from "puppeteer";
import { getProgramSchedule } from "../utils/getProgramSchedule";
import { logger } from "../utils/logger";
import {
	ProgramScheduler,
	type ScrapeResult,
} from "../utils/programScheduleWithRetry";

export const baseUrl = "https://cuesheets.prasarbharati.org";
export const akashVaniUrl =
	"https://cuesheets.prasarbharati.org/su_viewSheetByPb/414";

export async function openBrowserAndScrape(): Promise<ScrapeResult> {
	let browser: Browser | null = null;
	try {
		logger.info("Opening browser");
		browser = await puppeteer.launch({
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
			headless: true,
		});
		logger.info("Browser opened");
		const page = await browser.newPage();
		logger.info("New page opened");
		await page.goto(baseUrl, {
			waitUntil: "domcontentloaded",
			timeout: 120000,
		});
		logger.info("Navigated to base url");
		await page.waitForSelector('button[type="submit"]', {
			timeout: 120000,
		}); // Adjust selector as needed
		logger.info("Button found");

		logger.info("Getting cookies");
		const cookies = await page.cookies();
		logger.info("Cookies fetched");
		const cuesheets_session = cookies.find(
			(cookie) => cookie.name === "cuesheets_session",
		);
		logger.info("Cuesheets session found");
		if (cuesheets_session) {
			const expireTime = new Date(cuesheets_session.expires);
			logger.info("Expire time fetched");
			// if not logged in
			if (new Date() > expireTime) {
				logger.info("Expire time is in the past");
				logger.info("Clicking login as guest button");
				page.$$eval('button[type="submit"]', (btns) => {
					for (const btn of btns) {
						if (
							btn.innerText.toLowerCase() === "Login as guest".toLowerCase()
						) {
							btn.click();
						}
					}
				});
				logger.info("Login as guest button clicked");
			}

			// alread logged in
			logger.info("Getting program schedule");
			const result = await getProgramSchedule(page);
			logger.info("Program schedule fetched");
			if (result.isError) {
				logger.error(`Error in getProgramSchedule: ${result.errorMessage}`);
				return {
					isAvailable: false,
					programSchedule: [],
					isError: true,
					errorMessage: result.errorMessage,
				};
			}

			if (result.programSchedule.length === 0) {
				logger.info("No program schedule found");
				return {
					isAvailable: false,
					programSchedule: [],
					isError: false,
					errorMessage: "",
				};
			}

			return {
				isAvailable: true,
				programSchedule: result.programSchedule,
				isError: false,
				errorMessage: "",
			};
		}

		logger.info("No cuesheets session found");
		return {
			isAvailable: false,
			programSchedule: [],
			isError: false,
			errorMessage: "",
		};
	} catch (err) {
		logger.error("Error during browser scraping", err as Error);
		return {
			isAvailable: false,
			programSchedule: [],
			isError: true,
			errorMessage: (err as Error).message,
		};
	} finally {
		if (browser) {
			browser.close();
		}
	}
}

export const scrapeProgramListController = async (
	_req: Request,
	res: Response,
) => {
	logger.info("Manual scraping started");
	try {
		const schedule = new ProgramScheduler(false);
		const result = await schedule.startScraping();
		res.json(result);
	} catch (err) {
		logger.error("Error during manual scraping", err as Error);
		res.status(500).json({ message: "Error" });
	}
};
