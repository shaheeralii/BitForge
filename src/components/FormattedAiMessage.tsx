import React from 'react';
import { parseAiMessage, InlineToken, Block } from '../utils/formatAiText';

function renderInline(tokens: InlineToken[], keyPrefix: string): React.ReactNode {
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (token.type) {
      case 'text':
        return <React.Fragment key={key}>{token.value}</React.Fragment>;
      case 'bold':
        return (
          <strong key={key} className="font-semibold text-[var(--bf-text)]">
            {renderInline(token.children, key)}
          </strong>
        );
      case 'code':
        return (
          <code
            key={key}
            className="px-1 py-0.5 rounded bg-black/30 border border-[var(--bf-accent)]/20 text-[var(--bf-accent)] font-mono text-[12px]"
          >
            {token.value}
          </code>
        );
      case 'math':
        return (
          <span key={key} className="font-mono">
            {token.value}
          </span>
        );
      default:
        return null;
    }
  });
}

function renderBlock(block: Block, key: string): React.ReactNode {
  if (block.type === 'codeblock') {
    return (
      <pre
        key={key}
        className="my-1.5 p-2.5 rounded-lg bg-black/30 border border-[var(--bf-muted)]/40 overflow-x-auto"
      >
        <code className="font-mono text-[12px] text-[var(--bf-heading)]/90 whitespace-pre">{block.code}</code>
      </pre>
    );
  }

  return (
    <p key={key} className="whitespace-pre-wrap break-words">
      {block.lines.map((line, lineIdx) => (
        <React.Fragment key={`${key}-l${lineIdx}`}>
          {lineIdx > 0 && <br />}
          {renderInline(line, `${key}-l${lineIdx}`)}
        </React.Fragment>
      ))}
    </p>
  );
}

interface FormattedAiMessageProps {
  text: string;
}

/**
 * Renders a BitForge AI reply with light Markdown (bold, inline/fenced code)
 * and inline LaTeX math converted to plain Unicode, matching the notation
 * style used everywhere else in BitForge. Plain replies with none of that
 * syntax render exactly as they did before (unchanged text, line breaks
 * preserved).
 */
export const FormattedAiMessage: React.FC<FormattedAiMessageProps> = ({ text }) => {
  const blocks = React.useMemo(() => parseAiMessage(text), [text]);
  return <>{blocks.map((block, idx) => renderBlock(block, `b${idx}`))}</>;
};
