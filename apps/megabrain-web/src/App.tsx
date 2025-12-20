import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Empire from './pages/Empire';
import Consciousness from './pages/Consciousness';
import Research from './pages/Research';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/empire" element={<Empire />} />
        <Route path="/consciousness" element={<Consciousness />} />
        <Route path="/research" element={<Research />} />
      </Routes>
    </Layout>
  );
}
