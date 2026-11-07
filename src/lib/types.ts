// `link` is an optional next step shown under the message, e.g. "Record payment from City Bakers".
export type Result = { ok: boolean; message: string; link?: { href: string; label: string } };
