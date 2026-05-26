import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import * as socketService from '../services/socketService.js';

// --- Initial State ---

const initialState = {
  // Connection state
  view: 'home', // 'home' | 'lobby' | 'game'
  error: null,

  // Room state
  roomCode: null,
  playerId: null,
  players: [], // { id, name, isHost }

  // Game state (from ClientGameState)
  gameState: null,

  // Timer
  turnTimer: null, // { playerId, remaining } | null
};

// --- Action Types ---

const ActionTypes = {
  ROOM_CREATED: 'ROOM_CREATED',
  ROOM_JOINED: 'ROOM_JOINED',
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_LEFT: 'PLAYER_LEFT',
  GAME_STARTED: 'GAME_STARTED',
  GAME_STATE_UPDATE: 'GAME_STATE_UPDATE',
  TURN_TIMER: 'TURN_TIMER',
  UNO_CALLED: 'UNO_CALLED',
  GAME_OVER: 'GAME_OVER',
  ERROR: 'ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  RESET: 'RESET',
  PLAYER_DISCONNECTED: 'PLAYER_DISCONNECTED',
  PLAYER_RECONNECTED: 'PLAYER_RECONNECTED',
};

// --- Reducer ---

function gameReducer(state, action) {
  switch (action.type) {
    case ActionTypes.ROOM_CREATED:
      return {
        ...state,
        roomCode: action.payload.roomCode,
        playerId: action.payload.playerId,
        players: action.payload.players || [{ id: action.payload.playerId, name: 'You', isHost: true }],
        view: 'lobby',
        error: null,
      };

    case ActionTypes.ROOM_JOINED:
      return {
        ...state,
        roomCode: action.payload.roomCode,
        playerId: action.payload.playerId || state.playerId,
        players: action.payload.players,
        view: 'lobby',
        error: null,
      };

    case ActionTypes.PLAYER_JOINED:
      return {
        ...state,
        players: [...state.players, action.payload.player],
      };

    case ActionTypes.PLAYER_LEFT: {
      const updatedPlayers = state.players.filter(
        (p) => p.id !== action.payload.playerId
      );
      // Update host if a new host was designated
      if (action.payload.newHost) {
        return {
          ...state,
          players: updatedPlayers.map((p) =>
            p.id === action.payload.newHost
              ? { ...p, isHost: true }
              : { ...p, isHost: false }
          ),
        };
      }
      return {
        ...state,
        players: updatedPlayers,
      };
    }

    case ActionTypes.GAME_STARTED:
      return {
        ...state,
        gameState: action.payload.gameState,
        view: 'game',
        error: null,
      };

    case ActionTypes.GAME_STATE_UPDATE:
      return {
        ...state,
        gameState: action.payload.gameState,
      };

    case ActionTypes.TURN_TIMER:
      return {
        ...state,
        turnTimer: {
          playerId: action.payload.playerId,
          remaining: action.payload.remaining,
        },
      };

    case ActionTypes.UNO_CALLED:
      return {
        ...state,
        gameState: state.gameState
          ? {
              ...state.gameState,
              players: state.gameState.players.map((p) =>
                p.id === action.payload.playerId
                  ? { ...p, hasCalledUno: true }
                  : p
              ),
            }
          : null,
      };

    case ActionTypes.GAME_OVER:
      return {
        ...state,
        gameState: state.gameState
          ? {
              ...state.gameState,
              winner: action.payload.winner,
              scores: action.payload.scores,
              status: 'finished',
            }
          : null,
        turnTimer: null,
      };

    case ActionTypes.ERROR:
      return {
        ...state,
        error: action.payload.message,
      };

    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ActionTypes.RESET:
      return { ...initialState };

    case ActionTypes.PLAYER_DISCONNECTED:
      return {
        ...state,
        gameState: state.gameState
          ? {
              ...state.gameState,
              players: state.gameState.players.map((p) =>
                p.id === action.payload.playerId
                  ? { ...p, isConnected: false }
                  : p
              ),
            }
          : null,
        players: state.players.map((p) =>
          p.id === action.payload.playerId
            ? { ...p, isConnected: false }
            : p
        ),
      };

    case ActionTypes.PLAYER_RECONNECTED:
      return {
        ...state,
        gameState: state.gameState
          ? {
              ...state.gameState,
              players: state.gameState.players.map((p) =>
                p.id === action.payload.playerId
                  ? { ...p, isConnected: true }
                  : p
              ),
            }
          : null,
        players: state.players.map((p) =>
          p.id === action.payload.playerId
            ? { ...p, isConnected: true }
            : p
        ),
      };

    default:
      return state;
  }
}

// --- Context ---

const GameStateContext = createContext(null);
const GameActionsContext = createContext(null);

