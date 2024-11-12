// Function to sanitize string values
// function sanitizeString(str: string): string {
// 	if (!str) return str;
// 	return (
// 		str
// 			// biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
// 			.replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
// 			.replace(/\\(?!["\\/bfnrt])/g, "") // Remove invalid escapes
// 			.replace(/[""]/g, '"') // Normalize quotes
// 			.replace(/[\r\n]+/g, " ") // Replace newlines with spaces
// 			.trim()
// 	);
// }

// Function to sanitize the entire data object
export function sanitizeData<T>(data: T) {
	return JSON.parse(
		JSON.stringify(data, (_, value) => {
			if (typeof value === "string") {
				return (
					value
						.replace(/"/g, "'") // Replace double quotes with single quotes
						// biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
						.replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
						.trim()
				);
			}
			return value;
		}),
	);
}
