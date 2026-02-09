
import { GoogleGenAI, Modality } from "@google/genai";
import { Message, TranslatorResponse, NotebookSource, VaultFile, VaultTask, Question, UserAnswer, ExamReport } from '../types';

const GLOBAL_CAPABILITIES = `
[APP FEATURE AWARENESS]
You are SigNify OS, an integrated educational ecosystem.
Modules: Neural Reader (SigNify LM), Translator, Creative Studio, Neural Vault.
`;

const PRIMARY_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

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

// Fixed: Google GenAI initialization follows strict guidelines
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    const response = await ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents,
        config: { systemInstruction: sys }
    });

    for await (const chunk of response) {
        yield { text: chunk.text || "" };
    }
}

// Fixed: Google GenAI initialization follows strict guidelines
export async function analyzeVaultFile(file: VaultFile): Promise<{ summary: string, tasks: VaultTask[] }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: `Analyze file: ${file.name}. Content: ${file.content.slice(0, 10000)}`,
        config: { 
            responseMimeType: 'application/json',
            systemInstruction: 'Summarize the file and extract 3 tasks. Return JSON: { "summary": string, "tasks": [{ "text": string, "priority": "high" }] }'
        }
    });
    const data = JSON.parse(response.text || '{"summary":"","tasks":[]}');
    return {
        summary: data.summary || "",
        tasks: (data.tasks || []).map((t: any) => ({ ...t, id: Math.random().toString(), status: 'pending' }))
    };
}

// Fixed: Google GenAI initialization follows strict guidelines
export async function getTranslatorResponse(text: string, sourceLang: string, targetLang: string): Promise<TranslatorResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: `Translate from ${sourceLang} to ${targetLang}: "${text}"`,
        config: { 
            responseMimeType: 'application/json',
            systemInstruction: 'Return JSON: { "mainTranslation": string, "wordByWord": [{ "original": string, "translation": string }] }'
        }
    });
    return JSON.parse(response.text || '{"mainTranslation":"","wordByWord":[]}');
}

// Fixed: Google GenAI initialization follows strict guidelines
export async function getTranslatorResponseFromImage(base64: string, mimeType: string, sourceLang: string, targetLang: string): Promise<TranslatorResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
}

