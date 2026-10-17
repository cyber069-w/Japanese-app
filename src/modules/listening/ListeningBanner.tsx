/** Voice status and speed control at the top of the Listening page. */
import { useEffect, useState } from 'react';
import type { StudyContext } from '../../core/types';
import { updateSettings } from '../../core/store';
import { hasJapaneseVoice, onVoicesChanged, speak, speechSupported, useSpeaking, voiceName } from '../../lib/speech';
import { Icon } from '../../components/Icon';

const SAMPLE = 'わたしは まいにち にほんごを べんきょうします。';

export function ListeningBanner({ ctx }: { ctx: StudyContext }) {
  const [, force] = useState(0);
  useEffect(() => onVoicesChanged(() => force((n) => n + 1)), []);
  const speaking = useSpeaking();
  const rate = ctx.settings.voiceRate;

  if (!speechSupported()) {
    return (
      <div className="notice warn module-banner">
        This browser has no text-to-speech, so the listening exercises can’t play audio. Safari, Chrome and Edge all work.
      </div>
    );
  }

  const label = rate <= 0.65 ? 'very slow' : rate <= 0.85 ? 'slow' : rate <= 1.05 ? 'natural' : 'fast';
  return (
    <section className="card card-pad module-banner listen-banner">
      <div className="listen-voice">
        <span className={`listen-icon${speaking ? ' on' : ''}`}>
          <Icon name="speaker" size={20} />
        </span>
        <div>
          <b>{hasJapaneseVoice() ? voiceName() : 'No Japanese voice found'}</b>
          <div className="faint small">
            {hasJapaneseVoice()
              ? 'Space replays a question, Shift + Space replays it slower.'
              : 'Add one: iPhone/Mac › Settings › Accessibility › Spoken Content › Voices › Japanese; Windows › Settings › Time & language › Speech.'}
          </div>
        </div>
      </div>
      <div className="listen-speed">
        <label className="small muted" htmlFor="listen-rate">
          Speed <b className="nowrap">{rate.toFixed(2)}× · {label}</b>
        </label>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input
            id="listen-rate"
            type="range"
            min={0.5}
            max={1.3}
            step={0.05}
            value={rate}
            onChange={(e) => updateSettings({ voiceRate: Number(e.target.value) })}
          />
          <button className="btn btn-sm" onClick={() => speak(SAMPLE, rate)}>
            <Icon name="play" size={14} /> Test
          </button>
        </div>
      </div>
    </section>
  );
}
