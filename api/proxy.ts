
import { GoogleGenAI, Modality } from "@google/genai";

/**
 * SIGNIFY MASTER PROXY V3.2
 * Supports: Text Generation, Image Synthesis, and Neural Audio (TTS).
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "System Configuration Error: API_KEY missing." });
  }

  const { model, contents, config, type } = req.body || {};
  const ai = new GoogleGenAI({ apiKey });

  try {
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
      if (audioData) {
        return res.status(200).json({ audioData });
      }
      return res.status(500).json({ error: "Audio synthesis failed to generate bytes." });
    }

    // 2. IMAGE SYNTHESIS (NANO BANANA)
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
      return res.status(500).json({ error: "Synthesis core failed to materialize image." });
    }

    // 3. STANDARD CONTENT GENERATION (FLASH 3.1)
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents: contents,
      config: config || {}
    });

    return res.status(200).json({
      text: response.text,
      candidates: response.candidates
    });

  } catch (error: any) {
    console.error("Neural Matrix Error:", error.message);
    const status = error.message?.includes('429') ? 429 : 500;
    const msg = status === 429 
      ? "Neural Bandwidth Saturated. Logic core is cooling down (60s)." 
      : "Handshake Failed: " + error.message;
    
    return res.status(status).json({ error: msg });
  }
}
