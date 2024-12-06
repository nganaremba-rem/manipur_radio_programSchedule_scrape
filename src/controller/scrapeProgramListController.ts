import type { Request, Response } from "express";
import puppeteer, { type Browser } from "puppeteer";
import { getProgramSchedule } from "../utils/getProgramSchedule";
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
		console.log("Opening browser");
		browser = await puppeteer.launch({
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
			headless: true,
		});
		console.log("Browser opened");
		const page = await browser.newPage();
		console.log("New page opened");
		await page.goto(baseUrl, {
			waitUntil: "domcontentloaded",
		});
		console.log("Navigated to base url");
		await page.waitForSelector('button[type="submit"]'); // Adjust selector as needed
		console.log("Button found");

		console.log("Getting cookies");
		const cookies = await page.cookies();
		console.log("Cookies fetched");
		const cuesheets_session = cookies.find(
			(cookie) => cookie.name === "cuesheets_session",
		);
		console.log("Cuesheets session found");
		if (cuesheets_session) {
			const expireTime = new Date(cuesheets_session.expires);
			console.log("Expire time fetched");
			// if not logged in
			if (new Date() > expireTime) {
				console.log("Expire time is in the past");
				console.log("Clicking login as guest button");
				page.$$eval('button[type="submit"]', (btns) => {
					for (const btn of btns) {
						if (
							btn.innerText.toLowerCase() === "Login as guest".toLowerCase()
						) {
							btn.click();
						}
					}
				});
				console.log("Login as guest button clicked");
			}

			// alread logged in
			console.log("Getting program schedule");
			return {
				isAvailable: true,
				programSchedule: await getProgramSchedule(page),
			};
		}

		console.log("No cuesheets session found");
		return {
			isAvailable: false,
			programSchedule: [],
		};
	} catch (err) {
		console.log(err);
		return {
			isAvailable: false,
			programSchedule: [],
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
	console.log("Manual scraping started");
	try {
		const schedule = new ProgramScheduler(false);
		await schedule.startScraping();
		res.json({ message: "Done" });
	} catch (err) {
		console.log(err);
		res.status(500).json({ message: "Error" });
	}
};
