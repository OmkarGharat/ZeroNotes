import { GoogleGenAI } from "@google/genai";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Assume this variable is pre-configured, valid, and accessible.
const getGenAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is not configured. Please set API_KEY in your environment.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateText = async (prompt: string): Promise<string> => {
  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text ?? "";
  } catch (error) {
    console.error("Error generating text from Gemini:", error);
    if ((error as Error).message.includes("API Key")) {
      return "Error: Gemini API Key is missing. Please configure it.";
    }
    return "Sorry, I encountered an error while generating a response.";
  }
};