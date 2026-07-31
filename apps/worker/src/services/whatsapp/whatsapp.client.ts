import axios from "axios";

export const client = axios.create({
  baseURL: process.env.WHATSAPP_API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});
