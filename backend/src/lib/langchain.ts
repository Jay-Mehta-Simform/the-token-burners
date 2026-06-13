import { ChatOpenAI } from "@langchain/openai";

export const chatModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});
