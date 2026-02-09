
import { Message, UserProfile, SubscriptionTier } from '../types';

// --- Dynamic Storage Keys ---
export const getConversationsKey = (email: string | null) => `sikeAiAssistant_conversations_${(email || 'global').replace(/[@.]/g, '_')}`;
export const getSavedMessagesKey = (email: string | null) => `sikeAiAssistant_savedMessages_${(email || 'global').replace(/[@.]/g, '_')}`;
export const getExamHistoryKey = (rollNo: string) => `sikeTutorExamHistory_${rollNo}`;
export const getInProgressExamKey = (rollNo: string) => `sikeTutorInProgressExam_${rollNo}`;
export const GLOBAL_NOTES_KEY = 'sikeAiAssistant_globalNotes';
export const SIKE_USERS_KEY = 'sikeAiAssistant_users';
export const CURRENT_USER_EMAIL_KEY = 'sikeAiAssistant_currentUserEmail';

// --- Subscription System ---
const VALID_CODES = {
    study: [
        'STUDY560001', 'STUDY560011', 'STUDY560021', 'STUDY560031', 'STUDY560041',
        'STUDY560051', 'STUDY560061', 'STUDY560071', 'STUDY560081', 'STUDY560091'
    ],
    pro: [
        'PRO100001', 'PRO100011', 'PRO100021', 'PRO100031', 'PRO100041',
        'PRO100051', 'PRO100061', 'PRO100071', 'PRO100081', 'PRO100091'
    ]
};

export const validateSubscriptionCode = (code: string): SubscriptionTier | null => {
    const normalizedCode = code.trim().toUpperCase();
    if (VALID_CODES.study.includes(normalizedCode)) return 'study';
    if (VALID_CODES.pro.includes(normalizedCode)) return 'pro';
    return null;
};

export const checkFeatureAccess = (pageId: string, currentTier: SubscriptionTier): boolean => {
    // Unlocked all features for debugging/maintenance as requested.
    return true;
};

// Helper to chunk text for TTS
export const chunkText = (text: string, maxLength = 160): string[] => {
    if (!text) return [];
    if (text.length <= maxLength) {
        return [text];
    }

    const chunks = [];
    let remainingText = text;

    while (remainingText.length > 0) {
        if (remainingText.length <= maxLength) {
            chunks.push(remainingText);
            break;
        }

        let chunk = remainingText.substring(0, maxLength);
        let lastBreak = -1;
        ['.', '!', '?', '\n', ' '].forEach(p => {
            const pos = chunk.lastIndexOf(p);
            if (pos > lastBreak) {
                lastBreak = pos;
            }
        });
        
        const splitPoint = lastBreak > -1 ? lastBreak + 1 : maxLength;
        
        chunks.push(remainingText.substring(0, splitPoint));
        remainingText = remainingText.substring(splitPoint).trimStart();
    }

    return chunks.filter(c => c.trim() !== '');
};

/**
 * Creates a WAV file from raw PCM data.
 * Gemini TTS returns 16-bit Mono PCM at 24000Hz.
 */
export const createWavBlob = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    /* RIFF identifier */
    view.setUint32(0, 0x52494646, false);
    /* file length */
    view.setUint32(4, 36 + pcmData.length, true);
    /* RIFF type */
    view.setUint32(8, 0x57415645, false);
    /* format chunk identifier */
    view.setUint32(12, 0x666d7420, false);
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    view.setUint32(36, 0x64617461, false);
    /* data chunk length */
    view.setUint32(40, pcmData.length, true);

    // Using buffer explicitly and casting to BlobPart array to satisfy TypeScript
    return new Blob([new Uint8Array(header), pcmData.buffer as BlobPart], { type: 'audio/wav' });
};