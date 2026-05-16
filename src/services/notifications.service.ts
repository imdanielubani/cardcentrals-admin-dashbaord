import { api } from '../lib/api';

export interface BroadcastDto {
  title: string;
  body: string;
  type?: 'promotion' | 'system';
  data?: Record<string, string>;
}

export interface BroadcastResult {
  success: number;
  failure: number;
}

export const notificationsService = {
  broadcast: (dto: BroadcastDto) =>
    api.post<BroadcastResult>('/notifications/broadcast', dto),
};
