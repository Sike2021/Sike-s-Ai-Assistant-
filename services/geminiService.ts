
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Message, Question, UserAnswer, StudentProfile, ExamReport, TranslatorResponse, Source, NotebookSource, VaultFile, VaultTask } from '../types';
import { INJECTED_STORIES } from './injectedKnowledge';

/**
 * GLOBAL CAPABILITY MAP - System-wide awareness of SigNify OS modules
 */
const GLOBAL_CAPABILITIES = `
[APP FEATURE AWARENESS - MANDATORY]
You are SigNify OS, an integrated educational ecosystem with CROSS-MODULE NEURAL RECALL.
You have access to the "Neural Vault" which acts as your long-term document memory.

Modules you can suggest:
1. "Interactive Simulations": For real-time 3D/Canvas visualizations.
2. "Language Data Learner": Where the user teaches you specific reactions.
3. "Exam Center": For formal tests and reports.
4. "Neural Reader": Emotional TTS for stories.
5. "Verb Lexicon": A-Z English verb forms.
6. "Translator": Text and visual translation.
7. "Writing Spirit": Novel and creative prose engine.
8. "Study Helper": Textbook concept explanations.
9. "SigNify LM": Research and multi-source analysis.
10. "Neural Vault": The primary ingestion point for all your current knowledge.

[INJECTED SYSTEM KNOWLEDGE]
You have internal access to a set of Core Stories and Logs:
${INJECTED_STORIES.map(s => `- ${s.name}: ${s.content.substring(0, 100)}...`).join('\n')}

[NEURAL RECALL INSTRUCTION]
You MUST reference files from the Neural Vault or the Injected System Knowledge if they are relevant to the user's current request in ANY module.
`;

/**
 * GLOBAL VAULT RETRIEVAL
 */
