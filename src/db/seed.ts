import { prisma } from "./prisma";

async function main() {
  const business = await prisma.business.create({
    data: {
      name: "Test Barber",
    },
  });

  await prisma.service.createMany({
    data: [
      {
        name: "strzyżenie",
        durationMinutes: 30,
        businessId: business.id,
      },
      {
        name: "broda",
        durationMinutes: 20,
        businessId: business.id,
      },
    ],
  });

  console.log("Seed done");
}

main();