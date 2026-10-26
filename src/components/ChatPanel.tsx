import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, Lock, Send, X } from 'lucide-react';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { KINDS } from '../lib/categories';
import { chatMembers, senderName } from '../lib/chat';
import { displayKind, isJoined, isMine } from '../lib/status';
import { fmtDay, fmtTime, startOfDay } from '../lib/time';
import { plural } from '../lib/text';
import { Avatar, AvatarStack, cssVars } from './ui';

const SUGGESTIONS = ['On se retrouve où exactement ?', 'Il faut apporter quelque chose ?', 'Salut tout le monde 👋'];

/** Discussion entre les participants d'un RDV. */
export function ChatPanel({ id }: { id: string }) {
  const e = useStore((s) => s.events[id]);
  const meName = useStore((s) => s.me.name);
  const closeChat = useStore((s) => s.closeChat);
  const closeDrawer = useStore((s) => s.closeDrawer);
  const sendMessage = useStore((s) => s.sendMessage);
  const markChatRead = useStore((s) => s.markChatRead);
  const now = useNow((s) => s.now);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const count = e?.chat?.length ?? 0;

  // Toujours afficher le dernier message, et le marquer comme lu.
  useLayoutEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [count]);
  useEffect(() => {
    markChatRead(id);
  }, [count, id, markChatRead]);

  if (!e) return null;
  const allowed = isMine(e) || isJoined(e);
  const members = chatMembers(e);
  const kindColor = KINDS[displayKind(e, now)].color;

  const send = (value = text) => {
    if (!value.trim()) return;
    sendMessage(id, value);
    setText('');
    inputRef.current?.focus();
  };

  const messages = e.chat ?? [];
  let lastDay = 0;

  return (
    <div className="chat" style={cssVars({ '--c': kindColor })}>
      <header className="chat__head">
        <button type="button" className="icon-btn" onClick={closeChat} aria-label="Retour au RDV">
          <ChevronLeft size={20} />
        </button>
        <span className="chat__emoji">{e.emoji}</span>
        <div className="chat__title">
          <b>{e.title}</b>
          <span>Discussion · {plural(members.length + (allowed ? 1 : 0), 'membre', 'membres')}</span>
        </div>
        <AvatarStack ids={[...(allowed ? ['me'] : []), ...members]} max={3} size={26} />
        <button type="button" className="icon-btn" onClick={closeDrawer} aria-label="Fermer">
          <X size={20} />
        </button>
      </header>

      {!allowed ? (
        <div className="chat__locked">
          <Lock size={28} />
          <b>Discussion réservée aux participants</b>
          <span>Inscris-toi au RDV pour échanger avec l’organisateur et les autres inscrits.</span>
          <button type="button" className="btn btn--primary" onClick={closeChat}>
            Voir le RDV
          </button>
        </div>
      ) : (
        <>
          <div className="chat__list" ref={listRef}>
            {messages.length === 0 && (
              <div className="chat__empty">
                <span>💬</span>
                <b>Aucun message pour l’instant</b>
                <p>Pose une question à l’organisateur ou dis bonjour aux autres participants !</p>
              </div>
            )}
            {messages.map((m, i) => {
              const day = startOfDay(m.at);
              const showDay = day !== lastDay;
              lastDay = day;
              const mine = m.from === 'me';
              const prev = messages[i - 1];
              const grouped = prev && prev.from === m.from && m.at - prev.at < 5 * 60_000 && !showDay;
              return (
                <div key={m.id}>
                  {showDay && <div className="chat__day">{fmtDay(m.at, now)}</div>}
                  <div className={`chat__row${mine ? ' is-me' : ''}${grouped ? ' is-grouped' : ''}`}>
                    {!mine && <span className="chat__avatar">{!grouped && <Avatar id={m.from} size={30} />}</span>}
                    <div className="chat__bubble">
                      {!mine && !grouped && (
                        <span className="chat__author">
                          {senderName(m.from, meName)}
                          {m.from === e.organizerId && <small>orga</small>}
                        </span>
                      )}
                      <span className="chat__text">{m.text}</span>
                      <span className="chat__time">{fmtTime(m.at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {messages.filter((m) => m.from === 'me').length === 0 && (
            <div className="chat__suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="chat__composer"
            onSubmit={(ev) => {
              ev.preventDefault();
              send();
            }}
          >
            <textarea
              ref={inputRef}
              value={text}
              rows={1}
              maxLength={500}
              placeholder="Écrire un message…"
              onChange={(ev) => setText(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' && !ev.shiftKey) {
                  ev.preventDefault();
                  send();
                }
              }}
              aria-label="Message"
            />
            <button type="submit" className="chat__send" disabled={!text.trim()} aria-label="Envoyer">
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
