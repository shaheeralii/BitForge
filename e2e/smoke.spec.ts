import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Browser smoke suite: what unit tests cannot prove. Runs against the
 * production build (see playwright.config.ts). Every test also fails on any
 * console error, uncaught exception or failed network request, so a "green"
 * run means the page was quiet as well as correct.
 */

const pkgVersion = (JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as { version: string }).version;

const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
      });
      page.on('pageerror', (e) => problems.push(`pageerror: ${e}`));
      page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
      await use(problems);
      expect(problems, 'console errors / failed requests').toEqual([]);
    },
    { auto: true },
  ],
});

const ROUTES = {
  landing: '/',
  converter: '/#/app',
  bits: '/#/app/mode/bit_representation',
  ops: '/#/app/mode/operations',
  fp: '/#/app/mode/floating_point',
} as const;
type RouteKey = keyof typeof ROUTES;

/** A control that only exists on each screen — proves the right screen rendered. */
const landmark = (page: Page, key: RouteKey) => {
  switch (key) {
    case 'landing': return page.getByRole('heading', { level: 1, name: /See how computers/ });
    case 'converter': return page.locator('input[type="text"]').first();
    case 'bits': return page.getByRole('button', { name: /^Bit 7, currently/ });
    case 'ops': return page.getByLabel('Operand A');
    case 'fp': return page.getByPlaceholder(/Enter a decimal number/);
  }
};

const converterInput = (page: Page) => page.locator('input[type="text"]').first();
const card = (page: Page, name: string) => page.getByRole('button', { name: `View step-by-step derivation for ${name}` });
const themeButton = (page: Page) => page.getByRole('button', { name: /^Current theme/ });

