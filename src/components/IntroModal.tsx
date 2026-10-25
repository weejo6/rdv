import { useStore } from '../store/store';
import { KINDS, KIND_ORDER } from '../lib/categories';
import { Logo, cssVars } from './ui';

/** Écran d'accueil affiché à la première visite. */
export function IntroModal() {
  const dismiss = useStore((s) => s.dismissIntro);
  return (
    <div className="modal-backdrop">
      <div className="modal intro" role="dialog" aria-labelledby="intro-title">
        <div className="intro__hero">
          <Logo size={64} />
          <h1 id="intro-title">RDV</h1>
          <p>Crée, découvre et rejoins les rendez-vous autour de toi.</p>
        </div>
        <ul className="intro__kinds">
          {KIND_ORDER.map((k) => (
            <li key={k} style={cssVars({ '--c': KINDS[k].color })}>
              <i className={k === 'live' ? 'is-live' : ''} />
              <div>
                <b>{KINDS[k].label}</b> · {KINDS[k].desc}
                <span>{KINDS[k].example}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="intro__note">
          Un RDV complet disparaît de la carte. Un RDV vert est un live, ou un événement qui vient de commencer.
          <br />
          <b>Démo :</b> des habitants simulés rejoignent tes RDV, lancent des lives et se désinscrivent. Le bouton « Démo »
          permet d'avancer dans le temps.
        </p>
        <button type="button" className="btn btn--brand btn--lg btn--block" onClick={dismiss} autoFocus>
          Explorer la carte
        </button>
      </div>
    </div>
  );
}
