import { prisma } from "../../db/prisma";

export const findService = async (businessId: string, message: string) => {
  const normalized = message.toLowerCase().trim();
  const services = await prisma.service.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });

  const selectedByNumber = Number.parseInt(normalized, 10);

  if (
    Number.isInteger(selectedByNumber) &&
    selectedByNumber >= 1 &&
    selectedByNumber <= services.length
  ) {
    return services[selectedByNumber - 1];
  }

  return services.find((service) => service.name.toLowerCase() === normalized);
};

export const servicesListText = async (businessId: string) => {
  const services = await prisma.service.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });

  return services
    .map((service, index) => `${index + 1}. ${service.name}`)
    .join("\n");
};
