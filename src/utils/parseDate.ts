import * as chrono from "chrono-node";

const relativeDays: Record<string, number> = {
  heute: 0,
  dzisiaj: 0,
  dzis: 0,
  dziś: 0,
  morgen: 1,
  jutro: 1,
  uebermorgen: 2,
  übermorgen: 2,
  pojutrze: 2,
};

const parseRelativeDateWithTime = (text: string, referenceDate: Date) => {
  const normalized = text.toLowerCase().trim();
  const relativeDay = Object.entries(relativeDays)
    .sort(([left], [right]) => right.length - left.length)
    .find(([word]) => normalized.includes(word));
  const timeMatch = normalized.match(/\b(\d{1,2})(?::|\.)(\d{2})\b/);

  if (!relativeDay || !timeMatch) {
    return null;
  }

  const [, daysToAdd] = relativeDay;
  const hours = Number.parseInt(timeMatch[1], 10);
  const minutes = Number.parseInt(timeMatch[2], 10);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  const parsedDate = new Date(referenceDate);
  parsedDate.setDate(parsedDate.getDate() + daysToAdd);
  parsedDate.setHours(hours, minutes, 0, 0);

  return parsedDate;
};

export const parseDate = (text: string) => {
  const referenceDate = new Date();
  const relativeDate = parseRelativeDateWithTime(text, referenceDate);

  if (relativeDate) {
    return relativeDate;
  }

  return chrono.parseDate(text, referenceDate, {
    forwardDate: true,
  });
};
