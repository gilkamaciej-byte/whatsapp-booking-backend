import { prisma } from "../../db/prisma";

export type ConversationStep =
  | "START"
  | "CHOOSING_SERVICE"
  | "CHOOSING_DATE"
  | "CONFIRMING";

export type ConversationState = {
  step: ConversationStep;
  service?: string;
  dateText?: string;
};

export const getConversation = async (
  businessId: string,
  phone: string
): Promise<ConversationState> => {
  const conversation = await prisma.conversation.findUnique({
    where: {
      businessId_customerPhone: {
        businessId,
        customerPhone: phone,
      },
    },
  });

  if (!conversation) {
    return { step: "START" };
  }

  return {
    step: conversation.step as ConversationStep,
    service: conversation.serviceName || undefined,
    dateText: conversation.dateText || undefined,
  };
};

export const saveConversation = async (
  businessId: string,
  phone: string,
  state: ConversationState
) => {
  await prisma.conversation.upsert({
    where: {
      businessId_customerPhone: {
        businessId,
        customerPhone: phone,
      },
    },
    update: {
      step: state.step,
      serviceName: state.service,
      dateText: state.dateText,
    },
    create: {
      businessId,
      customerPhone: phone,
      step: state.step,
      serviceName: state.service,
      dateText: state.dateText,
    },
  });
};

export const clearConversation = async (businessId: string, phone: string) => {
  await prisma.conversation.deleteMany({
    where: {
      businessId,
      customerPhone: phone,
    },
  });
};
