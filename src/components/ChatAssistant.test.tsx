// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ChatAssistant } from './ChatAssistant';
import { ChatProvider } from '../context/ChatContext';

/** Controlled wrapper, like AppRoot: the parent owns `isOpen`. */
function Harness() {
  const [open, setOpen] = React.useState(false);
  return (
    <ChatProvider>
      <ChatAssistant isOpen={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} />
    </ChatProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ChatAssistant focus management', () => {
  it('moves focus into the dialog on open, and back to the launcher when Escape closes it', () => {
    render(<Harness />);
    const launcher = screen.getByRole('button', { name: /Open BitForge AI learning assistant/ });
    launcher.focus();
    fireEvent.click(launcher);

    const dialog = screen.getByRole('dialog', { name: 'BitForge AI learning assistant' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    // The launcher is unmounted while the panel is open (so it cannot be the
    // generic "restore focus" target)...
    expect(screen.queryByRole('button', { name: /Open BitForge AI learning assistant/ })).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    // ...so the freshly re-mounted launcher must receive focus, not <body>.
    const relaunched = screen.getByRole('button', { name: /Open BitForge AI learning assistant/ });
    expect(document.activeElement).toBe(relaunched);
  });

  it('does not steal focus if something else already has it when the panel closes', () => {
    render(
      <>
        <button>elsewhere</button>
        <Harness />
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: /Open BitForge AI learning assistant/ }));
    const elsewhere = screen.getByRole('button', { name: 'elsewhere' });
    // Closing while focus is already on a real element must leave it alone.
    fireEvent.keyDown(document, { key: 'Escape' });
    elsewhere.focus();
    expect(document.activeElement).toBe(elsewhere);
  });
});
