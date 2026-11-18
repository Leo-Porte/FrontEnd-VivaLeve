import { ACTIVITIES, MOODS, type Activity, type Mood, type MoodLog, type Page } from '@/models';
import { http, qs, request, exigirEnum } from '../client';
import type { CamposForm } from '../transporte';

// No POST/PUT o back só aceita multipart/form-data (campo opcional "image" é arquivo).
function formHumor(mood: string, note?: string | null, activities?: readonly string[] | null): CamposForm {
  const form: CamposForm = { mood };
  if (note) form.note = note;
  if (activities) {
    activities.forEach((a) => exigirEnum(a, ACTIVITIES, 'activities'));
    form.activities = [...activities];
  }
  return form;
}

export const humor = {
  listar({ page = 0, size = 20, sort }: { page?: number; size?: number; sort?: string } = {}): Promise<Page<MoodLog>> {
    return http.get('/v1/mood-logs' + qs({ page, size, sort }));
  },
  todos(): Promise<MoodLog[]> {
    return http.get('/v1/mood-logs/all');
  },
  hoje(): Promise<MoodLog[]> {
    return http.get('/v1/mood-logs/today');
  },
  criar(mood: Mood, note?: string | null, activities: Activity[] = []): Promise<MoodLog> {
    exigirEnum(mood, MOODS, 'mood');
    return request('POST', '/v1/mood-logs', { form: formHumor(mood, note, activities) });
  },
  /** activities = null (padrão) mantém as atuais; [] apaga todas. */
  atualizar(id: number, mood: Mood, note?: string | null, activities: Activity[] | null = null): Promise<MoodLog> {
    exigirEnum(mood, MOODS, 'mood');
    return request('PUT', `/v1/mood-logs/${id}`, { form: formHumor(mood, note, activities) });
  },
  apagar(id: number): Promise<void> {
    return http.delete(`/v1/mood-logs/${id}`);
  },
};
