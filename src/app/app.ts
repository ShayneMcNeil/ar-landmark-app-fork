import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as tmImage from '@teachablemachine/image';

interface Prediction {
  className: string;
  probability: number;
}

interface HistoryItem {
  id: number;
  imageUrl: string;
  source: 'camera' | 'upload';
  label: string;
  confidence: string;
  summary: string;
  timestamp: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private readonly MODEL_URL = 'model/';
  private readonly DETECTABLE_LABEL_KEYS = [
    'butchart-gardens',
    'chateau-frontenac',
    'cn-tower',
    'halifax-citadel',
    'lake-louise',
    'lions-gate-bridge',
    'niagara-falls',
    'notre-dame-montreal',
    'parliament-hill',
    'rideau-canal',
  ] as const;

  private model: tmImage.CustomMobileNet | null = null;
  private webcam: tmImage.Webcam | null = null;
  private previewFrameId: number | null = null;
  private historyId = 0;

  isLoading = signal(true);
  isAnalyzing = signal(false);
  isCameraReady = signal(false);
  errorMessage = signal('');
  topPrediction = signal<Prediction | null>(null);
  allPredictions = signal<Prediction[]>([]);
  landmarkInfo = signal('');
  currentImageUrl = signal<string | null>(null);
  currentImageSource = signal<'camera' | 'upload' | null>(null);
  history = signal<HistoryItem[]>([]);

  private lastFetchedLandmark = '';

  private readonly LANDMARK_DISPLAY_NAMES: Record<string, string> = {
    'butchart-gardens': 'Butchart Gardens',
    'chateau-frontenac': 'Chateau Frontenac',
    'cn-tower': 'CN Tower',
    'halifax-citadel': 'Halifax Citadel',
    'lake-louise': 'Lake Louise',
    'lions-gate-bridge': 'Lions Gate Bridge',
    'niagara-falls': 'Niagara Falls',
    'not-a-landmark': 'Not a Landmark',
    'notre-dame-montreal': 'Notre-Dame Basilica',
    'parliament-hill': 'Parliament Hill',
    'rideau-canal': 'Rideau Canal',
  };

  detectableLandmarks = this.DETECTABLE_LABEL_KEYS.map((key) => this.LANDMARK_DISPLAY_NAMES[key]);

