// Map of genres to royalty-free music URLs
// Using placeholder URLs from a reliable source or data URIs if possible.
// Since we can't easily host files, we'll use some public domain tracks from Pixabay or similar if hotlinking is allowed,
// OR we use a reliable CDN for demo purposes.
// For this environment, I will use some generic reliable URLs.

const MUSIC_TRACKS: Record<string, string> = {
  fantasy: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=fantasy-classical-themes-11449.mp3',
  'sci-fi': 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_102f3754a6.mp3?filename=space-atmosphere-2673.mp3',
  mystery: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=mystery-10643.mp3',
  adventure: 'https://cdn.pixabay.com/download/audio/2022/05/05/audio_13b47f39b9.mp3?filename=adventure-11234.mp3',
  funny: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_c63017909b.mp3?filename=funny-10641.mp3',
  fairy_tale: 'https://cdn.pixabay.com/download/audio/2022/02/07/audio_18d8d325b1.mp3?filename=fairy-tale-10856.mp3',
  educational: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d293018716.mp3?filename=calm-10639.mp3',
  bedtime: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_8716d9a779.mp3?filename=relaxing-10638.mp3',
  fable: 'https://cdn.pixabay.com/download/audio/2022/03/09/audio_c8c91a3327.mp3?filename=acoustic-guitar-loop-fable-11006.mp3',
  superhero: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_1808fbf07a.mp3?filename=epic-hero-11354.mp3', // Reusing fantasy for now as placeholder
  thriller: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_88447e769f.mp3?filename=suspense-10640.mp3',
  romance: 'https://cdn.pixabay.com/download/audio/2022/02/10/audio_fc0625916f.mp3?filename=piano-moment-10901.mp3',
  horror: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_3160a79d9d.mp3?filename=horror-10642.mp3',
  historical: 'https://cdn.pixabay.com/download/audio/2022/03/22/audio_c8c91a3327.mp3?filename=medieval-11006.mp3',
  crime: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=investigation-10643.mp3',
  drama: 'https://cdn.pixabay.com/download/audio/2022/02/10/audio_fc0625916f.mp3?filename=emotional-10901.mp3',
  default: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d293018716.mp3?filename=calm-10639.mp3'
};

export const getMusicForGenre = (genre: string): string => {
  return MUSIC_TRACKS[genre] || MUSIC_TRACKS['default'];
};
