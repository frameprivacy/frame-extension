import type { BooleanSettingId, Settings } from './settings';

export type PrivacyGroup = 'network' | 'websites' | 'services';

export interface PrivacyWrite {
  toggle: BooleanSettingId;
  group: PrivacyGroup;
  name: string;
  op: 'set' | 'clear';
  value?: boolean | string;
}

/**
 * Topics, Protected Audience (FLEDGE), and ad measurement can only be set to
 * false. Turning Frame's toggle off clears the extension's value instead of
 * writing true, which the browser rejects.
 */
function write(
  toggle: BooleanSettingId,
  group: PrivacyGroup,
  name: string,
  enabled: boolean,
  valueWhenEnabled: boolean | string,
): PrivacyWrite {
  if (!enabled) return { toggle, group, name, op: 'clear' };
  return { toggle, group, name, op: 'set', value: valueWhenEnabled };
}

export function privacyWrites(settings: Settings): PrivacyWrite[] {
  return [
    write('protectWebRtc', 'network', 'webRTCIPHandlingPolicy', settings.protectWebRtc, 'disable_non_proxied_udp'),
    write(
      'blockThirdPartyCookies',
      'websites',
      'thirdPartyCookiesAllowed',
      settings.blockThirdPartyCookies,
      false,
    ),
    write('disableAdPrivacyApis', 'websites', 'topicsEnabled', settings.disableAdPrivacyApis, false),
    write('disableAdPrivacyApis', 'websites', 'fledgeEnabled', settings.disableAdPrivacyApis, false),
    write('disableAdPrivacyApis', 'websites', 'adMeasurementEnabled', settings.disableAdPrivacyApis, false),
    write(
      'disableHyperlinkAuditing',
      'websites',
      'hyperlinkAuditingEnabled',
      settings.disableHyperlinkAuditing,
      false,
    ),
    write(
      'disableNetworkPrediction',
      'network',
      'networkPredictionEnabled',
      settings.disableNetworkPrediction,
      false,
    ),
    write('sendDoNotTrack', 'websites', 'doNotTrackEnabled', settings.sendDoNotTrack, true),
    write(
      'disableSearchSuggestions',
      'services',
      'searchSuggestEnabled',
      settings.disableSearchSuggestions,
      false,
    ),
    write(
      'disableAlternateErrorPages',
      'services',
      'alternateErrorPagesEnabled',
      settings.disableAlternateErrorPages,
      false,
    ),
  ];
}
