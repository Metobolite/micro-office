"use client";

import { supabase } from "@/app/lib/supabase";
import type {
  TeamPresenceConnection,
  TeamPresencePayload,
  TeamPresenceStatus,
} from "@/app/types/presence";
import type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const AWAY_AFTER_MS = 5 * 60 * 1000;
const PRESENCE_PUBLISH_INTERVAL_MS = 7 * 1000;
const POINTER_ACTIVITY_INTERVAL_MS = 15 * 1000;

type PresenceSnapshot = {
  teamId: string | null;
  statusByUserId: Record<string, TeamPresenceStatus>;
  connection: TeamPresenceConnection;
  errorMessage: string | null;
};

type TeamPresenceContextValue = PresenceSnapshot & {
  isSynced: boolean;
};

type TeamPresenceProviderProps = {
  children: ReactNode;
  userId: string;
  teamIds: string[];
  defaultTeamId: string | null;
};

const TeamPresenceContext = createContext<TeamPresenceContextValue | null>(
  null,
);

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getTrackedStatuses(
  state: RealtimePresenceState<TeamPresencePayload>,
) {
  const statuses: Record<string, TeamPresenceStatus> = {};

  Object.entries(state).forEach(([userId, presences]) => {
    if (!userId || !Array.isArray(presences) || presences.length === 0) {
      return;
    }

    const isOnline = presences.some(
      (presence) => presence.status === "online",
    );
    const isAway = presences.some((presence) => presence.status === "away");

    if (isOnline) statuses[userId] = "online";
    else if (isAway) statuses[userId] = "away";
  });

  return statuses;
}

