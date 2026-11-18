import { AuthGuard } from '@/controllers/AuthGuard';
import { HumorScreen } from '@/screens/humor/HumorScreen';

export default function Rota() {
  return (
    <AuthGuard>
      <HumorScreen />
    </AuthGuard>
  );
}
