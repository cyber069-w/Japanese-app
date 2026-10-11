/** Top of the Speaking page: start your self-introduction, or a short summary of it. */
import type { StudyContext } from '../../core/types';
import { Icon } from '../../components/Icon';
import { Ruby } from '../../components/Ruby';
import { speakQueue, stopSpeaking, useSpeaking } from '../../lib/speech';
import { parseSentence } from '../grammar/sentence';
import { introLines, isComplete } from './intro';

export function SpeakingBanner({ ctx }: { ctx: StudyContext }) {
  const profile = ctx.content.profile;
  const speaking = useSpeaking();

  if (!isComplete(profile)) {
    return (
      <section className="card module-banner speak-banner">
        <span className="speak-banner-ja serif" lang="ja" aria-hidden="true">はじめまして</span>
        <div className="speak-banner-text">
          <h2>Start with your self-introduction</h2>
          <p className="muted small">
            Fill in a short form and get a correct じこしょうかい with furigana, translation and audio. The oral exam questions then use your
            own details for their model answers.
          </p>
        </div>
        <a className="btn btn-primary" href="#/m/speaking/t/intro">
          <Icon name="user" size={18} /> {profile ? 'Finish it' : 'Write it'}
        </a>
      </section>
    );
  }

  const lines = introLines(profile!).map((l) => ({ id: l.id, s: parseSentence(l.ja) }));
  const who = lines.find((l) => l.id === 'name')?.s;
  return (
    <section className="card module-banner speak-banner done">
      <div className="speak-banner-text">
        <div className="eyebrow">Your self-introduction</div>
        {who && <Ruby text={who.ruby} className="serif speak-banner-name" />}
        <div className="faint small">{lines.length} sentences · saved on this device</div>
      </div>
      <div className="row">
        <button className="btn" onClick={() => (speaking ? stopSpeaking() : speakQueue(lines.map((l) => l.s.spoken), ctx.settings.voiceRate))}>
          <Icon name={speaking ? 'stop' : 'play'} size={16} /> {speaking ? 'Stop' : 'Listen'}
        </button>
        <a className="btn btn-ghost" href="#/m/speaking/t/intro">
          <Icon name="pen" size={16} /> Edit
        </a>
      </div>
    </section>
  );
}
