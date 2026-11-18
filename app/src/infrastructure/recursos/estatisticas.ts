import type { StatsSummary } from '@/models';
import { http, qs } from '../client';

export const estatisticas = {
  resumo(days: number): Promise<StatsSummary> {
    return http.get('/v1/stats' + qs({ days }));
  },
};
