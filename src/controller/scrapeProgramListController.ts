import { getProgramSchedule } from "@/utils/getProgramSchedule";
import {
	ProgramScheduler,
	type ScrapeResult,
} from "@/utils/programScheduleWithRetry";
import type { Request, Response } from "express";
import puppeteer, { type Browser } from "puppeteer";

export const baseUrl = "https://cuesheets.prasarbharati.org";
export const akashVaniUrl =
	"https://cuesheets.prasarbharati.org/su_viewSheetByPb/414";

export async function openBrowserAndScrape(): Promise<ScrapeResult> {
	let browser: Browser | null = null;
	try {
		browser = await puppeteer.launch({
			headless: true,
		});

		const page = await browser.newPage();
		await page.goto(baseUrl, {
			waitUntil: "domcontentloaded",
		});
		await page.waitForSelector('button[type="submit"]'); // Adjust selector as needed

		const cookies = await page.cookies();
		const cuesheets_session = cookies.find(
			(cookie) => cookie.name === "cuesheets_session",
		);

		if (cuesheets_session) {
			const expireTime = new Date(cuesheets_session.expires);

			// if not logged in
			if (new Date() > expireTime) {
				page.$$eval('button[type="submit"]', (btns) => {
					for (const btn of btns) {
						if (
							btn.innerText.toLowerCase() === "Login as guest".toLowerCase()
						) {
							btn.click();
						}
					}
				});
			}

			// alread logged in
			return {
				isAvailable: true,
				programSchedule: await getProgramSchedule(page),
			};
		}

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
	const schedule = new ProgramScheduler(false);
	await schedule.startScraping();

	res.json({ message: "Done" });
};
