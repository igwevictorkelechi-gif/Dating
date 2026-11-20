// Trending rules shared by the feed. The database does the same (supabase/migrations/*_09_trending.sql);
// these copies are used when the server can't rank posts, and for highlighting #topics in posts.

const TAG_RE = /#([A-Za-z0-9_]{2,40})/g;

// '#Travel #food' → ['travel', 'food']
export function extractTags(text) {
  const tags = new Set();
  for (const m of (text || '').matchAll(TAG_RE)) tags.add(m[1].toLowerCase());
  return [...tags];
}

// Engagement (likes + 2 × comments + 1) divided by (hours old + 2)^1.5:
// new posts with quick engagement rise, older ones fade.
export function trendScore(post, now = Date.now()) {
  const hours = Math.max(0, (now - post.createdAt) / 3_600_000);
  return (post.likeCount + 2 * post.comments.length + 1) / (hours + 2) ** 1.5;
}

// topic is '#travel' (a hashtag) or 'travel' (a keyword anywhere in the post).
export function matchesTopic(post, topic) {
  if (!topic) return true;
  if (topic.startsWith('#')) return post.tags.includes(topic.slice(1).toLowerCase());
  const word = topic.replace(/[^A-Za-z0-9_]/g, '');
  return word.length > 0 && new RegExp(`\\b${word}\\b`, 'i').test(post.text || post.note || '');
}

const STOP = new Set(`about after again also always anyone anything back because been before being came come could didn
does doesn doing done dont even every from going gonna good have here into just know like look made make many more most
much need never only other over people really said same should some something still such sure take than that their them
then there these they thing things think this those time today very want wanna well were what when where which while will
with would yeah your youre thats cant wont isnt`.split(/\s+/));

// Hashtags and keywords trending in the posts already loaded (last 7 days, flagged posts left out).
export function localTopics(posts, limit = 12, now = Date.now()) {
  const weights = new Map();
  const counts = new Map();
  const add = (key, kind, w) => {
    const id = `${kind}:${key}`;
    weights.set(id, (weights.get(id) || 0) + w);
    counts.set(id, (counts.get(id) || 0) + 1);
  };
  posts
    .filter((p) => !p.flagged && now - p.createdAt < 7 * 86_400_000)
    .forEach((p) => {
      const w = trendScore(p, now);
      p.tags.forEach((t) => add(`#${t}`, 'tag', w));
      const words = new Set(((p.text || p.note || '').match(/\b[A-Za-z]{4,30}\b/g) || []).map((x) => x.toLowerCase()));
      words.forEach((x) => { if (!STOP.has(x) && !p.tags.includes(x)) add(x, 'keyword', w); });
    });
  return [...weights.entries()]
    .map(([id, score]) => {
      const [kind, ...rest] = id.split(':');
      return { topic: rest.join(':'), kind, posts: counts.get(id), score };
    })
    .filter((t) => t.kind === 'tag' || t.posts >= 2)
    .sort((a, b) => b.score - a.score || b.posts - a.posts)
    .slice(0, limit);
}
