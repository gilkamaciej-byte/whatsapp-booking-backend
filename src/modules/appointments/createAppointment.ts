import { prisma } from "../../db/prisma";
import { isWithinBusinessHours } from "../businesses/businessHours";
import { createGoogleCalendarEvent } from "../calendar/googleCalendar";
import { parseDate } from "../../utils/parseDate";

export class AppointmentDateParseError extends Error {
  constructor() {
    super("Could not parse appointment date");
    this.name = "AppointmentDateParseError";
  }
}

export class AppointmentConflictError extends Error {
  constructor(
    public readonly conflictingAppointment: {
      id: string;
      startTime: Date;
      endTime: Date;
    }
  ) {
    super("Appointment time conflicts with an existing appointment");
    this.name = "AppointmentConflictError";
  }
}

export class AppointmentOutsideBusinessHoursError extends Error {
  constructor() {
    super("Appointment time is outside business hours");
    this.name = "AppointmentOutsideBusinessHoursError";
  }
}

export const createAppointment = async ({
  businessId,
  phone,
  serviceName,
  dateText,
}: {
  businessId: string;
  phone: string;
  serviceName: string;
  dateText: string;
}) => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  const service = await prisma.service.findFirst({
    where: {
      businessId,
      name: serviceName,
    },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  let customer = await prisma.customer.findFirst({
    where: {
      businessId,
      phone,
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId,
        phone,
      },
    });
  }

  const parsedDate = parseDate(dateText);

  if (!parsedDate) {
    throw new AppointmentDateParseError();
  }

  const startTime = parsedDate;
  const endTime = new Date(
    startTime.getTime() + service.durationMinutes * 60 * 1000
  );

  const withinBusinessHours = await isWithinBusinessHours({
    businessId,
    startTime,
    endTime,
  });

  if (!withinBusinessHours) {
    throw new AppointmentOutsideBusinessHoursError();
  }

  const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
      businessId,
      startTime: {
        lt: endTime,
      },
      endTime: {
        gt: startTime,
      },
    },
    orderBy: {
      startTime: "asc",
    },
  });

  if (conflictingAppointment) {
    throw new AppointmentConflictError({
      id: conflictingAppointment.id,
      startTime: conflictingAppointment.startTime,
      endTime: conflictingAppointment.endTime,
    });
  }

  const appointment = await prisma.appointment.create({
    data: {
      businessId,
      customerId: customer.id,
      serviceId: service.id,
      startTime,
      endTime,
    },
  });

  try {
    const googleCalendarEventId = await createGoogleCalendarEvent({
      appointment,
      business,
      customer,
      service,
    });

    if (googleCalendarEventId) {
      return prisma.appointment.update({
        where: { id: appointment.id },
        data: { googleCalendarEventId },
      });
    }
  } catch (error) {
    console.error("Nie udalo sie utworzyc wydarzenia Google Calendar", {
      appointmentId: appointment.id,
      error,
    });
  }

  return appointment;
};
