/**
 * GameEngine — core game logic for UNO No Mercy.
 * Validates plays, resolves actions, detects wins.
 */

import { createDeck, shuffle, deal, findStartingCard, drawFromPile } from './deckManager.js';
import { CARDS_PER_PLAYER, CARD_POINTS, GameError } from './types.js';
import { advanceTurn, skipPlayer, skipAllExceptCurrent, reverseDirection, getNextPlayer } from './turnManager.js';

/**
 * Card types that are always playable (wild-type cards).
 * These can be played regardless of the active color or top discard.
 */
const WILD_TYPES = ['wild', 'wild_draw4', 'skip_everyone', 'draw6', 'draw10', 'color_remap'];

/**
 * Mercy Rule: if a player holds 25 or more cards, they are eliminated.
 */
const MERCY_RULE_LIMIT = 25;

/**
 * Check and apply the Mercy Rule: eliminate any player with 25+ cards.
 * Redistributes their cards to the draw pile.
 * If only 1 player remains, that player wins.
 * @param {import('./types.js').GameState} state
 * @returns {import('./types.js').GameState}
 */
function applyMercyRule(state) {
  let newState = { ...state };
  let eliminated = false;

  do {
    eliminated = false;
    const elimIdx = newState.players.findIndex(p => p.hand.length >= MERCY_RULE_LIMIT);
    if (elimIdx === -1) break;

    eliminated = true;
    const elimPlayer = newState.players[elimIdx];

    // Add eliminated player's cards back to draw pile
    const newDrawPile = shuffle([...newState.drawPile, ...elimPlayer.hand]);

    // Remove the player from the game
    const newPlayers = newState.players.filter((_, i) => i !== elimIdx);

    // Adjust currentPlayerIndex
    let newCurrentIdx = newState.currentPlayerIndex;
    if (elimIdx < newCurrentIdx) {
      newCurrentIdx--;
    } else if (newCurrentIdx >= newPlayers.length) {
      newCurrentIdx = 0;
    }

    newState = {
      ...newState,
      players: newPlayers,
      drawPile: newDrawPile,
      currentPlayerIndex: newCurrentIdx,
    };

    // If only 1 player remains, they win
    if (newPlayers.length === 1) {
      newState.status = 'finished';
      newState.winner = newPlayers[0].id;
      newState.scores = { [newPlayers[0].id]: 0 };
      break;
    }
  } while (eliminated);

  return newState;
}

/**
 * Stacking rules matrix.
 * Maps the type of the last card in the stack chain to the types that can be stacked on top.
 */
const STACKING_RULES = {
  draw2: ['draw2'],
  wild_draw4: ['wild_draw4', 'draw6', 'draw10'],
  draw6: ['draw6', 'draw10'],
  draw10: ['draw10'],
};

/**
 * Initialize a new game from a list of players.
 * Shuffles the deck, deals 7 cards to each player, finds a valid starting card,
 * picks a random first player, and sets direction to clockwise.
 *
 * @param {Array<{ id: string, name: string, isHost: boolean }>} players
 * @returns {import('./types.js').GameState}
 */
export function initializeGame(players) {
  // Create and shuffle the deck
  const deck = createDeck();
  const shuffledDeck = shuffle(deck);

  // Deal cards to each player
  const { hands, remaining } = deal(shuffledDeck, players.length, CARDS_PER_PLAYER);

  // Find a valid starting card (must be a number card)
  const { startCard, remaining: drawPile } = findStartingCard(remaining);

  // Build player state objects
  const playerStates = players.map((player, index) => ({
    id: player.id,
    name: player.name,
    hand: hands[index],
    isConnected: true,
    isHost: player.isHost,
    hasCalledUno: false,
    disconnectedAt: null,
  }));

  // Pick a random first player
  const currentPlayerIndex = Math.floor(Math.random() * players.length);

  return {
    roomCode: '',
    status: 'in_progress',
    players: playerStates,
    currentPlayerIndex,
    direction: 1,
    drawPile,
    discardPile: [startCard],
    activeColor: startCard.color,
    stackChain: null,
    turnTimer: null,
    winner: null,
    scores: null,
  };
}

