// State to IANA Timezone mapping for US & Canada
const STATE_TIMEZONE_MAP: Record<string, string> = {
  // Eastern
  NY: "America/New_York", NJ: "America/New_York", PA: "America/New_York", MA: "America/New_York",
  CT: "America/New_York", RI: "America/New_York", VT: "America/New_York", NH: "America/New_York",
  ME: "America/New_York", FL: "America/New_York", GA: "America/New_York", NC: "America/New_York",
  SC: "America/New_York", VA: "America/New_York", WV: "America/New_York", MD: "America/New_York",
  DE: "America/New_York", DC: "America/New_York", OH: "America/New_York", MI: "America/Detroit",
  // Central
  IL: "America/Chicago", TX: "America/Chicago", MO: "America/Chicago", WI: "America/Chicago",
  MN: "America/Chicago", IA: "America/Chicago", KS: "America/Chicago", NE: "America/Chicago",
  OK: "America/Chicago", AR: "America/Chicago", LA: "America/Chicago", MS: "America/Chicago",
  AL: "America/Chicago", TN: "America/Chicago", KY: "America/Louisville", IN: "America/Indiana/Indianapolis",
  // Mountain
  CO: "America/Denver", UT: "America/Denver", NM: "America/Denver", WY: "America/Denver",
  MT: "America/Denver", ID: "America/Boise", AZ: "America/Phoenix",
  // Pacific
  CA: "America/Los_Angeles", WA: "America/Los_Angeles", OR: "America/Los_Angeles", NV: "America/Los_Angeles",
  // Alaska & Hawaii
  AK: "America/Anchorage", HI: "Pacific/Honolulu",
};

export function getTimezoneForState(state?: string | null): string {
  if (!state) return "America/New_York"; // Default fallback
  const cleanState = state.trim().toUpperCase();
  return STATE_TIMEZONE_MAP[cleanState] || "America/New_York";
}

export function formatDateTimeInTimezone(
  date: Date | string,
  timezone: string = "America/New_York"
): { dateStr: string; timeStr: string; tzAbbrev: string } {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return { dateStr: "Invalid Date", timeStr: "", tzAbbrev: "" };
  }

  const dateStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(d);

  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(d);

  const tzAbbrev = new Intl.DateTimeFormat("en-US", {
    dayPeriod: "short",
    timeZoneName: "short",
    timeZone: timezone,
  })
    .formatToParts(d)
    .find((part) => part.type === "timeZoneName")?.value || "";

  return { dateStr, timeStr, tzAbbrev };
}