async function setTheme(page: Page, label: 'Emerald' | 'Premium' | 'Plain') {
  await themeButton(page).click();
  await page.getByRole('menuitemradio', { name: new RegExp(`^${label}`) }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
}

const themeAttr = (page: Page) => page.locator('html');
const THEME_KEY = { Emerald: 'emerald', Premium: 'premium', Plain: 'plain' } as const;

async function readClipboard(page: Page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

/**
 * Let the page finish loading (network quiet, web fonts ready) before a
 * deliberate navigation. Reloading while fonts or the favicon are still in
 * flight makes Chromium report them as `net::ERR_ABORTED`, which the strict
 * "no failed requests" fixture above would flag even though the app is fine.
 * Waiting here keeps that guard fully strict for genuine failures.
 */
async function settled(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

test.describe('routing', () => {
  for (const key of Object.keys(ROUTES) as RouteKey[]) {
    test(`direct load of ${ROUTES[key]} renders its screen and carries the version marker`, async ({ page }) => {
      await page.goto(ROUTES[key]);
      await expect(landmark(page, key)).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-app-version', pkgVersion);
      await expect(page).toHaveTitle(/BitForge/);
    });

    test(`refresh on ${ROUTES[key]} stays on the same screen`, async ({ page }) => {
      await page.goto(ROUTES[key]);
      await expect(landmark(page, key)).toBeVisible();
      await settled(page);
      await page.reload();
      await expect(landmark(page, key)).toBeVisible();
      expect(new URL(page.url()).hash).toBe(new URL(ROUTES[key], 'http://x').hash);
    });
  }

  // Designed behaviour (also unit-tested in AppRoot.test.tsx): entering the
  // tool from the landing page pushes ONE history entry; switching tools
  // inside it rewrites that entry in place. So Back from any tool goes
  // straight to the landing page, and Forward returns to the tool the person
  // was last using — with the URL, screen and history length always agreeing.
  test('landing → converter → bits → operations → floating point: URL follows each tab, Back returns to landing, Forward returns to the last tool', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open BitForge' }).first().click();
    await expect(landmark(page, 'converter')).toBeVisible();
    const historyLength = () => page.evaluate(() => history.length);
    const afterEnteringTool = await historyLength();

    const tabs: Array<[string, RouteKey, string]> = [
      ['Bit Representation', 'bits', '#/app/mode/bit_representation'],
      ['Binary Operations', 'ops', '#/app/mode/operations'],
      ['Floating Point', 'fp', '#/app/mode/floating_point'],
    ];
    for (const [name, key, hash] of tabs) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(landmark(page, key)).toBeVisible();
      expect(new URL(page.url()).hash).toBe(hash);
      expect(await historyLength(), `${name}: no extra history entry`).toBe(afterEnteringTool);
    }

    await page.goBack();
    await expect(landmark(page, 'landing')).toBeVisible();
    await page.goForward();
    await expect(landmark(page, 'fp')).toBeVisible();
    expect(new URL(page.url()).hash).toBe('#/app/mode/floating_point');

    // A direct URL entry mid-session behaves the same as a cold load.
    await page.goto(ROUTES.ops);
    await expect(landmark(page, 'ops')).toBeVisible();
    await page.goBack();
    await expect(landmark(page, 'fp')).toBeVisible();
  });

  test('the logo returns to the landing page', async ({ page }) => {
    await page.goto(ROUTES.converter);
    await page.getByRole('link', { name: 'Back to the BitForge landing page' }).click();
    await expect(landmark(page, 'landing')).toBeVisible();
    expect(new URL(page.url()).hash).toMatch(/^(#\/?)?$/);
  });
});

test.describe('theme switching (no reload, ever)', () => {
  test('all six transitions Emerald↔Plain, Premium↔Plain, Emerald↔Premium', async ({ page }) => {
    await page.goto(ROUTES.converter);
    await expect(landmark(page, 'converter')).toBeVisible();
    // Survives only while the document is never reloaded.
    await page.evaluate(() => { (window as unknown as { __bfAlive: string }).__bfAlive = 'yes'; });

    const steps: Array<['Emerald' | 'Premium' | 'Plain', string]> = [
      ['Plain', 'Emerald → Plain'],
      ['Emerald', 'Plain → Emerald'],
      ['Premium', 'Emerald → Premium'],
      ['Plain', 'Premium → Plain'],
      ['Premium', 'Plain → Premium'],
      ['Emerald', 'Premium → Emerald'],
    ];
    for (const [to, label] of steps) {
      await setTheme(page, to);
      await expect(themeAttr(page), label).toHaveAttribute('data-theme', THEME_KEY[to]);
      // Plain never builds the WebGL scene; the FlowWave themes do.
      await expect(page.locator('canvas'), `${label}: canvas`).toHaveCount(to === 'Plain' ? 0 : 1);
      expect(await page.evaluate(() => (window as unknown as { __bfAlive?: string }).__bfAlive), `${label}: no reload`).toBe('yes');
      await expect(landmark(page, 'converter'), `${label}: UI intact`).toBeVisible();
    }
  });

  test('Plain, then logo, Back, Forward, a direct route and a refresh all keep Plain', async ({ page }) => {
    await page.goto(ROUTES.converter);
    await setTheme(page, 'Plain');
    await page.getByRole('link', { name: 'Back to the BitForge landing page' }).click();
    await expect(landmark(page, 'landing')).toBeVisible();
    await expect(themeAttr(page)).toHaveAttribute('data-theme', 'plain');
    await page.goBack();
    await expect(landmark(page, 'converter')).toBeVisible();
    await page.goForward();
    await expect(landmark(page, 'landing')).toBeVisible();
    await page.goto(ROUTES.fp);
    await expect(landmark(page, 'fp')).toBeVisible();
    await settled(page);
    await page.reload();
    await expect(landmark(page, 'fp')).toBeVisible();
    await expect(themeAttr(page)).toHaveAttribute('data-theme', 'plain');
    await expect(page.locator('canvas')).toHaveCount(0);
  });
});

test.describe('number converter', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(ROUTES.converter);
    await expect(converterInput(page)).toBeVisible();
  });

  test('base conversion, prefixes, negatives and fractions update every card', async ({ page }) => {
    const input = converterInput(page);
    await input.fill('255');
    await expect(card(page, 'Binary')).toContainText('11111111');
    await expect(card(page, 'Hexadecimal')).toContainText('FF');
    await expect(card(page, 'Octal')).toContainText('377');

    await input.fill('0xFF');
    await expect(card(page, 'Denary (Decimal)')).toContainText('255');

    await input.fill('-255');
    await expect(card(page, 'Binary')).toContainText('-11111111');

    await input.fill('13.625');
    await expect(card(page, 'Binary')).toContainText('1101.101');
  });

  test('rapid typing and rapid deletion never leave a stale result', async ({ page }) => {
    const input = converterInput(page);
    await input.fill('');
    await input.pressSequentially('65535', { delay: 15 });
    await expect(card(page, 'Hexadecimal')).toContainText('FFFF');
    for (let i = 0; i < 5; i++) await input.press('Backspace');
    await input.pressSequentially('16', { delay: 10 });
    await expect(card(page, 'Hexadecimal')).toContainText('10');
    await expect(card(page, 'Hexadecimal')).not.toContainText('FFFF');
  });

  test('copy puts the exact value on the real clipboard', async ({ page }) => {
    await converterInput(page).fill('255');
    await expect(card(page, 'Binary')).toContainText('11111111');
    await page.getByRole('button', { name: 'Copy Binary value' }).click();
    expect(await readClipboard(page)).toBe('11111111');
    await page.getByRole('button', { name: 'Copy Hexadecimal value' }).click();
    expect(await readClipboard(page)).toBe('FF');
  });

  test('an invalid digit shows an error and correcting it recovers immediately', async ({ page }) => {
    await page.getByRole('button', { name: /Base 2\s*Binary/ }).click();
    const input = converterInput(page);
    await input.fill('102');
    await expect(page.locator('#bitforge-main-error')).toBeVisible();
    await input.fill('101');
    await expect(page.locator('#bitforge-main-error')).toHaveCount(0);
    await expect(card(page, 'Denary (Decimal)')).toContainText('5');
  });

  test('"-0", "-000" and "-0.0" are plain zero — no negative zero in any base', async ({ page }) => {
    for (const text of ['-0', '-000', '-0.0']) {
      await converterInput(page).fill(text);
      for (const [label, name] of [['Binary', 'Binary'], ['Octal', 'Octal'], ['Denary', 'Denary (Decimal)'], ['Hexadecimal', 'Hexadecimal']] as const) {
        await expect(card(page, name), `${text} → ${label}`).toBeVisible();
        await page.getByRole('button', { name: `Copy ${name} value` }).click();
        const copied = await readClipboard(page);
        expect(copied, `${text} → ${label}`).not.toContain('-');
        expect(copied).toMatch(/^0(\.0)?$/);
      }
    }
  });

  test('all-0/1 input shows "Read as Binary · Also valid as Decimal" with a one-tap switch', async ({ page }) => {
    const input = converterInput(page);
    const notice = page.getByTestId('ambiguity-notice');

    await input.fill('10');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('Read as');
    await expect(notice).toContainText('Also valid as');
    await expect(card(page, 'Denary (Decimal)')).toContainText('2'); // existing behaviour kept: read as binary

    for (const t of ['100', '101', '1111', '0010', '10.0']) {
      await input.fill(t);
      await expect(notice, t).toBeVisible();
    }
    for (const t of ['255', '999', 'FF', '0x10', '0b10']) {
      await input.fill(t);
      await expect(notice, t).toHaveCount(0);
    }

    await input.fill('1010');
    await notice.getByRole('button', { name: 'Use Decimal' }).click();
    await expect(notice).toHaveCount(0); // decided → gone
    await expect(card(page, 'Binary')).toContainText('1111110010'); // 1010 decimal = 1111110010 binary
  });

  test('the ambiguity switch works from the keyboard', async ({ page }) => {
    await converterInput(page).fill('11');
    const button = page.getByRole('button', { name: 'Use Decimal' });
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('ambiguity-notice')).toHaveCount(0);
    await expect(card(page, 'Binary')).toContainText('1011'); // 11 decimal
  });

  test('a lone fractional 1 is ambiguous: ".1", "-.1" and "+.1" are 0.5 as Binary but 0.1 as Decimal', async ({ page }) => {
    const input = converterInput(page);
    const notice = page.getByTestId('ambiguity-notice');

    for (const t of ['.1', '-.1', '+.1']) {
      await input.fill(t);
      await expect(notice, t).toBeVisible();
      await expect(notice, t).toContainText('Also valid as');
    }

    // Still read as Binary by default (never silently switched to Decimal)…
    await input.fill('.1');
    await expect(card(page, 'Denary (Decimal)')).toContainText('0.5');
    // …and one tap reads the same text as Decimal instead.
    await notice.getByRole('button', { name: 'Use Decimal' }).click();
    await expect(notice).toHaveCount(0);
    await expect(card(page, 'Denary (Decimal)')).toContainText('0.1');
    await expect(card(page, 'Denary (Decimal)')).not.toContainText('0.5');
  });

  test('values that mean the same in every base show no ambiguity notice', async ({ page }) => {
    const input = converterInput(page);
    // Includes the all-zero / leading-zero / trailing-zero shapes that read as
    // the same number in Binary and in Decimal ("00", "01", "1.0", "000001"):
    // the notice is shown only when the two readings really differ.
    for (const t of ['0', '1', '-0', '.0', '00', '000', '01', '000001', '0.0', '1.0', '00.0', '0b.1', '-0b10']) {
      await input.fill(t);
      await expect(page.getByTestId('ambiguity-notice'), t).toHaveCount(0);
    }
  });

  test('the derivation is not built while closed: closed → open → closed on ordinary and 1,024-digit input', async ({ page }) => {
    const input = converterInput(page);
    const toggle = page.getByRole('button', { name: 'Toggle step-by-step derivation' });
    const verified = page.getByText('BitForge Engine Logic verified');
    const elementCount = () => page.evaluate(() => document.querySelectorAll('*').length);

    // Ordinary input: unchanged behaviour — closed by default, steps on demand.
    await input.fill('255.625');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(verified).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(verified).toBeVisible();
    await expect(page.getByText('Step Outcome:').first()).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(verified).toHaveCount(0); // unmounted once the collapse animation ends

    // Largest allowed input, derivation closed: no derivation DOM at all. With the body
    // mounted this input produced roughly 21,000 elements; closed, the whole page is ~550.
    await input.fill('7'.repeat(1024));
    await expect(card(page, 'Binary')).toBeVisible(); // the conversion itself is still shown
    await expect(verified).toHaveCount(0);
    expect(await elementCount()).toBeLessThan(2000);
    await expect(page.locator('table')).toHaveCount(0);

    // Changing the text while closed does not build it either.
    await input.fill('9'.repeat(900));
    await expect(verified).toHaveCount(0);
    expect(await elementCount()).toBeLessThan(2000);

    // Opening mounts the full derivation; closing removes it again.
    await toggle.click();
    await expect(verified).toBeVisible();
    expect(await elementCount()).toBeGreaterThan(5000);
    await toggle.click();
    await expect(verified).toHaveCount(0);
    expect(await elementCount()).toBeLessThan(2000);
  });

  test('the derivation toggle works from the keyboard and keeps focus', async ({ page }) => {
    await converterInput(page).fill('255.625');
    const toggle = page.getByRole('button', { name: 'Toggle step-by-step derivation' });
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toBeFocused();
    await expect(page.getByText('BitForge Engine Logic verified')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect(page.getByText('BitForge Engine Logic verified')).toHaveCount(0);
  });

  test('temporarily incomplete input ("-", ".", "0.", "-0.") shows a neutral hint — never an error or alert — and resolves once completed', async ({ page }) => {
    const input = converterInput(page);
    const status = page.getByTestId('converter-status');
    const alert = page.getByTestId('converter-alert');
    const hint = page.getByTestId('incomplete-notice');

    for (const t of ['-', '+', '.', '-.', '0.', '-0.']) {
      await input.fill(t);
      await expect(hint, t).toBeVisible();
      await expect(hint, t).toContainText('Waiting for digits');
      await expect(page.locator('#bitforge-main-error'), t).toHaveCount(0);
      await expect(input, t).not.toHaveAttribute('aria-invalid', 'true');
      // The announcer says it politely, and never through the alert region.
      await expect(status, t).toContainText('Waiting for digits');
      await expect(alert, t).toHaveText('');
      // Nothing finished-looking to copy or share while the number is incomplete.
      await expect(page.getByRole('button', { name: 'Copy Binary value' }), t).toBeDisabled();
    }

    await input.fill('-0.5');
    await expect(hint).toHaveCount(0);
    await expect(card(page, 'Denary (Decimal)')).toContainText('-0.5');
    await expect(page.getByRole('button', { name: 'Copy Binary value' })).toBeEnabled();

    // Genuinely wrong text keeps its real error.
    await input.fill('G.');
    await expect(page.locator('#bitforge-main-error')).toBeVisible();
    await expect(hint).toHaveCount(0);
  });

  test('1,024 characters are accepted; 1,025 is trimmed with a notice; a 200,000-character paste is handled instantly', async ({ page }) => {
    const input = converterInput(page);

    await input.fill('7'.repeat(1024));
    await expect(input).toHaveValue('7'.repeat(1024));
    await expect(page.getByText(/limit for this tool/)).toHaveCount(0);

    await input.fill('7'.repeat(1025));
    await expect(input).toHaveValue('7'.repeat(1024));
    await expect(page.getByText(/limit for this tool/)).toBeVisible();

    const t0 = Date.now();
    await input.fill('9'.repeat(200_000));
    await expect(input).toHaveValue('9'.repeat(1024));
    expect(Date.now() - t0, 'trim + render of a 200k paste').toBeLessThan(6000);

    // The tab is still alive and correct afterwards.
    await input.fill('255');
    await expect(card(page, 'Binary')).toContainText('11111111');
  });

  test('a long digit run ending in a bad character is rejected without freezing the page', async ({ page }) => {
    const t0 = Date.now();
    await converterInput(page).fill('1'.repeat(1000) + 'z');
    await expect(page.locator('#bitforge-main-error')).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(4000);
  });

  test('live regions: a small status and alert region exist and announce a debounced result', async ({ page }) => {
    const status = page.getByTestId('converter-status');
    const alert = page.getByTestId('converter-alert');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(alert).toHaveAttribute('role', 'alert');
    await converterInput(page).fill('255');
    await expect(status).toContainText('Converted result: 255 decimal equals 11111111 binary.');
    await page.getByRole('button', { name: /Base 2\s*Binary/ }).click();
    await converterInput(page).fill('12');
    await expect(alert).not.toHaveText('');
    await expect(status).toHaveText('');
  });
});