export function getGlobalVaultContext(userEmail?: string | null): string {
    let context = "\n\n[NEURAL RECALL - ACTIVE MEMORY]";
    
    // 1. Add Injected Knowledge (Always available)
    context += "\n--- SYSTEM DATA ---";
    INJECTED_STORIES.forEach(s => {
        context += `\n- SYS_ID: ${s.id} | NAME: ${s.name}\n  CONTENT: ${s.content}\n`;
    });

    // 2. Add User Vault Data (if available)
    try {
        const storageKey = `signify_vault_${(userEmail || 'global').replace(/[@.]/g, '_')}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            const files: VaultFile[] = parsed.files || [];
            if (files.length > 0) {
                context += "\n--- USER DATA ---";
                files.forEach(f => {
                    context += `\n- FILE_ID: ${f.id} | NAME: ${f.name}`;
                    context += `\n  SUMMARY: ${f.summary || "Pending analysis..."}`;
                    context += `\n  CONTENT_PREVIEW: ${f.content.substring(0, 2000)}...`;
                });
            }
        }
    } catch (e) { console.error("Vault retrieval error", e); }
    
    return context;
}

/**
 * LINGUISTIC LEARNING CORE
 */
function getLinguisticContext(): string {
    try {
        const autoMemory = localStorage.getItem('sike_linguistic_training_sindhi') || '[]';
        const explicitRules = localStorage.getItem('sike_explicit_linguistic_rules') || '[]';
        
        const parsedAuto: string[] = JSON.parse(autoMemory);
        const parsedExplicit: {trigger: string, response: string}[] = JSON.parse(explicitRules);

        let context = "\n\n[SINDHI/URDU LINGUISTIC CONTEXT]";
        if (parsedExplicit.length > 0) {
            context += "\nREACTION RULES:\n";
            parsedExplicit.forEach(r => context += `- Trigger: "${r.trigger}" -> Reaction: "${r.response}"\n`);
        }
        if (parsedAuto.length > 0) {
            context += `\nDIALECT SAMPLES:\n${parsedAuto.slice(-20).join('\n')}`;
        }
        return context;
    } catch (e) { return ""; }
}

export function saveToLinguisticMemory(text: string) {
    if (!text || text.length < 5) return;
    const sindhiPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    if (sindhiPattern.test(text)) {
        try {
            const memory = localStorage.getItem('sike_linguistic_training_sindhi') || '[]';
            const parsed: string[] = JSON.parse(memory);
            parsed.push(text.trim());
            localStorage.setItem('sike_linguistic_training_sindhi', JSON.stringify(parsed.slice(-1000)));
        } catch (e) {}
    }
}

export function saveExplicitLinguisticRule(trigger: string, response: string) {
    try {
        const rules = localStorage.getItem('sike_explicit_linguistic_rules') || '[]';
        const parsed: any[] = JSON.parse(rules);
        parsed.push({ id: Date.now().toString(), trigger, response });
        localStorage.setItem('sike_explicit_linguistic_rules', JSON.stringify(parsed));
    } catch (e) {}
}

function buildContentHistory(history: Message[], currentPrompt: string, images: { base64: string; mimeType: string }[] = []) {
    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: msg.imageUrls && msg.imageUrls.length > 0 && msg.sender === 'user'
            ? [
                { text: msg.text },
                ...msg.imageUrls.map(url => ({
                    inlineData: {
                        mimeType: url.split(';')[0].split(':')[1],
                        data: url.split(',')[1]
                    }
                }))
            ]
            : [{ text: msg.text }]
    }));

    const currentParts: any[] = [{ text: currentPrompt }];
    if (images && Array.isArray(images) && images.length > 0) {
        images.forEach(img => {
            currentParts.push({
                inlineData: { mimeType: img.mimeType, data: img.base64 }
            });
        });
    }
    contents.push({ role: 'user', parts: currentParts });
    return contents;
}

export async function* streamAIChatResponse(
    prompt: string,
    history: Message[],
    images: { base64: string; mimeType: string }[],
    userEmail?: string | null,
    userProfileNotes?: string,
    chatMode: string = 'General',
    userName: string = 'Guest'
): AsyncGenerator<{ text?: string; sources?: Source[] }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let systemInstruction = `You are SigNify Engine 3.2. Mode: ${chatMode}. User: ${userName}.
${GLOBAL_CAPABILITIES}
${getLinguisticContext()}
${getGlobalVaultContext(userEmail)}
[USER MEMORY]
${userProfileNotes || 'None'}`;

    const contents = buildContentHistory(history, prompt, images);
    const response = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents,
        config: { systemInstruction }
    });

    for await (const chunk of response) {
        yield { text: chunk.text };
    }
}

export async function* streamVaultChatResponse(
    prompt: string,
    history: Message[],
    files: VaultFile[],
    userProfileNotes?: string,
    userName: string = 'Guest',
    userEmail?: string | null
): AsyncGenerator<{ text?: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let vaultData = files.map(s => `[FILE: ${s.name}]\nSUMMARY: ${s.summary}\nCONTENT: ${s.content}`).join('\n\n');
    let systemInstruction = `You are the SigNify Vault Core. Help the user manage and query their documents.
${vaultData}
${getLinguisticContext()}
${userProfileNotes || ''}`;

    const contents = buildContentHistory(history, prompt, []);
    const response = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents,
        config: { systemInstruction }
    });

    for await (const chunk of response) {
        yield { text: chunk.text };
    }
}

export async function* streamNotebookChatResponse(
    prompt: string,
    history: Message[],
    sources: NotebookSource[],
    userProfileNotes?: string,
    userName: string = 'Guest',
    userEmail?: string | null
): AsyncGenerator<{ text?: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Combine hardcoded and uploaded sources for SigNify LM
    const allSources = [...INJECTED_STORIES, ...sources];
    let sourceContext = allSources.map(s => `[SOURCE: ${s.name}]\n${s.content}`).join('\n\n');
    
    let systemInstruction = `You are SigNify LM Research Assistant. Cite sources as [Source: Filename].
You have access to ${INJECTED_STORIES.length} system stories and ${sources.length} user sources.
${sourceContext}
${getGlobalVaultContext(userEmail)}
${userProfileNotes || ''}`;

    const contents = buildContentHistory(history, prompt, []);
    const response = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents,
        config: { systemInstruction }
    });

    for await (const chunk of response) {
        yield { text: chunk.text };
    }
}

export async function analyzeVaultFile(file: VaultFile): Promise<{ summary: string, tasks: VaultTask[] }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Perform Neural Analysis on file: ${file.name}. 
1. 2-sentence technical summary.
2. List 3-5 specific tasks/action items.
Return JSON.
CONTENT: ${file.content.slice(0, 15000)}`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    tasks: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING },
                                priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
                            }
                        }
                    }
                }
            }
        }
    });
    
    const data = JSON.parse(response.text || '{}');
    return {
        summary: data.summary || "Summary failed.",
        tasks: (data.tasks || []).map((t: any) => ({ ...t, id: Math.random().toString(36).substr(2, 9), status: 'pending' }))
    };
}

