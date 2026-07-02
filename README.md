# Automated Data Validation

Automated Data Validation is an evidence validation concept for audit, risk, and control workflows. The original Android prototype remains in `app/`; the new `web/` application refactors the same idea into a demoable browser console and REST intelligence layer that can integrate with enterprise applications.

## Web Intelligence Layer

The web app provides:

- An operations dashboard for evidence validation runs.
- A sandbox for structured and unstructured control evidence, including pasted text and uploaded `.csv`, `.json`, `.txt`, `.log`, and `.md` files.
- Tier-1 standard QA checks and Tier-2 domain controls.
- A configurable rule editor for creating, updating, disabling, deleting, and resetting validation rules.
- `POST /api/validate` for enterprise integrations.
- Writeback-ready disposition payloads for AuditBoard or other GRC systems.
- Docker and Render hosting configuration.

Run it locally:

```bash
cd web
npm start
```

Open `http://localhost:3000`.

See [web/README.md](web/README.md) for the API contract and hosting steps. The root-level `render.yaml` is configured for a Render Blueprint deployment.

## Android Prototype

**Prerequisites:** [Android Studio](https://developer.android.com/studio)

1. Open Android Studio.
2. Select **Open** and choose this project directory.
3. Allow Android Studio to import the Gradle project.
4. Create `.env` in the project directory and set `GEMINI_API_KEY` if you want the optional Gemini-backed path.
5. Remove `signingConfig = signingConfigs.getByName("debugConfig")` from `app/build.gradle.kts` if Android Studio flags it.
6. Run the app on an emulator or physical device.
