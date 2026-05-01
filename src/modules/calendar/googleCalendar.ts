import { google } from "googleapis";
import type { Appointment, Business, Customer, Service } from "@prisma/client";

const calendar = google.calendar("v3");

const getAuthClient = () => {
  const clientEmail = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!clientEmail || !privateKey) {
    return null;
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });
};

export const getBusinessCalendarId = (
  business: Pick<Business, "googleCalendarId">
) => {
  return business.googleCalendarId || process.env.GOOGLE_CALENDAR_ID || null;
};

export const createGoogleCalendarEvent = async ({
  appointment,
  business,
  customer,
  service,
}: {
  appointment: Appointment;
  business: Pick<Business, "name" | "timezone" | "googleCalendarId">;
  customer: Pick<Customer, "phone">;
  service: Pick<Service, "name">;
}) => {
  const auth = getAuthClient();
  const calendarId = getBusinessCalendarId(business);

  if (!calendarId || !auth) {
    return null;
  }

  const response = await calendar.events.insert({
    auth,
    calendarId,
    requestBody: {
      summary: `${service.name} - ${customer.phone}`,
      description: [
        `Business: ${business.name}`,
        `Service: ${service.name}`,
        `Customer phone: ${customer.phone}`,
        `Appointment ID: ${appointment.id}`,
      ].join("\n"),
      start: {
        dateTime: appointment.startTime.toISOString(),
        timeZone: business.timezone,
      },
      end: {
        dateTime: appointment.endTime.toISOString(),
        timeZone: business.timezone,
      },
    },
  });

  return response.data.id || null;
};