test.describe('conversion synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.converter);
    await expect(converterInput(page)).toBeVisible();
  });

  const pill = (page: Page, name: RegExp) => page.getByRole('button', { name }).first();

  test('every source base drives all the others: Hex → Decimal, Octal → Hex, Binary → Hex, Decimal → custom', async ({ page }) => {
    const input = converterInput(page);

    await pill(page, /Base 16\s*Hexadecimal/).click();
    await input.fill('FF');
    await expect(card(page, 'Denary (Decimal)')).toContainText('255');
    await expect(card(page, 'Binary')).toContainText('11111111');
    await expect(card(page, 'Octal')).toContainText('377');

    await pill(page, /Base 8\s*Octal/).click();
    await input.fill('377');
    await expect(card(page, 'Hexadecimal')).toContainText('FF');
    await expect(card(page, 'Denary (Decimal)')).toContainText('255');

    await pill(page, /Base 2\s*Binary/).click();
    await input.fill('11111111');
    await expect(card(page, 'Hexadecimal')).toContainText('FF');
    await expect(card(page, 'Octal')).toContainText('377');

    await pill(page, /Base 10\s*Denary/).click();
    await input.fill('255');
    await expect(card(page, 'Custom Base (12)')).toContainText('193'); // 1·144 + 9·12 + 3 = 255
  });

  test('custom radix as the source: value, slider and number box all stay in sync, and have accessible names', async ({ page }) => {
    await pill(page, /Base 12\s*Custom/).click();
    const slider = page.getByRole('slider', { name: /Custom Radix/i });
    const number = page.getByRole('spinbutton', { name: /Custom radix value/i });
    await expect(slider).toBeVisible();
    await expect(number).toBeVisible();

    await converterInput(page).fill('193');
    await expect(card(page, 'Denary (Decimal)')).toContainText('255');

    await number.fill('16');
    await expect(slider).toHaveValue('16');
    await converterInput(page).fill('FF');
    await expect(card(page, 'Denary (Decimal)')).toContainText('255');

    await slider.focus();
    await page.keyboard.press('Home');
    await expect(number).toHaveValue('2');
    await converterInput(page).fill('1111');
    await expect(card(page, 'Denary (Decimal)')).toContainText('15');
  });

  test('editing in the middle of the text keeps the caret where the person is typing (no cursor jump)', async ({ page }) => {
    const input = converterInput(page);
    await input.fill('');
    await input.pressSequentially('12345', { delay: 10 });
    await input.press('Home');
    await input.press('ArrowRight');
    await input.press('ArrowRight');
    await input.pressSequentially('9', { delay: 10 });
    await expect(input).toHaveValue('129345');
    expect(await input.evaluate((el: HTMLInputElement) => el.selectionStart), 'caret after inserting').toBe(3);
    await input.press('Backspace');
    await expect(input).toHaveValue('12345');
    expect(await input.evaluate((el: HTMLInputElement) => el.selectionStart), 'caret after deleting').toBe(2);
    await expect(card(page, 'Hexadecimal')).toContainText('3039'); // 12345 = 0x3039
  });

  test('paste then immediate replacement never leaves a stale result or error', async ({ page }) => {
    const input = converterInput(page);
    await input.fill('9'.repeat(900));
    await input.fill('7');
    await expect(card(page, 'Binary')).toContainText('111');
    await expect(page.locator('#bitforge-main-error')).toHaveCount(0);
    await input.fill('xyz'); // (not 'abc': that is valid hexadecimal, so auto-detect correctly accepts it)
    await expect(page.locator('#bitforge-main-error')).toBeVisible();
    await input.fill('7');
    await expect(page.locator('#bitforge-main-error')).toHaveCount(0);
    await expect(card(page, 'Binary')).toContainText('111');
  });

  test('a negative fractional value converts and a correction removes the old result', async ({ page }) => {
    const input = converterInput(page);
    await input.fill('-2.5');
    await expect(card(page, 'Binary')).toContainText('-10.1');
    await input.fill('-2.75');
    await expect(card(page, 'Binary')).toContainText('-10.11');
    // ...and the previous value (-10.1) is gone, not merely a prefix of the new one.
    await expect(card(page, 'Binary')).not.toHaveText(/-10\.1(?!1)/);
  });
});

