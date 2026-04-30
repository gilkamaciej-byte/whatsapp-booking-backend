import { prisma } from "../../db/prisma";
import { parseDate } from "../../utils/parseDate";

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
    throw new Error("Nie rozumiem daty");
  }

  const startTime = parsedDate;
  const endTime = new Date(
    startTime.getTime() + service.durationMinutes * 60 * 1000
  );

  return prisma.appointment.create({
    data: {
      businessId,
      customerId: customer.id,
      serviceId: service.id,
      startTime,
      endTime,
    },
  });
};