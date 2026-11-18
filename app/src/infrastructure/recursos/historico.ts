import type { EvolutionPoint, HistorySummary, MoodDistribution } from '@/models';
import { http, qs } from '../client';

// Atenção: este grupo usa o prefixo /api, e não /v1.
export const historico = {
  distribuicao(days: number): Promise<MoodDistribution> {
    return http.get('/api/history/distribution' + qs({ days }));
  },
  evolucao(days: number): Promise<EvolutionPoint[]> {
    return http.get('/api/history/evolution' + qs({ days }));
  },
  resumo(): Promise<HistorySummary> {
    return http.get('/api/history/summary');
  },
};
