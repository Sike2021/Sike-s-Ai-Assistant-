import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Message, TranslatorResponse, NotebookSource, VaultFile, VaultTask, Question, UserAnswer, ExamReport } from '../types';

const GLOBAL_CAPABILITIES = `
[APP FEATURE AWARENESS]
You are SigNify OS, an integrated educational ecosystem.
Modules: Neural Reader (SigNify LM), Translator, Creative Studio, Neural Vault.
`;

/**
 * 2025 COMPATIBILITY STANDARDS
 * PRIMARY_MODEL: Using 'gemini-flash-latest' for maximum compatibility across all API key tiers.
 * PRO_MODEL: Using 'gemini-3-pro-preview' for advanced reasoning.
 */
const PRIMARY_MODEL = 'gemini-flash-latest';
const PRO_MODEL = 'gemini-3-pro-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

/**
 * NEURAL STABILITY PROTOCOL
 * Implements exponential backoff to handle 429 (Quota) and transient 5xx errors.
 */
async function withStability<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    let lastErr: any;
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastErr = err;
            const msg = (err?.message || String(err)).toLowerCase();
            // Retry on quota, service busy, or common transient network resets
            const isRetryable = msg.includes("429") || msg.includes("quota") || msg.includes("503") || 
                               msg.includes("500") || msg.includes("deadline") || msg.includes("fetch") ||
                               msg.includes("network");

            if (isRetryable && i < retries) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                console.warn(`SigNify Stability Protocol: Retry ${i + 1}/${retries} after ${Math.round(delay)}ms. Reason: ${msg}`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw err;
        }
    }
    throw lastErr;
}

