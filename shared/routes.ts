import { z } from 'zod';
import { insertUserSchema, users, insertPolicySchema, policies, simulateTransactionSchema } from './schema';

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
  policies: {
    list: {
      method: 'GET' as const,
      path: '/api/policies',
      responses: {
        200: z.array(z.custom<typeof policies.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/policies/:id',
      responses: {
        200: z.custom<typeof policies.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/policies',
      input: insertPolicySchema,
      responses: {
        200: z.custom<typeof policies.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/policies/:id',
      input: insertPolicySchema.partial(),
      responses: {
        200: z.custom<typeof policies.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/policies/:id',
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
    toggle: {
      method: 'PATCH' as const,
      path: '/api/policies/:id/toggle',
      responses: {
        200: z.custom<typeof policies.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    reorder: {
      method: 'POST' as const,
      path: '/api/policies/reorder',
      input: z.object({
        orderedIds: z.array(z.number()),
      }),
      responses: {
        200: z.array(z.custom<typeof policies.$inferSelect>()),
        400: errorSchemas.validation,
      },
    },
    simulate: {
      method: 'POST' as const,
      path: '/api/policies/simulate',
      input: simulateTransactionSchema,
      responses: {
        200: z.object({
          matchedPolicy: z.custom<typeof policies.$inferSelect>().nullable(),
          action: z.string(),
          reason: z.string(),
        }),
        400: errorSchemas.validation,
      },
    },
    approveChange: {
      method: 'POST' as const,
      path: '/api/policies/:id/approve-change',
      input: z.object({
        approver: z.string(),
      }),
      responses: {
        200: z.custom<typeof policies.$inferSelect>(),
        404: errorSchemas.notFound,
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
