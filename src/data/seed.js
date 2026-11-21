// Option lists used by the profile and dating screens (they match the database's allowed values).

export const HOBBIES = ['Fishing', 'Meditating', 'Gardening', 'Skating', 'Gym', 'Cycling', 'Reading', 'Sky diving'];
export const ORIENTATIONS = ['Straight', 'Gay', 'Lesbian', 'Pan-sexual', 'Bi-sexual', 'Asexual'];
export const SPIRITUAL = ['Spiritualist', 'Traditionalist', 'Agnostic', 'Atheist'];
export const POLITICAL = ['Conservative', 'A-political', 'Moderate', 'Liberal'];
export const CAUSES = ['Feminism', 'LGBTQ', 'BLM'];
export const HABITS = ['Yes', 'No', 'Sometimes'];
export const GENDERS = ['Male', 'Female', 'Other'];
export const INTERESTED_IN = ['Men', 'Women', 'Both'];
// Zodiac signs (Western dates). `from`/`to` are [month, day], inclusive.
export const ZODIAC = [
  { sign: 'Aries', symbol: '♈', from: [3, 21], to: [4, 19] },
  { sign: 'Taurus', symbol: '♉', from: [4, 20], to: [5, 20] },
  { sign: 'Gemini', symbol: '♊', from: [5, 21], to: [6, 20] },
  { sign: 'Cancer', symbol: '♋', from: [6, 21], to: [7, 22] },
  { sign: 'Leo', symbol: '♌', from: [7, 23], to: [8, 22] },
  { sign: 'Virgo', symbol: '♍', from: [8, 23], to: [9, 22] },
  { sign: 'Libra', symbol: '♎', from: [9, 23], to: [10, 22] },
  { sign: 'Scorpio', symbol: '♏', from: [10, 23], to: [11, 21] },
  { sign: 'Sagittarius', symbol: '♐', from: [11, 22], to: [12, 21] },
  { sign: 'Capricorn', symbol: '♑', from: [12, 22], to: [1, 19] },
  { sign: 'Aquarius', symbol: '♒', from: [1, 20], to: [2, 18] },
  { sign: 'Pisces', symbol: '♓', from: [2, 19], to: [3, 20] },
];
export const ZODIAC_SIGNS = ZODIAC.map((z) => z.sign);

// The sign for a birthday (day and month as numbers or strings), or '' if it isn't known.
export function zodiacFor(day, month) {
  const d = Number(day);
  const m = Number(month);
  if (!d || !m) return '';
  const key = m * 100 + d;
  const hit = ZODIAC.find(({ from, to }) => {
    const a = from[0] * 100 + from[1];
    const b = to[0] * 100 + to[1];
    return a <= b ? key >= a && key <= b : key >= a || key <= b; // Capricorn wraps the new year
  });
  return hit ? hit.sign : '';
}

export const zodiacLabel = (sign) => {
  const z = ZODIAC.find((x) => x.sign === sign);
  return z ? `${z.symbol} ${z.sign}` : '';
};

export const LOOKING_FOR = ['Long-term relationship', 'Something casual', 'New friends', 'Still figuring it out'];

export const SUPPORT_EMAIL = 'support@alignment.app'; // placeholder — replace with your real support inbox
