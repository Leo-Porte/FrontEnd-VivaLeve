import { GuestGuard } from '@/controllers/AuthGuard';
import { LoginScreen } from '@/screens/login/LoginScreen';

export default function Rota() {
  return (
    <GuestGuard>
      <LoginScreen />
    </GuestGuard>
  );
}
