interface ICSOptions {
  title: string;
  description: string;
  location: string;
  start: Date;
  durationMinutes?: number;
  url?: string;
}

function formatDateToICS(d: Date): string {
  return d.toISOString().replace(/-|:|\.\d+/g, "");
}

export function generateICSContent({
  title,
  description,
  location,
  start,
  durationMinutes = 45,
  url,
}: ICSOptions): string {
  const endDate = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const startFormatted = formatDateToICS(start);
  const endFormatted = formatDateToICS(endDate);
  const nowFormatted = formatDateToICS(new Date());

  const descClean = (description || "").replace(/\n/g, "\\n");
  const locClean = (location || "").replace(/\n/g, "\\n");

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PropertyPro//Property Showing Tour//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:tour-${start.getTime()}@propertypro.com`,
    `DTSTAMP:${nowFormatted}`,
    `DTSTART:${startFormatted}`,
    `DTEND:${endFormatted}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${descClean}`,
    `LOCATION:${locClean}`,
  ];

  if (url) {
    ics.push(`URL:${url}`);
  }

  ics.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");

  return ics.join("\r\n");
}

export function generateGoogleCalendarUrl({
  title,
  description,
  location,
  start,
  durationMinutes = 45,
}: ICSOptions): string {
  const endDate = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const startFormatted = formatDateToICS(start);
  const endFormatted = formatDateToICS(endDate);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startFormatted}/${endFormatted}`,
    details: description || "",
    location: location || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
