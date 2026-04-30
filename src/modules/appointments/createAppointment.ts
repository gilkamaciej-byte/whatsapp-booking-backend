import { prisma } from "../../db/prisma";
import { parseDate } from "../../utils/parseDate";

export const createAppointment = async ({
  phone,
  serviceName,
  dateText,
}: {
  phone: string;
  serviceName: string;
  dateText: string;
}) => {
  const business = await prisma.business.findFirst();

  if (!business) {
    throw new Error("No business found");
  }

  const service = await prisma.service.findFirst({
    where: {
      businessId: business.id,
      name: serviceName,
    },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  let customer = await prisma.customer.findFirst({
    where: {
      businessId: business.id,
      phone,
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        phone,
      },
    });
  }

  const parsedDate = parseDate(dateText);

if (!parsedDate) {
  throw new Error("Nie rozumiem daty");
}

const startTime = parsedDate;
const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

  return prisma.appointment.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      serviceId: service.id,
      startTime,
      endTime,
    },
  });
};