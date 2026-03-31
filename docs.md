
## Overview
This is a one-page Angular app that uses a Teachable Machine image classification model to identify Canadian landmarks through a webcam feed. When a landmark is detected with enough confidence, it pulls a short description from Wikipedia and displays it beside the camera.

---

## Tech Stack
- **Angular 19** — frontend framework
- **Google Teachable Machine** — used to train the image classification model
- **TensorFlow.js** — runs the model in the browser
- **Wikipedia REST API** — fetches landmark descriptions, no API key needed

---

## Project Structure
```
src/
  app/
    app.ts        - main component, handles webcam, model, and predictions
    app.html      - template, one page layout with webcam and info panel
    app.css       - styles (to be added)
public/
  model/
    model.json    - trained Teachable Machine model
    metadata.json - class labels and model config
    weights.bin   - model weights
```

---

## How It Works

### 1. Model Loading
On startup, the app loads the Teachable Machine model from `public/model/`. The model was trained on ~50 images per class using Google Teachable Machine.

### 2. Webcam
When the user clicks Start Camera, the app accesses the webcam using the Teachable Machine webcam helper. It creates a 224x224 canvas (the size the model expects) and starts a frame loop using `requestAnimationFrame`.

### 3. Prediction Loop
Every frame, the current webcam image is passed to the model. The model returns a confidence score (0–1) for each of the 11 classes. Results are sorted by confidence and displayed in the overlay panel.

### 4. Wikipedia Integration
If the top prediction is a real landmark (not "not-a-landmark") and confidence is above 70%, the app fetches a summary from the Wikipedia REST API. It only fetches once per landmark to avoid spamming the API.

---

## Landmarks Trained
| Class | Landmark |
|---|---|
| cn-tower | CN Tower |
| parliament-hill | Parliament Hill |
| chateau-frontenac | Château Frontenac |
| lake-louise | Lake Louise |
| lions-gate-bridge | Lions Gate Bridge |
| niagara-falls | Niagara Falls |
| halifax-citadel | Halifax Citadel |
| rideau-canal | Rideau Canal |
| butchart-gardens | Butchart Gardens |
| notre-dame-montreal | Notre-Dame Basilica |
| not-a-landmark | Not a Landmark (background class) |

---

## Training Details
- ~50 images per class collected from Google Images
- Images varied by lighting, season, angle, and weather
- A "not-a-landmark" background class was included to reduce false positives
- Model trained and exported as TensorFlow.js from teachablemachine.withgoogle.com
- Image size: 224x224

---

## Challenges
- Angular's default asset folder is `public/`, not `src/assets/`, so the model files had to be placed in `public/model/` to be served correctly
- TensorFlow.js is large (~1MB bundle), so the Angular build budget had to be increased in `angular.json`
- The Teachable Machine package is CommonJS, which causes a warning during build but does not affect functionality
