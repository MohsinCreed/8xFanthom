import OpenAI from "openai";

export const GROQ_MODEL = "openai/gpt-oss-120b";

let client: OpenAI | null = null;

export function getGroq(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  client ??= new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
  return client;
}
