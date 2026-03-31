import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as tmImage from '@teachablemachine/image';

// shape of each result the model gives back
interface Prediction {
  className: string;
  probability: number;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {

  // model files are stored in public/model/
  private readonly MODEL_URL = 'model/';

  private model: tmImage.CustomMobileNet | null = null;
  private webcam: tmImage.Webcam | null = null;
  private animationFrameId: number | null = null;

  // used to control what shows in the template
  isLoading = signal(true);
  isRunning = signal(false);
  errorMessage = signal('');
  topPrediction = signal<Prediction | null>(null);
  allPredictions = signal<Prediction[]>([]);
  landmarkInfo = signal('');

  // track last fetched landmark so we don't keep calling wikipedia for the same one
  private lastFetchedLandmark = '';

  // maps model class names to proper display names
  private readonly LANDMARK_DISPLAY_NAMES: Record<string, string> = {
    'butchart-gardens':    'Butchart Gardens',
    'chateau-frontenac':   'Château Frontenac',
    'cn-tower':            'CN Tower',
    'halifax-citadel':     'Halifax Citadel',
    'lake-louise':         'Lake Louise',
    'lions-gate-bridge':   'Lions Gate Bridge',
    'niagara-falls':       'Niagara Falls',
    'not-a-landmark':      'Not a Landmark',
    'notre-dame-montreal': 'Notre-Dame Basilica',
    'parliament-hill':     'Parliament Hill',
    'rideau-canal':        'Rideau Canal',
  };

  async ngOnInit(): Promise<void> {
    await this.initModel();
  }

  ngOnDestroy(): void {
    this.stopWebcam();
  }

  // load the teachable machine model on startup
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

  // start webcam and kick off the prediction loop
  async startWebcam(): Promise<void> {
    if (!this.model) return;

    try {
      // 224x224 is the size the model expects
      this.webcam = new tmImage.Webcam(224, 224, true);
      await this.webcam.setup();
      await this.webcam.play();

      const container = document.getElementById('webcam-container');
      if (container && this.webcam.canvas) {
        container.appendChild(this.webcam.canvas);
      }

      this.isRunning.set(true);
      this.loop();
    } catch (err) {
      this.errorMessage.set('Could not access webcam. Please allow camera permissions.');
      console.error(err);
    }
  }

  // stop webcam and clean everything up
  stopWebcam(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.webcam) {
      this.webcam.stop();
      this.webcam = null;
    }

    const container = document.getElementById('webcam-container');
    if (container) container.innerHTML = '';

    this.isRunning.set(false);
    this.topPrediction.set(null);
    this.allPredictions.set([]);
    this.landmarkInfo.set('');
    this.lastFetchedLandmark = '';
  }

  // runs every frame while webcam is active
  private async loop(): Promise<void> {
    if (!this.webcam || !this.model) return;

    this.webcam.update();
    await this.predict();

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  // run the model on the current webcam frame and update the UI
  private async predict(): Promise<void> {
    if (!this.model || !this.webcam) return;

    const predictions: Prediction[] = await this.model.predict(this.webcam.canvas);

    const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
    this.allPredictions.set(sorted);

    const top = sorted[0];
    this.topPrediction.set(top);

    // only fetch wikipedia info if we're confident it's actually a landmark
    if (top && top.probability > 0.7 && top.className !== 'not-a-landmark') {
      this.fetchLandmarkInfo(top.className);
    } else if (top?.className === 'not-a-landmark') {
      this.landmarkInfo.set('');
    }
  }

  // pull a short summary from wikipedia for the detected landmark
  private async fetchLandmarkInfo(className: string): Promise<void> {
    if (className === this.lastFetchedLandmark) return;

    this.lastFetchedLandmark = className;
    const displayName = this.LANDMARK_DISPLAY_NAMES[className] ?? className;

    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(displayName)}`;
      const response = await fetch(url);

      if (!response.ok) {
        this.landmarkInfo.set('No information found.');
        return;
      }

      const data = await response.json();
      this.landmarkInfo.set(data.extract ?? 'No description available.');
    } catch {
      this.landmarkInfo.set('Could not load landmark information.');
    }
  }

  getDisplayName(className: string): string {
    return this.LANDMARK_DISPLAY_NAMES[className] ?? className;
  }

  getConfidencePercent(probability: number): string {
    return (probability * 100).toFixed(1) + '%';
  }
}
