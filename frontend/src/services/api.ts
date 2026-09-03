import axios from 'axios';
import { User, ScheduleCampaignPayload, ScheduledEmail } from '../types';

const rawApiUrl = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE_URL = rawApiUrl ? `${rawApiUrl}/api` : '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAuthUserId(userId: string | null) {
  if (userId) {
    api.defaults.headers.common['x-user-id'] = userId;
  } else {
    delete api.defaults.headers.common['x-user-id'];
  }
}

export async function loginWithGoogleToken(token: string, mockUser?: Partial<User>) {
  const response = await api.post<{ success: boolean; user: User }>('/auth/google', {
    token,
    mockUser,
  });
  return response.data;
}

export async function fetchScheduledEmails(page = 1, limit = 50) {
  const response = await api.get<{ success: boolean; total: number; emails: ScheduledEmail[] }>(
    `/emails/scheduled?page=${page}&limit=${limit}`
  );
  return response.data;
}

export async function fetchSentEmails(page = 1, limit = 50) {
  const response = await api.get<{ success: boolean; total: number; emails: ScheduledEmail[] }>(
    `/emails/sent?page=${page}&limit=${limit}`
  );
  return response.data;
}

export async function searchEmails(query: string, status: 'scheduled' | 'sent') {
  const response = await api.get<{ success: boolean; source: string; total: number; results: ScheduledEmail[] }>(
    `/emails/search?q=${encodeURIComponent(query)}&status=${status}`
  );
  return response.data;
}

export async function createCampaign(payload: ScheduleCampaignPayload) {
  const response = await api.post<{ success: boolean; campaign: any; scheduledCount: number }>(
    '/campaigns',
    payload
  );
  return response.data;
}

export async function updateSlackWebhook(webhookUrl: string) {
  const response = await api.post<{ success: boolean; message: string; slackWebhookUrl: string }>(
    '/slack/webhook',
    { slackWebhookUrl: webhookUrl }
  );
  return response.data;
}

export async function deleteScheduledEmail(id: string) {
  const response = await api.delete<{ success: boolean; message: string; id: string }>(`/emails/${id}`);
  return response.data;
}

export async function testSlackWebhook() {
  const response = await api.post<{ success: boolean; message: string }>('/slack/test');
  return response.data;
}
