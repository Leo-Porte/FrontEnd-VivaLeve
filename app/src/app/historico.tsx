import { AuthGuard } from '@/controllers/AuthGuard';
import { HistoricoScreen } from '@/screens/historico/HistoricoScreen';

export default function Rota() {
  return (
    <AuthGuard>
      <HistoricoScreen />
    </AuthGuard>
  );
}
