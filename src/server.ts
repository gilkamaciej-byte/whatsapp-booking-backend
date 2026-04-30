console.log("Startuję server.ts...");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { whatsappWebhook } from "./modules/twilio/webhook";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "whatsapp-booking-api",
  });
});

app.post("/webhooks/twilio/whatsapp", whatsappWebhook);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`API działa na porcie ${port}`);
});