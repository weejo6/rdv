import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ImagePlus, Minus, Plus, Repeat, Send, X, Zap, type LucideIcon } from 'lucide-react';
import type { CategoryId, EventKind, MediaItem, Place } from '../types';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { CATEGORIES, CATEGORY_ORDER, KINDS, KIND_ORDER } from '../lib/categories';
import { DAY, WD_ABBR, WEEK_ORDER, fmtDay, fmtDuration, fmtWeekdays, toDateInput } from '../lib/time';
import { plural } from '../lib/text';
import { uid } from '../lib/random';
import { LocationPicker } from './LocationPicker';
import { MediaView, cssVars } from './ui';

const KIND_ICONS: Record<EventKind, LucideIcon> = { event: CalendarDays, regular: Repeat, live: Zap };
const DURATIONS = [30, 60, 90, 120, 180, 240, 360];
const LIVE_DURATIONS = [30, 60, 90, 120, 180];
const MAX_MEDIA = 8;

export function CreateEventModal() {
  const close = useStore((s) => s.closeCreate);
  const createEvent = useStore((s) => s.createEvent);
  const preset = useStore((s) => s.createPreset);
  const myPos = useStore((s) => s.myPos);
  const now = useNow((s) => s.now);
  const openedAt = useRef(now).current;
  const fileInput = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<EventKind>('event');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryId>('jeux');
  const [capacity, setCapacity] = useState(10);
  const [present, setPresent] = useState(1);
  const [place, setPlace] = useState<Place>(() =>
    preset ? { ...preset, label: '' } : { lat: myPos.lat, lng: myPos.lng, label: myPos.label },
  );
  const [date, setDate] = useState(() => toDateInput(openedAt + DAY));
  const [time, setTime] = useState('14:00');
  const [weekdays, setWeekdays] = useState<number[]>(() => [new Date(openedAt + DAY).getDay()]);
  const [duration, setDuration] = useState(120);
  const [liveDuration, setLiveDuration] = useState(60);
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const startAt = useMemo(() => new Date(`${date}T${time || '00:00'}`).getTime(), [date, time]);
  const errors = {
    title: title.trim().length < 3 ? 'Donne un nom à ton RDV (3 caractères minimum).' : null,
    place: !place.label.trim() ? 'Indique le nom du lieu.' : null,
    when:
      kind === 'event' && !(startAt > now)
        ? 'Choisis une date et une heure dans le futur.'
        : kind === 'regular' && !weekdays.length
          ? 'Choisis au moins un jour.'
          : null,
  };
  const valid = !errors.title && !errors.place && !errors.when;
  const show = (msg: string | null) => (submitted ? msg : null);
  const color = KINDS[kind].color;
  const missing = capacity - present;

  const setCap = (n: number) => {
    const c = Math.max(2, Math.min(100, n));
    setCapacity(c);
    if (present > c - 1) setPresent(c - 1);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const items: MediaItem[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .slice(0, MAX_MEDIA - media.length)
      .map((f) => ({ id: uid('m'), kind: f.type.startsWith('video/') ? 'video' : 'image', name: f.name, blob: f }));
    setMedia((m) => [...m, ...items]);
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitted(true);
    if (!valid) {
      document.querySelector('.modal .is-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    createEvent({
      kind,
      title,
      category,
      capacity,
      alreadyPresent: present,
      place,
      startAt: kind === 'event' ? startAt : undefined,
      recurrence: kind === 'regular' ? { weekdays, time } : undefined,
      durationMin: kind === 'live' ? liveDuration : duration,
      description,
      media,
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(ev) => ev.target === ev.currentTarget && close()}>
      <form
        className="modal create"
        onSubmit={submit}
        style={cssVars({ '--c': color, '--soft': KINDS[kind].soft })}
        noValidate
      >
        <header className="modal__header">
          <div>
            <h2>Créer un RDV</h2>
            <p>Les gens autour de toi pourront le voir et le rejoindre.</p>
          </div>
          <button type="button" className="icon-btn" onClick={close} aria-label="Fermer">
            <X size={20} />
          </button>
        </header>

        <div className="modal__body">
          <div className="field">
            <span className="field__label">Type de RDV</span>
            <div className="kind-cards">
              {KIND_ORDER.map((k) => {
                const Icon = KIND_ICONS[k];
                return (
                  <button
                    key={k}
                    type="button"
                    className={`kind-card${kind === k ? ' is-on' : ''}`}
                    style={cssVars({ '--c': KINDS[k].color, '--soft': KINDS[k].soft })}
                    onClick={() => setKind(k)}
                  >
                    <span className="kind-card__icon">
                      <Icon size={18} />
                    </span>
                    <span>
                      <b>{KINDS[k].label}</b>
                      <small>{KINDS[k].desc}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="hint">Ex. : {KINDS[kind].example}</p>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="rdv-title">
              Nom
            </label>
            <input
              id="rdv-title"
              className={`input${show(errors.title) ? ' is-error' : ''}`}
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              placeholder="Ex : Partie de loup-garou"
              maxLength={60}
              autoFocus
            />
            {show(errors.title) && <div className="error">{errors.title}</div>}
          </div>

          <div className="field">
            <span className="field__label">Catégorie</span>
            <div className="cat-grid">
              {CATEGORY_ORDER.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cat-opt${category === c ? ' is-on' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {CATEGORIES[c].emoji} {CATEGORIES[c].label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">Personnes</span>
            <div className="steppers">
              <Stepper label="Nombre total" value={capacity} onChange={setCap} min={2} max={100} />
              <Stepper
                label="Déjà présentes (toi inclus)"
                value={present}
                onChange={(n) => setPresent(Math.max(1, Math.min(capacity - 1, n)))}
                min={1}
                max={capacity - 1}
              />
            </div>
            <p className="hint">
              → Il manque <b>{plural(missing, 'personne')}</b>. Dès que c'est complet, ton RDV disparaît de la carte.
            </p>
          </div>

          <div className="field">
            <span className="field__label">Lieu</span>
            <LocationPicker
              value={place}
              onChange={setPlace}
              color={color}
              emoji={CATEGORIES[category].emoji}
              error={show(errors.place)}
            />
          </div>

          <div className="field">
            <span className="field__label">Horaire</span>
            {kind === 'event' && (
              <>
                <div className="row">
                  <input
                    type="date"
                    className={`input grow${show(errors.when) ? ' is-error' : ''}`}
                    value={date}
                    min={toDateInput(now)}
                    onChange={(ev) => setDate(ev.target.value)}
                  />
                  <input
                    type="time"
                    className={`input input--time${show(errors.when) ? ' is-error' : ''}`}
                    value={time}
                    onChange={(ev) => setTime(ev.target.value)}
                    step={300}
                  />
                </div>
                {!Number.isNaN(startAt) && startAt > now && (
                  <p className="hint">
                    {fmtDay(startAt, now)} · confirmation demandée 24 h puis 1 h avant (sinon annulation automatique).
                  </p>
                )}
              </>
            )}
            {kind === 'regular' && (
              <>
                <div className="days">
                  {WEEK_ORDER.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`day${weekdays.includes(d) ? ' is-on' : ''}`}
                      onClick={() =>
                        setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))
                      }
                      aria-pressed={weekdays.includes(d)}
                    >
                      {WD_ABBR[d]}
                    </button>
                  ))}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <span className="muted">à</span>
                  <input
                    type="time"
                    className="input input--time"
                    value={time}
                    onChange={(ev) => setTime(ev.target.value)}
                    step={300}
                  />
                </div>
                <p className={show(errors.when) ? 'error' : 'hint'}>
                  {weekdays.length ? `${fmtWeekdays(weekdays)} à ${time.replace(':', 'h')}` : 'Choisis au moins un jour.'}
                </p>
              </>
            )}
            {kind === 'live' && (
              <div className="live-now">
                <Zap size={18} />
                <span>
                  <b>Commence maintenant.</b> Ton RDV apparaît tout de suite en vert sur la carte.
                </span>
              </div>
            )}
            {show(errors.when) && kind === 'event' && <div className="error">{errors.when}</div>}
          </div>

          <div className="field">
            <span className="field__label">Durée</span>
            <div className="seg">
              {(kind === 'live' ? LIVE_DURATIONS : DURATIONS).map((d) => {
                const on = (kind === 'live' ? liveDuration : duration) === d;
                return (
                  <button
                    key={d}
                    type="button"
                    className={on ? 'is-on' : ''}
                    onClick={() => (kind === 'live' ? setLiveDuration(d) : setDuration(d))}
                  >
                    {fmtDuration(d)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="rdv-desc">
              Description
            </label>
            <textarea
              id="rdv-desc"
              className="input"
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              placeholder="Le programme, le niveau, ce qu'il faut apporter…"
              maxLength={600}
              rows={3}
            />
          </div>

          <div className="field">
            <span className="field__label">Photos & vidéos</span>
            <div className="media-grid">
              {media.map((m) => (
                <div key={m.id} className="media-thumb">
                  <MediaView m={m} />
                  <button
                    type="button"
                    className="media-thumb__remove"
                    onClick={() => setMedia((list) => list.filter((x) => x.id !== m.id))}
                    aria-label="Retirer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {media.length < MAX_MEDIA && (
                <button type="button" className="media-add" onClick={() => fileInput.current?.click()}>
                  <ImagePlus size={22} />
                  Ajouter
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(ev) => {
                onFiles(ev.target.files);
                ev.target.value = '';
              }}
            />
          </div>
        </div>

        <footer className="modal__footer">
          <span className="modal__summary">
            <i className="dot" /> {KINDS[kind].label}
            {missing > 0 && ` · ${plural(missing, 'place')}`}
          </span>
          <button type="button" className="btn btn--ghost" onClick={close}>
            Annuler
          </button>
          <button type="submit" className="btn btn--primary">
            <Send size={16} /> Publier
          </button>
        </footer>
      </form>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="stepper">
      <span className="stepper__label">{label}</span>
      <div className="stepper__row">
        <button
          type="button"
          className="stepper__btn"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label="Moins"
        >
          <Minus size={16} />
        </button>
        <span className="stepper__value">{value}</span>
        <button
          type="button"
          className="stepper__btn"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label="Plus"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
