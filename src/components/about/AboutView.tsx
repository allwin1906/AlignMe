import { Cpu, Download, ShieldCheck, Smartphone } from 'lucide-react'
import type { StorageStatus } from '@/storage/storage'

const STORAGE_TEXT: Record<StorageStatus, string> = {
  ok: 'Saved data loaded from this browser.',
  empty: 'No saved data yet. Settings and history will be saved in this browser.',
  corrupt: 'Saved data was unreadable, so defaults were loaded. New changes will be saved normally.',
  unavailable: 'This browser is blocking local storage, so nothing will be saved after you close the page.',
}

function Card({ icon: Icon, title, children }: { icon: typeof Cpu; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[32px] bg-graphite p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-graphite-2">
          <Icon aria-hidden className="size-5" />
        </span>
        <h2 className="text-xl font-medium">{title}</h2>
      </div>
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-paper/85">{children}</div>
    </section>
  )
}

export function AboutView({ storageStatus }: { storageStatus: StorageStatus }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
      <section className="rounded-[32px] bg-sun p-6 text-ink lg:col-span-2">
        <h2 className="text-3xl font-medium">AlignMe</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed">
          Software prototype for a wearable posture belt. It calibrates your upright posture, smooths the readings, measures how far you drift from it,
          and raises an alert only when the drift lasts longer than the alert delay. Covers Modules 1–3 of the ABD1411 Phase I project.
        </p>
      </section>

      <Card icon={Cpu} title="Simulated data only">
        <p>Every reading in this app comes from a simulator, not from a sensor. The ESP32, MPU6050, Bluetooth link and vibration motor are planned for the hardware phase.</p>
        <p>Alerts here are on-screen and audio software alerts. No vibration hardware is triggered.</p>
        <p>The deviation score is a software measure in degrees, not a clinical spine angle, and the app makes no medical claims.</p>
      </Card>

      <Card icon={ShieldCheck} title="Your data stays here">
        <p>Settings, your reference posture and the latest 100 events are kept in this browser’s local storage. They do not sync between devices or between the web and installed app.</p>
        <p className="text-mist">{STORAGE_TEXT[storageStatus]}</p>
      </Card>

      <Card icon={Download} title="Install the app">
        <p>
          <strong className="font-medium">Chrome or Edge on desktop:</strong> use the install icon in the address bar, or the browser menu’s “Install app” option.
        </p>
        <p>
          <strong className="font-medium">Chrome on Android:</strong> open the menu and choose “Install app” or “Add to Home screen”.
        </p>
        <p>
          <strong className="font-medium">Safari on iPhone:</strong> tap Share, then “Add to Home Screen”.
        </p>
        <p className="text-mist">Options vary by browser. Once installed, the app opens offline.</p>
      </Card>

      <Card icon={Smartphone} title="Known limitations">
        <ul className="list-disc space-y-2 pl-5">
          <li>Pitch and roll describe trunk tilt, not spinal curvature.</li>
          <li>Smoothing steadies values but slightly delays reactions.</li>
          <li>The alert delay ignores real changes shorter than the delay.</li>
          <li>Values right at the threshold can flicker; hysteresis is future work.</li>
          <li>Simulation results do not show real-world sensor accuracy.</li>
        </ul>
      </Card>
    </div>
  )
}
