/// <reference types="vite/client" />

interface BarcodeDetector {
  detect(image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetector;
  getSupportedFormats(): Promise<string[]>;
}
declare var BarcodeDetector: BarcodeDetectorConstructor;
