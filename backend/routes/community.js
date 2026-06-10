const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { readJSON, writeJSON, addItem, findById } = require('../utils/jsonDB');
const { generateId } = require('../utils/helpers');

// Get all forum posts
router.get('/posts', async (req, res) => {
  const posts = readJSON('forum_posts.json');
  const users = readJSON('users.json');
  
  const postsWithUsers = posts.map(post => {
    const user = users.find(u => u.id === post.userId);
    return {
      ...post,
      authorName: user ? user.name : 'Anonymous',
      authorAvatar: user ? user.avatar : '?'
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ posts: postsWithUsers });
});

// Create a new post
router.post('/posts', authenticate, async (req, res) => {
  const { title, content } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  
  const posts = readJSON('forum_posts.json');
  const newPost = {
    id: generateId(),
    userId: req.user.id,
    title,
    content,
    replies: [],
    likes: 0,
    hot: false,
    createdAt: new Date().toISOString()
  };
  
  posts.push(newPost);
  writeJSON('forum_posts.json', posts);
  
  res.status(201).json({ success: true, post: newPost });
});

// Get single post
router.get('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const posts = readJSON('forum_posts.json');
  const post = posts.find(p => p.id === id);
  
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  const users = readJSON('users.json');
  const author = users.find(u => u.id === post.userId);
  
  // Get replies with user info
  const replies = (post.replies || []).map(reply => {
    const replyUser = users.find(u => u.id === reply.userId);
    return {
      ...reply,
      authorName: replyUser ? replyUser.name : 'Anonymous',
      authorAvatar: replyUser ? replyUser.avatar : '?'
    };
  });
  
  res.json({
    post: {
      ...post,
      authorName: author ? author.name : 'Anonymous',
      authorAvatar: author ? author.avatar : '?',
      replies
    }
  });
});

// Add reply to post
router.post('/posts/:id/reply', authenticate, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Reply content is required' });
  }
  
  const posts = readJSON('forum_posts.json');
  const postIndex = posts.findIndex(p => p.id === id);
  
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  const reply = {
    id: generateId(),
    userId: req.user.id,
    content,
    createdAt: new Date().toISOString()
  };
  
  if (!posts[postIndex].replies) posts[postIndex].replies = [];
  posts[postIndex].replies.push(reply);
  writeJSON('forum_posts.json', posts);
  
  res.status(201).json({ success: true, reply });
});

// Like a post
router.post('/posts/:id/like', authenticate, async (req, res) => {
  const { id } = req.params;
  const posts = readJSON('forum_posts.json');
  const postIndex = posts.findIndex(p => p.id === id);
  
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  posts[postIndex].likes = (posts[postIndex].likes || 0) + 1;
  writeJSON('forum_posts.json', posts);
  
  res.json({ success: true, likes: posts[postIndex].likes });
});

// Get trending posts
router.get('/trending', async (req, res) => {
  const posts = readJSON('forum_posts.json');
  const users = readJSON('users.json');
  
  const trending = posts
    .filter(p => p.likes >= 5 || (p.replies && p.replies.length >= 10))
    .map(post => {
      const user = users.find(u => u.id === post.userId);
      return {
        ...post,
        authorName: user ? user.name : 'Anonymous',
        replyCount: post.replies ? post.replies.length : 0
      };
    })
    .sort((a, b) => (b.likes + b.replyCount) - (a.likes + a.replyCount))
    .slice(0, 5);
  
  res.json({ trending });
});

// Get online users (placeholder - would use WebSockets in production)
router.get('/online', async (req, res) => {
  // Mock online users
  const onlineUsers = [
    { name: "Sarah K.", status: "Studying CCNA", online: true },
    { name: "Michael T.", status: "Taking ZTE exam", online: true },
    { name: "Jessica L.", status: "Cloud Engineering", online: true },
    { name: "David K.", status: "Away", online: false }
  ];
  
  res.json({ onlineUsers });
});

// Get study groups
router.get('/study-groups', async (req, res) => {
  const studyGroups = readJSON('study_groups.json');
  res.json({ studyGroups });
});

// Get live sessions
router.get('/live-sessions', async (req, res) => {
  const liveSessions = readJSON('live_sessions.json');
  res.json({ liveSessions });
});

module.exports = router;