/**
 * Determine if a card is playable given the current game state.
 *
 * Normal play rules (when stackChain is null):
 * 1. Card matches the active color, OR
 * 2. Card is a number card matching the top discard's value, OR
 * 3. Card is an action card matching the top discard's type, OR
 * 4. Card is a Wild or Wild Draw 4, OR
 * 5. Card is a Skip Everyone, Draw 6, Draw 10, or Color Remap (wild-type)
 *
 * During a stack chain (stackChain is not null):
 * Only cards that match the stacking rules for the last card in the chain are playable.
 *
 * @param {import('./types.js').Card} card - The card to check
 * @param {import('./types.js').Card} topDiscard - The top card of the discard pile
 * @param {import('./types.js').Color} activeColor - The currently active color
 * @param {import('./types.js').StackChain | null} stackChain - Active stack chain, or null
 * @returns {boolean} Whether the card is playable
 */
export function isPlayable(card, topDiscard, activeColor, stackChain) {
  // During a stack chain, only stacking-valid cards are playable
  if (stackChain !== null) {
    const lastCard = stackChain.cards[stackChain.cards.length - 1];
    const allowedTypes = STACKING_RULES[lastCard.type];

    // If the last card's type isn't in the stacking rules, nothing can be stacked
    if (!allowedTypes) {
      return false;
    }

    return allowedTypes.includes(card.type);
  }

  // Normal play rules (no stack chain)

  // Rule 4 & 5: Wild-type cards are always playable
  if (WILD_TYPES.includes(card.type)) {
    return true;
  }

  // Rule 1: Color match
  if (card.color !== null && card.color === activeColor) {
    return true;
  }

  // Rule 2: Number match (both must be number cards)
  if (card.type === 'number' && topDiscard.type === 'number' && card.value === topDiscard.value) {
    return true;
  }

  // Rule 3: Type match for action cards (same type, e.g., skip on skip)
  if (card.type !== 'number' && card.type === topDiscard.type) {
    return true;
  }

  return false;
}

/**
 * Filter a hand for all playable cards given the current game state.
 *
 * @param {import('./types.js').Card[]} hand - The player's hand
 * @param {import('./types.js').Card} topDiscard - The top card of the discard pile
 * @param {import('./types.js').Color} activeColor - The currently active color
 * @param {import('./types.js').StackChain | null} stackChain - Active stack chain, or null
 * @returns {import('./types.js').Card[]} Array of playable cards from the hand
 */
export function getPlayableCards(hand, topDiscard, activeColor, stackChain) {
  return hand.filter((card) => isPlayable(card, topDiscard, activeColor, stackChain));
}


/**
 * Play a card from the current player's hand.
 * Validates turn, card ownership, and playability.
 * Resolves action effects and advances the turn accordingly.
 *
 * @param {import('./types.js').GameState} state - Current game state
 * @param {string} playerId - ID of the player attempting to play
 * @param {string} cardId - ID of the card to play
 * @param {import('./types.js').Color} [chosenColor] - Color choice for wild-type cards
 * @returns {{ ok: true, value: import('./types.js').GameState } | { ok: false, error: string }}
 */
