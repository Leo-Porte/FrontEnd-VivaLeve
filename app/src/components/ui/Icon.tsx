import {
  Activity, ArrowUp, Bed, Bell, BellRing, Book, BookOpen, Briefcase, Calendar, ChartLine, Check, ChevronRight, CircleAlert,
  CloudRain, Coffee, Dumbbell, ExternalLink, Eye, EyeOff, Feather, Flame, Flower2, Frown, GraduationCap, Handshake,
  HeartHandshake, House, Laugh, Leaf, Lightbulb, LogOut, Menu, Meh, MessageCircle, Music, Palette, Pause, Pencil, PencilLine,
  Phone, Play, Plus, RotateCcw, Search, Send, Settings, ShieldCheck, Smile, Sofa, Sparkles, SquarePen, Star, Sun, Trash2,
  TrendingUp, Trophy, Users, Video, Waves, Wind, X, Zap, Moon, SunMoon, CircleUser, Globe,
  type LucideIcon,
} from 'lucide-react-native';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ensureContrast, useSurface, useTheme } from '@/theme';

/**
 * Ícones de interface (Lucide, traço uniforme). Os nomes antigos do Icon3D continuam valendo,
 * para trocar um pelo outro sem mexer na regra das telas.
 */
const ICONES = {
  home: House,
  humor: Smile,
  coracao: HeartHandshake,
  diario: BookOpen,
  grafico: ChartLine,
  respirar: Wind,
  lua: Moon,
  chat: MessageCircle,
  config: Settings,
  musica: Music,
  telefone: Phone,
  escudo: ShieldCheck,
  video: Video,
  cha: Coffee,
  ideia: Lightbulb,
  folha: Leaf,
  pluma: Feather,
  estrela: Star,
  fogo: Flame,
  trofeu: Trophy,
  sino: Bell,
  lapis: Pencil,
  sol: Sun,
  vela: Sparkles,

  // emoções (id da tela)
  otimo: Laugh,
  bem: Smile,
  'mais-ou-menos': Meh,
  mal: Frown,
  depressivo: CloudRain,
  ansioso: Zap,

  // atividades (id da tela)
  trabalho: Briefcase,
  exercicio: Dumbbell,
  familia: Users,
  amigos: Handshake,
  hobby: Palette,
  descanso: Sofa,
  estudo: GraduationCap,
  meditacao: Flower2,
  leitura: Book,
  sono: Bed,

  // sons ambiente (id)
  chuva: CloudRain,
  mar: Waves,
  vento: Wind,
  fogueira: Flame,
  tigelas: BellRing,

  // interface
  escuro: Moon,
  sistema: SunMoon,
  usuario: CircleUser,
  site: Globe,

  // ações de interface
  adicionar: Plus,
  buscar: Search,
  editar: PencilLine,
  apagar: Trash2,
  tocar: Play,
  pausar: Pause,
  reiniciar: RotateCcw,
  enviar: Send,
  sair: LogOut,
  calendario: Calendar,
  tendencia: TrendingUp,
  atividade: Activity,
  ok: Check,
  fechar: X,
  ver: Eye,
  ocultar: EyeOff,
  avancar: ChevronRight,
  externo: ExternalLink,
  alerta: CircleAlert,
  menu: Menu,
  novaSessao: SquarePen,
  subir: ArrowUp,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONES;
export const iconNames = Object.keys(ICONES) as IconName[];

/** Converte um id qualquer (emoção, atividade, som) em IconName, com reserva. */
export function iconeDe(id: string | null | undefined, reserva: IconName = 'vela'): IconName {
  return id && id in ICONES ? (id as IconName) : reserva;
}

export interface IconProps {
  name: IconName;
  size?: number;
  /** cor do traço; padrão: texto do tema */
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, color, strokeWidth = 1.9 }: IconProps) {
  const { colors } = useTheme();
  const Cmp = ICONES[name] ?? Sparkles;
  return <Cmp size={size} color={color ?? colors.text} strokeWidth={strokeWidth} absoluteStrokeWidth={false} />;
}

export interface IconBadgeProps {
  name: IconName;
  /** lado do quadrado (o ícone ocupa ~50%) */
  size?: number;
  /** cor de destaque; padrão: primária do tema */
  tint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Glifo na cor de destaque, SEM fundo colorido (padrão Saúde/Ajustes; quadradinho tingido é vício de IA — ver docs/VISUAL.md).
 * `size` é a caixa reservada; o traço ocupa ~60% dela, para alinhar com o texto ao lado.
 */
export function IconBadge({ name, size = 44, tint, style }: IconBadgeProps) {
  const { colors } = useTheme();
  const surface = useSurface();
  const base = tint ?? colors.primary;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size, alignItems: 'flex-start', justifyContent: 'center' }, style]}
    >
      <Icon name={name} size={Math.round(size * 0.6)} color={ensureContrast(base, surface, 3)} />
    </View>
  );
}
