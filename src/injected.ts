// Runs in the page world. Subscribes to Gather's `playerSetsFollowTarget`
// event so that every time the local user clicks "フォロー" on someone, we
// also teleport them next to that player.

const TAG = "[GatherTeleport/page]";

type Player = {
  id?: string;
  x?: number;
  y?: number;
  map?: string;
};

type FollowEvent = {
  $case: "playerSetsFollowTarget";
  playerSetsFollowTarget: { followTarget: string };
};

type EventContext = { playerId: string };

type GatherGame = {
  teleport: (mapId: string, x: number, y: number) => void;
  getPlayer: (uid: string) => Player | undefined;
  getMyPlayer: () => Player;
  setFollowTarget: (followTarget: string, targetId?: string) => void;
  subscribeToEvent: (
    event: "playerSetsFollowTarget",
    handler: (data: FollowEvent, context: EventContext) => void,
  ) => () => void;
};

const FOLLOW_CLEAR_DELAY_MS = 1000;

declare global {
  interface Window {
    __gatherTeleportInspect?: () => unknown;
    game?: GatherGame;
  }
}

function getLocalPlayerId(game: GatherGame): string | null {
  return game.getMyPlayer().id ?? null;
}

function teleportToTarget(game: GatherGame, targetId: string): void {
  const target = game.getPlayer(targetId);
  if (!target) {
    console.warn(TAG, "game.getPlayer returned undefined for:", targetId);
    return;
  }
  const { map, x, y } = target;
  if (
    typeof map !== "string" ||
    typeof x !== "number" ||
    typeof y !== "number"
  ) {
    console.warn(TAG, "missing teleport args for target", targetId, {
      map,
      x,
      y,
    });
    return;
  }
  try {
    game.teleport(map, x, y);
    console.log(TAG, "teleported via follow event →", targetId, { map, x, y });
  } catch (err) {
    console.warn(TAG, "game.teleport threw:", err);
    return;
  }
  setTimeout(() => {
    try {
      game.setFollowTarget("");
      console.log(TAG, "follow cleared");
    } catch (err) {
      console.warn(TAG, "game.setFollowTarget threw:", err);
    }
  }, FOLLOW_CLEAR_DELAY_MS);
}

function handleFollowEvent(
  game: GatherGame,
  data: FollowEvent,
  context: EventContext,
): void {
  const targetId = data.playerSetsFollowTarget.followTarget;
  // Empty followTarget = "stop following" event (also fired by our own
  // setFollowTarget("") after the teleport). Nothing to do.
  if (!targetId) return;

  // The event is broadcast for any player in the space who changes their
  // follow target, not just the local user. Only react when WE initiated it.
  const myId = getLocalPlayerId(game);
  if (!myId) {
    console.warn(
      TAG,
      "could not resolve local player id — processing event without filter",
      { contextPlayerId: context.playerId },
    );
  } else if (context.playerId !== myId) {
    return;
  }

  console.log(TAG, "follow event → teleport", {
    targetId,
    contextPlayerId: context.playerId,
  });
  teleportToTarget(game, targetId);
}

let unsubscribe: (() => void) | null = null;

function start(): void {
  const game = window.game;
  if (!game?.subscribeToEvent) {
    setTimeout(start, 300);
    return;
  }
  if (unsubscribe) return;
  unsubscribe = game.subscribeToEvent(
    "playerSetsFollowTarget",
    (data, context) => {
      handleFollowEvent(game, data, context);
    },
  );
  console.log(
    TAG,
    'subscribed to "playerSetsFollowTarget" — clicking フォロー will now teleport.',
  );
}

window.__gatherTeleportInspect = () => {
  const game = window.game;
  if (!game) {
    console.log(TAG, "window.game not found");
    return null;
  }
  console.log(TAG, "game:", game);
  return { game };
};

start();

export {};