export function playCard(state, playerId, cardId, chosenColor) {
  // Validate: it's the player's turn
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { ok: false, error: GameError.NOT_YOUR_TURN };
  }

  // Find the card in the player's hand
  const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { ok: false, error: GameError.INVALID_PLAY };
  }

  const card = currentPlayer.hand[cardIndex];
  const topDiscard = state.discardPile[state.discardPile.length - 1];

  // Validate: card is playable
  if (!isPlayable(card, topDiscard, state.activeColor, state.stackChain)) {
    return { ok: false, error: GameError.INVALID_PLAY };
  }

  // Remove card from hand
  const newHand = [...currentPlayer.hand.slice(0, cardIndex), ...currentPlayer.hand.slice(cardIndex + 1)];
  const updatedPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );

  // Place card on discard pile
  const newDiscardPile = [...state.discardPile, card];

  // Build intermediate state
  let newState = {
    ...state,
    players: updatedPlayers,
    discardPile: newDiscardPile,
    stackChain: null,
  };

  // Win detection: if the player's hand is now empty, the game is over
  if (newHand.length === 0) {
    newState.status = 'finished';
    newState.winner = playerId;
    // Calculate scores for all remaining players
    const scores = {};
    for (const player of newState.players) {
      if (player.id === playerId) {
        scores[player.id] = 0;
      } else {
        let score = 0;
        for (const c of player.hand) {
          if (c.type === 'number') {
            score += c.value;
          } else {
            score += CARD_POINTS[c.type] || 0;
          }
        }
        scores[player.id] = score;
      }
    }
    newState.scores = scores;
    // Do NOT advance the turn — game is over
    return { ok: true, value: newState };
  }

  // Resolve action effects based on card type
  switch (card.type) {
    case 'number': {
      newState = { ...newState, activeColor: card.color };

      if (card.value === 7) {
        // 7-swap: swap hand with a chosen target player
        // If chosenColor is used to pass targetPlayerId (reuse the param), handle it
        // We'll use a separate function swapSeven for this
        // For now, mark the state as needing a swap target — the socket handler will handle it
        // If a targetPlayerId was passed via the 4th argument (overloaded), do the swap
        if (chosenColor && newState.players.find(p => p.id === chosenColor)) {
          // chosenColor is actually the targetPlayerId for 7-swap
          const targetId = chosenColor;
          const currentIdx = newState.currentPlayerIndex;
          const targetIdx = newState.players.findIndex(p => p.id === targetId);
          if (targetIdx !== -1 && targetIdx !== currentIdx) {
            const currentHand = [...newState.players[currentIdx].hand];
            const targetHand = [...newState.players[targetIdx].hand];
            newState = {
              ...newState,
              players: newState.players.map((p, i) => {
                if (i === currentIdx) return { ...p, hand: targetHand };
                if (i === targetIdx) return { ...p, hand: currentHand };
                return p;
              }),
            };
          }
        }
        newState = advanceTurn(newState);
      } else if (card.value === 0) {
        // 0-rotate: all players pass their hand to the next player in direction
        const players = newState.players;
        const count = players.length;
        const dir = newState.direction;
        const newHands = new Array(count);
        for (let i = 0; i < count; i++) {
          // Each player receives the hand from the previous player (opposite of direction)
          const fromIdx = ((i - dir) % count + count) % count;
          newHands[i] = [...players[fromIdx].hand];
        }
        newState = {
          ...newState,
          players: newState.players.map((p, i) => ({ ...p, hand: newHands[i] })),
        };
        newState = advanceTurn(newState);
      } else {
        newState = advanceTurn(newState);
      }
      break;
    }

    case 'skip': {
      // Skip: update active color, skip next player
      newState = { ...newState, activeColor: card.color };
      newState = skipPlayer(newState);
      break;
    }

    case 'reverse': {
      // Reverse: update active color, reverse direction, then advance turn
      newState = { ...newState, activeColor: card.color };
      newState = reverseDirection(newState);
      newState = advanceTurn(newState);
      break;
    }

    case 'draw2': {
      // Draw 2: start a stack chain with cumulativeDrawCount=2
      const nextPlayerIndex = getNextPlayer(newState);
      const pendingPlayerId = newState.players[nextPlayerIndex].id;
      newState = {
        ...newState,
        stackChain: {
          cumulativeDrawCount: 2,
          pendingPlayerId,
          cards: [card],
        },
        activeColor: card.color || state.activeColor,
      };
      break;
    }

    case 'wild': {
      // Wild: set activeColor to chosenColor, advance turn
      newState = {
        ...newState,
        activeColor: chosenColor || state.activeColor,
      };
      newState = advanceTurn(newState);
      break;
    }

    case 'wild_draw4': {
      // Wild Draw 4: set activeColor to chosenColor, start stack chain with cumulativeDrawCount=4
      const nextIdx = getNextPlayer(newState);
      const pendingId = newState.players[nextIdx].id;
      newState = {
        ...newState,
        activeColor: chosenColor || state.activeColor,
        stackChain: {
          cumulativeDrawCount: 4,
          pendingPlayerId: pendingId,
          cards: [card],
        },
      };
      break;
    }

    case 'skip_everyone': {
      // Skip Everyone: current player gets another turn
      newState = {
        ...newState,
        activeColor: chosenColor || state.activeColor,
      };
      newState = skipAllExceptCurrent(newState);
      break;
    }

    case 'draw6': {
      // Draw 6: set activeColor to chosenColor, start stack chain with cumulativeDrawCount=6
      const nextIdx6 = getNextPlayer(newState);
      const pendingId6 = newState.players[nextIdx6].id;
      newState = {
        ...newState,
        activeColor: chosenColor || state.activeColor,
        stackChain: {
          cumulativeDrawCount: 6,
          pendingPlayerId: pendingId6,
          cards: [card],
        },
      };
      break;
    }

    case 'draw10': {
      // Draw 10: set activeColor to chosenColor, start stack chain with cumulativeDrawCount=10
      const nextIdx10 = getNextPlayer(newState);
      const pendingId10 = newState.players[nextIdx10].id;
      newState = {
        ...newState,
        activeColor: chosenColor || state.activeColor,
        stackChain: {
          cumulativeDrawCount: 10,
          pendingPlayerId: pendingId10,
          cards: [card],
        },
      };
      break;
    }

    case 'color_remap': {
      // Color Remap: handled separately (task 6.8)
      // For now, just set active color and advance turn
      newState = {
        ...newState,
        activeColor: chosenColor || state.activeColor,
      };
      newState = advanceTurn(newState);
      break;
    }

    default: {
      // Unknown card type — just advance turn
      newState = advanceTurn(newState);
      break;
    }
  }

  return { ok: true, value: newState };
}

