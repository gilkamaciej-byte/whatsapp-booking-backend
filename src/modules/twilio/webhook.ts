import { Request, Response } from "express";
import twilio from "twilio";
import { createAppointment } from "../appointments/createAppointment";
import {
  getConversation,
  saveConversation,
  clearConversation,
} from "../conversations/conversationStore";
import {
  findService,
  servicesListText,
} from "../businesses/services";

export const whatsappWebhook = async (req: Request, res: Response) => {
  const message = req.body?.Body?.trim() || "";
  const lowerMessage = message.toLowerCase();
  const from = req.body?.From || "";

  console.log("Nowa wiadomość:", { from, message });

  const twiml = new twilio.twiml.MessagingResponse();

  const conversation = getConversation(from);
  const step = conversation.step;

  // RESET
  if (lowerMessage === "reset") {
    clearConversation(from);
    twiml.message("Rozmowa zresetowana. Napisz 'wizyta', aby zacząć od nowa.");
    return res.type("text/xml").send(twiml.toString());
  }

  // START
  if (step === "START") {
    if (lowerMessage.includes("wizyta")) {
      saveConversation(from, { step: "CHOOSING_SERVICE" });

      twiml.message(
        `Super 👍 Jaką usługę chcesz zarezerwować?\n\nDostępne usługi:\n${servicesListText()}`
      );
    } else {
      twiml.message(
        "Cześć! 👋 Mogę pomóc umówić wizytę. Napisz 'wizyta', aby zacząć."
      );
    }

    return res.type("text/xml").send(twiml.toString());
  }

  // WYBÓR USŁUGI
  if (step === "CHOOSING_SERVICE") {
    const selectedService = findService(message);

    if (!selectedService) {
      twiml.message(
        `Nie mam takiej usługi w ofercie.\n\nDostępne usługi:\n${servicesListText()}\n\nNapisz nazwę jednej z nich.`
      );

      return res.type("text/xml").send(twiml.toString());
    }

    saveConversation(from, {
      step: "CHOOSING_DATE",
      service: selectedService,
    });

    twiml.message(
      `Wybrana usługa: ${selectedService}.\nKiedy chcesz umówić wizytę? Np. "jutro 15:00".`
    );

    return res.type("text/xml").send(twiml.toString());
  }

  // WYBÓR DATY
  if (step === "CHOOSING_DATE") {
    saveConversation(from, {
      ...conversation,
      step: "CONFIRMING",
      dateText: message,
    });

    twiml.message(
      `Potwierdź wizytę:\n\nUsługa: ${conversation.service}\nTermin: ${message}\n\nOdpisz "tak", żeby potwierdzić albo "reset", żeby zacząć od nowa.`
    );

    return res.type("text/xml").send(twiml.toString());
  }

  // POTWIERDZENIE
  if (step === "CONFIRMING") {
    if (["tak", "potwierdzam", "ok", "okej"].includes(lowerMessage)) {
      await createAppointment({
        phone: from,
        serviceName: conversation.service!,
        dateText: conversation.dateText!,
      })
      
      twiml.message(
        `Gotowe ✅ Twoja wizyta została zapisana.\n\nUsługa: ${conversation.service}\nTermin: ${conversation.dateText}`
      );

      clearConversation(from);
    } else {
      twiml.message(
        `Nie potwierdziłem wizyty.\nOdpisz "tak", żeby potwierdzić albo "reset", żeby zacząć od nowa.`
      );
    }

    return res.type("text/xml").send(twiml.toString());
  }

  // FALLBACK
  twiml.message("Coś poszło nie tak. Napisz 'reset', aby zacząć od nowa.");
  return res.type("text/xml").send(twiml.toString());
};