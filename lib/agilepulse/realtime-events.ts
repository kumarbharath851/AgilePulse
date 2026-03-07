import { z } from 'zod';

export const AgilePulseRealtimeEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('participant.joined'),
    sessionId: z.string().min(1),
    payload: z.object({
      userId: z.string().min(1),
      displayName: z.string().min(1),
      avatarUrl: z.string().url().optional(),
    }),
    emittedAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('vote.submitted'),
    sessionId: z.string().min(1),
    payload: z.object({
      storyId: z.string().min(1),
      userId: z.string().min(1),
      roundNumber: z.number().int().nonnegative(),
    }),
    emittedAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('votes.revealed'),
    sessionId: z.string().min(1),
    payload: z.object({
      storyId: z.string().min(1),
      roundNumber: z.number().int().nonnegative(),
      consensusReached: z.boolean(),
      outlierUserIds: z.array(z.string()),
      discussionPrompt: z.string().optional(),
    }),
    emittedAt: z.string().datetime(),
  }),
]);

export type AgilePulseRealtimeEvent = z.infer<typeof AgilePulseRealtimeEventSchema>;