export function getGlobalVaultContext(userEmail?: string | null): string {
    let context = "\n\n[NEURAL RECALL]";
    try {
        const storageKey = `signify_vault_${(userEmail || 'global').replace(/[@.]/g, '_')}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            const files: VaultFile[] = parsed.files || [];
            if (files.length > 0) {
                context += "\n--- USER DATA ---";
                files.forEach(f => {
                    context += `\n- FILE: ${f.name} | SUMMARY: ${f.summary || "N/A"} | PREVIEW: ${f.content.substring(0, 1000)}`;
                });
            }
        }
    } catch (e) {}
    return context;
}

function getLinguisticContext(): string {
    try {
        const explicitRules = localStorage.getItem('sike_explicit_linguistic_rules') || '[]';
        const parsedExplicit: {trigger: string, response: string}[] = JSON.parse(explicitRules);
        let context = "\n\n[LINGUISTIC CONTEXT]";
        parsedExplicit.forEach(r => context += `- Trigger: "${r.trigger}" -> Reaction: "${r.response}"\n`);
        return context;
    } catch (e) { return ""; }
}

export function saveToLinguisticMemory(text: string) {
    if (!text || text.length < 5) return;
    const memory = localStorage.getItem('sike_linguistic_training_sindhi') || '[]';
    const parsed: string[] = JSON.parse(memory);
    parsed.push(text.trim());
    localStorage.setItem('sike_linguistic_training_sindhi', JSON.stringify(parsed.slice(-1000)));
}

export function saveExplicitLinguisticRule(trigger: string, response: string) {
    const rules = JSON.parse(localStorage.getItem('sike_explicit_linguistic_rules') || '[]');
    rules.push({ id: Date.now().toString(), trigger, response });
    localStorage.setItem('sike_explicit_linguistic_rules', JSON.stringify(rules));
}

export async function* streamAIChatResponse(
    prompt: string,
    history: Message[],
    language: string = 'English',
    images: { base64: string; mimeType: string }[] = [],
    userEmail?: string | null,
    userProfileNotes?: string,
    chatMode: string = 'General',
    userName: string = 'Guest'
): AsyncGenerator<{ text?: string, error?: string }> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        yield { error: "Security Error: Logic core API key is missing. Check environment configuration." };
        return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const sys = `Persona: SigNify Engine 3.2. Mode: ${chatMode}. User: ${userName}. Language: ${language}.
    ${GLOBAL_CAPABILITIES}${getLinguisticContext()}${getGlobalVaultContext(userEmail)}
    [USER MEMORY] ${userProfileNotes || 'None'}`;

    const contents = history
        .filter(m => m.text && m.text.trim().length > 0)
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
    
    const currentParts: any[] = [{ text: prompt }];
    if (images && images.length > 0) {
        images.forEach(img => {
            currentParts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
        });
    }
    contents.push({ role: 'user', parts: currentParts });

    try {
        const response = await ai.models.generateContentStream({
            model: PRIMARY_MODEL,
            contents,
            config: { systemInstruction: sys }
        });

        for await (const chunk of response) {
            yield { text: chunk.text || "" };
        }
    } catch (err: any) {
        console.error("SigNify Logic Core Exception:", err);
        const msg = (err?.message || String(err)).toLowerCase();
        
        if (msg.includes("429") || msg.includes("quota") || msg.includes("exhausted")) {
            yield { error: "Neural Bandwidth Saturated: The API quota for this key has been reached. Please wait 60 seconds." };
        } else if (msg.includes("model") && (msg.includes("not found") || msg.includes("permission"))) {
            yield { error: "Compatibility Error: The selected model is not supported by your current API key permissions." };
        } else if (!navigator.onLine) {
            yield { error: "Transmission Interrupted: Your local network connectivity has been lost." };
        } else {
            yield { error: "Handshake Failure: A transient network reset occurred on the hosting platform. Please try again." };
        }
    }
}

export async function analyzeVaultFile(file: VaultFile): Promise<{ summary: string, tasks: VaultTask[] }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        return await withStability(async () => {
            const response = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: `Analyze file: ${file.name}. Content: ${file.content.slice(0, 15000)}`,
                config: { 
                    responseMimeType: 'application/json',
                    systemInstruction: 'Summarize the file and extract 3 tasks. Return JSON: { "summary": string, "tasks": [{ "text": string, "priority": "high" }] }'
                }
            });
            const data = JSON.parse(response.text || '{"summary":"Analysis failed","tasks":[]}');
            return {
                summary: data.summary || "",
                tasks: (data.tasks || []).map((t: any) => ({ ...t, id: Math.random().toString(), status: 'pending' }))
            };
        });
    } catch (e) {
        return { summary: "Deep analysis failed due to logic core instability.", tasks: [] };
    }
}

export async function getTranslatorResponse(text: string, sourceLang: string, targetLang: string): Promise<TranslatorResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return withStability(async () => {
        const response = await ai.models.generateContent({
            model: PRIMARY_MODEL,
            contents: `Translate from ${sourceLang} to ${targetLang}: "${text}"`,
            config: { 
                responseMimeType: 'application/json',
                systemInstruction: 'Return JSON: { "mainTranslation": string, "wordByWord": [{ "original": string, "translation": string }] }'
            }
        });
        return JSON.parse(response.text || '{"mainTranslation":"","wordByWord":[]}');
    });
}

export async function getTranslatorResponseFromImage(base64: string, mimeType: string, sourceLang: string, targetLang: string): Promise<TranslatorResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return withStability(async () => {
        const response = await ai.models.generateContent({
            model: PRIMARY_MODEL,
            contents: [
                { role: 'user', parts: [{ inlineData: { data: base64, mimeType } }, { text: `Extract text and translate from ${sourceLang} to ${targetLang}.` }] }
            ],
            config: { 
                responseMimeType: 'application/json',
                systemInstruction: 'Return JSON: { "mainTranslation": string, "wordByWord": [{ "original": string, "translation": string }] }'
            }
        });
        return JSON.parse(response.text || '{"mainTranslation":"","wordByWord":[]}');
    });
}

export async function generateGeminiTTS(text: string, voice: string = 'Kore', emotion: string = 'Neutral'): Promise<string | undefined> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        return await withStability(async () => {
            const response = await ai.models.generateContent({
                model: TTS_MODEL,
                contents: [{ parts: [{ text: `Say with ${emotion} tone: ${text}` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
                }
            });
            return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        });
    } catch (e) {
        console.error("TTS Core Error:", e);
        return undefined;
    }
}

export async function generateMultiSpeakerTTS(text: string, v1: string, v2: string): Promise<string | undefined> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        return await withStability(async () => {
            const response = await ai.models.generateContent({
                model: TTS_MODEL,
                contents: [{ parts: [{ text: text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        multiSpeakerVoiceConfig: {
                            speakerVoiceConfigs: [
                                { speaker: 'Speaker1', voiceConfig: { prebuiltVoiceConfig: { voiceName: v1 } } },
                                { speaker: 'Speaker2', voiceConfig: { prebuiltVoiceConfig: { voiceName: v2 } } }
                            ]
                        }
                    }
                }
            });
            return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        });
    } catch (e) {
        console.error("Multi-Speaker TTS Error:", e);
        return undefined;
    }
}

export async function* streamCreativeResponse(
    prompt: string,
    history: Message[],
    language: string,
    images: { base64: string; mimeType: string }[] = [],
    userEmail?: string | null,
    userProfileNotes?: string
): AsyncGenerator<{ text?: string, error?: string }> {
    yield* streamAIChatResponse(prompt, history, language, images, userEmail, userProfileNotes, 'Creative Studio Director');
}

export async function generateNanoBananaImage(prompt: string): Promise<string | undefined> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        return await withStability(async () => {
            const response = await ai.models.generateContent({
                model: IMAGE_MODEL,
                contents: { parts: [{ text: prompt }] },
                config: { imageConfig: { aspectRatio: "1:1" } }
            });
            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part && part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
            return undefined;
        });
    } catch (e) {
        console.error("Image Synthesis Error:", e);
        return undefined;
    }
}

export async function generateConversationTitle(userMsg: string, botMsg: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        return await withStability(async () => {
            const response = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: `Generate a very short (3-5 words) title for this conversation. User: ${userMsg.substring(0, 100)}. Bot: ${botMsg.substring(0, 100)}`,
                config: { systemInstruction: "You are a helpful assistant. Return only the title text, no quotes." }
            });
            return response.text?.trim() || "New Transmission";
        });
    } catch (e) {
        return "New Transmission";
    }
}

export async function generateExamQuestions(subject: string, chapter: string, type: string, languages: string[]): Promise<Question[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Generate 5 challenging questions for a ${subject} exam on ${chapter}. Exam Type: ${type}. Supported Languages: ${languages.join(', ')}.`;
    
    try {
        return await withStability(async () => {
            const response = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                type: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                modelAnswer: { type: Type.STRING }
                            },
                            required: ["question", "type"]
                        }
                    }
                }
            });
            return JSON.parse(response.text || "[]");
        });
    } catch (e) {
        console.error("Exam Generation Error:", e);
        return [];
    }
}

