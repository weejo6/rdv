import { useMemo, useState } from 'react';
import { Clapperboard, FastForward, LocateFixed, MapPin, Radio, RotateCcw, UserMinus, UserPlus } from 'lucide-react';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { isActive, isMine, timing } from '../lib/status';
import { DAY, HOUR, MIN, fmtFullDate, fmtOffset, fmtRelative, fmtTime } from '../lib/time';
import { quoted } from '../lib/text';
import { PanelHeader } from './ui';

const SPEEDS = [
  { v: 1, label: 'x1', hint: 'temps réel' },
  { v: 60, label: 'x60', hint: '1 min / s' },
  { v: 600, label: 'x600', hint: '10 min / s' },
];

export function DemoPanel() {
  const now = useNow((s) => s.now);
  const events = useStore((s) => s.events);
  const clock = useStore((s) => s.clock);
  const simEnabled = useStore((s) => s.simEnabled);
  const posMode = useStore((s) => s.posMode);
  const locating = useStore((s) => s.locating);
  const a = useStore.getState();
  const [confirmReset, setConfirmReset] = useState(false);

  const next = useMemo(() => {
    return Object.values(events)
      .filter((e) => isMine(e) && e.kind !== 'live' && isActive(e, now))
      .map((e) => ({ e, start: timing(e, now).start }))
      .filter((x) => x.start > now)
      .sort((x, y) => x.start - y.start)[0];
  }, [events, now]);

  const offset = now - Date.now();

  return (
    <>
      <PanelHeader title="Mode démo" subtitle="Pilote le temps et les habitants simulés" icon={<Clapperboard size={18} />} />
      <div className="drawer__scroll">
        <section className="demo-section">
          <div className="demo-clock">
            <span className="demo-clock__label">Heure simulée</span>
            <span className="demo-clock__time">{fmtTime(now)}</span>
            <span className="demo-clock__date">{fmtFullDate(now)}</span>
            <span className={`demo-clock__offset${Math.abs(offset) > MIN ? ' is-shifted' : ''}`}>
              {Math.abs(offset) > MIN ? fmtOffset(offset) : 'temps réel'}
              {clock.speed !== 1 && ` · accéléré x${clock.speed}`}
            </span>
          </div>
          <div className="grid-btns">
            <button type="button" className="btn btn--ghost" onClick={() => a.jump(15 * MIN)}>
              <FastForward size={16} /> +15 min
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => a.jump(HOUR)}>
              <FastForward size={16} /> +1 h
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => a.jump(6 * HOUR)}>
              <FastForward size={16} /> +6 h
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => a.jump(DAY)}>
              <FastForward size={16} /> +1 jour
            </button>
          </div>
          <div className="seg seg--full">
            {SPEEDS.map((s) => (
              <button
                key={s.v}
                type="button"
                className={clock.speed === s.v ? 'is-on' : ''}
                onClick={() => a.setSpeed(s.v)}
                title={s.hint}
              >
                {s.label}
                <small>{s.hint}</small>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--ghost btn--block" onClick={a.resetClock}>
            <RotateCcw size={16} /> Revenir à l'heure réelle
          </button>
        </section>

        <section className="demo-section">
          <h4>Scénario « annulation automatique »</h4>
          {next ? (
            <>
              <p className="muted small">
                Ton prochain RDV : <b>{quoted(next.e.title)}</b>, {fmtRelative(next.start, now)}. Saute aux moments clés :
              </p>
              <div className="steps">
                <JumpStep
                  n={1}
                  label="J-1 : demande de confirmation"
                  hint="Une notification te demande de confirmer."
                  at={next.start - DAY + 30_000}
                  now={now}
                />
                <JumpStep
                  n={2}
                  label="H-1 : dernière confirmation"
                  hint="Si J-1 est restée sans réponse, le RDV est annulé."
                  at={next.start - HOUR + 30_000}
                  now={now}
                />
                <JumpStep
                  n={3}
                  label="Début : le RDV passe en live"
                  hint="Son épingle devient verte sur la carte."
                  at={next.start + 30_000}
                  now={now}
                />
              </div>
            </>
          ) : (
            <p className="muted small">Crée un événement (bleu ou violet) pour tester les confirmations J-1 / H-1.</p>
          )}
        </section>

        <section className="demo-section">
          <div className="switch-row">
            <div>
              <h4>Habitants simulés</h4>
              <p className="muted small">Ils rejoignent tes RDV, lancent des lives, se désinscrivent…</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={simEnabled}
              className={`switch${simEnabled ? ' is-on' : ''}`}
              onClick={() => a.setSimEnabled(!simEnabled)}
            >
              <span />
            </button>
          </div>
          <div className="grid-btns">
            <button type="button" className="btn btn--ghost" onClick={() => a.simJoin()}>
              <UserPlus size={16} /> Quelqu'un rejoint
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => a.simLeave(true)}>
              <UserMinus size={16} /> Une désinscription
            </button>
            <button type="button" className="btn btn--ghost span-2" onClick={() => a.spawnLive(true)}>
              <Radio size={16} /> Lancer un live à proximité
            </button>
          </div>
        </section>

        <section className="demo-section">
          <h4>Position</h4>
          <div className="seg seg--full">
            <button type="button" className={posMode === 'demo' ? 'is-on' : ''} onClick={a.useDemoPosition}>
              <MapPin size={14} /> Grenoble (démo)
            </button>
            <button type="button" className={posMode === 'real' ? 'is-on' : ''} onClick={a.useRealPosition} disabled={locating}>
              <LocateFixed size={14} /> {locating ? 'Localisation…' : 'Ma vraie position'}
            </button>
          </div>
          <p className="muted small">Hors de Grenoble, la démo génère des RDV fictifs autour de toi.</p>
        </section>

        <section className="demo-section">
          {confirmReset ? (
            <div className="row">
              <button type="button" className="btn btn--ghost grow" onClick={() => setConfirmReset(false)}>
                Retour
              </button>
              <button
                type="button"
                className="btn btn--danger-solid grow"
                onClick={() => {
                  setConfirmReset(false);
                  a.resetDemo();
                }}
              >
                Tout effacer
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn--danger btn--block" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={16} /> Réinitialiser la démo
            </button>
          )}
        </section>
      </div>
    </>
  );
}

function JumpStep({ n, label, hint, at, now }: { n: number; label: string; hint: string; at: number; now: number }) {
  const jumpTo = useStore((s) => s.jumpTo);
  const past = at <= now;
  return (
    <button type="button" className={`step${past ? ' is-past' : ''}`} disabled={past} onClick={() => jumpTo(at)}>
      <span className="step__n">{past ? '✓' : n}</span>
      <span className="step__text">
        <b>{label}</b>
        <small>{past ? 'Moment déjà passé' : `${hint} (${fmtRelative(at, now)})`}</small>
      </span>
      {!past && <FastForward size={16} />}
    </button>
  );
}
