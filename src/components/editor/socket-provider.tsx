"use client";

import type {
  DocSavedPayload,
  DocUpdatedPayload,
  DocumentAccess,
  PresenceMember,
  PresenceUpdatePayload,
  RoomSnapshotPayload
} from "@booster/collab-contracts";
import {
  clientEventNames,
  cursorMoveSchema,
  docChangeSchema,
  docSavedSchema,
  docUpdatedSchema,
  presenceUpdateSchema,
  roomJoinSchema,
  roomSnapshotSchema,
  serverEventNames
} from "@booster/collab-contracts";
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode
} from "react";
import { io, type Socket } from "socket.io-client";

type ClientToServerEvents = {
  [clientEventNames.cursorMove]: (payload: ReturnType<typeof cursorMoveSchema.parse>) => void;
  [clientEventNames.docChange]: (payload: ReturnType<typeof docChangeSchema.parse>) => void;
  [clientEventNames.roomJoin]: (payload: ReturnType<typeof roomJoinSchema.parse>) => void;
  [clientEventNames.roomLeave]: (payload: ReturnType<typeof roomJoinSchema.parse>) => void;
};

type ServerToClientEvents = {
  [serverEventNames.docSaved]: (payload: DocSavedPayload) => void;
  [serverEventNames.docUpdated]: (payload: DocUpdatedPayload) => void;
  [serverEventNames.presenceUpdate]: (payload: PresenceUpdatePayload) => void;
  [serverEventNames.roomSnapshot]: (payload: RoomSnapshotPayload) => void;
  [serverEventNames.socketError]: (payload: { code: string; detail: string }) => void;
};

type ConnectionState =
  | "authorizing"
  | "connected"
  | "connecting"
  | "disconnected"
  | "error"
  | "reconnecting";

type SocketContextValue = {
  connectionState: ConnectionState;
  content: string;
  error: string | null;
  presence: PresenceMember[];
  publishChange: (payload: {
    baseRevision: number;
    content: string;
    selectionEnd: number;
    selectionStart: number;
  }) => void;
  publishCursor: (selection: { end: number; start: number } | null) => void;
  revision: number;
  saveStatus: "live" | "saving" | "synced";
  savedAt: string | null;
  setLocalContent: (content: string) => void;
  setSaveStatus: (status: "live" | "saving" | "synced") => void;
  socketId: string | null;
};

const SocketContext = createContext<SocketContextValue | null>(null);

type SocketProviderProps = {
  access: DocumentAccess;
  children: ReactNode;
  documentId: string;
  initialContent: string;
  initialRevision: number;
};

export function SocketProvider({
  access,
  children,
  documentId,
  initialContent,
  initialRevision
}: SocketProviderProps) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<PresenceMember[]>([]);
  const [revision, setRevision] = useState(initialRevision);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"live" | "saving" | "synced">("synced");
  const [socketId, setSocketId] = useState<string | null>(null);

  const handleSnapshot = useEffectEvent((payload: RoomSnapshotPayload) => {
    setConnectionState("connected");
    setContent(payload.content);
    setPresence(payload.presence);
    setRevision(payload.revision);
    setSaveStatus("synced");
    setError(null);
  });

  const handlePresence = useEffectEvent((payload: PresenceUpdatePayload) => {
    setPresence(payload.presence);
  });

  const handleUpdate = useEffectEvent((payload: DocUpdatedPayload) => {
    setRevision(payload.revision);
    setSaveStatus(payload.actorSocketId === socketId ? "live" : "synced");

    if (payload.actorSocketId !== socketId) {
      setContent(payload.content);
    }
  });

  const handleSaved = useEffectEvent((payload: DocSavedPayload) => {
    setRevision(payload.revision);
    setSavedAt(payload.savedAt);
    setSaveStatus("synced");
  });

  useEffect(() => {
    let disposed = false;

    async function connect() {
      setConnectionState("authorizing");

      try {
        const response = await fetch(`/api/socket-token?documentId=${documentId}`, {
          cache: "no-store"
        });
        const envelope = await response.json();

        if (!response.ok) {
          throw new Error(envelope.detail ?? "Could not authorize the realtime session.");
        }

        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4001", {
          auth: {
            token: envelope.data.token
          },
          transports: ["websocket", "polling"]
        });

        socketRef.current = socket;

        socket.io.on("reconnect_attempt", () => {
          setConnectionState("reconnecting");
        });

        socket.on("connect", () => {
          if (disposed) {
            return;
          }

          setSocketId(socket.id);
          setConnectionState("connected");
          socket.emit(
            clientEventNames.roomJoin,
            roomJoinSchema.parse({
              documentId
            })
          );
        });

        socket.on("disconnect", () => {
          setConnectionState("disconnected");
        });

        socket.on("connect_error", (connectionError) => {
          setConnectionState("error");
          setError(connectionError.message);
        });

        socket.on(serverEventNames.roomSnapshot, (payload) => {
          handleSnapshot(roomSnapshotSchema.parse(payload));
        });

        socket.on(serverEventNames.presenceUpdate, (payload) => {
          handlePresence(presenceUpdateSchema.parse(payload));
        });

        socket.on(serverEventNames.docUpdated, (payload) => {
          handleUpdate(docUpdatedSchema.parse(payload));
        });

        socket.on(serverEventNames.docSaved, (payload) => {
          handleSaved(docSavedSchema.parse(payload));
        });

        socket.on(serverEventNames.socketError, (payload) => {
          setError(payload.detail);
        });
      } catch (connectionError) {
        setConnectionState("error");
        setError(connectionError instanceof Error ? connectionError.message : "Could not connect.");
      }
    }

    void connect();

    return () => {
      disposed = true;
      const socket = socketRef.current;
      if (socket) {
        socket.emit(
          clientEventNames.roomLeave,
          roomJoinSchema.parse({
            documentId
          })
        );
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [documentId, handlePresence, handleSaved, handleSnapshot, handleUpdate]);

  const value: SocketContextValue = {
    connectionState,
    content,
    error,
    presence,
    publishChange(payload) {
      if (access !== "EDIT" || !socketRef.current?.connected) {
        return;
      }

      socketRef.current.emit(
        clientEventNames.docChange,
        docChangeSchema.parse({
          baseRevision: payload.baseRevision,
          content: payload.content,
          documentId,
          selectionEnd: payload.selectionEnd,
          selectionStart: payload.selectionStart
        })
      );
    },
    publishCursor(selection) {
      if (!selection || access !== "EDIT" || !socketRef.current?.connected) {
        return;
      }

      socketRef.current.emit(
        clientEventNames.cursorMove,
        cursorMoveSchema.parse({
          caretEnd: selection.end,
          caretStart: selection.start,
          documentId
        })
      );
    },
    revision,
    savedAt,
    saveStatus,
    setLocalContent: setContent,
    setSaveStatus,
    socketId
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider.");
  }

  return context;
}
