import { z } from 'zod';
import { insertUserSchema, users } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  wallet: {
    connect: {
      method: 'POST' as const,
      path: '/api/wallet/connect',
      input: z.object({
        walletAddress: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    disconnect: {
      method: 'POST' as const,
      path: '/api/wallet/disconnect',
      input: z.object({}),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },
  transactions: {
    listPending: {
      method: 'GET' as const,
      path: '/api/transactions/pending',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          type: z.string(),
          amount: z.string(),
          status: z.string(),
          txHash: z.string().optional()
        })),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ConnectWalletInput = z.infer<typeof api.wallet.connect.input>;
export type ConnectWalletResponse = z.infer<typeof api.wallet.connect.responses[200]>;