test.describe('other tools', () => {
  test('bit toggling: click and keyboard both flip a bit', async ({ page }) => {
    await page.goto(ROUTES.bits);
    const bit7 = page.getByRole('button', { name: /^Bit 7, currently/ });
    await expect(bit7).toHaveAccessibleName('Bit 7, currently 1');
    await bit7.click();
    await expect(bit7).toHaveAccessibleName('Bit 7, currently 0');
    await bit7.focus();
    await page.keyboard.press('Space');
    await expect(bit7).toHaveAccessibleName('Bit 7, currently 1');
    await page.keyboard.press('Enter');
    await expect(bit7).toHaveAccessibleName('Bit 7, currently 0');
  });

  test('floating point special values: ±0, overflow to Infinity, ordinary numbers, and junk is rejected', async ({ page }) => {
    await page.goto(ROUTES.fp);
    const input = page.getByPlaceholder(/Enter a decimal number/);
    await input.fill('-0');
    await expect(page.getByText(/^Zero • \d+ bits/)).toBeVisible();
    await input.fill('1e39'); // beyond Binary32's range
    await expect(page.getByText(/^Infinity • \d+ bits/)).toBeVisible();
    await input.fill('0.1');
    await expect(page.getByText(/^Normal • \d+ bits/)).toBeVisible();
    await input.fill('12');
    await input.pressSequentially('z');
    await expect(input).toHaveValue('12'); // letters are filtered as you type
  });

  test('a 50,000-digit FP paste (previously a multi-second regex stall) is handled instantly', async ({ page }) => {
    await page.goto(ROUTES.fp);
    const input = page.getByPlaceholder(/Enter a decimal number/);
    const t0 = Date.now();
    await input.fill('1'.repeat(50_000));
    await expect(page.getByText(/^Infinity • \d+ bits/)).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(5000);
  });

  test('binary subtraction flags: A − 0 has no borrow; 0 − (−128) overflows in signed terms', async ({ page }) => {
    await page.goto(ROUTES.ops);
    await page.getByRole('button', { name: '8-bit', exact: true }).click();
    await page.getByRole('button', { name: 'Subtract', exact: true }).click();
    await page.getByLabel('Operand A').fill('00000101');
    await page.getByLabel('Operand B').fill('00000000');
    await expect(page.locator('main')).toContainText('Borrow: No');
    await expect(page.locator('main')).toContainText('Signed Overflow: No');
    await page.getByLabel('Operand A').fill('00000000');
    await page.getByLabel('Operand B').fill('10000000');
    await expect(page.locator('main')).toContainText('Borrow: Yes');
    await expect(page.locator('main')).toContainText('Signed Overflow: Yes');
  });
});

