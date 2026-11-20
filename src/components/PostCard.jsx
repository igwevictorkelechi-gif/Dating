import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { timeAgo, useApp } from '../store.jsx';
import { Avatar } from './ui.jsx';
import { Scene } from './Art.jsx';

// Shows #topics as buttons that open that topic in the feed.
function WithTags({ text, onTopic }) {
  const parts = text.split(/(#[A-Za-z0-9_]{2,40})/g);
  return parts.map((part, i) => (i % 2 === 1
    ? <button key={i} type="button" className="hashtag" onClick={() => onTopic?.(part.toLowerCase())}>{part}</button>
    : part));
}

export default function PostCard({ post, onTopic }) {
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const openTopic = onTopic || ((t) => navigate(`/home?topic=${encodeURIComponent(t)}`));
  const { state, toggleFollow, toggleLike, addComment, deletePost, person, toast } = useApp();
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');
  const author = post.author;
  const mine = post.authorId === 'me';
  const following = state.following.includes(post.authorId);
  const profileLink = mine ? '/profile' : `/u/${post.authorId}`;
  const images = post.images || [];

  const submitComment = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    addComment(post.id, text);
    setDraft('');
  };

  return (
    <article className="post">
      <header className="post-head">
        <Link to={profileLink}><Avatar person={author} size={40} /></Link>
        <Link to={profileLink} className="who">
          <div className="name">{author.username}</div>
          <div className="time">{timeAgo(post.createdAt)} ago</div>
        </Link>
        {mine ? (
          <button type="button" className="follow-inline following" onClick={() => { deletePost(post.id); toast('Post deleted'); }} aria-label="Delete post">
            <Trash2 size={18} />
          </button>
        ) : (
          <button type="button" className={`follow-inline ${following ? 'following' : ''}`} onClick={() => toggleFollow(post.authorId)}>
            {following ? 'Following' : <>Follow <Plus size={22} /></>}
          </button>
        )}
      </header>

      {post.flagged && (mine || revealed) && (
        <p className="flag-label"><ShieldAlert size={16} /> Flagged: {post.flagReason || 'Sensitive content'}{mine && ' · others see a warning first'}</p>
      )}
      {post.flagged && !mine && !revealed ? (
        <div className="flag-cover">
          <ShieldAlert size={28} />
          <strong>{post.flagReason || 'Sensitive content'}</strong>
          <span>This post contains a flagged keyword.</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setRevealed(true)}>Show post</button>
        </div>
      ) : (
        <>
          {post.text && <p className="post-text"><WithTags text={post.text} onTopic={openTopic} /></p>}
          {post.note && <div className="post-note"><span><WithTags text={post.note} onTopic={openTopic} /></span></div>}
          {post.scene !== undefined && <div className="post-media"><Scene index={post.scene} /></div>}
          {images.length > 0 && (
            <div className={`post-media ${images.length > 1 ? 'two' : ''}`}>
              {images.map((src, i) => <img key={i} src={src} alt="" />)}
            </div>
          )}
          {post.video && (
            <div className="post-media">
              <video src={post.video} controls playsInline preload="metadata" />
            </div>
          )}
        </>
      )}

      <div className="post-actions">
        <button type="button" className={post.liked ? 'liked' : ''} onClick={() => toggleLike(post.id)} aria-pressed={post.liked} aria-label="Like">
          <Heart size={24} /> {post.likeCount > 0 && post.likeCount}
        </button>
        <button type="button" onClick={() => setShowComments((v) => !v)} aria-expanded={showComments} aria-label="Comments">
          <MessageCircle size={24} /> {post.comments.length > 0 && post.comments.length}
        </button>
      </div>

      {showComments && (
        <div className="comments">
          {post.comments.map((c, i) => (
            <p key={i}><strong>{person(c.by).username}</strong> {c.text}</p>
          ))}
          <form className="comment-form" onSubmit={submitComment}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment…" aria-label="Add a comment" />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>Post</button>
          </form>
        </div>
      )}
    </article>
  );
}
