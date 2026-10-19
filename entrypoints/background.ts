import { defineBackground } from 'wxt/utils/define-background';
import { startBackground } from '../src/background/controller';

export default defineBackground(() => {
  startBackground();
});