// Fixed: Google GenAI initialization follows strict guidelines
export async function generateGeminiTTS(text: string, voice: string = 'Kore', emotion: string = 'Neutral'): Promise<string | undefined> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: `Say with ${emotion} tone: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}

// Fixed: Google GenAI initialization follows strict guidelines
export async function generateMultiSpeakerTTS(text: string, v1: string, v2: string): Promise<string | undefined> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
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
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}

// Fixed: Google GenAI initialization follows strict guidelines
export async function generateNanoBananaImage(prompt: string, aspectRatio: string = "1:1"): Promise<string | undefined> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { imageConfig: { aspectRatio } }
    });
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
        const firstCandidate = candidates[0];
        if (firstCandidate.content && firstCandidate.content.parts) {
            for (const part of firstCandidate.content.parts) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    return undefined;
}

export async function* streamCreativeResponse(p: string, h: Message[], l: string, img: any, e: any, n: any) {
    yield* streamAIChatResponse(p, h, l, img, e, n, `Creative Studio Director`);
}

export async function* streamNotebookChatResponse(p: string, h: Message[], l: string, sourcesInput: NotebookSource[], e: any, n: any) {
    const context = sourcesInput.map(src => `[SOURCE: ${src.name}]\n${src.content.slice(0, 2000)}`).join('\n\n');
    yield* streamAIChatResponse(p, h, l, [], e, (n || "") + "\n\n" + context, 'LM Studio Researcher');
}

export async function* streamVaultChatResponse(p: string, h: Message[], l: string, vaultFilesInput: VaultFile[], e: any, n: any) {
    const context = vaultFilesInput.map(f => `[VAULT_FILE: ${f.name}]\n${f.content.slice(0, 2000)}`).join('\n\n');
    yield* streamAIChatResponse(p, h, l, [], e, (n || "") + "\n\n" + context, 'Neural Guardian');
}

// Fixed: Google GenAI initialization follows strict guidelines
export async function generateNotebookOverview(sources: NotebookSource[], duration: number): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: `Create a ${duration} minute podcast script for these sources: ${sources.map(s => s.name).join(', ')}`,
        config: { systemInstruction: 'Two speakers (S1 and S2) discussing key insights. Engaging tone.' }
    });
    return response.text || "";
}

// Fixed: Google GenAI initialization follows strict guidelines
export async function generateConversationTitle(prompt: string, response: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const result = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: `Summarize in 3 words: User: ${prompt}. Bot: ${response}`
    });
    return (result.text || "").trim() || "New Comms";
}

// Fixed: Google GenAI initialization follows strict guidelines
export async function getVerbsByInitial(initial: string): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: `List 20 common English verbs starting with '${initial}'.`,
        config: { responseMimeType: 'application/json', systemInstruction: 'Return JSON array of strings.' }
    });
    return JSON.parse(response.text || '[]');
}

// Fixed: Google GenAI initialization follows strict guidelines
export async function getVerbDetails(verb: string, language: string): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: `Provide details for '${verb}' in ${language}.`,
        config: {
            responseMimeType: 'application/json',
            systemInstruction: 'Return JSON: { "base": string, "description": string, "past": string, "pastParticiple": string, "nounForm": string, "adjectiveForm": string, "usages": [string] }'
        }
    });
    return JSON.parse(response.text || '{}');
}

// Added missing exam related services
// Fixed: Google GenAI initialization follows strict guidelines
export async function generateExamQuestions(subject: string, chapter: string, examType: string, language: string[]): Promise<Question[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: `Generate an exam for Subject: ${subject}, Chapter: ${chapter}. Type: ${examType}. Languages requested: ${language.join(', ')}.`,
        config: {
            responseMimeType: "application/json",
            systemInstruction: `You are an expert exam generator for the Pakistani curriculum. 
            Generate 10 relevant questions. 
            If MCQ, provide 4 options. 
            The question text MUST be in all requested languages, separated by ' / '.
            Return JSON: { "questions": [{ "question": "string", "type": "MCQ" | "SHORT" | "LONG", "options": ["string"] }] }`
        }
    });
    try {
        const data = JSON.parse(response.text || '{"questions":[]}');
        return data.questions || [];
    } catch (e) {
        return [];
    }
}

// Fixed: Google GenAI initialization follows strict guidelines
export async function evaluateExamAnswers(questions: Question[], userAnswers: UserAnswer[], studentInfo: any, examSetup: any): Promise<ExamReport> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: `Grade this exam for ${studentInfo.name}. 
        Questions: ${JSON.stringify(questions)}. 
        Student Answers: ${JSON.stringify(userAnswers)}. 
        Context: ${examSetup.subject}, ${examSetup.chapter}.`,
        config: {
            responseMimeType: "application/json",
            systemInstruction: `You are a strict but fair AI examiner. Evaluate the student's performance.
            Provide detailed feedback for each question and an overall summary.
            Return JSON matching the following structure exactly:
            {
                "results": {
                    "marksObtained": number,
                    "totalMarks": number,
                    "percentage": number,
                    "grade": "A+" | "A" | "B" | "C" | "D" | "F",
                    "overallFeedback": "string",
                    "breakdown": [{
                        "question": "string",
                        "userAnswer": "string",
                        "modelAnswer": "string",
                        "isCorrect": boolean,
                        "feedback": "string"
                    }]
                }
            }`
        }
    });
    const data = JSON.parse(response.text || '{"results": {}}');
    return {
        id: Date.now().toString(),
        studentInfo,
        examSetup,
        results: data.results
    };
}