export async function evaluateExamAnswers(questions: Question[], answers: UserAnswer[], profile: any, setup: any): Promise<ExamReport> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Evaluate the following student's exam. 
    Questions: ${JSON.stringify(questions)}
    Answers: ${JSON.stringify(answers)}
    Student: ${JSON.stringify(profile)}
    Exam Info: ${JSON.stringify(setup)}`;
    
    try {
        return await withStability(async () => {
            const response = await ai.models.generateContent({
                model: PRO_MODEL,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            results: {
                                type: Type.OBJECT,
                                properties: {
                                    marksObtained: { type: Type.NUMBER },
                                    totalMarks: { type: Type.NUMBER },
                                    percentage: { type: Type.NUMBER },
                                    grade: { type: Type.STRING },
                                    overallFeedback: { type: Type.STRING },
                                    breakdown: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                question: { type: Type.STRING },
                                                userAnswer: { type: Type.STRING },
                                                modelAnswer: { type: Type.STRING },
                                                isCorrect: { type: Type.BOOLEAN },
                                                feedback: { type: Type.STRING }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            const result = JSON.parse(response.text || "{}");
            return {
                id: Date.now().toString(),
                studentInfo: profile,
                examSetup: setup,
                results: result.results
            };
        });
    } catch (e) {
        console.error("Evaluation Error:", e);
        throw e;
    }
}

export async function getVerbsByInitial(initial: string): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        return await withStability(async () => {
            const response = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: `List 20 common English verbs starting with the letter ${initial}. Return as a JSON array of strings.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            });
            return JSON.parse(response.text || "[]");
        });
    } catch (e) {
        return [];
    }
}