export async function generateNotebookOverview(sources: NotebookSource[], targetMinutes: number = 5): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Combine hardcoded and uploaded sources for Overview
    const allSources = [...INJECTED_STORIES, ...sources];
    let sourceContext = allSources.map(s => `[SOURCE: ${s.name}]\n${s.content}`).join('\n\n');
    
    const prompt = `Generate a 2-person script for a ${targetMinutes} minute Audio Deep Dive.
S1: Tech Expert. S2: Skeptical Inquisitor.
Analyze the following documents including the System Knowledge Stories.
[DOCUMENTS]
${sourceContext}`;
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });
    return response.text || "";
}

export async function generateGeminiTTS(text: string, voice: string = 'Kore', emotion: string = 'Neutral'): Promise<string | undefined> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this ${emotion}: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}

export async function generateMultiSpeakerTTS(text: string, voice1: string, voice2: string): Promise<string | undefined> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'S1', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice1 } } },
                        { speaker: 'S2', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice2 } } }
                    ]
                }
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}

/**
 * TRANSLATOR CORE - Standardized to gemini-3-flash-preview for high stability and quota resilience.
 */
export async function getTranslatorResponse(text: string, sourceLang: string, targetLang: string): Promise<TranslatorResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following text from ${sourceLang} to ${targetLang}. Provide the main translation and a word-by-word breakdown. Return ONLY a valid JSON object.
        TEXT: "${text}"`,
        config: { 
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    mainTranslation: { type: Type.STRING },
                    wordByWord: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                original: { type: Type.STRING },
                                translation: { type: Type.STRING }
                            }
                        }
                    }
                },
                required: ['mainTranslation', 'wordByWord']
            }
        }
    });
    return JSON.parse(response.text || '{}');
}

export async function getTranslatorResponseFromImage(base64: string, mimeType: string, sourceLang: string, targetLang: string): Promise<TranslatorResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            { inlineData: { mimeType, data: base64 } }, 
            { text: `Analyze the text in this image and translate it to ${targetLang}. Return a JSON object with mainTranslation and wordByWord array.` }
        ],
        config: { 
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    mainTranslation: { type: Type.STRING },
                    wordByWord: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                original: { type: Type.STRING },
                                translation: { type: Type.STRING }
                            }
                        }
                    }
                },
                required: ['mainTranslation', 'wordByWord']
            }
        }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateNanoBananaImage(prompt: string, aspectRatio: string = "1:1"): Promise<string | undefined> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: aspectRatio as any } },
    });
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return undefined;
}

export async function* streamSimulationResponse(p: string, h: Message[], l: string, img: any, e: any, n: any, u: string = 'Guest') {
    yield* streamAIChatResponse(p, h, img, e, n, `Simulation Engineer`, u);
}
export async function* streamStudyHelperResponse(p: string, h: Message[], l: string, img: any, e: any, n: any, u: string = 'Guest') {
    yield* streamAIChatResponse(p, h, img, e, n, `Teacher`, u);
}
export async function* streamWritingResponse(p: string, h: Message[], l: string, img: any, e: any, n: any, u: string = 'Guest') {
    yield* streamAIChatResponse(p, h, img, e, n, `Creative Writer`, u);
}
export async function* streamStorybookResponse(p: string, h: Message[], l: string, img: any, e: any, n: any, u: string = 'Guest') {
    yield* streamAIChatResponse(p, h, img, e, n, `Story Weaver`, u);
}
export async function* streamGrammarResponse(p: string, h: Message[], l: string, img: any, e: any, n: any, u: string = 'Guest') {
    yield* streamAIChatResponse(p, h, img, e, n, `Grammar Expert`, u);
}

export async function generateConversationTitle(prompt: string, response: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Title for: "${prompt}"`,
    });
    return result.text?.trim() || "New Chat";
}

export async function generateExamQuestions(subject: string, chapter: string, examType: string, languages: string[]): Promise<Question[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Generate 10 questions for Subject: ${subject}. Languages: ${languages.join(', ')}.`;
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function evaluateExamAnswers(questions: Question[], userAnswers: UserAnswer[], studentInfo: StudentProfile, examSetup: any): Promise<ExamReport> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Evaluate exam. Return ExamReport JSON.`;
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    const report = JSON.parse(response.text || '{}');
    if (!report.id) report.id = Date.now().toString();
    return report;
}

export async function getVerbsByInitial(initial: string): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Verbs starting with ${initial}. JSON string array.`,
    });
    return JSON.parse(response.text || '[]');
}

export async function getVerbDetails(verb: string, language: string): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze verb "${verb}" in ${language}. JSON object.`,
    });
    return JSON.parse(response.text || '{}');
}
