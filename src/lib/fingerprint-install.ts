import {
  bucketHardwareConcurrency,
  commonWebGl,
  hideFontCheck,
  normalizeFontFamily,
  normalizedDeviceMemory,
  primaryFontFamily,
  quantizeChannel,
  quantizeUnitSample,
} from './fingerprint-policy';

const BRAND = Symbol.for('frame.privacy.guard');
const UNMASKED_VENDOR = 37445;
const UNMASKED_RENDERER = 37446;
const RGBA = 0x1908;
const UNSIGNED_BYTE = 0x1401;
/** Skip expensive copies above this many pixels. Fingerprint probes are smaller. */
const MAX_EXPORT_PIXELS = 2_000_000;

// DOM hooks do not share a call signature. This alias is only the wrapper boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;
type Branded = AnyFn & { [BRAND]?: true };

/**
 * Runs in the page's main world at document_start.
 * Wraps high-entropy readbacks so they collapse toward common values.
 * Does not randomize, and does not change what the page paints.
 */
export function installFingerprintGuards(): void {
  if (alreadyInstalled()) return;
  patchNavigator();
  patchCanvas();
  patchWebGl();
  patchOfflineAudio();
  patchFonts();
}

function alreadyInstalled(): boolean {
  const concurrency = Object.getOwnPropertyDescriptor(Navigator.prototype, 'hardwareConcurrency')?.get;
  if (concurrency && isBranded(concurrency)) return true;
  return isBranded(HTMLCanvasElement.prototype.toDataURL);
}

function patchNavigator(): void {
  const originalConcurrency = Object.getOwnPropertyDescriptor(Navigator.prototype, 'hardwareConcurrency')?.get;
  defineGetter(Navigator.prototype, 'hardwareConcurrency', () => {
    let cores = 8;
    try {
      if (originalConcurrency) {
        const value = originalConcurrency.call(navigator);
        if (typeof value === 'number') cores = value;
      }
    } catch {
      cores = 8;
    }
    return bucketHardwareConcurrency(cores);
  });
  if ('deviceMemory' in Navigator.prototype) {
    defineGetter(Navigator.prototype, 'deviceMemory', () => normalizedDeviceMemory());
  }
  if ('queryLocalFonts' in globalThis) {
    const denied = function queryLocalFonts() {
      return Promise.reject(new DOMException('The user has not granted permission.', 'NotAllowedError'));
    };
    try {
      Object.defineProperty(globalThis, 'queryLocalFonts', {
        configurable: true,
        writable: true,
        value: maskNative(denied, 'queryLocalFonts'),
      });
    } catch {
      /* ignore */
    }
  }
}

function patchCanvas(): void {
  const canvasProto = HTMLCanvasElement.prototype;
  wrap(canvasProto, 'toDataURL', (original) =>
    function toDataURL(this: HTMLCanvasElement, ...args: unknown[]) {
      const copy = copyQuantizedCanvas(this);
      if (!copy) return (original as (...inner: unknown[]) => string).apply(this, args);
      return (original as (...inner: unknown[]) => string).apply(copy, args);
    },
  );
  wrap(canvasProto, 'toBlob', (original) =>
    function toBlob(this: HTMLCanvasElement, ...args: unknown[]) {
      const copy = copyQuantizedCanvas(this);
      if (!copy) return (original as (...inner: unknown[]) => void).apply(this, args);
      return (original as (...inner: unknown[]) => void).apply(copy, args);
    },
  );
  const contexts = [CanvasRenderingContext2D.prototype];
  if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
    contexts.push(OffscreenCanvasRenderingContext2D.prototype as unknown as CanvasRenderingContext2D);
  }
  for (const proto of contexts) {
    wrap(proto, 'getImageData', (original) =>
      function getImageData(this: CanvasRenderingContext2D, ...args: unknown[]) {
        const image = (original as (...inner: unknown[]) => ImageData).apply(this, args);
        quantizeImageData(image);
        return image;
      },
    );
  }
  if (typeof OffscreenCanvas !== 'undefined' && 'convertToBlob' in OffscreenCanvas.prototype) {
    wrap(OffscreenCanvas.prototype, 'convertToBlob', (original) =>
      function convertToBlob(this: OffscreenCanvas, ...args: unknown[]) {
        const copy = copyQuantizedOffscreen(this);
        const target = copy ?? this;
        return (original as (...inner: unknown[]) => Promise<Blob>).apply(target, args);
      },
    );
  }
}

function patchWebGl(): void {
  const identity = commonWebGl(navigator.platform, navigator.userAgent);
  const protos: object[] = [WebGLRenderingContext.prototype];
  if (typeof WebGL2RenderingContext !== 'undefined') protos.push(WebGL2RenderingContext.prototype);
  for (const proto of protos) {
    wrap(proto, 'getParameter', (original) =>
      function getParameter(this: WebGLRenderingContext, pname: number) {
        if (pname === UNMASKED_VENDOR) return identity.vendor;
        if (pname === UNMASKED_RENDERER) return identity.renderer;
        return (original as (pname: number) => unknown).call(this, pname);
      },
    );
    wrap(proto, 'readPixels', (original) =>
      function readPixels(this: WebGLRenderingContext, ...args: unknown[]) {
        (original as (...inner: unknown[]) => void).apply(this, args);
        const format = args[4];
        const type = args[5];
        const pixels = args[6];
        if (format === RGBA && type === UNSIGNED_BYTE && isByteBuffer(pixels)) quantizeBytes(pixels);
      },
    );
  }
}

