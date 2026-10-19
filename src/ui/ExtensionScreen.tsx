import { browser } from 'wxt/browser';
import { TOGGLES, PERMISSIONS } from '../lib/catalog';
import { controlDisabled, controlNote } from '../lib/control';
import type { FrameExposure } from '../lib/frame/types';
import type { PublicAccount } from '../lib/messages';
import { fingerprintEnabledForHost } from '../lib/settings';
import { useExtensionState } from './useExtensionState';

export function ExtensionScreen({ variant }: { variant: 'popup' | 'options' }) {
  const { state, error, send } = useExtensionState();
  const options = variant === 'options';

  return (
    <div className="shell">
      <div className={options ? 'options-body' : 'popup-body'}>
        <header className="header">
          <img className="mark" src="/wordmark.svg" alt="Frame" />
          {state ? (
            <AccountButton
              signedIn={state.account !== null}
              signingIn={state.signingIn}
              available={state.authAvailable}
              onSignIn={() => void send({ type: 'frame.sign-in' })}
              onSignOut={() => void send({ type: 'frame.sign-out' })}
            />
          ) : null}
        </header>

        {options ? (
          <>
            <h1 className="display">This browser.</h1>
            <p className="lede">
              Settings for this browser. They work without a Frame account. Nothing here makes you anonymous.
            </p>
          </>
        ) : null}

        {error ? <p className="error">{error}</p> : null}
        {!state ? (
          <p className="quiet">Loading…</p>
        ) : (
          <>
            {state.account ? (
              <ScoreCard account={state.account} />
            ) : state.authAvailable ? (
              <p className="quiet">
                Optional. Privacy settings work without an account. Your password stays on frameprivacy.com.
              </p>
            ) : (
              <p className="quiet">
                Sign-in on Firefox is coming soon. Privacy settings work without an account. Your password stays on
                frameprivacy.com.
              </p>
            )}
            {state.authError ? <p className="error">{state.authError}</p> : null}

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
                note={controlNote(state.controls.fingerprintProtection)}
                disabled={controlDisabled(state.controls.fingerprintProtection)}
                onChange={(enabled) => {
                  if (!state.tab.host) return;
                  void send({ type: 'frame.set-host', host: state.tab.host, enabled });
                }}
              />
            ) : null}

            <p className="label">Protections</p>
            <div className="panel rows">
              {TOGGLES.map((toggle) => {
                const control = state.controls[toggle.id];
                return (
                  <div className={controlDisabled(control) ? 'row is-locked' : 'row'} key={toggle.id}>
                    <div className="row-copy">
                      <h3>{toggle.title}</h3>
                      <p>{options ? toggle.detail : toggle.summary}</p>
                      {controlNote(control) ? <p className="note">{controlNote(control)}</p> : null}
                    </div>
                    <Switch
                      label={toggle.title}
                      checked={state.settings[toggle.id]}
                      disabled={controlDisabled(control)}
                      onChange={(value) => void send({ type: 'frame.set-setting', id: toggle.id, value })}
                    />
                  </div>
                );
              })}
            </div>

            {options ? <Exceptions state={state} onClear={(host) => void send({ type: 'frame.clear-host', host })} /> : null}
            {options ? <PermissionList /> : null}

            <footer className="footer">
              <p>Frame does not make you anonymous, and it does not replace a VPN or a breach check.</p>
              <div className="footer-links">
                {variant === 'popup' ? (
                  <button type="button" className="text-link" onClick={() => void browser.runtime.openOptionsPage()}>
                    All settings
                  </button>
                ) : null}
                <a href="https://frameprivacy.com" target="_blank" rel="noreferrer">
                  frameprivacy.com
                </a>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function AccountButton({
  signedIn,
  signingIn,
  available,
  onSignIn,
  onSignOut,
}: {
  signedIn: boolean;
  signingIn: boolean;
  available: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  if (!signedIn && !available) {
    return (
      <button type="button" className="btn" disabled>
        Coming soon
      </button>
    );
  }
  if (!signedIn) {
    return (
      <button type="button" className="btn" onClick={onSignIn} disabled={signingIn}>
        {signingIn ? 'Waiting…' : 'Sign in'}
      </button>
    );
  }
  return (
    <button type="button" className="text-link header-link" onClick={onSignOut}>
      Sign out
    </button>
  );
}

function ScoreCard({ account }: { account: PublicAccount }) {
  const name = account.name || account.email;
  return (
    <section className="panel score-panel">
      <div className="score-top">
        <ExposureScore exposure={account.exposure} />
        <div className="who">
          <div className="who-name">{name}</div>
          {account.name ? <div className="who-mail">{account.email}</div> : null}
          {account.plan ? <div className="plan">{planLabel(account.plan)}</div> : null}
        </div>
      </div>
      <ExposureMeta exposure={account.exposure} />
      <AreaList exposure={account.exposure} />
      {account.preview ? <p className="preview">Preview data, not connected</p> : null}
    </section>
  );
}

function ExposureScore({ exposure }: { exposure: FrameExposure | null }) {
  if (!exposure || exposure.score === null) {
    return (
      <div>
        <div className="score-empty">Not checked yet</div>
      </div>
    );
  }
  return (
    <div>
      <div className="score-num">{exposure.score}</div>
      <div className="score-caption">Privacy score</div>
    </div>
  );
}

function ExposureMeta({ exposure }: { exposure: FrameExposure | null }) {
  if (!exposure) return null;
  const month = formatMonth(exposure.month);
  const findings = countLabel(exposure.openFindings, 'open finding', 'open findings');
  const breaches = countLabel(exposure.openBreaches, 'open breach', 'open breaches');
  const parts = [month, findings, breaches].filter((part): part is string => part !== null);
  if (parts.length === 0) return null;
  return <p className="meta">{parts.join(' · ')}</p>;
}

function AreaList({ exposure }: { exposure: FrameExposure | null }) {
  if (!exposure || exposure.areas.length === 0) return null;
  return (
    <ul className="areas">
      {exposure.areas.map((area, index) => (
        <li key={`${area.key}-${index}`}>
          <span>{area.key.replaceAll('_', ' ')}</span>
          <span className="area-score">{area.score === null ? 'Not checked yet' : area.score}</span>
        </li>
      ))}
    </ul>
  );
}

function planLabel(plan: NonNullable<PublicAccount['plan']>): string {
  if (plan === 'plus') return 'Plus';
  if (plan === 'family') return 'Family';
  return 'Free';
}

function countLabel(value: number | null, singular: string, plural: string): string | null {
  if (typeof value !== 'number') return null;
  return `${value} ${value === 1 ? singular : plural}`;
}

function SiteCard({
  host,
  restricted,
  enabled,
  customized,
  note,
  disabled,
  onChange,
}: {
  host: string | null;
  restricted: boolean;
  enabled: boolean;
  customized: boolean;
  note: string | null;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <>
      <p className="label">This site</p>
      <section className="panel site-panel">
        {restricted ? (
          <>
            <h2 className="host">Browser page</h2>
            <p className="hint">Frame doesn’t change pages like this.</p>
          </>
        ) : !host ? (
          <>
            <h2 className="host">No site</h2>
            <p className="hint">Open a page to set fingerprinting for that site.</p>
          </>
        ) : (
          <div className="site-row">
            <div>
              <h2 className="host">{host}</h2>
              <p className="hint">
                {customized
                  ? 'Fingerprinting is saved for this site only.'
                  : 'Fingerprinting follows your default for every site.'}
              </p>
            </div>
            <Switch
              label={`Fingerprinting protection for ${host}`}
              checked={enabled}
              disabled={disabled}
              onChange={onChange}
            />
          </div>
        )}
        {note ? <p className="note hint">{note}</p> : null}
      </section>
    </>
  );
}

function Exceptions({
  state,
  onClear,
}: {
  state: NonNullable<ReturnType<typeof useExtensionState>['state']>;
  onClear: (host: string) => void;
}) {
  const hosts = Object.entries(state.settings.fingerprintHosts).sort(([a], [b]) => a.localeCompare(b));
  return (
    <>
      <p className="label">Site exceptions</p>
      {hosts.length === 0 ? (
        <p className="empty panel">
          No site exceptions. Open Frame on a page that breaks, and turn fingerprinting off for that site only.
          Subdomains are separate: www.example.com is not example.com.
        </p>
      ) : (
        <ul className="hosts panel">
          {hosts.map(([host, enabled]) => (
            <li key={host}>
              <span>{host}</span>
              <span className="pill">{enabled ? 'On' : 'Off'}</span>
              <button type="button" className="text-link" onClick={() => onClear(host)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function PermissionList() {
  return (
    <>
      <p className="label">Permissions</p>
      <dl className="permissions panel">
        {PERMISSIONS.map((permission) => (
          <div key={permission.name}>
            <dt>{permission.name}</dt>
            <dd>{permission.why}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function formatMonth(month: string | null): string | null {
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  );
}
