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

const conversations = new Map<string, ConversationState>();

export const getConversation = (phone: string): ConversationState => {
  return conversations.get(phone) || { step: "START" };
};

export const saveConversation = (
  phone: string,
  state: ConversationState
) => {
  conversations.set(phone, state);
};

export const clearConversation = (phone: string) => {
  conversations.delete(phone);
};