/**
 * Execute a Color Remap action: swap cards of a selected color between the current player and a target player.
 *
 * Rules:
 * - The playing player must hold at least 1 card of the selected color.
 * - The target must be a different player in the game.
 * - Both players swap min(M, N) cards of that color, where M = playing player's count, N = target's count.
 * - If the target has fewer cards of the color (N < M), the playing player keeps the excess.
 * - The turn advances after the swap.
 *
 * @param {import('./types.js').GameState} state - Current game state
 * @param {string} playerId - ID of the player performing the remap
 * @param {import('./types.js').Color} color - The color to swap
 * @param {string} targetPlayerId - ID of the target player to swap with
 * @returns {{ ok: true, value: import('./types.js').GameState } | { ok: false, error: string }}
 */
export function colorRemap(state, playerId, color, targetPlayerId) {
  // Validate: it's the player's turn
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { ok: false, error: GameError.NOT_YOUR_TURN };
  }

  // Validate: targetPlayerId is a different player in the game
  if (targetPlayerId === playerId) {
    return { ok: false, error: GameError.INVALID_COLOR_REMAP };
  }
  const targetIndex = state.players.findIndex((p) => p.id === targetPlayerId);
  if (targetIndex === -1) {
    return { ok: false, error: GameError.INVALID_COLOR_REMAP };
  }

  // Get cards of the selected color from the playing player's hand
  const playerColorCards = currentPlayer.hand.filter((c) => c.color === color);
  const playerNonColorCards = currentPlayer.hand.filter((c) => c.color !== color);

  // Validate: player holds at least 1 card of the selected color
  if (playerColorCards.length === 0) {
    return { ok: false, error: GameError.INVALID_COLOR_REMAP };
  }

  // Get cards of the selected color from the target player's hand
  const targetPlayer = state.players[targetIndex];
  const targetColorCards = targetPlayer.hand.filter((c) => c.color === color);
  const targetNonColorCards = targetPlayer.hand.filter((c) => c.color !== color);

  // Calculate swap count: min(M, N)
  const M = playerColorCards.length;
  const N = targetColorCards.length;
  const swapCount = Math.min(M, N);

  // Perform the swap:
  // Playing player gives swapCount cards of that color to target, receives swapCount from target
  const cardsGivenToTarget = playerColorCards.slice(0, swapCount);
  const cardsKeptByPlayer = playerColorCards.slice(swapCount); // excess if M > N
  const cardsReceivedFromTarget = targetColorCards.slice(0, swapCount);
  const cardsKeptByTarget = targetColorCards.slice(swapCount); // excess if N > M

  // Build new hands
  const newPlayerHand = [...playerNonColorCards, ...cardsKeptByPlayer, ...cardsReceivedFromTarget];
  const newTargetHand = [...targetNonColorCards, ...cardsKeptByTarget, ...cardsGivenToTarget];

  // Update players
  const updatedPlayers = state.players.map((p, i) => {
    if (i === state.currentPlayerIndex) {
      return { ...p, hand: newPlayerHand };
    }
    if (i === targetIndex) {
      return { ...p, hand: newTargetHand };
    }
    return p;
  });

  // Build new state and advance turn
  let newState = {
    ...state,
    players: updatedPlayers,
  };
  newState = advanceTurn(newState);

  return { ok: true, value: newState };
}

