
import { GoogleGenAI, Type, Modality } from "@google/genai";

/**
 * SIGNIFY NEURAL ORCHESTRATOR (Backend Core)
 * Exclusively uses process.env.API_KEY for all transmissions.
 */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const SigNifyServer = {
    /**
     * UNIFIED CONTENT GENERATOR
     * Handles Static and Multimodal requests.
     */
    async generateContent(payload: any) {
        try {
            const { model, contents, systemInstruction, responseMimeType, responseSchema } = payload;
            
            // Ensure contents is array of Role/Parts
            const formattedContents = Array.isArray(contents) 
                ? contents 
                : [{ role: 'user', parts: [{ text: contents }] }];

            const response = await ai.models.generateContent({
                model: model || 'gemini-3-flash-preview',
                contents: formattedContents,
                config: {
                    systemInstruction,
                    responseMimeType,
                    responseSchema,
                }
            });
            
            return { text: response.text || "" };
        } catch (error: any) {
            console.error("SigNify Core Error:", error);
            if (error.message?.includes('429') || error.message?.includes('quota')) {
                return { text: "Error: Neural Bandwidth Saturated. Please retry in 60 seconds.", isError: true };
            }
            return { text: "Neural handshake failed. Please check connectivity.", isError: true };
        }
    },

    /**
     * STREAMING GATEWAY
     * Yields objects { text: string } to match UI expectations.
     */
    async *generateContentStream(payload: any) {
        const { model, contents, systemInstruction } = payload;
        try {
            // Ensure contents is array of Role/Parts
            const formattedContents = Array.isArray(contents) 
                ? contents 
                : [{ role: 'user', parts: [{ text: contents }] }];

            const response = await ai.models.generateContentStream({
                model: model || 'gemini-3-flash-preview',
                contents: formattedContents,
                config: { systemInstruction }
            });

            for await (const chunk of response) {
                if (chunk.text) {
                    yield { text: chunk.text };
                }
            }
        } catch (error) {
            console.error("Stream Core Error:", error);
            yield { text: "Transmission interrupted. Switching to stable logic... Please retry." };
        }
    },

    /**
     * IMAGE SYNTHESIS (Nano Banana)
     */
    async generateImage(payload: any) {
        const { prompt, aspectRatio } = payload;
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: { imageConfig: { aspectRatio: aspectRatio || "1:1" } },
            });
            
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return { imageUrl: `data:image/png;base64,${part.inlineData.data}` };
            }
            return { error: "Synthesis core failed to materialize image." };
        } catch (error) {
            return { error: "Neural core busy." };
        }
    },

    /**
     * NEURAL SPEECH SYNTHESIS (TTS)
     */
    async generateTTS(payload: any) {
        const { text, voice, emotion, isMultiSpeaker, voice2 } = payload;
        
        const config: any = {
            responseModalities: [Modality.AUDIO],
            speechConfig: isMultiSpeaker ? {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'S1', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Zephyr' } } },
                        { speaker: 'S2', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice2 || 'Kore' } } }
                    ]
                }
            } : {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Kore' } },
            },
        };

        const prompt = emotion ? `Emotion: ${emotion}. Speak the following: ${text}` : text;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: prompt }] }],
                config
            });
            return { audioData: response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data };
        } catch (error) {
            console.error("Audio Core Error:", error);
            return { audioData: null };
        }
    }
};
