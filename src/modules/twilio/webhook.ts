import { Request, Response } from "express";
import twilio from "twilio";
import { prisma } from "../../db/prisma";
import {
  AppointmentConflictError,
  AppointmentDateParseError,
  AppointmentOutsideBusinessHoursError,
  createAppointment,
} from "../appointments/createAppointment";
import {
  getConversation,
  saveConversation,
  clearConversation,
} from "../conversations/conversationStore";
import { findService, servicesListText } from "../businesses/services";

export const whatsappWebhook = async (req: Request, res: Response) => {
  const message = req.body?.Body?.trim() || "";
  const lowerMessage = message.toLowerCase();
  const to = req.body?.To || "";
  const from = req.body?.From || "";
  const twiml = new twilio.twiml.MessagingResponse();

  const business = await prisma.business.findUnique({
    where: {
      phoneNumber: to,
    },
  });

  if (!business) {
    twiml.message("Ten numer nie jest skonfigurowany.");
    return res.type("text/xml").send(twiml.toString());
  }

  console.log("Nowa wiadomość:", {
    businessId: business.id,
    to,
    from,
    message,
  });

  const conversation = await getConversation(business.id, from);
  const step = conversation.step;

  if (lowerMessage === "reset") {
    await clearConversation(business.id, from);
    twiml.message("Rozmowa zresetowana. Napisz 'wizyta', aby zacząć od nowa.");
    return res.type("text/xml").send(twiml.toString());
  }

  if (step === "START") {
    if (lowerMessage.includes("wizyta")) {
      await saveConversation(business.id, from, { step: "CHOOSING_SERVICE" });

      twiml.message(
        `Super 👌 Jaką usługę chcesz zarezerwować?\n\nDostępne usługi:\n${await servicesListText(
          business.id
        )}`
      );
    } else {
      twiml.message(
        "Cześć! 👋 Mogę pomóc umówić wizytę. Napisz 'wizyta', aby zacząć."
      );
    }

    return res.type("text/xml").send(twiml.toString());
  }

  if (step === "CHOOSING_SERVICE") {
    const selectedService = await findService(business.id, message);

    if (!selectedService) {
      twiml.message(
        `Nie mam takiej usługi w ofercie.\n\nDostępne usługi:\n${await servicesListText(
          business.id
        )}\n\nNapisz nazwę albo numer jednej z nich.`
      );

      return res.type("text/xml").send(twiml.toString());
    }

    await saveConversation(business.id, from, {
      step: "CHOOSING_DATE",
      service: selectedService.name,
    });

    twiml.message(
      `Wybrana usługa: ${selectedService.name}.\nKiedy chcesz umówić wizytę? Np. "jutro 15:00".`
    );

    return res.type("text/xml").send(twiml.toString());
  }

  if (step === "CHOOSING_DATE") {
    await saveConversation(business.id, from, {
      ...conversation,
      step: "CONFIRMING",
      dateText: message,
    });

    twiml.message(
      `Potwierdź wizytę:\n\nUsługa: ${conversation.service}\nTermin: ${message}\n\nOdpisz "tak", żeby potwierdzić albo "reset", żeby zacząć od nowa.`
    );

    return res.type("text/xml").send(twiml.toString());
  }

  if (step === "CONFIRMING") {
    if (["tak", "potwierdzam", "ok", "okej"].includes(lowerMessage)) {
      try {
        await createAppointment({
          businessId: business.id,
          phone: from,
          serviceName: conversation.service!,
          dateText: conversation.dateText!,
        });
      } catch (error) {
        if (error instanceof AppointmentConflictError) {
          await saveConversation(business.id, from, {
            step: "CHOOSING_DATE",
            service: conversation.service,
          });

          twiml.message(
            `Ten termin jest juz zajety. Podaj inna godzine dla uslugi: ${conversation.service}.`
          );

          return res.type("text/xml").send(twiml.toString());
        }

        if (error instanceof AppointmentDateParseError) {
          await saveConversation(business.id, from, {
            step: "CHOOSING_DATE",
            service: conversation.service,
          });

          twiml.message(
            `Nie rozumiem tego terminu. Podaj go jeszcze raz, np. "morgen 16:30".`
          );

          return res.type("text/xml").send(twiml.toString());
        }

        if (error instanceof AppointmentOutsideBusinessHoursError) {
          await saveConversation(business.id, from, {
            step: "CHOOSING_DATE",
            service: conversation.service,
          });

          twiml.message(
            `Ten termin jest poza godzinami pracy. Podaj inna godzine dla uslugi: ${conversation.service}.`
          );

          return res.type("text/xml").send(twiml.toString());
        }

        throw error;
      }

      twiml.message(
        `Gotowe ✅ Twoja wizyta została zapisana.\n\nUsługa: ${conversation.service}\nTermin: ${conversation.dateText}`
      );

      await clearConversation(business.id, from);
    } else {
      twiml.message(
        `Nie potwierdziłem wizyty.\nOdpisz "tak", żeby potwierdzić albo "reset", żeby zacząć od nowa.`
      );
    }

    return res.type("text/xml").send(twiml.toString());
  }

  twiml.message("Coś poszło nie tak. Napisz 'reset', aby zacząć od nowa.");
  return res.type("text/xml").send(twiml.toString());
};
