import { useStore } from '../store/store';
import { ChatPanel } from './ChatPanel';
import { DemoPanel } from './DemoPanel';
import { EventDetails } from './EventDetails';
import { ListPanel } from './ListPanel';
import { MyEventsPanel } from './MyEventsPanel';
import { NotificationsPanel } from './NotificationsPanel';

/** Panneau latéral (bureau) / feuille du bas (mobile). */
export function Drawer() {
  const panel = useStore((s) => s.panel);
  const selectedId = useStore((s) => s.selectedId);
  const chatOpen = useStore((s) => s.chatOpen);
  if (!panel && !selectedId) return null;
  const chat = !!selectedId && chatOpen;
  return (
    <aside
      className={`drawer${selectedId && !chat ? ' drawer--details' : ' drawer--panel'}`}
      key={chat ? 'chat' : selectedId ? 'details' : panel}
    >
      {chat ? (
        <ChatPanel id={selectedId!} />
      ) : selectedId ? (
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
