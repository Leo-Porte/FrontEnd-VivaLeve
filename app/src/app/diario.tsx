import { AuthGuard } from '@/controllers/AuthGuard';
import { DiarioScreen } from '@/screens/diario/DiarioScreen';

export default function Rota() {
  return (
    <AuthGuard>
      <DiarioScreen />
    </AuthGuard>
  );
}
