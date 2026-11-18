import { AuthGuard } from '@/controllers/AuthGuard';
import { ChatScreen } from '@/screens/chat/ChatScreen';

export default function Rota() {
  return (
    <AuthGuard>
      <ChatScreen />
    </AuthGuard>
  );
}
