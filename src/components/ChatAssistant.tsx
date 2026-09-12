import React, { useEffect, useRef, useState } from 'react';
import {
  Bot, X, Send, Copy, Check, RotateCcw, AlertTriangle, Loader2,
  Binary, Calculator, Cpu, SquareSigma, Type,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';
import { useAutoResetTimer } from '../hooks/useAutoResetTimer';
import { copyTextSafe } from '../utils/shareUtils';
import { FormattedAiMessage } from './FormattedAiMessage';

const QUICK_PROMPTS = [
  { label: 'Explain binary numbers', icon: Binary, prompt: 'Explain binary numbers to me' },
  { label: 'Convert a number', icon: Calculator, prompt: 'Help me convert a number between bases' },
  { label: "Explain two's complement", icon: Cpu, prompt: "Explain two's complement to me" },
  { label: 'Help with binary operations', icon: SquareSigma, prompt: 'Help me understand binary arithmetic operations' },
  { label: 'Explain ASCII', icon: Type, prompt: 'Explain ASCII encoding to me' },
];

const CopyMessageButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const setTimer = useAutoResetTimer();

  const handleCopy = async () => {
    const ok = await copyTextSafe(text);
    if (!ok) return;
    setCopied(true);
    setTimer(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] text-[var(--bf-heading)]/40 hover:text-[var(--bf-accent)] transition-colors mt-1"
      aria-label="Copy response"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

interface ChatAssistantProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ isOpen, onOpen, onClose }) => {
  const { messages, isSending, sendMessage, clearConversation, maxMessageLength } = useChat();
  const [draft, setDraft] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, isOpen);
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  const submit = (text: string) => {
    if (!text.trim() || isSending) return;
    sendMessage(text);
    setDraft('');
  };

  const nearLimit = draft.length > maxMessageLength * 0.85;

  return (
    <>
      {/* Floating launcher — hidden while the panel is open to avoid a redundant control */}
      {!isOpen && (
        <button
          onClick={onOpen}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 pl-3.5 pr-4 py-3 rounded-full bg-[var(--bf-accent)] text-[var(--bf-chip)] shadow-lg shadow-[var(--bf-accent)]/30 hover:shadow-xl hover:shadow-[var(--bf-accent)]/40 hover:scale-105 transition-all font-bold text-sm"
          aria-label="Open BitForge AI learning assistant"
          title="Ask BitForge AI"
        >
          <Bot className="w-5 h-5" />
          <span className="hidden sm:inline">BitForge AI</span>
        </button>
      )}

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} aria-hidden="true" />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="BitForge AI learning assistant"
            tabIndex={-1}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[var(--bf-overlay)] border-l border-[var(--bf-accent)]/20 shadow-2xl z-50 flex flex-col animate-fadeIn"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--bf-muted)]/30 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-[var(--bf-chip)] text-[var(--bf-accent)] shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-display font-semibold tracking-wide text-[var(--bf-heading)] leading-tight truncate">BitForge AI</h2>
                  <p className="text-[10px] text-[var(--bf-heading)]/60 truncate">Your CS learning assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {messages.length > 0 && (
                  <button
                    onClick={clearConversation}
                    className="p-1.5 text-[var(--bf-heading)]/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Clear conversation"
                    aria-label="Clear conversation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-[var(--bf-heading)]/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Close"
                  aria-label="Close BitForge AI"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <Bot className="w-8 h-8 text-[var(--bf-accent)]/50 mx-auto mb-2" />
                  <p className="text-xs text-[var(--bf-heading)]/60 leading-relaxed px-2">
                    Ask about number systems, binary arithmetic, two's complement, ASCII, or anything else
                    covered in BitForge.
                  </p>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[var(--bf-accent)] text-[var(--bf-chip)] font-medium'
                        : m.isError
                        ? 'bg-red-950/40 border border-red-500/30 text-red-200'
                        : 'bg-black/25 border border-[var(--bf-muted)]/30 text-[var(--bf-heading)]/90'
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      {m.isError && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                      {m.role === 'assistant' && !m.isError ? (
                        <div className="min-w-0">
                          <FormattedAiMessage text={m.text} />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      )}
                    </div>
                    {m.role === 'assistant' && !m.isError && <CopyMessageButton text={m.text} />}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-black/25 border border-[var(--bf-muted)]/30 rounded-xl px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-[var(--bf-accent)] animate-spin" />
                    <span className="text-[11px] text-[var(--bf-heading)]/60">Thinking…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick prompts */}
            {messages.length === 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {QUICK_PROMPTS.map((qp) => {
                  const Icon = qp.icon;
                  return (
                    <button
                      key={qp.label}
                      onClick={() => submit(qp.prompt)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/20 hover:bg-[var(--bf-chip)] text-[var(--bf-heading)]/70 hover:text-[var(--bf-accent)] border border-[var(--bf-muted)]/40 hover:border-[var(--bf-accent)]/40 text-[11px] font-medium transition-colors"
                    >
                      <Icon className="w-3 h-3" />
                      {qp.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-[var(--bf-muted)]/30 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, maxMessageLength))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submit(draft);
                    }
                  }}
                  placeholder="Ask about binary, hex, two's complement…"
                  rows={1}
                  aria-label="Message BitForge AI"
                  className="flex-1 resize-none bg-black/25 border border-[var(--bf-muted)]/40 focus:border-[var(--bf-accent)]/60 rounded-lg px-3 py-2 text-[13px] text-[var(--bf-heading)] placeholder:text-[var(--bf-heading)]/30 outline-none transition-colors max-h-24"
                />
                <button
                  onClick={() => submit(draft)}
                  disabled={!draft.trim() || isSending}
                  className="p-2.5 rounded-lg bg-[var(--bf-accent)] text-[var(--bf-chip)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bf-accent-hover)] transition-colors shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-0.5">
                <p className="text-[9px] text-[var(--bf-heading)]/35">AI-generated — verify anything critical.</p>
                {nearLimit && (
                  <p className={`text-[9px] font-mono ${draft.length >= maxMessageLength ? 'text-red-400' : 'text-[var(--bf-heading)]/40'}`}>
                    {draft.length}/{maxMessageLength}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
