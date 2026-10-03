import React, { useMemo } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ANNOUNCE_DELAY_MS, buildConverterAnnouncement, type AnnouncementInput } from '../utils/converterAnnouncement';

/**
 * Two small, always-mounted, visually hidden live regions — never the large
 * output cards themselves, which would make a screen reader read the whole
 * page on every keystroke. Text is debounced so typing "255" announces once,
 * not three times. Live regions must exist *before* their text changes to be
 * announced reliably, which is why both stay mounted and only their content
 * changes.
 */
export const ConverterAnnouncer: React.FC<AnnouncementInput> = (props) => {
  const { conversion, targetBase, customRadix, inputText, ambiguous } = props;
  const message = useMemo(
    () => buildConverterAnnouncement({ conversion, targetBase, customRadix, inputText, ambiguous }),
    [conversion, targetBase, customRadix, inputText, ambiguous]
  );
  const result = useDebouncedValue(message.result, ANNOUNCE_DELAY_MS);
  const error = useDebouncedValue(message.error, ANNOUNCE_DELAY_MS);

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="converter-status">
        {result}
      </div>
      <div role="alert" aria-atomic="true" className="sr-only" data-testid="converter-alert">
        {error}
      </div>
    </>
  );
};
