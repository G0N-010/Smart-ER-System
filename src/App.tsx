import { useState } from 'react';
import './index.css';
import LoginPage from './components/LoginPage';
import PatientIntakeForm from './components/PatientIntakeForm';
import NeuDashboard from './components/NeuDashboard';
import { useSimulation } from './hooks/useSimulation';
import type { LoginState } from './simulation/types';

function App() {
  const [loginState, setLoginState] = useState<LoginState>({
    isAuthenticated: false,
    user: null,
  });
  const [isIntakeMode, setIsIntakeMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('intake') === 'true';
  });

  const { config, result, isRunning, progress, updateConfig, runSimulation } = useSimulation();

  const handleLogout = () => {
    setLoginState({ isAuthenticated: false, user: null });
  };

  const handleBackFromIntake = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('intake');
    window.history.replaceState({}, '', url.toString());
    setIsIntakeMode(false);
  };

  // ── Patient Intake Form (accessed via QR code scan) ──
  if (isIntakeMode) {
    return <PatientIntakeForm onBack={handleBackFromIntake} />;
  }

  // ── Login Page ──
  if (!loginState.isAuthenticated) {
    return <LoginPage onLogin={setLoginState} />;
  }

  // ── Neumorphic Dashboard ──
  return (
    <NeuDashboard
      user={loginState.user}
      onLogout={handleLogout}
      config={config}
      result={result}
      isRunning={isRunning}
      progress={progress}
      updateConfig={updateConfig}
      runSimulation={runSimulation}
    />
  );
}

export default App;
