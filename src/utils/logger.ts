import { sendLogToClient } from "../server";

class Logger {
	private static instance: Logger;

	private constructor() {}

	public static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	info(message: string, ...args: any[]) {
		const formattedMessage = `[INFO] ${message}`;
		console.log(formattedMessage, ...args);
		sendLogToClient(`${formattedMessage}\n${args.join("\n")}`);
	}

	error(message: string, error?: Error) {
		const formattedMessage = `[ERROR] ${message}${error ? `: ${error.message}` : ""}`;
		console.error(formattedMessage);
		sendLogToClient(formattedMessage);
		if (error?.stack) {
			console.error(error.stack);
			sendLogToClient(`[ERROR_STACK] ${error.stack}`);
		}
	}

	warn(message: string) {
		const formattedMessage = `[WARN] ${message}`;
		console.warn(formattedMessage);
		sendLogToClient(formattedMessage);
	}

	debug(message: string) {
		const formattedMessage = `[DEBUG] ${message}`;
		console.debug(formattedMessage);
		sendLogToClient(formattedMessage);
	}
}

export const logger = Logger.getInstance();
