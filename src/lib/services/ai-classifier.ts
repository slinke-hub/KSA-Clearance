import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ProductDetails } from './product-profile';

const SYSTEM_PROMPT = `
You are an expert Saudi Customs Classification Agent. Your task is to predict the most accurate international 6-digit Harmonized System (HS) Code for a given product description.
You will be provided with a product description extracted from a commercial invoice, and optionally some extracted product details (like material or vehicle class).

Instructions:
1. Analyze the product description carefully.
2. Ignore irrelevant model numbers, random letters, or standard invoice noise (like "pcs", "item", "unit").
3. Determine the best matching 6-digit HS Code according to the World Customs Organization (WCO) nomenclature.
4. Return ONLY a JSON object containing the predicted 6-digit HS Code and a brief 1-sentence reasoning.

The response MUST strictly match this JSON schema, with no markdown formatting or extra text outside the JSON:
{
  "hsCode": "XXXXXX",
  "reasoning": "string"
}
`;

export async function predictHsCode(description: string, details: ProductDetails = {}): Promise<{ hsCode: string; reasoning: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. AI classification fallback is disabled.');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: SYSTEM_PROMPT });

    const prompt = `Product Description: "${description}"\nAdditional Details: ${JSON.stringify(details)}`;
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Low temperature for factual classification
        responseMimeType: 'application/json',
      }
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    
    if (parsed && typeof parsed.hsCode === 'string' && /^\d{6}$/.test(parsed.hsCode)) {
      return {
        hsCode: parsed.hsCode,
        reasoning: parsed.reasoning || 'AI predicted match',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error in predictHsCode:', error);
    return null;
  }
}