export async function getVerbDetails(verb: string, language: string): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        return await withStability(async () => {
            const response = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: `Provide complete grammatical details for the verb "${verb}" in ${language}.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            base: { type: Type.STRING },
                            past: { type: Type.STRING },
                            pastParticiple: { type: Type.STRING },
                            description: { type: Type.STRING },
                            nounForm: { type: Type.STRING },
                            adjectiveForm: { type: Type.STRING },
                            usages: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            });
            return JSON.parse(response.text || "{}");
        });
    } catch (e) {
        return null;
    }
}

export async function* streamNotebookChatResponse(
    prompt: string,
    history: Message[],
    language: string,
    sources: NotebookSource[],
    userEmail?: string | null,
    userProfileNotes?: string
): AsyncGenerator<{ text?: string, error?: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let sourceContext = "\n\n[NOTEBOOK SOURCES]\n";
    sources.forEach(s => sourceContext += `Source: ${s.name}\nContent: ${s.content.substring(0, 5000)}\n\n`);

    const sys = `You are a research assistant. Answer based on the notebook sources. Use [Source: filename]. Language: ${language}. ${GLOBAL_CAPABILITIES}${sourceContext}[USER MEMORY] ${userProfileNotes || 'None'}`;

    const contents = history.filter(m => m.text && m.text.trim().length > 0).map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    try {
        const response = await ai.models.generateContentStream({ model: PRIMARY_MODEL, contents, config: { systemInstruction: sys } });
        for await (const chunk of response) { yield { text: chunk.text || "" }; }
    } catch (err: any) { yield { error: err.message }; }
}

export async function generateNotebookOverview(sources: NotebookSource[], durationMinutes: number): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let sourceContext = "";
    sources.forEach(s => sourceContext += `Source: ${s.name}\nContent: ${s.content.substring(0, 3000)}\n\n`);
    
    const prompt = `Create an engaging ${durationMinutes}-minute audio overview script. Dynamic dialogue between Speaker1 (learner) and Speaker2 (expert).
    Format:
    Speaker1: ...
    Speaker2: ...
    
    Sources: ${sourceContext}`;

    return await withStability(async () => {
        const response = await ai.models.generateContent({
            model: PRIMARY_MODEL,
            contents: prompt,
            config: { systemInstruction: "Expert educational scriptwriter." }
        });
        return response.text || "";
    });
}

export async function* streamVaultChatResponse(
    prompt: string,
    history: Message[],
    language: string,
    files: VaultFile[],
    userEmail?: string | null,
    userProfileNotes?: string
): AsyncGenerator<{ text?: string, error?: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let sourceContext = "\n\n[VAULT FILES]\n";
    files.forEach(f => sourceContext += `File: ${f.name}\nContent: ${f.content.substring(0, 5000)}\n\n`);

    const sys = `Neural archivist. Provide technical insights. Language: ${language}. ${GLOBAL_CAPABILITIES}${sourceContext}[USER MEMORY] ${userProfileNotes || 'None'}`;

    const contents = history.filter(m => m.text && m.text.trim().length > 0).map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    try {
        const response = await ai.models.generateContentStream({ model: PRIMARY_MODEL, contents, config: { systemInstruction: sys } });
        for await (const chunk of response) { yield { text: chunk.text || "" }; }
    } catch (err: any) { yield { error: err.message }; }
}