test.describe('keyboard', () => {
  test('theme menu: Enter opens onto the checked item; arrows, Home and End move; Escape and Tab close; Enter selects', async ({ page }) => {
    await page.goto(ROUTES.converter);
    const trigger = themeButton(page);
    const focused = () => page.evaluate(() => (document.activeElement?.textContent ?? '').trim());

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect.poll(focused).toContain('Emerald'); // the checked item receives focus
    await page.keyboard.press('ArrowDown');
    await expect.poll(focused).toContain('Premium');
    await page.keyboard.press('End');
    await expect.poll(focused).toContain('Plain');
    await page.keyboard.press('ArrowDown');
    await expect.poll(focused).toContain('Emerald'); // wraps
    await page.keyboard.press('Home');
    await expect.poll(focused).toContain('Emerald');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await page.keyboard.press('ArrowDown'); // opens on the first item from the closed trigger
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Tab'); // leaving the menu closes it
    await expect(page.getByRole('menu')).toHaveCount(0);

    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter'); // select Plain
    await expect(themeAttr(page)).toHaveAttribute('data-theme', 'plain');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('Tab reaches the converter input and every focused control shows a visible focus indicator', async ({ page }) => {
    await page.goto(ROUTES.converter);
    const input = converterInput(page);
    let reached = false;
    const unindicated: string[] = [];
    for (let i = 0; i < 60 && !reached; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(async () => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        // Measure the *settled* indicator. The mode tabs use a 150 ms
        // `transition-all`, and `outline-style` is a discrete property that
        // only flips halfway through it, so reading the style a few
        // milliseconds after the keypress can see the ring before it exists.
        await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
        const cs = getComputedStyle(el);
        const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
        const shadow = cs.boxShadow !== 'none';
        const bordered = el.matches('input');
        return { name: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30), visible: outline || shadow || bordered };
      });
      if (info && !info.visible) unindicated.push(info.name);
      reached = await input.evaluate((el) => el === document.activeElement);
    }
    expect(reached, 'converter input is reachable by Tab').toBe(true);
    expect(unindicated, 'controls that received focus with no outline or ring').toEqual([]);
  });

  test('the keyboard-shortcuts dialog traps focus and Escape closes it', async ({ page }) => {
    await page.goto(ROUTES.converter);
    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), `Tab #${i + 1} stays inside`).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('dialogs', () => {
  test('BitForge AI chat: opens with focus inside, traps Tab, Escape closes and focus returns to the launcher', async ({ page }) => {
    await page.goto(ROUTES.converter);
    const launcher = page.getByRole('button', { name: /Open BitForge AI learning assistant/ });
    await launcher.click();
    const dialog = page.getByRole('dialog', { name: 'BitForge AI learning assistant' });
    await expect(dialog).toBeVisible();
    expect(await dialog.getAttribute('aria-modal')).toBe('true');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), 'focus starts inside').toBe(true);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), `Tab #${i + 1} stays inside`).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(launcher).toBeFocused();
  });

  test('History panel and the About dialog return focus to the control that opened them', async ({ page }) => {
    await page.goto(ROUTES.converter);
    const history = page.getByRole('button', { name: /history/i }).first();
    await history.click();
    await expect(page.getByRole('dialog', { name: 'Activity history' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(history).toBeFocused();

    const about = page.locator('footer').getByRole('button', { name: 'About' });
    await about.click();
    await expect(page.getByRole('dialog', { name: 'BitForge information' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(about).toBeFocused();
  });
});

test.describe('mobile', () => {
  for (const width of [320, 360, 390, 430]) {
    test(`no horizontal scroll on any screen at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const key of Object.keys(ROUTES) as RouteKey[]) {
        await page.goto(ROUTES[key]);
        await expect(landmark(page, key)).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${key} @${width}: horizontal overflow (px)`).toBeLessThanOrEqual(0);
      }
    });

    test(`five base pills at ${width}px: 2×2 grid, then Custom Base on its own full-width row`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(ROUTES.converter);
      const boxes = await Promise.all(
        [/Base 10\s*Denary/, /Base 2\s*Binary/, /Base 8\s*Octal/, /Base 16\s*Hexadecimal/, /Base 12\s*Custom/].map(async (name) => {
          const b = await page.getByRole('button', { name }).first().boundingBox();
          if (!b) throw new Error(`pill ${name} not found`);
          return b;
        })
      );
      const [dec, bin, oct, hex, custom] = boxes;
      expect(Math.abs(dec.y - bin.y), 'DEC and BIN share a row').toBeLessThan(2);
      expect(Math.abs(oct.y - hex.y), 'OCT and HEX share a row').toBeLessThan(2);
      expect(oct.y).toBeGreaterThan(dec.y + dec.height - 2);
      expect(custom.y, 'Custom sits below the pairs').toBeGreaterThan(oct.y + oct.height - 2);
      const rowWidth = bin.x + bin.width - dec.x;
      expect(Math.abs(custom.width - rowWidth), 'Custom spans the full row').toBeLessThan(3);
    });
  }
});

