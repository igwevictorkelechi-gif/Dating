// Sample people and content so the app has something to show before a backend exists.
// `likesYou` decides whether liking someone on the dating screen becomes a match.

export const HOBBIES = ['Fishing', 'Meditating', 'Gardening', 'Skating', 'Gym', 'Cycling', 'Reading', 'Sky diving'];
export const ORIENTATIONS = ['Straight', 'Gay', 'Lesbian', 'Pan-sexual', 'Bi-sexual', 'Asexual'];
export const SPIRITUAL = ['Spiritualist', 'Traditionalist', 'Agnostic', 'Atheist'];
export const POLITICAL = ['Conservative', 'A-political', 'Moderate', 'Liberal'];
export const CAUSES = ['Feminism', 'LGBTQ', 'BLM'];
export const HABITS = ['Yes', 'No', 'Sometimes'];
export const GENDERS = ['Male', 'Female', 'Other'];
export const INTERESTED_IN = ['Men', 'Women', 'Both'];
export const LOOKING_FOR = ['Long-term relationship', 'Something casual', 'New friends', 'Still figuring it out'];

export const PEOPLE = [
  {
    id: 'ada', name: 'Ada Chisom', username: 'ada_chisom', age: 24, gender: 'Female', location: 'Ikeja, Nigeria', job: 'Librarian', lookingFor: 'Long-term relationship',
    spiritual: 'Agnostic', political: 'Liberal', orientation: 'Straight', causes: ['Feminism'],
    hobbies: ['Reading', 'Fishing', 'Skating'], smoke: 'No', drink: 'Yes',
    theory: 'Pigeons are government drones. Have you ever seen a baby pigeon?',
    bio: 'Books, beaches and bad puns.', followers: 1234, following: 310, likesYou: true, hue: 18,
  },
  {
    id: 'george', name: 'George Laura', username: 'georgelaura', age: 28, gender: 'Male', location: 'Lekki, Nigeria', job: 'Fitness coach', lookingFor: 'Long-term relationship',
    spiritual: 'Spiritualist', political: 'Moderate', orientation: 'Straight', causes: ['BLM'],
    hobbies: ['Gym', 'Cycling'], smoke: 'No', drink: 'Sometimes',
    theory: 'The moon landing was real, but the moon itself is a hologram.',
    bio: 'Chasing sunsets and good conversations.', followers: 842, following: 390, likesYou: true, hue: 140,
  },
  {
    id: 'laura', name: 'Laura the explorer', username: 'laura_explores', age: 26, gender: 'Female', location: 'Abuja, Nigeria', job: 'Travel writer', lookingFor: 'New friends',
    spiritual: 'Spiritualist', political: 'A-political', orientation: 'Bi-sexual', causes: ['LGBTQ', 'Feminism'],
    hobbies: ['Sky diving', 'Cycling', 'Meditating'], smoke: 'No', drink: 'Sometimes',
    theory: 'Every airport is secretly the same airport.',
    bio: 'Passport full, heart open. 32 countries and counting.', followers: 20400, following: 512, likesYou: false, hue: 200,
    creator: true,
  },
  {
    id: 'mimi', name: 'Mimi Adeoti', username: 'mimi_adeoti', age: 25, gender: 'Female', location: 'Yaba, Nigeria', job: 'Florist', lookingFor: 'Long-term relationship',
    spiritual: 'Traditionalist', political: 'Moderate', orientation: 'Straight', causes: ['Feminism'],
    hobbies: ['Gardening', 'Reading'], smoke: 'No', drink: 'No',
    theory: 'Plants can hear us gossiping about them.',
    bio: 'Plant mum. Jollof judge.', followers: 5310, following: 220, likesYou: true, hue: 330,
    creator: true,
  },
  {
    id: 'jack', name: 'Mr Jack', username: 'mr_jack', age: 31, gender: 'Male', location: 'Victoria Island, Nigeria', job: 'Chef', lookingFor: 'Something casual',
    spiritual: 'Atheist', political: 'Liberal', orientation: 'Straight', causes: ['BLM'],
    hobbies: ['Fishing', 'Gym'], smoke: 'Sometimes', drink: 'Yes',
    theory: 'Birds stopped being real in 1986.',
    bio: 'I cook, I fish, I tell long stories.', followers: 9870, following: 145, likesYou: false, hue: 260,
    creator: true,
  },
  {
    id: 'tomi', name: 'Tomi Bankole', username: 'tomi.b', age: 27, gender: 'Female', location: 'Ibadan, Nigeria', job: 'Yoga teacher', lookingFor: 'Still figuring it out',
    spiritual: 'Spiritualist', political: 'Moderate', orientation: 'Straight', causes: ['Feminism', 'BLM'],
    hobbies: ['Meditating', 'Reading', 'Gardening'], smoke: 'No', drink: 'Sometimes',
    theory: 'Cats are running a long con on all of us.',
    bio: 'Yoga teacher who still cannot touch her toes.', followers: 3120, following: 400, likesYou: true, hue: 45,
    creator: true,
  },
  {
    id: 'emeka', name: 'Emeka Obi', username: 'emeka_obi', age: 29, gender: 'Male', location: 'Enugu, Nigeria', job: 'Software engineer', lookingFor: 'Long-term relationship',
    spiritual: 'Agnostic', political: 'A-political', orientation: 'Straight', causes: [],
    hobbies: ['Skating', 'Cycling', 'Gym'], smoke: 'No', drink: 'Yes',
    theory: 'Traffic lights know when you are late.',
    bio: 'Engineer by day, skater by night.', followers: 760, following: 612, likesYou: true, hue: 100,
    creator: true,
  },
  {
    id: 'zainab', name: 'Zainab Musa', username: 'zee_musa', age: 30, gender: 'Female', location: 'Kano, Nigeria', job: 'Lawyer', lookingFor: 'Long-term relationship',
    spiritual: 'Traditionalist', political: 'Conservative', orientation: 'Straight', causes: [],
    hobbies: ['Reading', 'Gardening'], smoke: 'No', drink: 'No',
    theory: 'Socks do not get lost. They leave.',
    bio: 'Lawyer, stargazer, tea snob.', followers: 1480, following: 280, likesYou: false, hue: 280,
    creator: true,
  },
  {
    id: 'kunle', name: 'Kunle Ade', username: 'kunle_ade', age: 33, gender: 'Male', location: 'Surulere, Nigeria', job: 'Architect', lookingFor: 'Long-term relationship',
    spiritual: 'Spiritualist', political: 'Moderate', orientation: 'Straight', causes: ['BLM'],
    hobbies: ['Fishing', 'Reading', 'Sky diving'], smoke: 'No', drink: 'Sometimes',
    theory: 'Lagos traffic is a social experiment.',
    bio: 'Architect. I sketch buildings and people-watch in cafés.', followers: 2290, following: 350, likesYou: true, hue: 170,
  },
];

