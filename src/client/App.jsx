import { GameProvider, useGameState, useGameActions } from './context/GameContext.jsx';
import CreateRoom from './components/CreateRoom.jsx';
import JoinRoom from './components/JoinRoom.jsx';
import Lobby from './components/Lobby.jsx';
import GameBoard from './components/GameBoard.jsx';
import GameOver from './components/GameOver.jsx';
import TurnTimer from './components/TurnTimer.jsx';
import UnoButton from './components/UnoButton.jsx';
import DrawButton from './components/DrawButton.jsx';

function AppContent() {
  const state = useGameState();
  const { clearError } = useGameActions();

  // Game view — full screen, no wrapper constraints
  if (state.view === 'game') {
    return (
      <>
        <GameBoard />
        <div style={{ position: 'fixed', top: '12px', right: '12px', display: 'flex', gap: '8px', alignItems: 'center', zIndex: 100 }}>
          <TurnTimer />
        </div>
        <div style={{ position: 'fixed', bottom: '140px', right: '16px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', zIndex: 100 }}>
          <UnoButton />
          <DrawButton />
        </div>
        <GameOver />
      </>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>UNO No Mercy</h1>

      {state.error && (
        <div style={{ padding: '12px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '6px', marginBottom: '16px' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{state.error}</p>
          <button onClick={clearError} style={{ marginTop: '8px', fontSize: '12px', cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      )}

      {state.view === 'home' && (
        <>
          <CreateRoom />
          <JoinRoom />
        </>
      )}

      {state.view === 'lobby' && <Lobby />}
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
