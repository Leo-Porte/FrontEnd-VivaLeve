/**
 * Models de recepção do front: o formato exato que a API (ou o mock) devolve.
 * Fonte: js/api.js e js/mock-api.js do front legado (raiz do repo).
 * Nada de lógica aqui — só tipos. Conversões ficam nos controllers/infrastructure.
 */

// ------------------------------------------------------------ enums

export const MOODS = ['OTIMO', 'BEM', 'MAIS_OU_MENOS', 'MAL', 'DEPRESSIVO', 'ANSIOSO'] as const;
export type Mood = (typeof MOODS)[number];

export const ACTIVITIES = [
  'EXERCISE', 'WORK', 'STUDY', 'READING', 'FAMILY',
  'FRIENDS', 'HOBBY', 'REST', 'SLEEP_WELL', 'MEDITATION',
] as const;
export type Activity = (typeof ACTIVITIES)[number];

// ------------------------------------------------------------ auth / usuário

export interface User {
  id: number;
  email: string;
  name: string;
  pictureUrl: string | null;
}

/** Resposta de /v1/auth/login, /register e /google. */
export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresAt: string;
  user: User;
}

// ------------------------------------------------------------ humor (/v1/mood-logs)

export interface MoodLog {
  id: number;
  mood: Mood;
  note: string | null;
  activities: Activity[];
  imageUrl: string | null;
  logDate: string; // AAAA-MM-DD
  createdAt: string; // ISO
  updatedAt: string;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// ------------------------------------------------------------ diário (/v1/diary)

export interface DiaryEntry {
  id: number;
  title: string;
  text: string;
  emotion: Mood | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryInput {
  title: string;
  text: string;
  emotion?: Mood | null;
}

// ------------------------------------------------------------ respiração (/v1/breathing)

export interface BreathingSession {
  id: number;
  technique: string;
  cycles: number;
  durationSeconds: number;
  sessionDate: string;
  createdAt: string;
}

export interface BreathingInput {
  technique: string;
  cycles: number;
  durationSeconds: number;
}

export interface BreathingStats {
  todaySessions: number;
  totalSessions: number;
  totalMinutes: number;
}

// ------------------------------------------------------------ estatísticas / histórico

export interface MoodDistributionItem {
  mood: Mood;
  count: number;
  percentage: number;
}

export interface MoodDistribution {
  items: MoodDistributionItem[];
  total: number;
  predominant: Mood | null;
  predominantPercentage: number;
}

export interface EvolutionPoint {
  date: string; // AAAA-MM-DD
  averageScore: number | null;
  count: number;
}

/** /api/history/summary */
export interface HistorySummary {
  totalRecords: number;
  currentStreak: number;
  bestStreak: number;
  breathingSessions: number;
}

/** /v1/stats?days= */
export interface StatsSummary {
  days: number;
  startDate: string;
  endDate: string;
  totalEntries: number;
  predominantMood: Mood | null;
  currentStreak: number;
  longestStreak: number;
  evolution: EvolutionPoint[];
  distribution: MoodDistributionItem[];
}

// ------------------------------------------------------------ IA (/v1/ai)

/** SUCCESS = resposta da IA · FALLBACK = IA fora, texto padrão · CRISIS = risco: mostrar CVV 188 */
export type AiStatus = 'SUCCESS' | 'FALLBACK' | 'CRISIS';

export interface HelpResource {
  name: string;
  phone?: string;
  url?: string;
}

export interface AiResponse {
  conversationId?: number;
  messageId?: number;
  useCase: string;
  status: AiStatus;
  reply: string;
  crisisDetected: boolean;
  helpResources: HelpResource[];
  model: string;
  createdAt: string;
}

export interface Conversation {
  id: number;
  useCase: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface ChatMessage {
  id: number;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  status: AiStatus;
  createdAt: string;
}

// ------------------------------------------------------------ erro padronizado

/** Todo erro que sai da infrastructure tem este formato. */
export interface ApiError extends Error {
  status?: number;
  /** 401: sessão perdida, a tela deve mandar para o login. */
  semLogin?: boolean;
  /** rede fora / timeout. */
  offline?: boolean;
}
