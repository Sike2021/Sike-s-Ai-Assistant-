import { Message, Question, UserAnswer, StudentProfile, ExamReport, TranslatorResponse, NotebookSource, VaultFile, VaultTask } from '../types';
import { INJECTED_STORIES } from './injectedKnowledge';

const GLOBAL_CAPABILITIES = `
[APP FEATURE AWARENESS]
You are SigNify OS, an integrated educational ecosystem.
Modules: Simulations, Exam Center, Neural Reader, Verb Lexicon, Translator, Writing Spirit, Study Helper, SigNify LM, Neural Vault.
`;

// Primary 'Flash' core for all reasoning tasks
const FLASH_MODEL = 'gemini-2.5-flash';

export function getGlobalVaultContext(userEmail?: string | null): string {
    let context = "\n\n[NEURAL RECALL]";
    context += "\n--- SYSTEM DATA ---";
    INJECTED_STORIES.forEach(s => {
        context += `\n- SYS_ID: ${s.id} | NAME: ${s.name}\n  CONTENT: ${s.content}\n`;
    });

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

async function callProxy(payload: any) {
    const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Neural handshake failed");
    return data;
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
): AsyncGenerator<{ text?: string }> {
    const sys = `Persona: SigNify Engine 3.2. Mode: ${chatMode}. User: ${userName}. Language: ${language}.
    ${GLOBAL_CAPABILITIES}${getLinguisticContext()}${getGlobalVaultContext(userEmail)}
    [USER MEMORY] ${userProfileNotes || 'None'}`;

    const contents = history
        .filter(m => m.text && m.text.trim().length > 0)
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
    
    const currentParts: any[] = [{ text: prompt }];
    if (Array.isArray(images)) {
        images.forEach(img => {
            if (img && img.base64) {
                currentParts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
            }
        });
    }
    contents.push({ role: 'user', parts: currentParts });

    const result = await callProxy({
        type: 'generate',
        model: FLASH_MODEL,
        contents,
        config: { systemInstruction: sys }
    });
    
    yield { text: result.text };
}

export async function analyzeVaultFile(file: VaultFile): Promise<{ summary: string, tasks: VaultTask[] }> {
    const result = await callProxy({
        type: 'generate',
        model: FLASH_MODEL,
        contents: `Analyze file: ${file.name}. Content: ${file.content.slice(0, 10000)}`,
        config: { 
            responseMimeType: 'application/json',
            systemInstruction: 'Summarize the file and extract 3 tasks. Return JSON: { "summary": string, "tasks": [{ "text": string, "priority": "high" }] }'
        }
    });
    const data = JSON.parse(result.text);
    return {
        summary: data.summary || "",
        tasks: (data.tasks || []).map((t: any) => ({ ...t, id: Math.random().toString(), status: 'pending' }))
    };
}

export async function getTranslatorResponse(text: string, sourceLang: string, targetLang: string): Promise<TranslatorResponse> {
    const result = await callProxy({
        type: 'generate',
        model: FLASH_MODEL,
        contents: `Translate from ${sourceLang} to ${targetLang}: "${text}"`,
        config: { 
            responseMimeType: 'application/json',
            systemInstruction: 'Return JSON: { "mainTranslation": string, "wordByWord": [{ "original": string, "translation": string }] }'
        }
    });
    return JSON.parse(result.text);
}

export async function getTranslatorResponseFromImage(base64: string, mimeType: string, sourceLang: string, targetLang: string): Promise<TranslatorResponse> {
    const result = await callProxy({
        type: 'generate',
        model: FLASH_MODEL,
        contents: [
            { role: 'user', parts: [{ inlineData: { data: base64, mimeType } }, { text: `Extract text and translate from ${sourceLang} to ${targetLang}.` }] }
        ],
        config: { 
            responseMimeType: 'application/json',
            systemInstruction: 'Return JSON: { "mainTranslation": string, "wordByWord": [{ "original": string, "translation": string }] }'
        }
    });
    return JSON.parse(result.text);
}

export async function generateGeminiTTS(text: string, voice: string = 'Kore', emotion: string = 'Neutral'): Promise<string | undefined> {
    const result = await callProxy({
        type: 'tts',
        contents: [{ parts: [{ text: `Say with ${emotion} tone: ${text}` }] }],
        config: {
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
    });
    return result.audioData;
}

export async function generateMultiSpeakerTTS(text: string, v1: string, v2: string): Promise<string | undefined> {
    const result = await callProxy({
        type: 'tts',
        contents: [{ parts: [{ text }] }],
        config: {
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'S1', voiceConfig: { prebuiltVoiceConfig: { voiceName: v1 } } },
                        { speaker: 'S2', voiceConfig: { prebuiltVoiceConfig: { voiceName: v2 } } }
                    ]
                }
            }
        }
    });
    return result.audioData;
}

