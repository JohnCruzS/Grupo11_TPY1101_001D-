import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import ChatBot from '../components/ChatBot';
import { useAuth } from '../context/AuthContext';

export default function Root() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {user && <ChatBot />}
    </div>
  );
}
