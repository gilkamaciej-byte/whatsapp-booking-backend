import { prisma } from "./prisma";

async function main() {
  const phoneNumber =
    process.env.SEED_BUSINESS_PHONE_NUMBER ||
    process.env.TWILIO_WHATSAPP_NUMBER ||
    "whatsapp:+14155238886";

  const business = await prisma.business.upsert({
    where: { phoneNumber },
    update: {
      name: "Test Barber",
      timezone: "Europe/Warsaw",
    },
    create: {
      name: "Test Barber",
      phoneNumber,
      timezone: "Europe/Warsaw",
    },
  });

  const services = [
    { name: "strzyżenie", durationMinutes: 30 },
    { name: "broda", durationMinutes: 20 },
    { name: "strzyżenie + broda", durationMinutes: 45 },
  ];

  for (const service of services) {
    const existingService = await prisma.service.findFirst({
      where: {
        businessId: business.id,
        name: service.name,
      },
    });

    if (existingService) {
      await prisma.service.update({
        where: { id: existingService.id },
        data: {
          durationMinutes: service.durationMinutes,
        },
      });
    } else {
      await prisma.service.create({
        data: {
          businessId: business.id,
          ...service,
        },
      });
    }
  }

  const savedServices = await prisma.service.findMany({
    where: { businessId: business.id },
    orderBy: { name: "asc" },
  });

  console.log("Seed done", {
    business: {
      id: business.id,
      name: business.name,
      phoneNumber: business.phoneNumber,
    },
    services: savedServices.map((service) => ({
      name: service.name,
      durationMinutes: service.durationMinutes,
    })),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
