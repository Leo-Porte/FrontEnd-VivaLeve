import { MOODS, type DiaryEntry, type DiaryInput } from '@/models';
import { http, qs, exigir, exigirEnum } from '../client';

function validar({ title, text, emotion }: Partial<DiaryInput> = {}) {
  exigir(title, 'title');
  exigir(text, 'text');
  if (emotion) exigirEnum(emotion, MOODS, 'emotion');
  return { title, text, emotion: emotion || null };
}

export const diario = {
  listar(q?: string): Promise<DiaryEntry[]> {
    return http.get('/v1/diary' + qs({ q }));
  },
  buscar(id: number): Promise<DiaryEntry> {
    return http.get(`/v1/diary/${id}`);
  },
  criar(input: DiaryInput): Promise<DiaryEntry> {
    return http.post('/v1/diary', validar(input));
  },
  atualizar(id: number, input: DiaryInput): Promise<DiaryEntry> {
    return http.put(`/v1/diary/${id}`, validar(input));
  },
  apagar(id: number): Promise<void> {
    return http.delete(`/v1/diary/${id}`);
  },
};
