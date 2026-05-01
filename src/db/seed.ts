import { prisma } from "./prisma";

async function main() {
  const phoneNumber =
    process.env.SEED_BUSINESS_PHONE_NUMBER ||
    process.env.TWILIO_WHATSAPP_NUMBER ||
    "whatsapp:+14155238886";
  const googleCalendarId = process.env.SEED_GOOGLE_CALENDAR_ID || null;

  const business = await prisma.business.upsert({
    where: { phoneNumber },
    update: {
      name: "Test Barber",
      timezone: "Europe/Warsaw",
      googleCalendarId,
    },
    create: {
      name: "Test Barber",
      phoneNumber,
      timezone: "Europe/Warsaw",
      googleCalendarId,
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

  const businessHours = [
    { dayOfWeek: 0, opensAt: "00:00", closesAt: "00:00", isClosed: true },
    { dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    { dayOfWeek: 2, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    { dayOfWeek: 3, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    { dayOfWeek: 4, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    { dayOfWeek: 5, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    { dayOfWeek: 6, opensAt: "09:00", closesAt: "14:00", isClosed: false },
  ];

  for (const hours of businessHours) {
    await prisma.businessHours.upsert({
      where: {
        businessId_dayOfWeek: {
          businessId: business.id,
          dayOfWeek: hours.dayOfWeek,
        },
      },
      update: {
        opensAt: hours.opensAt,
        closesAt: hours.closesAt,
        isClosed: hours.isClosed,
      },
      create: {
        businessId: business.id,
        ...hours,
      },
    });
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
      googleCalendarId: business.googleCalendarId,
    },
    services: savedServices.map((service) => ({
      name: service.name,
      durationMinutes: service.durationMinutes,
    })),
    businessHours,
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
