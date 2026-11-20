// Photos on the welcome screen. They are free-to-use Unsplash photos, loaded from Unsplash.
// To use your own pictures, put the files in public/onboarding/ (e.g. public/onboarding/1.jpg)
// and change `src` to './onboarding/1.jpg'. Portrait (taller than wide) pictures look best.
// If a photo can't load, a drawn placeholder is shown in its place.
const unsplash = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&crop=faces&w=480&h=640&q=75`;

export const WELCOME_PHOTOS = [
  { src: unsplash('photo-1531123897727-8f129e1688ce'), alt: 'A smiling woman', hue: 30 },
  { src: unsplash('photo-1506794778202-cad84cf45f1d'), alt: 'A man smiling at the camera', hue: 140 },
  { src: unsplash('photo-1494790108377-be9c29b29330'), alt: 'A woman laughing', hue: 200 },
  { src: unsplash('photo-1507003211169-0a1dd7228f2d'), alt: 'A man in a denim jacket', hue: 90 },
  { src: unsplash('photo-1534528741775-53994a69daeb'), alt: 'A woman looking at the camera', hue: 320 },
];
