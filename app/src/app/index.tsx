import { AuthGuard } from '@/controllers/AuthGuard';
import { HomeScreen } from '@/screens/home/HomeScreen';

export default function Rota() {
  return (
    <AuthGuard>
      <HomeScreen />
    </AuthGuard>
  );
}
