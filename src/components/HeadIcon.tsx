import { Icon } from './Icon';

/** Small icon in front of a card title: a quiet line icon in the leather looks, a coloured app-icon tile in the Apple look. */
export function HeadIcon({ name, color }: { name: string; color: string }) {
  return (
    <span className="head-icon" style={{ '--tile': color } as React.CSSProperties} aria-hidden="true">
      <Icon name={name} size={15} />
    </span>
  );
}
