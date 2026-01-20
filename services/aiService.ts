import { InferenceClient } from '@huggingface/inference';

const hfToken = process.env.EXPO_PUBLIC_HF_TOKEN?.trim();

if (!hfToken) {
  console.error('CRITICAL ERROR: Hugging Face token not found in .env!');
}

const hf = new InferenceClient(hfToken);

const MODEL_NAME = "meta-llama/Meta-Llama-3-8B-Instruct";

export interface ParsedInvoiceData {
  clientName?: string;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  taxRate?: number;
  discount?: number;
  notes?: string;
}

export async function parseInvoiceWithAI(prompt: string): Promise<ParsedInvoiceData | null> {
  try {
    if (!hfToken) throw new Error('Token not configured. Check .env and restart the server.');

    const systemPrompt = `Extract invoice data from the text below. Extract ALL information you can find.
    Return ONLY a JSON object. Include only fields that are mentioned in the text.
    Possible fields (all optional):
    - clientName: client/company name
    - invoiceNumber: invoice number
    - date: date in YYYY-MM-DD format
    - dueDate: due date in YYYY-MM-DD format
    - items: array of items with "name", "quantity" (number), "price" (number)
    - taxRate: tax rate as decimal (0.20 for 20%)
    - discount: discount as decimal (0.10 for 10%)
    - notes: additional notes
    
    Example: {"clientName": "Apple", "items": [{"name": "logo design", "quantity": 2, "price": 500}]}
    
    Text: "${prompt}"`;

    const out = await hf.chatCompletion({
      model: MODEL_NAME,
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 500,
      temperature: 0.1,
    });

    const responseText = out.choices[0].message.content;
    if (!responseText) throw new Error('Model returned empty response');

    console.log('Original AI response:', responseText);

    let cleanedResponse = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0];
    } else {
      const firstBraceIndex = cleanedResponse.indexOf('{');
      const lastBraceIndex = cleanedResponse.lastIndexOf('}');

      if (firstBraceIndex === -1 || lastBraceIndex === -1 || firstBraceIndex >= lastBraceIndex) {
        console.error('Failed to find JSON in response:', cleanedResponse);
        throw new Error('JSON not found in AI response. Try rephrasing your request.');
      }

      cleanedResponse = cleanedResponse.substring(firstBraceIndex, lastBraceIndex + 1);
    }

    console.log('Cleaned JSON:', cleanedResponse);

    try {
      const parsed = JSON.parse(cleanedResponse);
      return parsed;
    } catch (parseError: any) {
      console.error('JSON parsing error:', parseError.message);
      console.error('Problematic JSON:', cleanedResponse);
      throw new Error(`Failed to parse JSON from AI: ${parseError.message}. Try rephrasing your request.`);
    }
  } catch (error: any) {
    console.error('AI error details:', error.message);
    throw error;
  }
}
