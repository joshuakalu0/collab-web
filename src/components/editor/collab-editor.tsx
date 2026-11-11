"use client";

import type { CollaboratorDescriptor, DocumentAccess, PresenceMember } from "@booster/collab-contracts";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { SocketProvider, useSocket } from "./socket-provider";
import { getCursorLocation, getSelectionOffsets, normalizePlainText, syncPlainTextValue } from "./selection";

type SocketUser = {
  email: string;
  id: string;
  image: string | null;
  name: string | null;
};

type CollabEditorProps = {
  access: DocumentAccess;
  currentUser: SocketUser;
  documentId: string;
  initialCollaborators: CollaboratorDescriptor[];
  initialContent: string;
  initialRevision: number;
};

function getPresenceSummary(presence: PresenceMember[], collaborators: CollaboratorDescriptor[]) {
  const byUser = new Map<string, PresenceMember>();
  const byCollaboratorId = new Map(collaborators.map((collaborator) => [collaborator.id, collaborator]));

  for (const member of presence) {
    if (!byUser.has(member.userId)) {
      byUser.set(member.userId, member);
    }
  }

  return Array.from(byUser.values()).map((member) => {
    const collaborator = byCollaboratorId.get(member.userId);

    return {
      access: collaborator?.access ?? member.access,
      email: member.email,
      id: member.userId,
      image: member.image,
      isOnline: true,
      name: member.name
    };
  });
}

function EditorSurface({
  access,
  currentUser,
  initialCollaborators
}: Pick<CollabEditorProps, "access" | "currentUser" | "initialCollaborators">) {
  const editorRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [charWidth, setCharWidth] = useState(8);
  const {
    connectionState,
    content,
    error,
    presence,
    publishChange,
    publishCursor,
    revision,
    saveStatus,
    savedAt,
    setLocalContent,
    setSaveStatus,
    socketId
  } = useSocket();

  useEffect(() => {
    if (measureRef.current) {
      setCharWidth(measureRef.current.getBoundingClientRect().width || 8);
    }
  }, []);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const selection = document.activeElement === editor ? getSelectionOffsets(editor) : null;
    syncPlainTextValue(editor, content, selection);
  }, [content]);

  const lineCount = Math.max(1, content.split("\n").length);
  const presenceSummary = useMemo(
    () => getPresenceSummary(presence, initialCollaborators),
    [initialCollaborators, presence]
  );
  const remoteCursors = useMemo(
    () =>
      presence.filter(
        (member) =>
          member.socketId !== socketId &&
          member.access === "EDIT" &&
          member.caretStart !== null &&
          member.caretEnd !== null
      ),
    [presence, socketId]
  );

  function handleEditorInput(event: FormEvent<HTMLDivElement>) {
    const editor = event.currentTarget;
    const selection = getSelectionOffsets(editor);
    const nextContent = normalizePlainText(editor.textContent ?? "");

    syncPlainTextValue(editor, nextContent, selection);
    setLocalContent(nextContent);

    if (access === "EDIT" && selection) {
      setSaveStatus("saving");
      publishChange({
        baseRevision: revision,
        content: nextContent,
        selectionEnd: selection.end,
        selectionStart: selection.start
      });
      publishCursor(selection);
    }
  }

  function syncCursorFromDom() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    publishCursor(getSelectionOffsets(editor));
  }

  return (
    <section className="editor-shell">
      <header className="editor-topbar">
        <div>
          <p className="eyebrow">Live room</p>
          <h2>Shared editor</h2>
        </div>
        <div className="topbar-status">
          <span
            className={`pill ${
              connectionState === "connected"
                ? "pill-green"
                : connectionState === "reconnecting"
                  ? "pill-amber"
                  : "pill-slate"
            }`}
          >
            {connectionState}
          </span>
          <span className={`pill ${saveStatus === "synced" ? "pill-green" : "pill-amber"}`}>
            {saveStatus === "synced"
              ? savedAt
                ? `saved ${new Date(savedAt).toLocaleTimeString()}`
                : "synced"
              : saveStatus}
          </span>
        </div>
      </header>
      <div className="presence-strip">
        {presenceSummary.map((member) => (
          <div className="presence-chip" key={member.id}>
            <span className={`presence-dot ${member.isOnline ? "presence-dot-online" : ""}`} />
            <span>{member.name ?? member.email}</span>
            <span className="presence-access">{member.access}</span>
          </div>
        ))}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="editor-frame">
        <span aria-hidden="true" className="measure-probe" ref={measureRef}>
          M
        </span>
        <div className="editor-grid">
          <div aria-hidden="true" className="editor-gutter">
            {Array.from({ length: lineCount }, (_, index) => (
              <span key={index + 1}>{index + 1}</span>
            ))}
          </div>
          <div className="editor-stage">
            <div className="editor-canvas" style={{ minHeight: `${Math.max(24 * lineCount, 420)}px` }}>
              {remoteCursors.map((cursor) => {
                const point = getCursorLocation(content, cursor.caretStart ?? 0);

                return (
                  <div
                    className="remote-caret"
                    key={cursor.socketId}
                    style={{
                      color: cursor.color,
                      left: `${point.column * charWidth + 16}px`,
                      top: `${point.line * 24 + 12}px`
                    }}
                    title={`${cursor.name ?? cursor.email} is here`}
                  >
                    <span>{cursor.name ?? cursor.email}</span>
                  </div>
                );
              })}
              <div
                className={`editor-surface ${access === "EDIT" ? "" : "editor-surface-readonly"}`}
                contentEditable={access === "EDIT" ? "plaintext-only" : false}
                onInput={handleEditorInput}
                onKeyUp={syncCursorFromDom}
                onMouseUp={syncCursorFromDom}
                ref={editorRef}
                role="textbox"
                spellCheck={false}
                suppressContentEditableWarning
              />
            </div>
          </div>
        </div>
      </div>
      <footer className="editor-footer">
        <p>
          Signed in as <strong>{currentUser.name ?? currentUser.email}</strong> with{" "}
          <strong>{access}</strong> access.
        </p>
        <p>
          The socket provider owns authorization, reconnects, presence, last-write-wins content sync, and delayed
          autosave signals.
        </p>
      </footer>
    </section>
  );
}

export function CollabEditor(props: CollabEditorProps) {
  return (
    <SocketProvider
      access={props.access}
      documentId={props.documentId}
      initialContent={props.initialContent}
      initialRevision={props.initialRevision}
    >
      <EditorSurface
        access={props.access}
        currentUser={props.currentUser}
        initialCollaborators={props.initialCollaborators}
      />
    </SocketProvider>
  );
}