test.describe('layout', () => {
  /** Right edge of the widest row vs the last row: a short last row leaves a visible hole. */
  async function rowEdges(page: Page) {
    const cards = page.getByRole('button', { name: /^View step-by-step derivation for/ });
    await expect(cards).toHaveCount(5);
    const boxes = [];
    for (let i = 0; i < 5; i++) {
      const b = await cards.nth(i).boundingBox();
      if (!b) throw new Error(`card ${i} has no box`);
      boxes.push(b);
    }
    const rows = new Map<number, { left: number; right: number; n: number }>();
    for (const b of boxes) {
      const y = Math.round(b.y);
      const r = rows.get(y) ?? { left: b.x, right: b.x + b.width, n: 0 };
      r.left = Math.min(r.left, b.x);
      r.right = Math.max(r.right, b.x + b.width);
      r.n++;
      rows.set(y, r);
    }
    return [...rows.values()];
  }

  for (const [width, label] of [[1280, 'desktop (3 + 2)'], [1024, 'laptop (3 + 2)'], [768, 'tablet (2 + 2 + 1)']] as const) {
    test(`Live Bases Grid at ${width}px ${label}: every row spans the full grid width, no orphan or hole`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(ROUTES.converter);
      await expect(converterInput(page)).toBeVisible();
      const rows = await rowEdges(page);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      const { left, right } = rows[0];
      for (const r of rows) {
        expect(Math.abs(r.left - left), 'row starts at the grid edge').toBeLessThan(2);
        expect(Math.abs(r.right - right), 'row ends at the grid edge').toBeLessThan(2);
      }
    });
  }
});

