import type { Response } from "express";
import { EventEmitter } from "node:events";

// Type declaration for our event emitter

interface TypedEventEmitter<
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	T extends Record<string, (...args: any[]) => void>,
> {
	on<K extends keyof T>(event: K | string | symbol, listener: T[K]): this;
	emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean;
	addListener<K extends keyof T>(
		event: K | string | symbol,
		listener: T[K],
	): this;
	removeListener<K extends keyof T>(
		event: K | string | symbol,
		listener: T[K],
	): this;
}

type LogEvents = {
	[K in "newLogClient" | "removeLogClient"]: (client: Response) => void;
};

// Create a typed event emitter
const logEmitter =
	new EventEmitter() as unknown as TypedEventEmitter<LogEvents>;

export { logEmitter };
