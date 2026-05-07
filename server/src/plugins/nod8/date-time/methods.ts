import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

type DateUnit =
  | "millisecond" | "second" | "minute" | "hour"
  | "day" | "week" | "month" | "year";

export function createMethods() {
  return {
    async now(params: { format?: string; timezone?: string }) {
      const tz = params.timezone;
      const fmt = params.format;
      const d = tz ? dayjs().tz(tz) : dayjs();
      const formatted = fmt ? d.format(fmt) : d.toISOString();
      return {
        iso: d.toISOString(),
        timestamp: d.valueOf(),
        formatted,
        utcOffset: d.utcOffset(),
      };
    },

    async format(params: { date: string; format: string }) {
      const d = dayjs(params.date);
      if (!d.isValid()) throw new Error(`Invalid date: "${params.date}"`);
      return {
        formatted: d.format(params.format),
        iso: d.toISOString(),
        timestamp: d.valueOf(),
      };
    },

    async add(params: { date: string; amount: number; unit: DateUnit }) {
      const d = dayjs(params.date);
      if (!d.isValid()) throw new Error(`Invalid date: "${params.date}"`);
      const result = d.add(params.amount, params.unit);
      return {
        iso: result.toISOString(),
        timestamp: result.valueOf(),
        formatted: result.format("YYYY-MM-DD HH:mm:ss"),
      };
    },

    async subtract(params: { date: string; amount: number; unit: DateUnit }) {
      const d = dayjs(params.date);
      if (!d.isValid()) throw new Error(`Invalid date: "${params.date}"`);
      const result = d.subtract(params.amount, params.unit);
      return {
        iso: result.toISOString(),
        timestamp: result.valueOf(),
        formatted: result.format("YYYY-MM-DD HH:mm:ss"),
      };
    },

    async diff(params: { dateA: string; dateB: string; unit: DateUnit }) {
      const a = dayjs(params.dateA);
      const b = dayjs(params.dateB);
      if (!a.isValid()) throw new Error(`Invalid dateA: "${params.dateA}"`);
      if (!b.isValid()) throw new Error(`Invalid dateB: "${params.dateB}"`);
      return {
        diff: a.diff(b, params.unit),
        unit: params.unit,
        dateA: a.toISOString(),
        dateB: b.toISOString(),
      };
    },
  };
}
