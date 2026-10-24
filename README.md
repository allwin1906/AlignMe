# AlignMe — Posture Monitoring Software Prototype

Phase I software for AlignMe, a smart wearable posture monitoring and correction system. Covers Module 1 (posture data processing), Module 2 (classification and persistence detection) and Module 3 (dashboard PWA).

> All posture data in this prototype is **simulated**. No ESP32, MPU6050, Bluetooth or vibration hardware is used in this phase.

## Requirements
- Node.js 20.19 or newer, npm 10

## Run
```bash
npm install
npm run dev       # development server at http://localhost:5173
npm test          # unit and scenario tests
npm run build     # type-check and production build into dist/
npm run preview   # serve the production build (use this to test PWA install/offline)
```

See `docs/IMPLEMENTATION_PLAN.md` for the design and `docs/DEMO_VIDEO_SCRIPT.md` for the demo video.
