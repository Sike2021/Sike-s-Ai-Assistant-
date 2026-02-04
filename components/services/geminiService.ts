
import { Message, Question, UserAnswer, StudentProfile, ExamReport, TranslatorResponse, Source, NotebookSource, VaultFile, VaultTask } from '../types';
import { SigNifyServer } from '../../server';

/**
 * CLIENT-SIDE LINGUISTIC ADAPTER
 * Communicates with SigNifyServer (Backend Core).
 */

const GLOBAL_CAPABILITIES = `
[SYSTEM STATUS]
Architecture: Decoupled. Models: Unified. Core: Gemini 3.1 Flash.
Features: Vault, Simulations, Learner, Exam Center, Lexicon, Translator.
`;

export function getGlobalVaultContext(userEmail?: string | null): string {
    let context = "\n\n[NEURAL RECALL]";
    try {
        const storageKey = `signify_vault_${(userEmail || 'global').replace(/[@.]/g, '_')}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const files: VaultFile[] = JSON.parse(saved).files || [];
            files.forEach(f => context += `\n- NODE: ${f.name} | MAP: ${f.summary || "Pending"}`);
        }
    } catch (e) {}
    return context;
}

function getLinguisticContext(): string {
    try {
        const explicitRules = localStorage.getItem('sike_explicit_linguistic_rules') || '[]';
        const parsed: {trigger: string, response: string}[] = JSON.parse(explicitRules);
        return parsed.length > 0 ? `\n\n[LINGUISTIC RULES]:\n${parsed.map(r => `- ${r.trigger} => ${r.response}`).join('\n')}` : "";
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

/**
 * STREAMING TRANSMISSION
 */
export async function* streamAIChatResponse(
    prompt: string,
    history: Message[],
    language: string = 'English',
    images: { base64: string; mimeType: string }[] = [],
    userEmail?: string | null,
    userProfileNotes?: string,
    chatMode: string = 'General',
    userName: string = 'Guest'
): AsyncGenerator<{ text?: string }> {
    // Filter and map history ensuring strict User/Model alternation
    const contents = history
        .filter(msg => msg.text && msg.text.trim().length > 0)
        .map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));
    
    const userParts: any[] = [{ text: prompt }];
    if (images && images.length > 0) {
        images.forEach(img => userParts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } }));
    }

    // Handle initial turn or role alignment
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents.push({ role: 'model', parts: [{ text: "Acknowledged. Proceeding with analysis." }] });
    }
    
    contents.push({ role: 'user', parts: userParts });

    const payload = {
        contents,
        systemInstruction: `Persona: SigNify Engine 3.2. Mode: ${chatMode}. User: ${userName}. Language: ${language}. Directives: ${userProfileNotes}.${GLOBAL_CAPABILITIES}${getLinguisticContext()}${getGlobalVaultContext(userEmail)}`,
    };

    yield* SigNifyServer.generateContentStream(payload);
}

export async function analyzeVaultFile(file: VaultFile): Promise<{ summary: string, tasks: VaultTask[] }> {
    const payload = {
        contents: [{ role: 'user', parts: [{ text: `Analysing file: ${file.name}. Raw Content: ${file.content.slice(0, 10000)}` }] }],
        responseMimeType: 'application/json',
        responseSchema: {
            type: "OBJECT",
            properties: {
                summary: { type: "STRING" },
                tasks: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            text: { type: "STRING" },
                            priority: { type: "STRING" }
                        }
                    }
                }
            }
        }
    };

    const result = await SigNifyServer.generateContent(payload);
    const data = JSON.parse(result.text);
    return {
        summary: data.summary || "",
        tasks: (data.tasks || []).map((t: any) => ({ ...t, id: Math.random().toString(), status: 'pending', priority: t.priority || 'medium' }))
    };
}

export async function generateGeminiTTS(text: string, voice: string = 'Kore', emotion: string = 'Neutral'): Promise<string | undefined> {
    const result = await SigNifyServer.generateTTS({ text, voice, emotion, isMultiSpeaker: false });
    return result.audioData;
}

export async function generateMultiSpeakerTTS(text: string, voice1: string, voice2: string): Promise<string | undefined> {
    const result = await SigNifyServer.generateTTS({ text, voice: voice1, voice2, isMultiSpeaker: true });
    return result.audioData;
}

export async function getTranslatorResponse(text: string, sourceLang: string, targetLang: string): Promise<TranslatorResponse> {
    const payload = {
        contents: [{ role: 'user', parts: [{ text: `Translate from ${sourceLang} to ${targetLang}: ${text}` }] }],
        responseMimeType: 'application/json',
        responseSchema: {
            type: "OBJECT",
            properties: {
                mainTranslation: { type: "STRING" },
                wordByWord: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: { original: { type: "STRING" }, translation: { type: "STRING" } }
                    }
                }
            }
        }
    };
    const result = await SigNifyServer.generateContent(payload);
    return JSON.parse(result.text);
}

export async function getTranslatorResponseFromImage(base64: string, mimeType: string, sourceLang: string, targetLang: string): Promise<TranslatorResponse> {
    const payload = {
        contents: [{
            role: 'user',
            parts: [
                { inlineData: { data: base64, mimeType } },
                { text: `Extract text and translate from ${sourceLang} to ${targetLang}.` }
            ]
        }],
        responseMimeType: 'application/json',
        responseSchema: {
            type: "OBJECT",
            properties: {
                mainTranslation: { type: "STRING" },
                wordByWord: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: { original: { type: "STRING" }, translation: { type: "STRING" } }
                    }
                }
            }
        }
    };
    const result = await SigNifyServer.generateContent(payload);
    return JSON.parse(result.text);
}

export async function generateNanoBananaImage(prompt: string, aspectRatio: string = "1:1"): Promise<string | undefined> {
    const result = await SigNifyServer.generateImage({ prompt, aspectRatio });
    return result.imageUrl;
}

/** Specialized Streams with Standardized Signatures */
export async function* streamSimulationResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    yield* streamAIChatResponse(p, h, l, img, e, n, `Simulation Engineer`);
}
export async function* streamStudyHelperResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    yield* streamAIChatResponse(p, h, l, img, e, n, `Tutor`);
}
export async function* streamWritingResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    yield* streamAIChatResponse(p, h, l, img, e, n, `Writer`);
}
export async function* streamStorybookResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    yield* streamAIChatResponse(p, h, l, img, e, n, `Storyteller`);
}
export async function* streamGrammarResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    yield* streamAIChatResponse(p, h, l, img, e, n, `Linguist`);
}
export async function* streamNotebookChatResponse(p: string, h: Message[], s: any[], n: any, u: string = 'Guest', e?: string | null) {
    yield* streamAIChatResponse(p, h, 'English', [], e, n, `Researcher`, u);
}
export async function* streamVaultChatResponse(p: string, h: Message[], f: any[], n: any, u: string = 'Guest', e?: string | null) {
    yield* streamAIChatResponse(p, h, 'English', [], e, n, `Guardian`, u);
}

export async function generateConversationTitle(prompt: string, response: string): Promise<string> {
    const res = await SigNifyServer.generateContent({ contents: [{ role: 'user', parts: [{ text: `Summarize this exchange in 3 words: User: ${prompt}. Bot: ${response}` }] }] });
    return res.text.trim() || "New Comms";
}

export async function generateExamQuestions(subject: string, chapter: string, examType: string, languages: string[]): Promise<Question[]> {
    const res = await SigNifyServer.generateContent({ 
        contents: [{ role: 'user', parts: [{ text: `Generate 10 ${examType} questions for ${subject} (${chapter}) in ${languages.join('/')}.` }] }],
        responseMimeType: 'application/json',
        responseSchema: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    question: { type: "STRING" },
                    type: { type: "STRING" },
                    options: { type: "ARRAY", items: { type: "STRING" } },
                    modelAnswer: { type: "STRING" }
                }
            }
        }
    });
    return JSON.parse(res.text);
}

export async function evaluateExamAnswers(questions: Question[], userAnswers: UserAnswer[], studentInfo: StudentProfile, examSetup: any): Promise<ExamReport> {
    const res = await SigNifyServer.generateContent({ 
        contents: [{ role: 'user', parts: [{ text: `Grade this exam for ${studentInfo.name}. Questions: ${JSON.stringify(questions)}. Answers: ${JSON.stringify(userAnswers)}` }] }],
        responseMimeType: 'application/json'
    });
    const report = JSON.parse(res.text);
    return { ...report, id: Date.now().toString() };
}

export async function getVerbsByInitial(initial: string): Promise<string[]> {
    const res = await SigNifyServer.generateContent({ 
        contents: [{ role: 'user', parts: [{ text: `List common verbs starting with ${initial}. Return JSON array of strings only.` }] }],
        responseMimeType: 'application/json'
    });
    return JSON.parse(res.text);
}

export async function getVerbDetails(verb: string, language: string): Promise<any> {
    const res = await SigNifyServer.generateContent({ 
        contents: [{ role: 'user', parts: [{ text: `Provide full details for verb '${verb}' in ${language}. Forms, meaning, usages.` }] }],
        responseMimeType: 'application/json'
    });
    return JSON.parse(res.text);
}

export async function generateNotebookOverview(sources: NotebookSource[], targetMinutes: number = 5): Promise<string> {
    const res = await SigNifyServer.generateContent({ 
        contents: [{ role: 'user', parts: [{ text: `Create a ${targetMinutes}-minute podcast script based on these sources: ${sources.map(s => s.content).join('\n')}` }] }]
    });
    return res.text;
}
