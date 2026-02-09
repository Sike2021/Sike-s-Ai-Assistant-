import { GoogleGenAI, Modality } from "@google/genai";

export default async function handler(req: any, res: any) {
  // CORS Headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API_KEY environment variable is missing on Vercel." });
  }

  const { model, contents, config, type } = req.body || {};
  const ai = new GoogleGenAI({ apiKey });

  try {
    // Standardize on the requested 'Flash' family
    const targetModel = model || 'gemini-2.5-flash';

    // 1. NEURAL AUDIO SYNTHESIS (TTS)
    if (type === 'tts') {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: contents,
        config: {
          ...config,
          responseModalities: [Modality.AUDIO]
        }
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return res.status(200).json({ audioData });
    }

    // 2. IMAGE SYNTHESIS (Flash Image)
    if (type === 'image') {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: contents,
        config: config || {}
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (imagePart) {
        return res.status(200).json({ imageUrl: `data:image/png;base64,${imagePart.inlineData.data}` });
      }
      return res.status(500).json({ error: "Neural image synthesis failed." });
    }

    // 3. STANDARD REASONING (Gemini 2.5 Flash)
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: contents,
      config: config || {}
    });

    return res.status(200).json({
      text: response.text,
      candidates: response.candidates
    });

  } catch (error: any) {
    console.error("Neural Proxy Error:", error.message);
    const status = error.message?.includes('429') ? 429 : 500;
    return res.status(status).json({ 
      error: status === 429 ? "Matrix overloaded. Bandwidth exhausted. Please retry in 60s." : error.message 
    });
  }
}