/**
 * Draw penalty values for each draw card type.
 */
const DRAW_PENALTY = {
  draw2: 2,
  wild_draw4: 4,
  draw6: 6,
  draw10: 10,
};

/**
 * Stack a card onto an active stack chain.
 * Validates that there is an active stack chain, the player is the pending player,
 * the card is in their hand, and the card is a valid stacking card.
 *
 * @param {import('./types.js').GameState} state - Current game state
 * @param {string} playerId - ID of the player attempting to stack
 * @param {string} cardId - ID of the card to stack
 * @returns {{ ok: true, value: import('./types.js').GameState } | { ok: false, error: string }}
 */
export function stackCard(state, playerId, cardId) {
  // Validate: there IS an active stack chain and the player is the pendingPlayerId
  if (state.stackChain === null || state.stackChain.pendingPlayerId !== playerId) {
    return { ok: false, error: GameError.CANNOT_STACK };
  }

  // Find the player
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  const player = state.players[playerIndex];

  // Find the card in the player's hand
  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { ok: false, error: GameError.INVALID_PLAY };
  }

  const card = player.hand[cardIndex];
  const topDiscard = state.discardPile[state.discardPile.length - 1];

  // Validate: the card is a valid stacking card
  if (!isPlayable(card, topDiscard, state.activeColor, state.stackChain)) {
    return { ok: false, error: GameError.INVALID_PLAY };
  }

  // Remove card from hand
  const newHand = [...player.hand.slice(0, cardIndex), ...player.hand.slice(cardIndex + 1)];
  const updatedPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, hand: newHand } : p
  );

  // Update cumulative draw count
  const penalty = DRAW_PENALTY[card.type] || 0;
  const newCumulativeDrawCount = state.stackChain.cumulativeDrawCount + penalty;

  // Add card to stack chain cards array
  const newStackCards = [...state.stackChain.cards, card];

  // Place card on discard pile
  const newDiscardPile = [...state.discardPile, card];

  // Set pendingPlayerId to the NEXT player in direction (use getNextPlayer)
  // We need to compute the next player from the pending player's position
  const tempState = {
    ...state,
    players: updatedPlayers,
    currentPlayerIndex: playerIndex,
  };
  const nextPlayerIndex = getNextPlayer(tempState);
  const nextPendingPlayerId = state.players[nextPlayerIndex].id;

  const newState = {
    ...state,
    players: updatedPlayers,
    discardPile: newDiscardPile,
    stackChain: {
      cumulativeDrawCount: newCumulativeDrawCount,
      pendingPlayerId: nextPendingPlayerId,
      cards: newStackCards,
    },
  };

  return { ok: true, value: newState };
}

/**
 * Accept the draw penalty from an active stack chain.
 * Forces the player to draw the cumulative count, clears the stack chain,
 * and skips the player's turn.
 *
 * @param {import('./types.js').GameState} state - Current game state
 * @param {string} playerId - ID of the player accepting the draw
 * @returns {{ ok: true, value: import('./types.js').GameState } | { ok: false, error: string }}
 */
export function acceptDraw(state, playerId) {
  // Validate: there IS an active stack chain and the player is the pendingPlayerId
  if (state.stackChain === null || state.stackChain.pendingPlayerId !== playerId) {
    return { ok: false, error: GameError.CANNOT_STACK };
  }

  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  const player = state.players[playerIndex];

  // Force the player to draw cumulativeDrawCount cards from the draw pile
  const { drawn, newDrawPile, newDiscardPile } = drawFromPile(
    state.drawPile,
    state.discardPile,
    state.stackChain.cumulativeDrawCount
  );

  // Add drawn cards to the player's hand
  const newHand = [...player.hand, ...drawn];
  const updatedPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, hand: newHand } : p
  );

  // Clear the stack chain and build intermediate state
  // Set currentPlayerIndex to the accepting player so advanceTurn skips them
  let newState = {
    ...state,
    players: updatedPlayers,
    drawPile: newDrawPile,
    discardPile: newDiscardPile,
    stackChain: null,
    currentPlayerIndex: playerIndex,
  };

  // Skip the player's turn (advance to next player)
  newState = advanceTurn(newState);

  // Apply Mercy Rule: eliminate players with 25+ cards
  newState = applyMercyRule(newState);

  return { ok: true, value: newState };
}

