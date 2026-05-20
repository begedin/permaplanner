export const confirmGuildDeletion = (guildName: string): boolean =>
  window.confirm(`Delete guild “${guildName}”? This cannot be undone.`);
