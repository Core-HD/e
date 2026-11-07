import { apiRequest } from './client';

export async function blockUser(token: string, username: string): Promise<void> {
  await apiRequest('/api/v1/blocks/block', {
    method: 'POST',
    token,
    body: { username },
  });
}

export async function unblockUser(token: string, username: string): Promise<void> {
  await apiRequest('/api/v1/blocks/unblock', {
    method: 'DELETE',
    token,
    body: { username },
  });
}

export async function fetchBlockedUserIds(token: string): Promise<number[]> {
  const payload = await apiRequest('/api/v1/blocks/', { token });
  if (!Array.isArray(payload)) throw new Error('Unexpected blocks response');
  return payload.flatMap((item: unknown) =>
    typeof item === 'object' && item !== null && 'user_id' in item && typeof (item as Record<string, unknown>).user_id === 'number'
      ? [(item as { user_id: number }).user_id]
      : [],
  );
}