/**
 * Handle a timeout for a player whose turn timer has expired.
 * If there's an active stack chain and the player is the pending player,
 * resolves the stack chain (force draw cumulative total, skip turn).
 * Otherwise, auto-draws a card for the player and advances the turn
 * regardless of whether the drawn card is playable.
 *
 * @param {import('./types.js').GameState} state - Current game state
 * @param {string} playerId - ID of the player who timed out
 * @returns {{ ok: true, value: import('./types.js').GameState } | { ok: false, error: string }}
 */
export function handleTimeout(state, playerId) {
  // Validate: it's the player's turn
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { ok: false, error: GameError.NOT_YOUR_TURN };
  }

  // If there's an active stack chain and this player is the pending player
  if (state.stackChain !== null && state.stackChain.pendingPlayerId === playerId) {
    const drawCount = state.stackChain.cumulativeDrawCount;

    // Force draw the cumulative total
    const { drawn, newDrawPile, newDiscardPile } = drawFromPile(state.drawPile, state.discardPile, drawCount);

    // Add drawn cards to the player's hand
    const newHand = [...currentPlayer.hand, ...drawn];
    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
    );

    // Clear stack chain, advance turn (skip the timed-out player's turn)
    let newState = {
      ...state,
      players: updatedPlayers,
      drawPile: newDrawPile,
      discardPile: newDiscardPile,
      stackChain: null,
    };
    newState = advanceTurn(newState);

    // Apply Mercy Rule
    newState = applyMercyRule(newState);

    return { ok: true, value: newState };
  }

  // Otherwise: auto-draw a card and advance turn regardless of playability
  // Handle case where both piles are exhausted
  if (state.drawPile.length === 0 && state.discardPile.length <= 1) {
    const newState = advanceTurn(state);
    return { ok: true, value: newState };
  }

  const { drawn, newDrawPile, newDiscardPile } = drawFromPile(state.drawPile, state.discardPile, 1);

  // Add drawn card to the player's hand (if any was drawn)
  const newHand = [...currentPlayer.hand, ...drawn];
  const updatedPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );

  // Always advance turn on timeout (regardless of playability)
  let newState = {
    ...state,
    players: updatedPlayers,
    drawPile: newDrawPile,
    discardPile: newDiscardPile,
  };
  newState = advanceTurn(newState);

  // Apply Mercy Rule
  newState = applyMercyRule(newState);

  return { ok: true, value: newState };
}

/**
 * Draw a card from the draw pile for the current player.
 * Validates that it's the player's turn and there's no active stack chain.
 * Checks if the drawn card is playable — if so, keeps the turn on the same player;
 * otherwise, automatically advances the turn.
 *
 * @param {import('./types.js').GameState} state - Current game state
 * @param {string} playerId - ID of the player attempting to draw
 * @returns {{ ok: true, value: { state: import('./types.js').GameState, drawnCard: import('./types.js').Card | null, drawnCardPlayable: boolean } } | { ok: false, error: string }}
 */
