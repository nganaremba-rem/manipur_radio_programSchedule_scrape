import { format } from "date-fns";
import type { Page } from "puppeteer";
import { akashVaniUrl } from "../controller/scrapeProgramListController";

export async function getProgramSchedule(page: Page) {
	try {
		console.log("Waiting for navigation");
		await page.waitForNavigation({
			waitUntil: "load",
			timeout: 120000,
		});
		console.log("Navigated to url");
		await page.goto(`${akashVaniUrl}/${format(new Date(), "yyyy-MM-dd")}`, {
			waitUntil: "domcontentloaded",
		});
		console.log(
			"Navigated to url",
			`${akashVaniUrl}/${format(new Date(), "yyyy-MM-dd")}`,
		);
		// Wait for table to be loaded
		console.log("Waiting for table to be loaded");
		await page.waitForSelector("table#st");

		console.log("Table loaded");
		// Extract data from table
		console.log("Extracting data from table");
		const programSchedule = await page.evaluate(() => {
			console.log("Evaluating table rows");
			const rows = Array.from(document.querySelectorAll("table#st tbody tr"));

			console.log("rows", rows);
			return rows?.map((row) => {
				console.log("mapping row", row);
				function cleanText(text: string | null) {
					console.log("cleaning text", text);
					if (!text) return "";

					return text
						.trim()
						.replace(/\s+/g, " ") // Replace multiple spaces with single space
						.replace(/\n/g, " "); // Replace newlines with space
					// .replace(/[\-\/]/g, "-") // Replace newlines with space
					// .replace(/[^a-zA-Z0-9\-.:]/g, " "); // Replace newlines with space
					// .substring(0, 100);
				}

				function convertTo24Hour(timeStr: string): string {
					console.log("converting to 24 hour", timeStr);
					// Remove extra spaces and convert to uppercase for consistency
					const timeString = timeStr.trim().toUpperCase();

					// Extract hours, minutes, and period (AM/PM)
					const matches = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);

					if (!matches) {
						throw new Error(
							'Invalid time format. Expected "HH:MM AM/PM" or "HH:MM"',
						);
					}

					let hours = Number.parseInt(matches[1]);
					const minutes = matches[2];
					const period = matches[3];

					// Handle 24-hour format input (no AM/PM)
					if (!period) {
						return `${hours.toString().padStart(2, "0")}:${minutes}`;
					}

					// Convert to 24-hour format
					if (period === "PM" && hours !== 12) {
						hours += 12;
					} else if (period === "AM" && hours === 12) {
						hours = 0;
					}

					return `${hours.toString().padStart(2, "0")}:${minutes}`;
				}

				function getContent(cell: Element | null) {
					console.log("getting content", cell);
					if (!cell) return "";
					// Check for paragraphs or divs first
					const content = cell.querySelector("p, div");
					if (content) {
						return cleanText(content.textContent);
					}
					return cleanText(cell.textContent);
				}
				// Get all cells from the row
				const cells = Array.from(row.querySelectorAll("td"));

				return {
					serialNumber: cleanText(cells?.[0]?.textContent),
					timeIn: convertTo24Hour(cleanText(cells?.[1]?.textContent)),
					timeOut: convertTo24Hour(cleanText(cells?.[2]?.textContent)),
					studio: cleanText(cells?.[3]?.textContent),
					programDescription: getContent(cells?.[4]),
					presenter: cleanText(cells?.[5]?.textContent),
					remarks: cleanText(cells?.[6]?.textContent),
					language: cleanText(cells?.[7]?.textContent),
					programType: cleanText(cells?.[8]?.textContent),
					contentType: cleanText(cells?.[9]?.textContent),
				};
			});
		});
		return programSchedule;
	} catch (err) {
		console.log(err);
		return [];
	}
}
