import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { TOGGLES, permissionLabel, permissionsFor } from '../lib/catalog';
import { signInReturnOrigin } from '../lib/auth';
import { SAFARI_REDIRECT_URI } from '../lib/extension-ids';
import type { BrowserTarget } from '../lib/platform';
import { controlDisabled, controlNote } from '../lib/control';
import type { FrameExposure } from '../lib/frame/types';
import { areaLabel, bandLabel, clampScore, scoreBand } from '../lib/score';
import type { PublicAccount } from '../lib/messages';
import { fingerprintEnabledForHost, trackersEnabledForHost } from '../lib/settings';
import { SITE_ORIGINS } from '../lib/site-access';
import { AliasPanel } from './AliasPanel';
import { ScoreRing } from './ScoreRing';
import { Switch } from './Switch';
import { useExtensionState } from './useExtensionState';
import { locale, plural, t } from '../lib/i18n';

export function ExtensionScreen({ variant }: { variant: 'popup' | 'options' }) {
  const { state, error, send, refresh } = useExtensionState();
  const options = variant === 'options';
  const signIn = () => {
    // Safari only shows Frame the return page's address on a site it's allowed on.
    // permissions.request must run straight from the click, so it's asked here.
    if (state?.browser === 'safari' && browser.permissions?.request) {
      void browser.permissions
        .request({ origins: [signInReturnOrigin(SAFARI_REDIRECT_URI)] })
        .catch(() => false)
        .then(() => send({ type: 'frame.sign-in' }));
      return;
    }
    void send({ type: 'frame.sign-in' });
  };

  return (
    <div className="shell">
      <main className={options ? 'options-body' : 'popup-body'}>
        <header className="header">
          <img className="mark" src="/wordmark.svg" alt="Frame" />
          {state && (state.signInAvailable || state.account !== null) ? (
            <AccountButton
              signedIn={state.account !== null}
              signingIn={state.signingIn}
              onSignIn={signIn}
              onSignOut={() => void send({ type: 'frame.sign-out' })}
            />
          ) : null}
        </header>
        {options ? null : <h1 className="visually-hidden">{t('Frame privacy controls')}</h1>}

        {options ? (
          <>
            <h1 className="display">{t('This browser.')}</h1>
            <p className="lede">
              {t('Settings for this browser. They work without a Frame account. Nothing here makes you anonymous.')}
            </p>
          </>
        ) : null}

        {error ? (
          <div className="error-block" role="alert">
            <p className="error">{error}</p>
            {!state ? (
              <button type="button" className="text-link" onClick={() => void refresh()}>
                {t('Try again')}
              </button>
            ) : null}
          </div>
        ) : null}
        {!state ? (
          error ? null : <LoadingState />
        ) : (
          <>
            {state.siteAccess === false ? <SiteAccessCard browser={state.browser} onGranted={() => void refresh()} /> : null}
            {state.account ? <ScoreCard account={state.account} /> : <SignedOutCard signInAvailable={state.signInAvailable} />}
            {state.authError ? (
              <p className="error" role="alert">
                {state.authError}
              </p>
            ) : null}

            {variant === 'popup' ? (
              <SiteCard
                host={state.tab.host}
                restricted={state.tab.restricted}
                enabled={state.tab.host ? fingerprintEnabledForHost(state.settings, state.tab.host) : false}
                customized={
                  state.tab.host
                    ? Object.prototype.hasOwnProperty.call(state.settings.fingerprintHosts, state.tab.host)
                    : false
                }
                trackersOn={state.tab.host ? trackersEnabledForHost(state.settings, state.tab.host) : false}
                trackersCustomized={
                  state.tab.host
                    ? Object.prototype.hasOwnProperty.call(state.settings.trackerHosts, state.tab.host)
                    : false
                }
                trackerNote={controlNote(state.controls.stripTrackers)}
                trackerDisabled={controlDisabled(state.controls.stripTrackers)}
                notice={state.siteNotice?.host === state.tab.host ? state.siteNotice : null}
                note={controlNote(state.controls.fingerprintProtection)}
                disabled={controlDisabled(state.controls.fingerprintProtection)}
                onChange={(enabled) => {
                  if (!state.tab.host) return;
                  void send({ type: 'frame.set-host', host: state.tab.host, enabled });
                }}
                onTrackers={(enabled) => {
                  if (!state.tab.host) return;
                  void send({ type: 'frame.set-tracker-host', host: state.tab.host, enabled });
                }}
                onForget={() => send({ type: 'frame.forget-site' })}
                onReload={() => send({ type: 'frame.reload-tab' })}
              />
            ) : null}

            <AliasPanel
              variant={variant}
              access={state.aliasAccess}
              host={state.tab.host}
              signingIn={state.signingIn}
              signInAvailable={state.signInAvailable}
              autofill={state.settings.aliasAutofill}
              onAutofill={(value) => void send({ type: 'frame.set-setting', id: 'aliasAutofill', value })}
              onReconnect={signIn}
            />

            <Protections
              state={state}
              options={options}
              onChange={(id, value) => void send({ type: 'frame.set-setting', id, value })}
            />

            {options ? (
              <Exceptions
                state={state}
                onClear={(host) => void send({ type: 'frame.clear-host', host })}
                onClearTracker={(host) => void send({ type: 'frame.clear-tracker-host', host })}
              />
            ) : null}
            {options ? <PermissionList browser={state.browser} signInAvailable={state.signInAvailable} /> : null}

            <footer className="footer">
              <p>{t('Frame does not make you anonymous, and it does not replace a VPN or a breach check.')}</p>
              <div className="footer-links">
                {variant === 'popup' ? (
                  <button type="button" className="text-link" onClick={() => void browser.runtime.openOptionsPage()}>
                    {t('All settings')}
                  </button>
                ) : null}
                <a href="https://frameprivacy.com" target="_blank" rel="noreferrer">
                  frameprivacy.com
                </a>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

function AccountButton({
  signedIn,
  signingIn,
  onSignIn,
  onSignOut,
}: {
  signedIn: boolean;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  if (!signedIn) {
    return (
      <button type="button" className="btn" onClick={onSignIn} disabled={signingIn}>
        {signingIn ? t('Waiting…') : t('Sign in')}
      </button>
    );
  }
  return (
    <button type="button" className="text-link header-link" onClick={onSignOut}>
      {t('Sign out')}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="loading" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{t('Loading Frame…')}</span>
      <div className="panel skeleton skeleton-score" />
      <div className="panel skeleton skeleton-rows" />
    </div>
  );
}

function SignedOutCard({ signInAvailable }: { signInAvailable: boolean }) {
  return (
    <section className="panel score-panel" aria-labelledby="score-title">
      <div className="score-top">
        <ScoreRing score={null} />
        <div className="score-copy">
          <h2 className="score-title" id="score-title">
            {t('Privacy Score')}
          </h2>
          <p className="hint">
            {signInAvailable
              ? t('Sign in to see the score from your Frame account. Optional: the protections below work without one.')
              : t('Frame account sign-in isn’t available in Safari yet. Every protection below works without an account.')}
          </p>
        </div>
      </div>
    </section>
  );
}

function ScoreCard({ account }: { account: PublicAccount }) {
  const name = account.name || account.email;
  const score = account.exposure?.score ?? null;
  return (
    <section className="panel score-panel" aria-labelledby="score-title">
      <div className="score-top">
        <ScoreRing score={score} />
        <div className="score-copy">
          <h2 className="score-title" id="score-title">
            {t('Privacy Score')}
          </h2>
          {score === null ? (
            <p className="score-band">{t('Not checked yet')}</p>
          ) : (
            <p className="score-band">{bandLabel(scoreBand(clampScore(score)))}</p>
          )}
          <div className="who">
            <span className="who-name" title={name}>{name}</span>
            {account.plan ? <span className="plan">{planLabel(account.plan)}</span> : null}
          </div>
          {account.name ? <div className="who-mail" title={account.email}>{account.email}</div> : null}
        </div>
      </div>
      {score === null ? (
        <p className="hint score-note">{t('Frame shows a score once it has checked something for your account.')}</p>
      ) : null}
      <ExposureMeta exposure={account.exposure} />
      <AreaList exposure={account.exposure} />
      {account.preview ? <p className="preview">{t('Preview data, not connected')}</p> : null}
    </section>
  );
}

function Protections({
  state,
  options,
  onChange,
}: {
  state: NonNullable<ReturnType<typeof useExtensionState>['state']>;
  options: boolean;
  onChange: (id: (typeof TOGGLES)[number]['id'], value: boolean) => void;
}) {
  const offered = TOGGLES.filter((toggle) => state.controls[toggle.id]?.kind !== 'unavailable');
  const missing = TOGGLES.filter((toggle) => state.controls[toggle.id]?.kind === 'unavailable');
  const row = (toggle: (typeof TOGGLES)[number]) => {
    const control = state.controls[toggle.id];
    const note = control?.kind === 'unavailable' ? null : controlNote(control);
    return (
      <div className={controlDisabled(control) ? 'row is-locked' : 'row'} key={toggle.id}>
        <div className="row-copy">
          <h3>{toggle.title}</h3>
          <p id={`${toggle.id}-desc`}>{options ? toggle.detail : toggle.summary}</p>
          {note ? (
            <p className="note" id={`${toggle.id}-note`}>
              {note}
            </p>
          ) : null}
        </div>
        <Switch
          label={toggle.title}
          describedBy={note ? `${toggle.id}-desc ${toggle.id}-note` : `${toggle.id}-desc`}
          checked={state.settings[toggle.id]}
          disabled={controlDisabled(control)}
          onChange={(value) => onChange(toggle.id, value)}
        />
      </div>
    );
  };
  return (
    <>
      <h2 className="label">{t('Protections')}</h2>
      <div className="panel rows">{offered.map(row)}</div>
      {missing.length > 0 ? (
        <details className="panel unavailable">
          <summary>
            <span>{t('Not offered by this browser')}</span>
            <span className="count">{missing.length}</span>
          </summary>
          <p className="hint unavailable-hint">{unavailableHint(state.browser)}</p>
          <div className="rows">{missing.map(row)}</div>
        </details>
      ) : null}
    </>
  );
}

function unavailableHint(target: BrowserTarget): string {
  if (target === 'safari') {
    return t('Safari gives extensions no privacy settings and no way to change response headers, so Frame leaves these alone. Safari has its own: Prevent cross-site tracking and Hide IP address, in Safari’s Privacy settings.');
  }
  return t('This browser has no setting an extension can change for these, so Frame leaves them alone.');
}

function ExposureMeta({ exposure }: { exposure: FrameExposure | null }) {
  if (!exposure) return null;
  const month = formatMonth(exposure.month);
  const findings =
    typeof exposure.openFindings === 'number'
      ? plural(exposure.openFindings, '{n} open finding', '{n} open findings')
      : null;
  const breaches =
    typeof exposure.openBreaches === 'number'
      ? plural(exposure.openBreaches, '{n} open breach', '{n} open breaches')
      : null;
  const parts = [month, findings, breaches].filter((part): part is string => part !== null);
  if (parts.length === 0) return null;
  return <p className="meta">{parts.join(' · ')}</p>;
}

function AreaList({ exposure }: { exposure: FrameExposure | null }) {
  if (!exposure || exposure.areas.length === 0) return null;
  return (
    <ul className="areas" aria-label={t('What makes up your score')}>
      {exposure.areas.map((area, index) => (
        <li key={`${area.key}-${index}`}>
          <div className="area-head">
            <span>{areaLabel(area.key)}</span>
            <span className="area-score">{area.score === null ? t('Not checked yet') : clampScore(area.score)}</span>
          </div>
          {area.score !== null ? <AreaBar value={clampScore(area.score)} /> : null}
        </li>
      ))}
    </ul>
  );
}

function AreaBar({ value }: { value: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <div className="bar" aria-hidden="true">
      <div className="bar-fill" style={{ width: `${width}%` }} />
    </div>
  );
}

function planLabel(plan: NonNullable<PublicAccount['plan']>): string {
  if (plan === 'plus') return t('Plus');
  if (plan === 'household') return t('Household');
  if (plan === 'business') return t('Business');
  return t('Free');
}


function SiteCard({
  host,
  restricted,
  enabled,
  customized,
  trackersOn,
  trackersCustomized,
  trackerNote,
  trackerDisabled,
  notice,
  note,
  disabled,
  onChange,
  onTrackers,
  onForget,
  onReload,
}: {
  host: string | null;
  restricted: boolean;
  enabled: boolean;
  customized: boolean;
  trackersOn: boolean;
  trackersCustomized: boolean;
  trackerNote: string | null;
  trackerDisabled: boolean;
  notice: { tone: 'ok' | 'error'; text: string; canReload: boolean } | null;
  note: string | null;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
  onTrackers: (enabled: boolean) => void;
  onForget: () => Promise<boolean>;
  onReload: () => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const clearRef = useRef<HTMLButtonElement>(null);
  const forgetRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  useEffect(() => {
    setConfirming(false);
    setClearing(false);
  }, [host]);
  // The button that was pressed goes away, so keyboard focus moves with the question and back.
  useEffect(() => {
    if (confirming) clearRef.current?.focus();
    else if (returnFocus.current) forgetRef.current?.focus();
    returnFocus.current = false;
  }, [confirming]);
  const cancel = () => {
    returnFocus.current = true;
    setConfirming(false);
  };

  return (
    <>
      <h2 className="label">{t('This site')}</h2>
      <section className="panel site-panel">
        {restricted ? (
          <>
            <h3 className="host">{t('Browser page')}</h3>
            <p className="hint">{t('Frame doesn’t change pages like this.')}</p>
          </>
        ) : !host ? (
          <>
            <h3 className="host">{t('No site')}</h3>
            <p className="hint">{t('Open a page to set fingerprinting for that site.')}</p>
          </>
        ) : (
          <>
            <div className="site-row">
              <div>
                <h3 className="host">{host}</h3>
                <p className="hint">
                  {customized
                    ? t('Fingerprinting is saved for this site only.')
                    : t('Fingerprinting follows your default for every site.')}
                </p>
              </div>
              <Switch
                label={t('Fingerprinting protection for {host}', { host })}
                checked={enabled}
                disabled={disabled}
                onChange={onChange}
              />
            </div>
            <div className="site-row site-follow">
              <div>
                <h4 className="host-sub">{t('Clean tracking links')}</h4>
                <p className="hint">
                  {trackersCustomized
                    ? t('Saved for this site and its subdomains.')
                    : t('Follows your default for this site and its subdomains.')}
                </p>
              </div>
              <Switch
                label={t('Clean tracking links for {host}', { host })}
                checked={trackersOn}
                disabled={trackerDisabled}
                onChange={onTrackers}
              />
            </div>
            {trackerNote ? <p className="note hint">{trackerNote}</p> : null}
            {confirming ? (
              <div
                className="confirm"
                role="group"
                aria-label={t('Forget {host}', { host })}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && !clearing) {
                    event.stopPropagation();
                    cancel();
                  }
                }}
              >
                <p className="hint">
                  {t(
                    'Clear cookies and site data for {host} on this device? You’ll be signed out of that site. This does not erase history, or data the site already kept on its servers. Storage on subdomains we can see is included. Chrome also clears cookies for the wider site. Open tabs drop session storage.',
                    { host },
                  )}
                </p>
                <div className="site-actions">
                  <button
                    type="button"
                    className="btn"
                    ref={clearRef}
                    disabled={clearing}
                    onClick={() => {
                      setClearing(true);
                      void onForget().then((ok) => {
                        if (ok) {
                          returnFocus.current = true;
                          setConfirming(false);
                        }
                        setClearing(false);
                      });
                    }}
                  >
                    {clearing ? t('Clearing…') : t('Clear data')}
                  </button>
                  <button type="button" className="text-link" onClick={cancel} disabled={clearing}>
                    {t('Cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="text-link site-forget" ref={forgetRef} onClick={() => setConfirming(true)}>
                {t('Forget this site')}
              </button>
            )}
            <div role="status" aria-live="polite">
              {notice ? <p className={notice.tone === 'error' ? 'error notice' : 'hint notice'}>{notice.text}</p> : null}
            </div>
            {notice?.canReload ? (
              <button type="button" className="text-link" onClick={() => void onReload()}>
                {t('Reload tab')}
              </button>
            ) : null}
          </>
        )}
        {note ? <p className="note hint">{note}</p> : null}
      </section>
    </>
  );
}

function SiteAccessCard({ browser: target, onGranted }: { browser: BrowserTarget; onGranted: () => void }) {
  const [failed, setFailed] = useState(false);
  const safari = target === 'safari';
  return (
    <section className="panel access-panel" aria-labelledby="access-title">
      <h2 className="host-sub" id="access-title">
        {safari ? t('Frame isn’t allowed on every website') : t('Frame can’t reach websites')}
      </h2>
      {safari ? (
        <p className="hint">
          {t(
            'Safari asks site by site. Global Privacy Control, clean tracking links, and fingerprinting protection only run on websites you’ve allowed. To allow all of them: on Mac, Safari › Settings › Extensions › Frame; on iPhone and iPad, Settings › Apps › Safari › Extensions › Frame. Frame doesn’t read or send page content.',
          )}
        </p>
      ) : (
        <p className="hint">
          {t(
            'Website access for Frame is off in this browser, so Global Privacy Control, clean tracking links, referrer trimming, and fingerprinting protection aren’t running. Frame doesn’t read or send page content.',
          )}
        </p>
      )}
      <button
        type="button"
        className="btn access-btn"
        onClick={() => {
          // permissions.request must run straight from the click.
          void browser.permissions
            .request({ origins: [...SITE_ORIGINS] })
            .then((granted) => {
              setFailed(!granted);
              if (granted) onGranted();
            })
            .catch(() => setFailed(true));
        }}
      >
        {safari ? t('Allow on all websites') : t('Allow website access')}
      </button>
      {failed ? (
        <p className="error" role="alert">
          {safari
            ? t('Access wasn’t granted. You can also allow Frame in Safari’s Extensions settings.')
            : t('Access wasn’t granted. You can also turn it on from this add-on’s page in the browser’s add-on settings.')}
        </p>
      ) : null}
    </section>
  );
}

function Exceptions({
  state,
  onClear,
  onClearTracker,
}: {
  state: NonNullable<ReturnType<typeof useExtensionState>['state']>;
  onClear: (host: string) => void;
  onClearTracker: (host: string) => void;
}) {
  const hosts = Object.entries(state.settings.fingerprintHosts).sort(([a], [b]) => a.localeCompare(b));
  const trackers = Object.entries(state.settings.trackerHosts).sort(([a], [b]) => a.localeCompare(b));
  return (
    <>
      <h2 className="label">{t('Site exceptions')}</h2>
      {hosts.length === 0 ? (
        <p className="empty panel">
          {t(
            'No fingerprint exceptions. Open Frame on a page that breaks, and turn fingerprinting off for that site only. Subdomains are separate: www.example.com is not example.com.',
          )}
        </p>
      ) : (
        <ul className="hosts panel">
          {hosts.map(([host, enabled]) => (
            <li key={host}>
              <span>{host}</span>
              <span className="pill">{enabled ? t('Fingerprinting on') : t('Fingerprinting off')}</span>
              <button
                type="button"
                className="text-link"
                aria-label={t('Remove fingerprinting exception for {host}', { host })}
                onClick={() => onClear(host)}
              >
                {t('Remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2 className="label">{t('Tracking link exceptions')}</h2>
      {trackers.length === 0 ? (
        <p className="empty panel">
          {t(
            'No tracking-link exceptions. Turn clean tracking links off for a site from the popup when a link breaks. That choice also covers its subdomains.',
          )}
        </p>
      ) : (
        <ul className="hosts panel">
          {trackers.map(([host, enabled]) => (
            <li key={host}>
              <span>{host}</span>
              <span className="pill">{enabled ? t('Cleaning on') : t('Cleaning off')}</span>
              <button
                type="button"
                className="text-link"
                aria-label={t('Remove tracking-link exception for {host}', { host })}
                onClick={() => onClearTracker(host)}
              >
                {t('Remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function PermissionList({ browser: target, signInAvailable }: { browser: BrowserTarget; signInAvailable: boolean }) {
  return (
    <>
      <h2 className="label">{t('Permissions')}</h2>
      <dl className="permissions panel">
        {permissionsFor(target, signInAvailable).map((permission) => (
          <div key={permission.name}>
            <dt>{permissionLabel(permission.name)}</dt>
            <dd>{permission.why}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function formatMonth(month: string | null): string | null {
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  return new Intl.DateTimeFormat(locale(), { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  );
}
