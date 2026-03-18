import { describe, expect, it } from 'vitest';
import { chatMessageSchema, joinRoomPayloadSchema } from '../src/schemas.js';
describe('shared schemas', () => {
    it('accepts a valid join payload', () => {
        const result = joinRoomPayloadSchema.parse({
            roomId: 'lobby',
            displayName: 'Taylor',
            botName: 'Orbit',
            personality: 'playful strategist',
            theme: 'dark'
        });
        expect(result.displayName).toBe('Taylor');
    });
    it('rejects empty message content', () => {
        expect(() => chatMessageSchema.parse({
            id: '1',
            roomId: 'lobby',
            participantId: 'u1',
            displayName: 'Taylor',
            content: '',
            createdAt: new Date().toISOString()
        })).toThrowError();
    });
});
