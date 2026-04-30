import * as chrono from "chrono-node";

export const parseDate = (text: string) => {
  return chrono.parseDate(text, new Date(), {
    forwardDate: true,
  });
};