import { AuthGuard } from '@/controllers/AuthGuard';
import { ConfigScreen } from '@/screens/config/ConfigScreen';

export default function Rota() {
  return (
    <AuthGuard>
      <ConfigScreen />
    </AuthGuard>
  );
}
