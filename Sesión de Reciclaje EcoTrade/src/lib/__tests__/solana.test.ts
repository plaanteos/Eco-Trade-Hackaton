import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock('@/lib/config', () => ({
  CONFIG: {
    SOLANA_NETWORK: 'devnet',
    SOLANA_RPC_URL: 'https://api.devnet.solana.com',
  },
}));

import { emitirReciboSolana } from '@/lib/solana';

describe('emitirReciboSolana', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    vi.restoreAllMocks();
  });

  it('falla si no hay sesión autenticada', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    await expect(emitirReciboSolana('session-1')).rejects.toThrow(
      'Debes iniciar sesión como operador para emitir recibos'
    );
  });

  it('envía el token bearer y devuelve el recibo emitido', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        signature: 'sig-123',
        explorerUrl: 'https://explorer.solana.com/tx/sig-123?cluster=devnet',
        cluster: 'devnet',
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const receipt = await emitirReciboSolana('session-1');

    expect(fetchMock).toHaveBeenCalledWith('/api/emit-solana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
      body: JSON.stringify({ sessionId: 'session-1' }),
    });
    expect(receipt.signature).toBe('sig-123');
    expect(receipt.cluster).toBe('devnet');
  });

  it('propaga el error devuelto por el backend', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Solo un operador autenticado puede emitir recibos' }),
      })
    );

    await expect(emitirReciboSolana('session-1')).rejects.toThrow(
      'Solo un operador autenticado puede emitir recibos'
    );
  });
});