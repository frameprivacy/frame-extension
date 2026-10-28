import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { ALIAS_LABEL_MAX, ALIAS_SITES_MAX, aliasSite, shortDate, sortForSite, usedOn, type Alias } from '../lib/aliases';
import type { AliasAccess } from '../lib/messages';
import { Switch } from './Switch';
import { useAliases } from './useAliases';

interface Props {
  variant: 'popup' | 'options';
  access: AliasAccess;
  host: string | null;
  signingIn: boolean;
  signInAvailable: boolean;
  autofill: boolean;
  onAutofill: (value: boolean) => void;
  onReconnect: () => void;
}

/** Email aliases: make one, copy it, rename it, turn it off, delete it, and see which sites it was used on. */
export function AliasPanel({ variant, access, host, signingIn, signInAvailable, autofill, onAutofill, onReconnect }: Props) {
  const options = variant === 'options';
  const aliases = useAliases(access);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Alias | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const site = aliasSite(host);

  useEffect(() => {
    setCreated(null);
    setNotice(null);
  }, [host]);

  if (access === 'signed-out') {
    if (!options) return null;
    return (
      <>
        <h2 className="label" id="aliases">Email aliases</h2>
        <p className="empty panel">
          {signInAvailable
            ? 'Sign in to make Frame email aliases: a different address for each site, forwarded to your inbox. You can turn one off when it gets spam.'
            : 'Frame email aliases need a Frame account, and sign-in isn’t available in Safari yet.'}
        </p>
      </>
    );
  }

  const needsReconnect = access === 'needs-scope' || aliases.error?.reconnect === true;
  if (needsReconnect) {
    return (
      <>
        <h2 className="label" id="aliases">Email aliases</h2>
        <section className="panel pad alias-panel">
          <h3 className="host-sub">Allow email aliases</h3>
          <p className="hint">
            Frame can make a different email address for each site and fill it into sign-up forms. Sign in again and
            approve <strong>email aliases</strong> to turn this on. Your other settings stay as they are.
          </p>
          <button type="button" className="btn alias-gap" onClick={onReconnect} disabled={signingIn}>
            {signingIn ? 'Waiting…' : 'Allow aliases'}
          </button>
        </section>
      </>
    );
  }

  const list = aliases.list;
  const sorted = list ? sortForSite(list.aliases, site) : [];
  const shown = options ? sorted : sorted.filter((alias) => usedOn(alias, site));
  const atLimit = list ? list.aliases.length >= list.max : false;
  const unavailable = list ? !list.available : false;

  const make = async () => {
    setCreating(true);
    setNotice(null);
    const result = await aliases.create(options ? label.trim() || null : null, !options && site !== null);
    setCreating(false);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    setCreated(result.alias);
    setLabel('');
  };

  return (
    <>
      <h2 className="label" id="aliases" tabIndex={-1}>
        Email aliases
      </h2>
      <section className="panel alias-panel">
        <div className="alias-head">
          {options ? (
            <p className="hint alias-intro">
              Each alias forwards to {list?.destination || 'your Frame account email'}. Use a different one for each site, so you
              can see who shares it, and turn it off when it gets spam.
              {list ? ` ${list.aliases.length} of ${list.max} used.` : ''}
            </p>
          ) : (
            <p className="hint alias-intro">
              {site ? `Aliases for ${site}.` : 'Open a site to make an alias for it.'} Click the Frame button in an
              email field to fill one.
            </p>
          )}

          {options ? (
            <div className="alias-create">
              <input
                className="alias-input"
                type="text"
                value={label}
                maxLength={ALIAS_LABEL_MAX}
                placeholder="Label (optional), like Newsletter"
                aria-label="Label for the new alias"
                onChange={(event) => setLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !creating && !atLimit && !unavailable) void make();
                }}
              />
              <button type="button" className="btn" onClick={() => void make()} disabled={creating || atLimit || unavailable || !list}>
                {creating ? 'Making…' : 'New alias'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn alias-gap"
              onClick={() => void make()}
              disabled={creating || atLimit || unavailable || !list}
            >
              {creating ? 'Making…' : site ? `New alias for ${site}` : 'New alias'}
            </button>
          )}

          {atLimit ? (
            <p className="note hint">You have {list?.max} aliases, the most an account can have. Delete one to make another.</p>
          ) : null}
          {unavailable ? <p className="note hint">Email aliases aren’t available right now.</p> : null}
          {created ? <CreatedAlias alias={created} /> : null}
          <div role="status" aria-live="polite">
            {notice ? <p className="error alias-error">{notice}</p> : null}
          </div>
        </div>

        {aliases.error && !aliases.error.reconnect ? (
          <div className="alias-head">
            <p className="error alias-error" role="alert">{aliases.error.error}</p>
            <button type="button" className="text-link alias-gap" onClick={() => void aliases.reload()}>
              Try again
            </button>
          </div>
        ) : !list ? (
          <p className="hint alias-empty">{aliases.loading ? 'Loading aliases…' : ''}</p>
        ) : shown.length === 0 ? (
          <p className="hint alias-empty">
            {options ? 'No aliases yet.' : site ? `No aliases used on ${site} yet.` : 'No site open.'}
          </p>
        ) : (
          <ul className="alias-list">
            {shown.map((alias) => (
              <AliasItem
                key={alias.id}
                alias={alias}
                full={options}
                site={site}
                onEnabled={(enabled) => aliases.setEnabled(alias.id, enabled)}
                onRename={(next) => aliases.rename(alias.id, next)}
                onDelete={async () => {
                  const failed = await aliases.remove(alias.id);
                  // The deleted row and its buttons are gone; put focus somewhere it can carry on from.
                  if (failed === null) document.getElementById('aliases')?.focus();
                  return failed;
                }}
              />
            ))}
          </ul>
        )}

        {options ? (
          <div className="row alias-setting">
            <div className="row-copy">
              <h3>Offer aliases in email fields</h3>
              <p id="alias-autofill-desc">
                Shows a small Frame button in email fields on websites. Frame only fills a field when you pick an alias,
                and it notes the site against that alias. It doesn’t read what you type or send page contents anywhere.
              </p>
            </div>
            <Switch
              label="Offer aliases in email fields"
              describedBy="alias-autofill-desc"
              checked={autofill}
              onChange={onAutofill}
            />
          </div>
        ) : (
          <div className="alias-foot">
            <button type="button" className="text-link" onClick={() => void browser.runtime.openOptionsPage()}>
              Manage aliases
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function CreatedAlias({ alias }: { alias: Alias }) {
  return (
    <div className="alias-created">
      <p className="hint">New alias ready. It can take about a minute before mail to it arrives.</p>
      <div className="alias-address-row">
        <code className="alias-address" title={alias.address}>{alias.address}</code>
        <CopyButton text={alias.address} />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 1600);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <button
      type="button"
      className="text-link alias-copy"
      aria-label={`Copy ${text}`}
      onClick={() => {
        void navigator.clipboard
          .writeText(text)
          .then(() => setState('copied'))
          .catch(() => setState('failed'));
      }}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Couldn’t copy' : 'Copy'}
    </button>
  );
}

function AliasItem({
  alias,
  full,
  site,
  onEnabled,
  onRename,
  onDelete,
}: {
  alias: Alias;
  full: boolean;
  site: string | null;
  onEnabled: (enabled: boolean) => Promise<string | null>;
  onRename: (label: string | null) => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(alias.label ?? '');
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  // The pressed button goes away while editing or confirming, so focus moves with the form and comes back after.
  const back = useRef<'rename' | 'delete' | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
    else if (back.current === 'rename') renameRef.current?.focus();
    if (!editing && back.current === 'rename') back.current = null;
  }, [editing]);
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (back.current === 'delete') deleteRef.current?.focus();
    if (!confirming && back.current === 'delete') back.current = null;
  }, [confirming]);
  const stopEditing = () => {
    back.current = 'rename';
    setEditing(false);
  };
  const stopConfirming = () => {
    back.current = 'delete';
    setConfirming(false);
  };

  const act = async (task: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const failed = await task();
    setBusy(false);
    setError(failed);
    return failed === null;
  };

  const meta = [
    alias.createdOrigin ? `Made on ${alias.createdOrigin}` : 'Made on frameprivacy.com',
    full ? `${alias.forwardedCount} ${alias.forwardedCount === 1 ? 'email' : 'emails'} forwarded` : null,
    full && alias.createdAt ? `Since ${shortDate(alias.createdAt)}` : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <li className={alias.enabled ? 'alias-item' : 'alias-item is-off'}>
      <div className="alias-top">
        <div className="alias-copy-block">
          <div className="alias-address-row">
            <code className="alias-address" title={alias.address}>{alias.address}</code>
            <CopyButton text={alias.address} />
          </div>
          {alias.label ? <p className="alias-label">{alias.label}</p> : null}
          <p className="hint">
            {meta.join(' · ')}
            {alias.enabled ? '' : ' · Off: mail to it is dropped'}
          </p>
        </div>
        <Switch
          label={`Forward mail sent to ${alias.address}`}
          checked={alias.enabled}
          disabled={busy}
          onChange={(enabled) => void act(() => onEnabled(enabled))}
        />
      </div>

      <UsedOn alias={alias} site={site} />

      {full ? (
        editing ? (
          <div className="alias-edit">
            <input
              ref={inputRef}
              className="alias-input"
              type="text"
              value={draft}
              maxLength={ALIAS_LABEL_MAX}
              placeholder="Label"
              aria-label={`Label for ${alias.address}`}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  stopEditing();
                }
                if (event.key === 'Enter' && !busy) {
                  void act(() => onRename(draft.trim() || null)).then((ok) => ok && stopEditing());
                }
              }}
            />
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => void act(() => onRename(draft.trim() || null)).then((ok) => ok && stopEditing())}
            >
              Save
            </button>
            <button type="button" className="text-link" onClick={stopEditing} disabled={busy}>
              Cancel
            </button>
          </div>
        ) : confirming ? (
          <div
            className="confirm"
            role="group"
            aria-label={`Delete ${alias.address}`}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !busy) {
                event.stopPropagation();
                stopConfirming();
              }
            }}
          >
            <p className="hint">
              Delete {alias.address}? Mail sent to it stops arriving, and Frame never gives this address out again. To
              pause it instead, turn it off.
            </p>
            <div className="site-actions">
              <button type="button" className="btn" ref={confirmRef} disabled={busy} onClick={() => void act(onDelete)}>
                {busy ? 'Deleting…' : 'Delete alias'}
              </button>
              <button type="button" className="text-link" onClick={stopConfirming} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="site-actions">
            <button
              type="button"
              className="text-link"
              ref={renameRef}
              aria-label={`${alias.label ? 'Rename' : 'Add label to'} ${alias.address}`}
              onClick={() => {
                setDraft(alias.label ?? '');
                setEditing(true);
              }}
            >
              {alias.label ? 'Rename' : 'Add label'}
            </button>
            <button
              type="button"
              className="text-link"
              ref={deleteRef}
              aria-label={`Delete ${alias.address}`}
              onClick={() => setConfirming(true)}
            >
              Delete
            </button>
          </div>
        )
      ) : null}
      {error ? (
        <p className="error alias-error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function UsedOn({ alias, site }: { alias: Alias; site: string | null }) {
  if (alias.usages.length === 0) return <p className="hint alias-used">Not used on a site yet.</p>;
  return (
    <details className="alias-used">
      <summary>
        Used on {alias.usages.length} {alias.usages.length === 1 ? 'site' : 'sites'}
        {alias.usages.length >= ALIAS_SITES_MAX ? ` (Frame keeps the latest ${ALIAS_SITES_MAX})` : ''}
      </summary>
      <ul>
        {alias.usages.map((usage) => (
          <li key={usage.site}>
            <span className={usage.site === site ? 'alias-site is-here' : 'alias-site'}>{usage.site}</span>
            <span className="pill">
              {usage.lastSeenAt ? `Last seen ${shortDate(usage.lastSeenAt)}` : ''}
              {usage.timesSeen > 1 ? ` · ${usage.timesSeen} times` : ''}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
