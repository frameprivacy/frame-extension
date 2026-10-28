import { browser } from 'wxt/browser';
import { looksLikeEmailField } from '../lib/aliases';
import type { AliasMessage, PageAlias, PageCreateResult, PageListResult, PageUseResult } from '../lib/messages';
import { locale, t } from '../lib/i18n';

// 24px is the smallest pointer target WCAG 2.2 (2.5.8) allows; smaller only when the field itself is shorter.
const BADGE_SIZE = 24;
const MENU_WIDTH = 292;
const Z_TOP = '2147483647';

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; }
.badge {
  position: fixed; width: ${BADGE_SIZE}px; height: ${BADGE_SIZE}px; padding: 3px; margin: 0;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255,255,255,0.18); border-radius: 7px; background: #000; cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25); opacity: 0.92;
}
.badge:hover, .badge[aria-expanded="true"] { opacity: 1; border-color: rgba(255,255,255,0.45); }
.badge:focus-visible, .menu button:focus-visible { outline: 2px solid #e7eefc; outline-offset: 2px; }
.badge svg { width: 100%; height: 100%; display: block; }
.menu {
  position: fixed; width: ${MENU_WIDTH}px; max-height: 360px; overflow: auto; padding: 8px;
  border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; background: #0b0b0c; color: #fff;
  font: 13px/1.35 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  box-shadow: 0 12px 32px rgba(0,0,0,0.45);
}
.title { margin: 2px 6px 8px; color: rgba(255,255,255,0.6); font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; }
.menu button.item {
  display: block; width: 100%; margin: 0; padding: 8px 10px; border: 0; border-radius: 9px;
  background: none; color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.menu button.item:hover, .menu button.item:focus-visible { background: rgba(255,255,255,0.08); }
.menu button.primary { background: #fff; color: #000; font-weight: 500; }
.menu button.primary:hover, .menu button.primary:focus-visible { background: #f0f0f0; }
.menu button:disabled { opacity: 0.5; cursor: default; }
@media (forced-colors: active) {
  .badge, .menu { border-color: CanvasText; }
  .menu button.item:focus-visible { outline: 2px solid Highlight; }
}
.addr { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.sub { display: block; margin-top: 2px; color: rgba(255,255,255,0.55); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.primary .sub { color: rgba(0,0,0,0.6); }
.sep { height: 1px; margin: 8px 4px; background: rgba(255,255,255,0.1); }
.status { margin: 8px 6px 2px; color: rgba(255,255,255,0.6); font-size: 12px; }
.status.error { color: #f0d0d0; }
`;

/** The two halves of the Frame symbol, drawn inline so pages never load a file from the extension. */
const SYMBOL_PATHS: [string, string][] = [
  ['M41 30 H154 Q157 30 154 33 L126 61 Q123 64 118 64 H73 Q66 64 66 71 V126 Q66 133 59 133 H38 Q30 133 30 125 V41 Q30 30 41 30 Z', '#b7c4de'],
  ['M159 170 H46 Q43 170 46 167 L74 139 Q77 136 82 136 H127 Q134 136 134 129 V74 Q134 67 141 67 H162 Q170 67 170 75 V159 Q170 170 159 170 Z', '#6c7d9e'],
];
const SVG_NS = 'http://www.w3.org/2000/svg';

let started = false;

type ListData = Extract<PageListResult, { ok: true }>['data'];

/**
 * Shows a small Frame button inside a focused email field. The button opens a menu to make a new alias for
 * this site or fill one you already have. Everything lives in a closed shadow root, so the page can't read the
 * list of aliases. The only thing written to the page is the address you choose, into the field you chose.
 */
export function startAliasAutofill(): void {
  if (started) return;
  started = true;

  const host = document.createElement('frame-alias');
  host.style.cssText = `all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: ${Z_TOP};`;
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = STYLE;
  shadow.append(style);

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'badge';
  // The page may be in any language; this UI follows the browser language, so screen readers read it in that one.
  badge.lang = locale();
  badge.title = t('Use a Frame email alias (Alt+Down)');
  badge.setAttribute('aria-label', t('Use a Frame email alias'));
  badge.setAttribute('aria-keyshortcuts', 'Alt+ArrowDown');
  badge.setAttribute('aria-haspopup', 'menu');
  badge.setAttribute('aria-expanded', 'false');
  badge.append(symbol());
  badge.hidden = true;

  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', t('Frame email alias'));
  menu.lang = locale();
  menu.hidden = true;
  shadow.append(badge, menu);

  let field: HTMLInputElement | null = null;
  let hideTimer: number | null = null;
  let frame = 0;
  let busy = false;


  const place = () => {
    frame = 0;
    if (!field || !field.isConnected) return hide();
    const rect = field.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 14 || rect.bottom < 0 || rect.top > window.innerHeight) {
      badge.hidden = true;
      menu.hidden = true;
      return;
    }
    const size = Math.min(BADGE_SIZE, Math.max(16, rect.height - 6));
    badge.style.width = `${size}px`;
    badge.style.height = `${size}px`;
    badge.style.left = `${Math.round(rect.right - size - 6)}px`;
    badge.style.top = `${Math.round(rect.top + (rect.height - size) / 2)}px`;
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    const below = window.innerHeight - rect.bottom;
    menu.style.left = `${Math.round(left)}px`;
    if (below < 220 && rect.top > below) {
      menu.style.top = '';
      menu.style.bottom = `${Math.round(window.innerHeight - rect.top + 6)}px`;
    } else {
      menu.style.bottom = '';
      menu.style.top = `${Math.round(rect.bottom + 6)}px`;
    }
  };
  const schedule = () => {
    if (!frame && field) frame = requestAnimationFrame(place);
  };

  const show = (input: HTMLInputElement) => {
    cancelHide();
    if (field !== input) closeMenu();
    field = input;
    if (!host.isConnected) document.documentElement.append(host);
    badge.hidden = false;
    place();
  };

  function hide() {
    field = null;
    badge.hidden = true;
    closeMenu();
  }

  function cancelHide() {
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    hideTimer = null;
  }

  function closeMenu() {
    menu.hidden = true;
    badge.setAttribute('aria-expanded', 'false');
  }

  const isOurs = (node: EventTarget | null) => node === host;

  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.composedPath()[0];
      if (isOurs(event.target)) return cancelHide();
      if (target instanceof HTMLInputElement && isEmailField(target)) show(target);
      else if (!menu.hidden) closeMenu();
    },
    true,
  );
  document.addEventListener(
    'focusout',
    (event) => {
      if (isOurs(event.relatedTarget) || isOurs(event.target)) return;
      cancelHide();
      hideTimer = window.setTimeout(() => {
        if (menu.hidden) hide();
      }, 150);
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (menu.hidden || isOurs(event.target) || event.target === field) return;
      closeMenu();
      if (document.activeElement !== field) hide();
    },
    true,
  );
  window.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);

  // Keep focus in the field when the button is pressed with a mouse.
  badge.addEventListener('mousedown', (event) => event.preventDefault());
  badge.addEventListener('click', () => {
    if (!menu.hidden) {
      closeMenu();
      field?.focus();
      return;
    }
    void openMenu();
  });
  shadow.addEventListener('keydown', (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeMenu();
      field?.focus();
      return;
    }
    if (menu.hidden) return;
    // A menu moves with the arrow keys (WAI-ARIA menu pattern). Tab leaves it, back to the field.
    if (event.key === 'Tab') {
      event.preventDefault();
      closeMenu();
      field?.focus();
      return;
    }
    const items = [...menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)')];
    if (items.length === 0) return;
    const at = items.indexOf(shadow.activeElement as HTMLButtonElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = at < 0 ? 0 : (at + 1) % items.length;
    else if (event.key === 'ArrowUp') next = at < 0 ? items.length - 1 : (at - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    if (next < 0) return;
    event.preventDefault();
    event.stopPropagation();
    items[next]?.focus();
  });
  // Alt+Down in an email field opens the menu from the keyboard, like a native suggestion list.
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'ArrowDown' && event.altKey && field && event.target === field && menu.hidden) {
        event.preventDefault();
        void openMenu();
      }
    },
    true,
  );

  async function openMenu() {
    if (!field) return;
    menu.hidden = false;
    badge.setAttribute('aria-expanded', 'true');
    place();
    render({ loading: true });
    const result = await ask<PageListResult>({ type: 'alias.page-list' });
    if (menu.hidden) return;
    if (!result.ok) return render({ error: result.error, reconnect: result.reconnect });
    render({ data: result.data });
  }

  function render(view: { loading?: boolean; error?: string; reconnect?: boolean; data?: ListData; done?: string }) {
    menu.replaceChildren();
    const title = document.createElement('p');
    title.className = 'title';
    title.textContent = t('Frame alias');
    menu.append(title);

    if (view.loading) {
      menu.append(status(t('Loading your aliases…')));
      return;
    }
    if (view.error) {
      menu.append(status(view.error, true));
      if (view.reconnect) menu.append(status(t('Open Frame from the toolbar to sign in again.')));
      return;
    }
    const data = view.data;
    if (!data) return;

    const create = item(
      t('New alias for this site'),
      data.site ? t('Remembers it was made on {site}', { site: data.site }) : t('Forwards to your Frame email'),
      true,
    );
    create.disabled = !data.canCreate;
    create.addEventListener('click', () => void createAndFill(create));
    menu.append(create);
    if (!data.canCreate) {
      menu.append(status(t('You can’t make another alias right now. Manage aliases from Frame’s settings.')));
    }

    if (data.aliases.length > 0) {
      const sep = document.createElement('div');
      sep.className = 'sep';
      menu.append(sep);
      for (const alias of data.aliases) {
        const button = item(alias.address, aliasDetail(alias));
        button.addEventListener('click', () => void useExisting(alias, button));
        menu.append(button);
      }
    }
    (menu.querySelector('button:not(:disabled)') as HTMLButtonElement | null)?.focus();
  }

  async function createAndFill(button: HTMLButtonElement) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    menu.append(status(t('Making a new alias…')));
    const result = await ask<PageCreateResult>({ type: 'alias.page-create' });
    busy = false;
    if (!result.ok) return render({ error: result.error, reconnect: result.reconnect });
    fill(result.data.address);
  }

  async function useExisting(alias: PageAlias, button: HTMLButtonElement) {
    if (busy) return;
    button.disabled = true;
    fill(alias.address);
    if (!alias.usedHere) {
      // Note the site against the alias. Filling never waits on this.
      const result = await ask<PageUseResult>({ type: 'alias.page-use', id: alias.id });
      if (!result.ok) console.debug('[Frame] Could not note this site on the alias:', result.error);
    }
  }

  function fill(address: string) {
    const input = field;
    closeMenu();
    if (!input || !input.isConnected) return;
    setInputValue(input, address);
    input.focus();
  }
}

function symbol(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const [d, fill] of SYMBOL_PATHS) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', fill);
    svg.append(path);
  }
  return svg;
}

function item(main: string, detail: string, primary = false): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = primary ? 'item primary' : 'item';
  button.setAttribute('role', 'menuitem');
  const a = document.createElement('span');
  a.className = 'addr';
  a.textContent = main;
  const b = document.createElement('span');
  b.className = 'sub';
  b.textContent = detail;
  button.append(a, b);
  return button;
}

function status(text: string, error = false): HTMLParagraphElement {
  const p = document.createElement('p');
  p.className = error ? 'status error' : 'status';
  p.setAttribute('role', error ? 'alert' : 'status');
  p.textContent = text;
  return p;
}

function aliasDetail(alias: PageAlias): string {
  const parts = [alias.label, alias.usedHere ? t('Used on this site') : null].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : t('Fill this alias');
}

function isEmailField(input: HTMLInputElement): boolean {
  if (input.disabled || input.readOnly) return false;
  return looksLikeEmailField({
    type: input.getAttribute('type') ?? '',
    name: input.name ?? '',
    id: input.id ?? '',
    autocomplete: input.getAttribute('autocomplete') ?? '',
    placeholder: input.placeholder ?? '',
    ariaLabel: input.getAttribute('aria-label') ?? '',
  });
}

/** Sets the value the way typing would, so frameworks that track input events see the change. */
function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

async function ask<T extends { ok: boolean }>(message: AliasMessage): Promise<T> {
  try {
    const response: unknown = await browser.runtime.sendMessage(message);
    if (response && typeof response === 'object' && 'ok' in response) return response as T;
  } catch {
    /* Frame was updated or turned off while this page was open. */
  }
  return { ok: false, error: t('Frame isn’t responding. Reload this page and try again.'), code: null, reconnect: false } as unknown as T;
}
