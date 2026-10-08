// AI models frequently hallucinate plausible-looking but broken/nonexistent
// video URLs, so these are constructed search-result links (always valid)
// rather than any attempt to link a specific video.
function encodeQuery(value: string): string {
  return encodeURIComponent(value).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

export function buildTrackVideoLinks(track: string, car: string | undefined, channels: string[] = []): string {
  const subject = car ? `${track} ${car}` : track;
  const setupQuery = encodeQuery(`${subject} setup guide iRacing`);
  const onboardQuery = encodeQuery(`${subject} onboard lap iRacing`);

  const channelQuery = encodeQuery(subject.replace(/\s+-\s+/g, ' '));
  const channelLinks = channels.map((handle) => `**${handle.replace(/^@/, '')}:** [${track} guides](https://www.youtube.com/${handle}/search?query=${channelQuery})`);

  const generic = [
    `[Setup guides](https://www.youtube.com/results?search_query=${setupQuery})`,
    `[Onboard laps](https://www.youtube.com/results?search_query=${onboardQuery})`,
  ].join(' · ');

  return [...channelLinks, generic].join('\n');
}