export async function generateNanoBananaImage(prompt: string, aspectRatio: string = "1:1"): Promise<string | undefined> {
    const result = await callProxy({
        type: 'image',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { imageConfig: { aspectRatio } }
      });
    return result.imageUrl;
}

/** Normalized Persona Streamers */
export async function* streamSimulationResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    yield* streamAIChatResponse(p, h, l, img, e, n, `Simulation Engineer`);
}
export async function* streamStudyHelperResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    yield* streamAIChatResponse(p, h, l, img, e, n, `Tutor`);
}
export async function* streamWritingResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    yield* streamAIChatResponse(p, h, l, img, e, n, `Writing Spirit`);
}
export async function* streamStorybookResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    yield* streamAIChatResponse(p, h, l, img, e, n, `Story Weaver`);
}
export async function* streamGrammarResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    yield* streamAIChatResponse(p, h, l, img, e, n, `Grammar Core`);
}

export async function* streamNotebookChatResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    const sources: NotebookSource[] = Array.isArray(img) ? img : [];
    const context = sources.map(src => `[SOURCE: ${src.name}]\n${src.content.slice(0, 2000)}`).join('\n\n');
    yield* streamAIChatResponse(p, h, l, [], e, n + "\n\n" + context, 'LM Studio Researcher');
}

export async function* streamVaultChatResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    const vaultFiles: VaultFile[] = Array.isArray(img) ? img : [];
    const context = vaultFiles.map(f => `[VAULT_FILE: ${f.name}]\n${f.content.slice(0, 2000)}`).join('\n\n');
    yield* streamAIChatResponse(p, h, l, [], e, (n || "") + "\n\n" + context, 'Neural Guardian');
}

export async function generateNotebookOverview(sources: NotebookSource[], duration: number): Promise<string> {
    const result = await callProxy({
        type: 'generate',
        model: FLASH_MODEL,
        contents: `Create a ${duration} minute podcast script for these sources: ${sources.map(s => s.name).join(', ')}`,
        config: { systemInstruction: 'Two speakers (S1 and S2) discussing key insights. Engaging tone.' }
    });
    return result.text;
}

export async function generateConversationTitle(prompt: string, response: string): Promise<string> {
    const result = await callProxy({
        type: 'generate',
        model: FLASH_MODEL,
        contents: `Summarize in 3 words: User: ${prompt}. Bot: ${response}`
    });
    return result.text.trim() || "New Comms";
}

export async function generateExamQuestions(subject: string, chapter: string, type: string, langs: string[]): Promise<Question[]> {
    const result = await callProxy({
        type: 'generate',
        model: FLASH_MODEL,
        contents: `Generate 10 ${type} questions for ${subject} (${chapter}) in ${langs.join('/')}.`,
        config: { 
            responseMimeType: 'application/json',
            systemInstruction: 'Return JSON: [{ "question": string, "type": "MCQ", "options": [string], "modelAnswer": string }]'
        }
    });
    return JSON.parse(result.text);
}

export async function evaluateExamAnswers(qs: Question[], ans: UserAnswer[], student: StudentProfile, setup: any): Promise<ExamReport> {
    const result = await callProxy({
        type: 'generate',
        model: FLASH_MODEL,
        contents: `Grade exam. Questions: ${JSON.stringify(qs)}. Answers: ${JSON.stringify(ans)}`,
        config: { 
            responseMimeType: 'application/json',
            systemInstruction: 'Return ExamReport JSON.' 
        }
    });
    return { ...JSON.parse(result.text), id: Date.now().toString() };
}

export async function getVerbsByInitial(initial: string): Promise<string[]> {
    const result = await callProxy({
        type: 'generate',
        model: FLASH_MODEL,
        contents: `List common verbs starting with ${initial}. JSON array of strings.`
    });
    return JSON.parse(result.text);
}

export async function getVerbDetails(verb: string, lang: string): Promise<any> {
    const result = await callProxy({
        type: 'generate',
        model: FLASH_MODEL,
        contents: `Details for verb '${verb}' in ${lang}. JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(result.text);
}