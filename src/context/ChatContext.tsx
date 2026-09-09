import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';

const MAX_MESSAGE_LENGTH = 600;
// Kept in sync with api/chat.ts's MAX_HISTORY_MESSAGES — no need for these to
// match exactly (the server re-trims regardless), but sending less than the
// server accepts just wastes context for no benefit.
const MAX_HISTORY_TURNS_SENT = 8;

interface ChatContextValue {
  messages: ChatMessage[];
  isSending: boolean;
  sendMessage: (text: string) => void;
  clearConversation: () => void;
  maxMessageLength: number;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Deliberately React state only — no localStorage/sessionStorage. The
  // conversation is ephemeral: it lives only for this tab's session and is
  // gone on refresh, matching BitForge's privacy stance for the AI feature.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Mirrors `messages` synchronously so sendMessage can read the *current*
  // conversation without going through a state updater. Reading a value
  // back out of a setState updater's side effect (`setMessages(prev => {
  // sideVar = ...; return next })` then using `sideVar` right after) relies
  // on React calling that updater before the next line runs — timing React
  // does not actually guarantee. A ref kept in sync via effect has no such
  // ambiguity: by the time an event handler runs, it always holds exactly
  // what the component last rendered with.
  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback((rawText: string) => {
    const text = rawText.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text || isSending) return;

    // Cancel any still-in-flight request rather than letting two responses
    // race — also prevents duplicate submissions from piling up requests.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMessage: ChatMessage = { id: makeId(), role: 'user', text, timestamp: Date.now() };

    // Computed directly from the ref — deterministic, no dependency on when
    // React chooses to run the state updater below.
    const historyForRequest = messagesRef.current
      .slice(-MAX_HISTORY_TURNS_SENT)
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMessage]);

    setIsSending(true);
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ message: text, history: historyForRequest }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.reply) {
          const errorText: string =
            data?.message ?? 'The AI assistant is temporarily unavailable. Please try again later.';
          setMessages((cur) => [
            ...cur,
            { id: makeId(), role: 'assistant', text: errorText, isError: true, timestamp: Date.now() },
          ]);
          return;
        }
        setMessages((cur) => [
          ...cur,
          { id: makeId(), role: 'assistant', text: data.reply, timestamp: Date.now() },
        ]);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return; // superseded by a newer message
        setMessages((cur) => [
          ...cur,
          {
            id: makeId(),
            role: 'assistant',
            text: 'The AI assistant is temporarily unavailable. Please try again later.',
            isError: true,
            timestamp: Date.now(),
          },
        ]);
      })
      .finally(() => {
        if (abortRef.current === controller) setIsSending(false);
      });
  }, [isSending]);

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    setIsSending(false);
    setMessages([]);
  }, []);

  return (
    <ChatContext.Provider value={{ messages, isSending, sendMessage, clearConversation, maxMessageLength: MAX_MESSAGE_LENGTH }}>
      {children}
    </ChatContext.Provider>
  );
};

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}
