# AR Canadian Landmark Recognizer

AR Canadian Landmark Recognizer is a browser-based Angular application that classifies photos of Canadian landmarks using a custom Google Teachable Machine image model. A user can open the device camera, snap a photo, or upload an existing image, and the app will score the image against the trained landmark classes. When the model is confident enough, the app also fetches a short landmark description from the Wikipedia REST API.

This project was built collaboratively by Shayne McNeil and Hudson Latimer, 2nd year IT Programming students at NSCC's eCampus.

## What The App Does

- Classifies photos against a trained set of Canadian landmarks
- Supports both camera capture and uploaded images
- Shows ranked prediction confidence scores for every analyzed photo
- Retrieves a short landmark summary from Wikipedia when a confident match is found
- Keeps a temporary in-session history of analyzed photos and results

## Landmarks The Model Can Detect

The current Teachable Machine model in [`public/model`](./public/model) was trained to recognize the following landmark classes:

- Butchart Gardens
- Chateau Frontenac
- CN Tower
- Halifax Citadel
- Lake Louise
- Lions Gate Bridge
- Niagara Falls
- Notre-Dame Basilica
- Parliament Hill
- Rideau Canal

The model also includes a `not-a-landmark` background class to reduce false positives.

## How It Works

### Frontend

The app is built with Angular and runs entirely in the browser. The main UI is responsible for:

- loading the TensorFlow.js model exported from Google Teachable Machine
- opening the device camera preview
- capturing a still image from the camera
- accepting uploaded image files
- rendering prediction results and session history

### Machine Learning Model

The image classifier was trained in Google Teachable Machine and exported as a TensorFlow.js model. The model files are stored in [`public/model`](./public/model):

- `model.json`
- `metadata.json`
- `weights.bin`

At runtime, the app loads those files in the browser and runs inference locally on the client device.

### Camera Access

Camera support is provided through `@teachablemachine/image`, which uses the browser camera stack underneath. In practice, this means the app relies on the Media Devices API to access the camera through the browser. Because of that, camera access requires:

- a supported browser
- user permission to use the camera
- a secure context such as `https://` or `http://localhost`

### Landmark Descriptions

When the model returns a confident landmark prediction, the app sends a request to the Wikipedia REST API and displays a short summary for that landmark in the results panel.

## Tech Stack

- Angular 21
- TypeScript
- Google Teachable Machine
- TensorFlow.js
- `@teachablemachine/image`
- Wikipedia REST API
- PNPM

## Project Structure

```text
src/
  app/
    app.ts         Main application logic
    app.html       Main UI template
    app.css        Application styling
  main.ts          Angular bootstrap entry
  styles.css       Global styles

public/
  model/
    model.json
    metadata.json
    weights.bin
  favicon.ico
```

## Local Development

### Prerequisites

- Node.js 20 or newer
- Corepack available in your Node installation
- PNPM activated through Corepack

This repository is configured for `pnpm`, not `npm`.

### Install Dependencies

From the project root:

```powershell
corepack prepare pnpm@10.17.1 --activate
corepack pnpm install
```

If `pnpm` works directly in your shell, you can also use:

```powershell
pnpm install
```

On some Windows PowerShell setups, `pnpm.ps1` may be blocked by execution policy. In that case, use `corepack pnpm ...` commands instead.

### Run The App Locally

```powershell
corepack pnpm start
```

Then open:

[http://localhost:4200](http://localhost:4200)

### Build For Production

```powershell
corepack pnpm build
```

The production build output is written to:

[`dist/ar-landmark-app`](./dist/ar-landmark-app)

### Run Tests

```powershell
corepack pnpm test
```

## How To Use The App

### Camera Workflow

1. Open the app in a supported browser.
2. Click `Open Camera`.
3. Allow camera permission if prompted.
4. Frame a supported landmark.
5. Click `Snap Photo`.
6. Review the top match, confidence values, and Wikipedia description.

### Upload Workflow

1. Click `Upload Image`.
2. Select an image file from your device.
3. Wait for the app to analyze the image.
4. Review the prediction panel and result summary.

### Temporary History

Every snapped or uploaded image is stored in a temporary in-memory history list during the current session. This history is not persisted to a database or backend and will reset when the page is refreshed.

## Deploying The App

This project is a static frontend application. After building it, you can deploy the generated files to any static hosting provider that serves over HTTPS.

Common options include:

- Vercel
- Netlify
- Firebase Hosting
- GitHub Pages with an HTTPS-enabled hosting workflow
- Any standard web server serving the `dist/ar-landmark-app` directory

### Basic Deployment Process

1. Build the project:

```powershell
corepack pnpm build
```

2. Deploy the contents of:

[`dist/ar-landmark-app`](./dist/ar-landmark-app)

3. Make sure the deployed site is served over `https://`

HTTPS matters because mobile camera access will generally not work on an insecure origin.

## Using The App On A Personal Mobile Device

### Browser-Based Mobile Testing

The current repository is a web app, so the simplest way to use it on a personal mobile device is:

1. Deploy the app to an HTTPS host
2. Open the deployed URL on your phone or tablet
3. Grant camera permission in the browser
4. Use `Open Camera` and `Snap Photo`, or upload an image from the device

This is the most direct way to test real mobile camera behavior.

### Install To Home Screen

After deploying the app, you can also install it to your device's home screen from the browser:

- On iPhone or iPad in Safari: use `Share` -> `Add to Home Screen`
- On Android in Chrome: use the browser menu -> `Add to Home screen`

That gives you an app-like launcher icon, but this repository is still a web application, not a native iOS or Android project.

### Native App Packaging

If you eventually want a fully packaged mobile app for Android or iOS app-store style deployment, you would need to wrap the Angular app with a native container such as Capacitor. That native mobile packaging workflow is not currently included in this repository.

## Notes And Constraints

- The ML model runs in the browser, so performance depends on the device and browser
- Camera access depends on browser permissions and secure hosting
- The Teachable Machine package is currently brought in as a CommonJS dependency
- The app currently stores history only for the active session
- Wikipedia descriptions depend on network availability and API response success

## Why Someone Would Clone This Repo

This project is useful as a reference if you want to explore:

- browser-based image classification with Teachable Machine
- integrating TensorFlow.js models into Angular
- using camera capture in a frontend-only application
- enriching ML predictions with third-party web APIs
- building a student portfolio or demonstration app around computer vision concepts

## License And Ownership

No license file is currently included in this repository. If you plan to reuse, publish, or redistribute the project, add an explicit license first.
