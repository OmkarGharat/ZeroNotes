
import { GoogleGenAI } from "@google/genai";

// Safe access to process.env.API_KEY
const getApiKey = () => {
  try {
    return process.env.API_KEY;
  } catch (e) {
    return undefined;
  }
};

const API_KEY = getApiKey();

if (!API_KEY) {
  console.warn("API_KEY is not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "dummy-key-to-prevent-crash" });

export const generateText = async (prompt: string): Promise<string> => {
  if (!API_KEY) {
    return "AI functionality is disabled because the API key is not configured.";
  }
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });
    return response.text ?? "";
  } catch (error) {
    console.error("Error generating text from Gemini:", error);
    return "Sorry, I encountered an error while generating a response.";
  }
};
