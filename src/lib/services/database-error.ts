export function databaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: string; message?: string };
  return ['P1000', 'P1001', 'P1002', 'P1008', 'P1011', 'P1017', 'P2024'].includes(code ?? '') ||
    /opening a TLS connection|no credentials are available in the security package/i.test(message ?? '');
}

export const databaseUnavailableMessage = 'The invoice database is temporarily unavailable. Your invoice preview has been kept. Please retry after the connection is restored.';
