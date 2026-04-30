export const availableServices = [
  "strzyżenie",
  "broda",
  "strzyżenie + broda",
];

export const findService = (message: string) => {
  const normalized = message.toLowerCase().trim();

  return availableServices.find(
    (service) => service.toLowerCase() === normalized
  );
};

export const servicesListText = () => {
  return availableServices.map((service, index) => `${index + 1}. ${service}`).join("\n");
};