  async ngOnInit(): Promise<void> {
    await this.initModel();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  private async initModel(): Promise<void> {
    try {
      this.model = await tmImage.load(
        `${this.MODEL_URL}model.json`,
        `${this.MODEL_URL}metadata.json`
      );
      this.isLoading.set(false);
    } catch (err) {
      this.errorMessage.set('Failed to load model. Please refresh the page.');
      this.isLoading.set(false);
      console.error(err);
    }
  }

  async startCamera(): Promise<void> {
    if (!this.model || this.isAnalyzing()) return;

    try {
      this.errorMessage.set('');
      this.clearCurrentResult();

      this.webcam = new tmImage.Webcam(224, 224, true);
      await this.webcam.setup();
      await this.webcam.play();

      const container = document.getElementById('webcam-container');
      if (container && this.webcam.canvas) {
        container.innerHTML = '';
        container.appendChild(this.webcam.canvas);
      }

      this.isCameraReady.set(true);
      this.startPreviewLoop();
    } catch (err) {
      this.errorMessage.set('Could not access webcam. Please allow camera permissions.');
      console.error(err);
    }
  }

  stopCamera(): void {
    if (this.previewFrameId !== null) {
      cancelAnimationFrame(this.previewFrameId);
      this.previewFrameId = null;
    }

    if (this.webcam) {
      this.webcam.stop();
      this.webcam = null;
    }

    const container = document.getElementById('webcam-container');
    if (container) container.innerHTML = '';

    this.isCameraReady.set(false);
  }

  async snapPhoto(): Promise<void> {
    if (!this.model || !this.webcam || this.isAnalyzing()) return;

    this.errorMessage.set('');
    this.isAnalyzing.set(true);

    try {
      this.webcam.update();
      const imageUrl = this.webcam.canvas.toDataURL('image/jpeg', 0.92);
      this.currentImageUrl.set(imageUrl);
      this.currentImageSource.set('camera');

      await this.analyzeImageElement(this.webcam.canvas, imageUrl, 'camera');
      this.stopCamera();
    } catch (err) {
      this.errorMessage.set('Could not capture that photo. Please try again.');
      console.error(err);
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  async onImageSelected(event: Event): Promise<void> {
    if (!this.model || this.isAnalyzing()) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.errorMessage.set('');
    this.stopCamera();
    this.clearCurrentResult();
    this.isAnalyzing.set(true);

    try {
      const imageUrl = await this.readFileAsDataUrl(file);
      this.currentImageUrl.set(imageUrl);
      this.currentImageSource.set('upload');

      const image = await this.loadImage(imageUrl);
      await this.analyzeImageElement(image, imageUrl, 'upload');
    } catch (err) {
      this.errorMessage.set('Could not read that image. Please try a different file.');
      console.error(err);
    } finally {
      this.isAnalyzing.set(false);
      input.value = '';
    }
  }

  clearCurrentSelection(): void {
    this.stopCamera();
    this.clearCurrentResult();
  }

  clearHistory(): void {
    this.history.set([]);
  }

  getDisplayName(className: string): string {
    return this.LANDMARK_DISPLAY_NAMES[className] ?? className;
  }

  getConfidencePercent(probability: number): string {
    return `${(probability * 100).toFixed(1)}%`;
  }

  private startPreviewLoop(): void {
    const render = () => {
      if (!this.webcam) return;
      this.webcam.update();
      this.previewFrameId = requestAnimationFrame(render);
    };

    render();
  }

  private async analyzeImageElement(
    image: HTMLImageElement | HTMLCanvasElement,
    imageUrl: string,
    source: 'camera' | 'upload'
  ): Promise<void> {
    if (!this.model) return;

    const predictions: Prediction[] = await this.model.predict(image);
    const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
    this.allPredictions.set(sorted);

    const top = sorted[0] ?? null;
    this.topPrediction.set(top);

    let summary = '';
    if (top && top.probability > 0.7 && top.className !== 'not-a-landmark') {
      summary = await this.resolveLandmarkInfo(top.className);
      this.landmarkInfo.set(summary);
    } else {
      this.landmarkInfo.set('');
      this.lastFetchedLandmark = '';
    }

    this.pushHistoryEntry(imageUrl, source, top, summary);
  }

  private async resolveLandmarkInfo(className: string): Promise<string> {
    if (className === this.lastFetchedLandmark && this.landmarkInfo()) {
      return this.landmarkInfo();
    }

    this.lastFetchedLandmark = className;
    const displayName = this.LANDMARK_DISPLAY_NAMES[className] ?? className;

    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(displayName)}`;
      const response = await fetch(url);

      if (!response.ok) {
        return 'No information found.';
      }

      const data = await response.json();
      return data.extract ?? 'No description available.';
    } catch {
      return 'Could not load landmark information.';
    }
  }

  private pushHistoryEntry(
    imageUrl: string,
    source: 'camera' | 'upload',
    top: Prediction | null,
    summary: string
  ): void {
    const hasLandmark = !!top && top.probability > 0.7 && top.className !== 'not-a-landmark';
    const label = hasLandmark && top ? this.getDisplayName(top.className) : 'No landmark detected';
    const confidence = top ? this.getConfidencePercent(top.probability) : '0.0%';
    const timestamp = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });

    const item: HistoryItem = {
      id: ++this.historyId,
      imageUrl,
      source,
      label,
      confidence,
      summary: hasLandmark ? summary : 'The model did not find a confident landmark match in this photo.',
      timestamp,
    };

    this.history.update((items) => [item, ...items]);
  }

  private clearCurrentResult(): void {
    this.currentImageUrl.set(null);
    this.currentImageSource.set(null);
    this.topPrediction.set(null);
    this.allPredictions.set([]);
    this.landmarkInfo.set('');
    this.lastFetchedLandmark = '';
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Image failed to load'));
      image.src = src;
    });
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }
}