// --- Provider ---

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // Set up socket event listeners
  useEffect(() => {
    const socket = socketService.connect();

    function onRoomCreated(data) {
      dispatchRef.current({ type: ActionTypes.ROOM_CREATED, payload: data });
    }

    function onRoomJoined(data) {
      dispatchRef.current({ type: ActionTypes.ROOM_JOINED, payload: data });
    }

    function onPlayerJoined(data) {
      dispatchRef.current({ type: ActionTypes.PLAYER_JOINED, payload: data });
    }

    function onPlayerLeft(data) {
      dispatchRef.current({ type: ActionTypes.PLAYER_LEFT, payload: data });
    }

    function onGameStarted(data) {
      dispatchRef.current({ type: ActionTypes.GAME_STARTED, payload: data });
    }

    function onGameStateUpdate(data) {
      dispatchRef.current({ type: ActionTypes.GAME_STATE_UPDATE, payload: data });
    }

    function onTurnTimer(data) {
      dispatchRef.current({ type: ActionTypes.TURN_TIMER, payload: data });
    }

    function onUnoCalled(data) {
      dispatchRef.current({ type: ActionTypes.UNO_CALLED, payload: data });
    }

    function onGameOver(data) {
      dispatchRef.current({ type: ActionTypes.GAME_OVER, payload: data });
    }

    function onError(data) {
      dispatchRef.current({ type: ActionTypes.ERROR, payload: data });
    }

    function onPlayerDisconnected(data) {
      dispatchRef.current({ type: ActionTypes.PLAYER_DISCONNECTED, payload: data });
    }

    function onPlayerReconnected(data) {
      dispatchRef.current({ type: ActionTypes.PLAYER_RECONNECTED, payload: data });
    }

    socketService.on('room_created', onRoomCreated);
    socketService.on('room_joined', onRoomJoined);
    socketService.on('player_joined', onPlayerJoined);
    socketService.on('player_left', onPlayerLeft);
    socketService.on('game_started', onGameStarted);
    socketService.on('game_state_update', onGameStateUpdate);
    socketService.on('turn_timer', onTurnTimer);
    socketService.on('uno_called', onUnoCalled);
    socketService.on('game_over', onGameOver);
    socketService.on('error', onError);
    socketService.on('player_disconnected', onPlayerDisconnected);
    socketService.on('player_reconnected', onPlayerReconnected);

    return () => {
      socketService.off('room_created', onRoomCreated);
      socketService.off('room_joined', onRoomJoined);
      socketService.off('player_joined', onPlayerJoined);
      socketService.off('player_left', onPlayerLeft);
      socketService.off('game_started', onGameStarted);
      socketService.off('game_state_update', onGameStateUpdate);
      socketService.off('turn_timer', onTurnTimer);
      socketService.off('uno_called', onUnoCalled);
      socketService.off('game_over', onGameOver);
      socketService.off('error', onError);
      socketService.off('player_disconnected', onPlayerDisconnected);
      socketService.off('player_reconnected', onPlayerReconnected);
      socketService.disconnect();
    };
  }, []);

  // --- Actions ---

  const actions = useGameActionsImpl(dispatch);

  return (
    <GameStateContext.Provider value={state}>
      <GameActionsContext.Provider value={actions}>
        {children}
      </GameActionsContext.Provider>
    </GameStateContext.Provider>
  );
}

// --- Actions Implementation ---

function useGameActionsImpl(dispatch) {
  const createRoom = useCallback((playerName) => {
    socketService.createRoom(playerName);
  }, []);

  const joinRoom = useCallback((roomCode, playerName) => {
    socketService.joinRoom(roomCode, playerName);
  }, []);

  const startGame = useCallback(() => {
    socketService.startGame();
  }, []);

  const playCard = useCallback((cardId, chosenColor) => {
    socketService.playCard(cardId, chosenColor);
  }, []);

  const drawCard = useCallback(() => {
    socketService.drawCard();
  }, []);

  const stackCard = useCallback((cardId) => {
    socketService.stackCard(cardId);
  }, []);

  const acceptDraw = useCallback(() => {
    socketService.acceptDraw();
  }, []);

  const callUno = useCallback(() => {
    socketService.callUno();
  }, []);

  const challengeUno = useCallback((targetPlayerId) => {
    socketService.challengeUno(targetPlayerId);
  }, []);

  const colorRemap = useCallback((color, targetPlayerId) => {
    socketService.colorRemap(color, targetPlayerId);
  }, []);

  const leaveRoom = useCallback(() => {
    socketService.leaveRoom();
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_ERROR });
  }, [dispatch]);

  const resetGame = useCallback(() => {
    socketService.leaveRoom();
    dispatch({ type: ActionTypes.RESET });
  }, [dispatch]);

  return {
    createRoom,
    joinRoom,
    startGame,
    playCard,
    drawCard,
    stackCard,
    acceptDraw,
    callUno,
    challengeUno,
    colorRemap,
    leaveRoom,
    clearError,
    resetGame,
  };
}

// --- Hooks ---

/**
 * Hook to access the current game state.
 * Must be used within a GameProvider.
 */
export function useGameState() {
  const context = useContext(GameStateContext);
  if (context === null) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
}

/**
 * Hook to access game action dispatchers.
 * Must be used within a GameProvider.
 */
export function useGameActions() {
  const context = useContext(GameActionsContext);
  if (context === null) {
    throw new Error('useGameActions must be used within a GameProvider');
  }
  return context;
}

export { ActionTypes, gameReducer, initialState };