export function TeamPresenceProvider({
  children,
  userId,
  teamIds,
  defaultTeamId,
}: TeamPresenceProviderProps) {
  const searchParams = useSearchParams();
  const requestedTeamId = searchParams.get("teamId");
  const activeTeamId =
    requestedTeamId && teamIds.includes(requestedTeamId)
      ? requestedTeamId
      : defaultTeamId;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const desiredStatusRef = useRef<Exclude<TeamPresenceStatus, "offline">>(
    "online",
  );
  const lastActivityAtRef = useRef(Date.now());
  const lastPublishedAtRef = useRef(0);
  const lastPublishedStatusRef = useRef<Exclude<
    TeamPresenceStatus,
    "offline"
  > | null>(null);
  const pendingPublishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [snapshot, setSnapshot] = useState<PresenceSnapshot>({
    teamId: activeTeamId,
    statusByUserId: {},
    connection: activeTeamId ? "connecting" : "idle",
    errorMessage: null,
  });
  const [syncedTeamId, setSyncedTeamId] = useState<string | null>(null);

  const clearPendingPublish = useCallback(() => {
    if (pendingPublishTimerRef.current) {
      clearTimeout(pendingPublishTimerRef.current);
      pendingPublishTimerRef.current = null;
    }
  }, []);

  const publishStatus = useCallback(
    (status: Exclude<TeamPresenceStatus, "offline">, force = false) => {
      if (!force && desiredStatusRef.current === status) return;

      desiredStatusRef.current = status;

      if (!channelRef.current || !isSubscribedRef.current) return;

      const trackedChannel = channelRef.current;

      const sendStatus = () => {
        pendingPublishTimerRef.current = null;

        if (
          channelRef.current !== trackedChannel ||
          !isSubscribedRef.current
        ) {
          return;
        }

        const publishedStatus = desiredStatusRef.current;
        lastPublishedAtRef.current = Date.now();
        lastPublishedStatusRef.current = publishedStatus;

        void trackedChannel
          .track({
            status: publishedStatus,
            last_active_at: new Date(
              lastActivityAtRef.current,
            ).toISOString(),
          } satisfies TeamPresencePayload)
          .then((result) => {
            if (result === "ok" || channelRef.current !== trackedChannel) {
              return;
            }

            lastPublishedStatusRef.current = null;
            console.error("Presence status could not be published.");
          })
          .catch(() => {
            if (channelRef.current !== trackedChannel) return;

            lastPublishedStatusRef.current = null;
            console.error("Presence status could not be published.");
          });
      };

      if (!force && lastPublishedStatusRef.current === status) {
        clearPendingPublish();
        return;
      }

      clearPendingPublish();
      const publishDelay = force
        ? 0
        : Math.max(
            0,
            PRESENCE_PUBLISH_INTERVAL_MS -
              (Date.now() - lastPublishedAtRef.current),
          );

      if (publishDelay === 0) {
        sendStatus();
      } else {
        pendingPublishTimerRef.current = setTimeout(sendStatus, publishDelay);
      }
    },
    [clearPendingPublish],
  );

  useEffect(() => {
    let awayTimer: ReturnType<typeof setTimeout> | null = null;
    let lastPointerActivityAt = 0;

    const clearAwayTimer = () => {
      if (awayTimer) clearTimeout(awayTimer);
      awayTimer = null;
    };

    const scheduleAway = () => {
      clearAwayTimer();
      awayTimer = setTimeout(() => publishStatus("away"), AWAY_AFTER_MS);
    };

    const markActive = () => {
      if (document.visibilityState === "hidden") return;
      lastActivityAtRef.current = Date.now();
      publishStatus("online");
      scheduleAway();
    };

    const handlePointerMove = () => {
      const now = Date.now();
      if (now - lastPointerActivityAt < POINTER_ACTIVITY_INTERVAL_MS) return;

      lastPointerActivityAt = now;
      markActive();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearAwayTimer();
        publishStatus("away");
      } else {
        markActive();
      }
    };

    desiredStatusRef.current =
      document.visibilityState === "hidden" ? "away" : "online";
    if (document.visibilityState !== "hidden") markActive();

    const activityEvents: Array<keyof WindowEventMap> = [
      "focus",
      "keydown",
      "pointerdown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, markActive, { passive: true }),
    );
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearAwayTimer();
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, markActive),
      );
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [publishStatus]);

  useEffect(() => {
    let disposed = false;
    let channel: RealtimeChannel | null = null;

    channelRef.current = null;
    isSubscribedRef.current = false;
    clearPendingPublish();
    lastPublishedAtRef.current = 0;
    lastPublishedStatusRef.current = null;
    setSyncedTeamId(null);
    setSnapshot({
      teamId: activeTeamId,
      statusByUserId: {},
      connection: activeTeamId ? "connecting" : "idle",
      errorMessage: null,
    });

    if (!activeTeamId) return;

    const connect = async () => {
      try {
        const topic = `team:${activeTeamId}:presence`;
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(
            `Presence session could not be loaded: ${sessionError.message}`,
          );
        }

        if (!session?.access_token) {
          throw new Error("No authenticated session is available for Presence.");
        }

        // Realtime authorization is evaluated with this JWT. Passing it
        // explicitly prevents a private channel from briefly joining as anon.
        await supabase.realtime.setAuth(session.access_token);

        const { data: canAccess, error: accessError } = await supabase.rpc(
          "can_access_team_presence",
          { target_topic: topic },
        );

        if (accessError) {
          throw new Error(
            `Presence policy check failed: ${accessError.message}`,
          );
        }

        if (canAccess !== true) {
          throw new Error(
            "The current user is not authorized for this team Presence channel.",
          );
        }

        if (disposed) return;

        channel = supabase.channel(topic, {
          config: {
            private: true,
            presence: { key: userId, enabled: true },
          },
        });
        channelRef.current = channel;

        channel
          .on("presence", { event: "sync" }, () => {
            if (disposed || !channel) return;

            setSnapshot({
              teamId: activeTeamId,
              statusByUserId: getTrackedStatuses(
                channel.presenceState<TeamPresencePayload>(),
              ),
              connection: "connected",
              errorMessage: null,
            });
            setSyncedTeamId(activeTeamId);
          })
          .subscribe((status, error) => {
            if (disposed || !channel) return;

            if (status === "SUBSCRIBED") {
              isSubscribedRef.current = true;
              setSnapshot((current) => ({
                teamId: activeTeamId,
                statusByUserId:
                  current.teamId === activeTeamId
                    ? current.statusByUserId
                    : {},
                connection: "connected",
                errorMessage: null,
              }));
              publishStatus(desiredStatusRef.current, true);
              return;
            }

            if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              const errorMessage = getErrorMessage(
                error,
                status === "TIMED_OUT"
                  ? "The Presence connection timed out."
                  : status === "CLOSED"
                    ? "The Presence connection was closed."
                    : "The Presence channel could not be opened.",
              );

              console.error("Team Presence channel error", {
                status,
                error,
                teamId: activeTeamId,
                topic,
              });
              isSubscribedRef.current = false;
              setSyncedTeamId(null);
              setSnapshot({
                teamId: activeTeamId,
                statusByUserId: {},
                connection: "error",
                errorMessage,
              });
            }
          });
      } catch (error) {
        if (disposed) return;

        const errorMessage = getErrorMessage(
          error,
          "The Presence connection could not be started.",
        );

        console.error("Team Presence setup error", {
          error,
          teamId: activeTeamId,
        });

        setSnapshot({
          teamId: activeTeamId,
          statusByUserId: {},
          connection: "error",
          errorMessage,
        });
      }
    };

    void connect();

    return () => {
      disposed = true;
      isSubscribedRef.current = false;
      clearPendingPublish();

      if (channelRef.current === channel) channelRef.current = null;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [activeTeamId, clearPendingPublish, publishStatus, userId]);

  const value = useMemo<TeamPresenceContextValue>(() => {
    const isCurrentTeam = snapshot.teamId === activeTeamId;

    return {
      teamId: activeTeamId,
      statusByUserId: isCurrentTeam ? snapshot.statusByUserId : {},
      connection: isCurrentTeam
        ? snapshot.connection
        : activeTeamId
          ? "connecting"
          : "idle",
      errorMessage: isCurrentTeam ? snapshot.errorMessage : null,
      isSynced:
        isCurrentTeam &&
        snapshot.connection === "connected" &&
        syncedTeamId === activeTeamId,
    };
  }, [activeTeamId, snapshot, syncedTeamId]);

  return (
    <TeamPresenceContext.Provider value={value}>
      {children}
    </TeamPresenceContext.Provider>
  );
}

export function useTeamPresence(teamId: string) {
  const context = useContext(TeamPresenceContext);

  if (!context) {
    throw new Error("useTeamPresence must be used within TeamPresenceProvider");
  }

  if (context.teamId !== teamId) {
    return {
      statusByUserId: {},
      connection: "connecting" as const,
      errorMessage: null,
      isSynced: false,
    };
  }

  return {
    statusByUserId: context.statusByUserId,
    connection: context.connection,
    errorMessage: context.errorMessage,
    isSynced: context.isSynced,
  };
}