function patchOfflineAudio(): void {
  if (typeof OfflineAudioContext === 'undefined') return;
  wrap(OfflineAudioContext.prototype, 'startRendering', (original) =>
    function startRendering(this: OfflineAudioContext) {
      return Promise.resolve((original as (this: OfflineAudioContext) => Promise<AudioBuffer>).call(this)).then(
        (buffer) => {
          quantizeAudioBuffer(buffer);
          return buffer;
        },
      );
    },
  );
}

function patchFonts(): void {
  if (typeof FontFaceSet === 'undefined' || typeof FontFaceSet.prototype.check !== 'function') return;
  wrap(FontFaceSet.prototype, 'check', (original) =>
    function check(this: FontFaceSet, font: string, text?: string) {
      const allowed = (original as (font: string, text?: string) => boolean).call(this, font, text);
      const family = primaryFontFamily(font);
      if (!hideFontCheck(family, family ? fontSetHas(this, family) : false)) return allowed;
      return false;
    },
  );
}

function fontSetHas(set: FontFaceSet, family: string): boolean {
  try {
    for (const face of set as unknown as Iterable<{ family?: string }>) {
      if (face.family && normalizeFontFamily(face.family) === family) return true;
    }
  } catch {
    return false;
  }
  return false;
}

function copyQuantizedCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
  const width = canvas.width;
  const height = canvas.height;
  if (!width || !height || width * height > MAX_EXPORT_PIXELS) return null;
  try {
    const copy = document.createElement('canvas');
    copy.width = width;
    copy.height = height;
    const context = copy.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(canvas, 0, 0);
    const image = context.getImageData(0, 0, width, height);
    quantizeImageData(image);
    context.putImageData(image, 0, 0);
    return copy;
  } catch {
    return null;
  }
}

function copyQuantizedOffscreen(canvas: OffscreenCanvas): OffscreenCanvas | null {
  const width = canvas.width;
  const height = canvas.height;
  if (!width || !height || width * height > MAX_EXPORT_PIXELS) return null;
  try {
    const copy = new OffscreenCanvas(width, height);
    const context = copy.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(canvas, 0, 0);
    const image = context.getImageData(0, 0, width, height);
    quantizeImageData(image);
    context.putImageData(image, 0, 0);
    return copy;
  } catch {
    return null;
  }
}

function quantizeImageData(image: ImageData): void {
  quantizeBytes(image.data);
}

function quantizeBytes(data: Uint8ClampedArray | Uint8Array): void {
  for (let index = 0; index + 3 < data.length; index += 4) {
    data[index] = quantizeChannel(data[index]!);
    data[index + 1] = quantizeChannel(data[index + 1]!);
    data[index + 2] = quantizeChannel(data[index + 2]!);
  }
}

function quantizeAudioBuffer(buffer: AudioBuffer): void {
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = quantizeUnitSample(samples[index]!);
    }
    // getChannelData returns a copy. Write it back or the page still reads the original samples.
    if (typeof buffer.copyToChannel === 'function') buffer.copyToChannel(samples, channel);
  }
}

function isByteBuffer(value: unknown): value is Uint8Array | Uint8ClampedArray {
  return value instanceof Uint8Array || value instanceof Uint8ClampedArray;
}

function defineGetter(proto: object, key: string, get: () => unknown): void {
  try {
    const getter = maskNative(get, `get ${key}`);
    brand(getter);
    Object.defineProperty(proto, key, { configurable: true, enumerable: true, get: getter });
  } catch {
    /* ignore */
  }
}

const masks = new WeakMap<AnyFn, string>();

function maskNative<T extends AnyFn>(fn: T, name: string): T {
  masks.set(fn, `function ${name}() { [native code] }`);
  return fn;
}

function installToStringMask(): void {
  if (isBranded(Function.prototype.toString)) return;
  const native = Function.prototype.toString;
  const wrapped = function toString(this: AnyFn) {
    return masks.get(this) ?? native.call(this);
  };
  masks.set(wrapped, 'function toString() { [native code] }');
  brand(wrapped);
  Function.prototype.toString = wrapped;
}

function wrap(proto: object, key: string, factory: (original: AnyFn) => AnyFn): void {
  const original = (proto as Record<string, unknown>)[key];
  if (typeof original !== 'function' || isBranded(original)) return;
  installToStringMask();
  const wrapped = factory(original as AnyFn);
  brand(maskNative(wrapped, original.name || key));
  try {
    (proto as Record<string, unknown>)[key] = wrapped;
  } catch {
    /* ignore */
  }
}

function brand(fn: AnyFn): void {
  Object.defineProperty(fn, BRAND, { value: true });
}

function isBranded(fn: unknown): fn is Branded {
  return typeof fn === 'function' && BRAND in fn;
}
