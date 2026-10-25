import { useStore } from '../store/store';
import { DemoPanel } from './DemoPanel';
import { EventDetails } from './EventDetails';
import { ListPanel } from './ListPanel';
import { MyEventsPanel } from './MyEventsPanel';
import { NotificationsPanel } from './NotificationsPanel';

/** Panneau latéral (bureau) / feuille du bas (mobile). */
export function Drawer() {
  const panel = useStore((s) => s.panel);
  const selectedId = useStore((s) => s.selectedId);
  if (!panel && !selectedId) return null;
  return (
    <aside className={`drawer${selectedId ? ' drawer--details' : ' drawer--panel'}`} key={selectedId ? 'details' : panel}>
      {selectedId ? (
        <EventDetails id={selectedId} />
      ) : panel === 'list' ? (
        <ListPanel />
      ) : panel === 'notifs' ? (
        <NotificationsPanel />
      ) : panel === 'mine' ? (
        <MyEventsPanel />
      ) : (
        <DemoPanel />
      )}
    </aside>
  );
}
