import type { BreathingInput, BreathingSession, BreathingStats } from '@/models';
import { http, exigir } from '../client';

export const respiracao = {
  sessoes(): Promise<BreathingSession[]> {
    return http.get('/v1/breathing/sessions');
  },
  registrar({ technique, cycles, durationSeconds }: BreathingInput): Promise<BreathingSession> {
    exigir(technique, 'technique');
    exigir(cycles, 'cycles');
    exigir(durationSeconds, 'durationSeconds');
    return http.post('/v1/breathing/sessions', {
      technique,
      cycles: Number(cycles),
      durationSeconds: Number(durationSeconds),
    });
  },
  /** CUIDADO: o endpoint não recebe id, apaga TODAS as sessões do usuário (peça confirmação). */
  apagarTodas(): Promise<void> {
    return http.delete('/v1/breathing/sessions');
  },
  stats(): Promise<BreathingStats> {
    return http.get('/v1/breathing/stats');
  },
};