test.describe('header and tab bar', () => {
  /** Geometry of the brand link, the five mode tabs and the controls cluster. */
  async function headerGeometry(page: Page) {
    return page.evaluate(() => {
      const box = (e: Element) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      const logo = box(document.querySelector('a[aria-label="Back to the BitForge landing page"]')!);
      const navEl = [...document.querySelectorAll('nav')].find((n) => n.querySelectorAll('button').length >= 5 && /Bit Representation/.test(n.textContent ?? ''))!;
      const nav = box(navEl);
      const tabs = [...navEl.querySelectorAll('button')].map((b) => ({ label: (b.textContent ?? '').trim(), ...box(b) }));
      const vw = document.documentElement.clientWidth;
      const hits = (a: typeof logo, b: typeof logo) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
      const controls = box(document.querySelector('header > div:last-of-type')!);
      return {
        vw,
        tabsShareBrandRow: nav.t < logo.b,
        navCentred: Math.abs((nav.l + nav.r) / 2 - vw / 2) < 4,
        navScrolls: navEl.scrollWidth > navEl.clientWidth + 1,
        allTabsInsideNavAndViewport: tabs.every((t) => t.l >= nav.l - 0.5 && t.r <= nav.r + 0.5 && t.l >= 0 && t.r <= vw),
        floatingPointFullyVisible: tabs.filter((t) => /Floating Point/.test(t.label)).every((t) => t.l >= nav.l - 0.5 && t.r <= nav.r + 0.5 && t.r <= vw),
        overlap: hits(logo, nav) || hits(nav, controls) || hits(logo, controls),
        pageOverflow: document.documentElement.scrollWidth - vw,
      };
    });
  }

  for (const width of [768, 1024, 1280, 1366, 1439]) {
    test(`below 1440px (${width}px): the five tabs sit on their own centred row, complete, with no clipping, scrolling or overlap`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(ROUTES.fp);
      await expect(landmark(page, 'fp')).toBeVisible();
      const g = await headerGeometry(page);
      expect(g.tabsShareBrandRow, 'tabs are on their own row').toBe(false);
      expect(g.navCentred, 'tab row is centred').toBe(true);
      expect(g.navScrolls, 'tab bar does not need to scroll').toBe(false);
      expect(g.allTabsInsideNavAndViewport, 'every tab is fully inside the bar and the viewport').toBe(true);
      expect(g.floatingPointFullyVisible, 'the Floating Point label is completely visible').toBe(true);
      expect(g.overlap, 'brand, tabs and controls do not overlap').toBe(false);
    });
  }

  for (const width of [1440, 1536, 1920]) {
    test(`from 1440px (${width}px): the tabs sit inline with the brand and controls, complete and without overlap`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(ROUTES.fp);
      await expect(landmark(page, 'fp')).toBeVisible();
      const g = await headerGeometry(page);
      expect(g.tabsShareBrandRow, 'tabs share the brand row').toBe(true);
      expect(g.navScrolls).toBe(false);
      expect(g.allTabsInsideNavAndViewport).toBe(true);
      expect(g.floatingPointFullyVisible).toBe(true);
      expect(g.overlap, 'brand, tabs and controls do not overlap').toBe(false);
    });
  }

  for (const width of [320, 390, 430]) {
    test(`phones (${width}px): the tab bar scrolls, and the active tab is in view after a direct load of every tool`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const key of ['converter', 'bits', 'ops', 'fp'] as const) {
        await page.goto(ROUTES[key]);
        await expect(landmark(page, key)).toBeVisible();
        const inView = await page.evaluate(() => {
          const bar = [...document.querySelectorAll('nav')].find((n) => n.querySelectorAll('button').length >= 5)!;
          const active = bar.querySelector('[aria-current="page"]')!.getBoundingClientRect();
          const b = bar.getBoundingClientRect();
          return active.left >= b.left - 0.5 && active.right <= b.right + 0.5;
        });
        expect(inView, `${key} @${width}: the highlighted tab must not be scrolled out of view`).toBe(true);
      }
    });
  }

  test('the active tab stays in view on a phone after tapping through the tools and after Back/Forward', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(ROUTES.converter);
    await expect(converterInput(page)).toBeVisible();
    const activeInView = () => page.evaluate(() => {
      const bar = [...document.querySelectorAll('nav')].find((n) => n.querySelectorAll('button').length >= 5)!;
      const a = bar.querySelector('[aria-current="page"]')!.getBoundingClientRect();
      const b = bar.getBoundingClientRect();
      return a.left >= b.left - 0.5 && a.right <= b.right + 0.5;
    });
    for (const tab of ['Floating Point', 'Text & ASCII', 'Binary Operations', 'Number Converter']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      expect(await activeInView(), tab).toBe(true);
    }
  });
});