const HOUR = 3600 * 1000;
const now = Date.now();

// Posts use `note` (text on a colour card), `scene` (generated artwork) or `images` (uploaded data URLs).
export const POSTS = [
  { id: 'p1', authorId: 'laura', text: 'Ohh my goodness, Thailand is soo beautiful..... #lovely #amazing', scene: 3, likes: 214, createdAt: now - 3 * HOUR },
  { id: 'p2', authorId: 'mimi', note: 'Today is a good day. Water your plants, water yourself.', likes: 98, createdAt: now - 5 * HOUR },
  { id: 'p3', authorId: 'jack', text: 'Caught nothing, still a great morning at the lagoon.', scene: 1, likes: 57, createdAt: now - 9 * HOUR },
  { id: 'p4', authorId: 'tomi', note: 'Life is good.', likes: 143, createdAt: now - 26 * HOUR },
  { id: 'p5', authorId: 'emeka', text: 'New board, who dey for Sunday skate at the park?', scene: 5, likes: 31, createdAt: now - 30 * HOUR },
  { id: 'p6', authorId: 'ada', text: 'Finished my 12th book this year. Recommendations welcome!', scene: 2, likes: 76, createdAt: now - 50 * HOUR },
  { id: 'p7', authorId: 'george', note: 'Share deep conversations with your soul tribe.', likes: 40, createdAt: now - 70 * HOUR },
];

export const NOTIFICATIONS = [
  { id: 'n1', personId: 'laura', text: 'Started following you', at: now - 5 * HOUR },
  { id: 'n2', personId: 'mimi', text: 'Started following you', at: now - 5 * HOUR },
  { id: 'n3', personId: 'jack', text: 'Started following you', at: now - 5 * HOUR },
  { id: 'n4', personId: 'jack', text: 'Commented on your post', at: now - 5 * HOUR },
  { id: 'n5', personId: 'laura', text: 'Liked your post', at: now - 6 * HOUR },
];

// George is already a match with an open chat, so the chat screens have content on first run.
export const STARTER_CHATS = {
  george: [
    { from: 'them', text: 'Hiii', at: now - 2 * HOUR },
    { from: 'them', text: 'I saw you like reading too. What are you reading right now?', at: now - 2 * HOUR + 60000 },
  ],
};

export const AUTO_REPLIES = [
  'Haha, I love that!',
  'Tell me more 😄',
  'That is so interesting. What got you into it?',
  'Same here! We should talk about this over coffee.',
  'Okay you have my attention now.',
];

export const SUPPORT_EMAIL = 'support@alignment.app'; // placeholder — replace with your real support inbox
