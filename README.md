<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/80cd0eb5-83d0-40b5-926b-9c2d3167ab77

## Run Locally

**Prerequisites:**  [Android Studio](https://developer.android.com/studio)


1. Open Android Studio
2. Select **Open** and choose the directory containing this project
3. Allow Android Studio to fix any incompatibilities as it imports the project.
4. (Optional, for live Gemini analysis) Create a file named `.env` in the project directory and set `GEMINI_PROXY_URL` to the HTTPS base URL of a backend proxy that holds your Gemini API key and forwards `generateContent` requests (see `.env.example`). Never put the Gemini API key itself in `.env`: values there are compiled into the APK. Without a proxy the app uses its offline heuristic engine.
5. Remove this line from the app's `build.gradle.kts` file: `signingConfig = signingConfigs.getByName("debugConfig")`
6. Run the app on an emulator or physical device
