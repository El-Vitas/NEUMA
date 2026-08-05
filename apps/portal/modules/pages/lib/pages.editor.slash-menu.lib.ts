import type { SlashMenuKeyDownOptions } from '../types/pages.editor.slash-menu.types';

const slashQueryPattern = /(?:^|\s)\/([^\s]*)$/;

export const getSlashMenuQuery = (text: string): string | null => slashQueryPattern.exec(text)?.[1] ?? null;

export const handleSlashMenuKeyDown = ({
  commands,
  event,
  onClose,
  onSelect,
  onSelectedIndexChange,
  selectedIndex,
}: SlashMenuKeyDownOptions): boolean => {
  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
    return true;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    if (commands.length === 0) return false;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    onSelectedIndexChange((selectedIndex + direction + commands.length) % commands.length);
    return true;
  }
  if (event.key !== 'Enter') return false;
  const command = commands[selectedIndex]?.[1];
  if (command === undefined) return false;
  event.preventDefault();
  onSelect(command.run);
  return true;
};
