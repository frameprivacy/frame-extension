import { LiveFrameClient } from './live';
import { StubFrameClient } from './stub';
import type { FrameClient } from './types';

export function createFrameClient(): FrameClient {
  if (import.meta.env.MODE === 'stub') return new StubFrameClient();
  return new LiveFrameClient();
}
