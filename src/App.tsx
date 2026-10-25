import { useStore } from './store/store';
import { useSimulation } from './sim/useSimulation';
import { MapView } from './components/MapView';
import { TopBar } from './components/TopBar';
import { Legend, MapControls, Toasts } from './components/MapOverlays';
import { Drawer } from './components/Drawer';
import { CreateEventModal } from './components/CreateEventModal';
import { IntroModal } from './components/IntroModal';
import { Logo } from './components/ui';

export default function App() {
  const hydrated = useStore((s) => s.hydrated);
  const drawerOpen = useStore((s) => !!s.panel || !!s.selectedId);
  const createOpen = useStore((s) => s.createOpen);
  const introSeen = useStore((s) => s.introSeen);
  useSimulation();

  if (!hydrated) {
    return (
      <div className="splash">
        <Logo size={56} />
        <span>RDV</span>
      </div>
    );
  }

  return (
    <div className={`app${drawerOpen ? ' has-drawer' : ''}`}>
      <main className="stage">
        <MapView drawerOpen={drawerOpen} />
        <TopBar />
        <MapControls />
        <Legend />
        <Toasts />
      </main>
      <Drawer />
      {createOpen && <CreateEventModal />}
      {!introSeen && <IntroModal />}
    </div>
  );
}