export function drawCard(state, playerId) {
  // Validate: it's the player's turn
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return { ok: false, error: GameError.NOT_YOUR_TURN };
  }

  // Validate: no active stack chain (player must stack or accept, not draw)
  if (state.stackChain !== null) {
    return { ok: false, error: GameError.CANNOT_STACK };
  }

  // Handle case where both piles are exhausted
  if (state.drawPile.length === 0 && state.discardPile.length <= 1) {
    // No cards available to draw — auto-pass the turn
    const newState = advanceTurn(state);
    return { ok: true, value: { state: newState, drawnCard: null, drawnCardPlayable: false } };
  }

  // Draw one card from the draw pile (handles reshuffle internally)
  const { drawn, newDrawPile, newDiscardPile } = drawFromPile(state.drawPile, state.discardPile, 1);

  // If no card was drawn (shouldn't happen given the check above, but be safe)
  if (drawn.length === 0) {
    const newState = advanceTurn(state);
    return { ok: true, value: { state: newState, drawnCard: null, drawnCardPlayable: false } };
  }

  const drawnCard = drawn[0];

  // Add drawn card to the player's hand
  const newHand = [...currentPlayer.hand, drawnCard];
  const updatedPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );

  // Check if the drawn card is playable against the current top discard and active color
  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const drawnCardPlayable = isPlayable(drawnCard, topDiscard, state.activeColor, null);

  // Build new state
  let newState = {
    ...state,
    players: updatedPlayers,
    drawPile: newDrawPile,
    discardPile: newDiscardPile,
  };

  // If the drawn card is NOT playable, automatically advance the turn
  if (!drawnCardPlayable) {
    newState = advanceTurn(newState);
  }
  // If the drawn card IS playable, keep the turn on the same player

  return { ok: true, value: { state: newState, drawnCard, drawnCardPlayable } };
}

/**
 * Call UNO for a player who is about to play their second-to-last card.
 * Validates that the player has exactly 2 cards in their hand.
 *
 * @param {import('./types.js').GameState} state - Current game state
 * @param {string} playerId - ID of the player calling UNO
 * @returns {{ ok: true, value: import('./types.js').GameState } | { ok: false, error: string }}
 */
export function callUno(state, playerId) {
  // Find the player
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return { ok: false, error: GameError.INVALID_PLAY };
  }

  const player = state.players[playerIndex];

  // Validate: the player has exactly 2 cards in their hand
  if (player.hand.length !== 2) {
    return { ok: false, error: GameError.INVALID_PLAY };
  }

  // Set hasCalledUno = true on the player
  const updatedPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, hasCalledUno: true } : p
  );

  return { ok: true, value: { ...state, players: updatedPlayers } };
}

/**
 * Challenge a player who has 1 card and hasn't called UNO.
 * If valid: force target to draw 4 cards and reset hasCalledUno.
 * If invalid (target called UNO or doesn't have 1 card): return error.
 *
 * @param {import('./types.js').GameState} state - Current game state
 * @param {string} challengerId - ID of the player issuing the challenge
 * @param {string} targetId - ID of the player being challenged
 * @returns {{ ok: true, value: import('./types.js').GameState } | { ok: false, error: string }}
 */
export function challengeUno(state, challengerId, targetId) {
  // Find the target player
  const targetIndex = state.players.findIndex((p) => p.id === targetId);
  if (targetIndex === -1) {
    return { ok: false, error: GameError.INVALID_PLAY };
  }

  const target = state.players[targetIndex];

  // Validate: target has exactly 1 card AND has NOT called UNO
  if (target.hand.length !== 1 || target.hasCalledUno) {
    return { ok: false, error: GameError.INVALID_PLAY };
  }

  // Force target to draw 4 cards
  const { drawn, newDrawPile, newDiscardPile } = drawFromPile(state.drawPile, state.discardPile, 4);

  // Add drawn cards to the target's hand and reset hasCalledUno
  const newTargetHand = [...target.hand, ...drawn];
  const updatedPlayers = state.players.map((p, i) =>
    i === targetIndex ? { ...p, hand: newTargetHand, hasCalledUno: false } : p
  );

  const newState = {
    ...state,
    players: updatedPlayers,
    drawPile: newDrawPile,
    discardPile: newDiscardPile,
  };

  // Apply Mercy Rule: eliminate players with 25+ cards
  const finalState = applyMercyRule(newState);

  return { ok: true, value: finalState };
}

/**
 * Calculate the score for a set of cards.
 * Number cards = face value (0-9), action cards = 20 points, wild-type cards = 50 points.
 *
 * @param {import('./types.js').Card[]} cards - Cards to score
 * @returns {number} Total point value
 */
export function calculateScore(cards) {
  let score = 0;
  for (const card of cards) {
    if (card.type === 'number') {
      score += card.value;
    } else {
      score += CARD_POINTS[card.type] || 0;
    }
  }
  return score;
}
