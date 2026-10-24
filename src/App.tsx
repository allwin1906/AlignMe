import { AppShell } from '@/components/shell/AppShell'
import { usePostureEngine } from '@/hooks/usePostureEngine'

export default function App() {
  const model = usePostureEngine()
  return <AppShell model={model} />
}
