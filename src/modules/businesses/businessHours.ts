import { prisma } from "../../db/prisma";

const minutesFromTimeText = (timeText: string) => {
  const match = timeText.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

const minutesFromDate = (date: Date) => {
  return date.getHours() * 60 + date.getMinutes();
};

export const isWithinBusinessHours = async ({
  businessId,
  startTime,
  endTime,
}: {
  businessId: string;
  startTime: Date;
  endTime: Date;
}) => {
  if (startTime.toDateString() !== endTime.toDateString()) {
    return false;
  }

  const hours = await prisma.businessHours.findUnique({
    where: {
      businessId_dayOfWeek: {
        businessId,
        dayOfWeek: startTime.getDay(),
      },
    },
  });

  if (!hours || hours.isClosed) {
    return false;
  }

  const opensAt = minutesFromTimeText(hours.opensAt);
  const closesAt = minutesFromTimeText(hours.closesAt);

  if (opensAt === null || closesAt === null) {
    return false;
  }

  return (
    minutesFromDate(startTime) >= opensAt && minutesFromDate(endTime) <= closesAt
  );
};