test.describe('landing header CTA', () => {
  for (const width of [320, 360, 390, 399]) {
    test(`at ${width}px the header CTA reads "Open" but keeps the accessible name "Open BitForge"`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const cta = page.locator('header').getByRole('button', { name: 'Open BitForge' });
      await expect(cta).toBeVisible();
      expect(((await cta.innerText()) ?? '').trim()).toBe('Open');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }
  for (const width of [400, 430, 768, 1280]) {
    test(`at ${width}px the header CTA reads "Open BitForge"`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const cta = page.locator('header').getByRole('button', { name: 'Open BitForge' });
      expect(((await cta.innerText()) ?? '').trim()).toBe('Open BitForge');
    });
  }
});

test.describe('no horizontal overflow at tablet and desktop widths', () => {
  for (const width of [768, 1024, 1280, 1366, 1440, 1920]) {
    test(`no horizontal scroll on any screen at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const key of Object.keys(ROUTES) as RouteKey[]) {
        await page.goto(ROUTES[key]);
        await expect(landmark(page, key)).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${key} @${width}: horizontal overflow (px)`).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe('source-base synchronization', () => {
  test('switching the source base re-reads the same text; negatives, fractions and leading zeros stay consistent', async ({ page }) => {
    await page.goto(ROUTES.converter);
    const input = converterInput(page);
    await expect(input).toBeVisible();

    await page.getByRole('button', { name: /Base 2\s*Binary/ }).click();
    await input.fill('1101.101');
    await expect(card(page, 'Denary (Decimal)')).toContainText('13.625');
    await expect(card(page, 'Hexadecimal')).toContainText('D.A');

    // Same characters, now read as hexadecimal: 0x1101 + 0x.101 = 4353.062744140625 (checked with exact fractions).
    await page.getByRole('button', { name: /Base 16\s*Hexadecimal/ }).click();
    await expect(input).toHaveValue('1101.101');
    await expect(card(page, 'Denary (Decimal)')).toContainText('4353.062744140625');

    await input.fill('-FF');
    await expect(card(page, 'Denary (Decimal)')).toContainText('-255');
    await expect(card(page, 'Binary')).toContainText('-11111111');

    await page.getByRole('button', { name: /Base 8\s*Octal/ }).click();
    await input.fill('777');
    await expect(card(page, 'Hexadecimal')).toContainText('1FF');

    await page.getByRole('button', { name: /Base 10\s*Denary/ }).click();
    await input.fill('000255');
    await expect(card(page, 'Binary')).toContainText('11111111');
    await input.fill('1000');
    await expect(card(page, 'Custom Base (12)')).toContainText('6B4');
  });

  test('typing in the middle of the text keeps the caret in place (no cursor jump)', async ({ page }) => {
    await page.goto(ROUTES.converter);
    const input = converterInput(page);
    await input.fill('1234');
    await input.evaluate((el: HTMLInputElement) => el.setSelectionRange(2, 2));
    await page.keyboard.type('99', { delay: 30 });
    await expect(input).toHaveValue('129934');
    expect(await input.evaluate((el: HTMLInputElement) => el.selectionStart)).toBe(4);
  });

  test('paste followed by an immediate replacement never leaves a stale result', async ({ page }) => {
    await page.goto(ROUTES.converter);
    const input = converterInput(page);
    await input.fill('0xDEADBEEF');
    await input.fill('42');
    await expect(card(page, 'Hexadecimal')).toContainText('2A');
    await expect(card(page, 'Hexadecimal')).not.toContainText('DEADBEEF');
  });
});
