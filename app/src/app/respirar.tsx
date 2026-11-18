import { AuthGuard } from '@/controllers/AuthGuard';
import { RespirarScreen } from '@/screens/respirar/RespirarScreen';

export default function Rota() {
  return (
    <AuthGuard>
      <RespirarScreen />
    </AuthGuard>
  );
}
