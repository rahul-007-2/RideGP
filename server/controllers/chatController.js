const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Create a new group
 */
async function createGroup(req, res) {
  try {
    const userId = req.user.userId;
    const { name, description, avatar_emoji, member_emails } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Resolve member emails to user IDs
    let memberIds = [userId]; // creator is always a member
    let notFoundEmails = [];
    if (member_emails && member_emails.length > 0) {
      const normalized = member_emails
        .map(e => (e || '').trim().toLowerCase())
        .filter(e => e && e.includes('@'));
      const users = await User.find({ email: { $in: normalized } });
      const foundEmails = users.map(u => u.email.toLowerCase());
      notFoundEmails = normalized.filter(e => !foundEmails.includes(e));
      memberIds = [...new Set([...memberIds, ...users.map(u => u._id.toString())])];
    }

    const group = new Group({
      name: name.trim(),
      description: (description || '').trim(),
      created_by: userId,
      members: memberIds,
      avatar_emoji: avatar_emoji || '🏍️'
    });

    await group.save();

    // Populate member details
    await group.populate('members', 'name email');

    let msg = 'Group created';
    if (notFoundEmails.length > 0) {
      msg += `. Not found: ${notFoundEmails.join(', ')} — they need to sign up first`;
    }
    res.status(201).json({ message: msg, group, not_found: notFoundEmails });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get user's groups
 */
async function getUserGroups(req, res) {
  try {
    const userId = req.user.userId;

    const groups = await Group.find({ members: userId })
      .populate('members', 'name email')
      .sort({ updated_at: -1 });

    // Get last message for each group
    const groupsWithLastMsg = await Promise.all(
      groups.map(async (g) => {
        const lastMsg = await Message.findOne({ group_id: g._id })
          .sort({ created_at: -1 })
          .populate('sender_id', 'name');
        return {
          ...g.toObject(),
          last_message: lastMsg ? {
            text: lastMsg.text,
            sender_name: lastMsg.sender_id?.name || 'Unknown',
            created_at: lastMsg.created_at
          } : null
        };
      })
    );

    res.json({ groups: groupsWithLastMsg });
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get group details
 */
async function getGroup(req, res) {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;

    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!group.members.some(m => m._id.toString() === userId)) {
      return res.status(403).json({ error: 'Not a member' });
    }

    res.json({ group });
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Add members to a group
 * Only adds users whose email exists in the database
 */
async function addMembers(req, res) {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;
    const { member_emails } = req.body;

    if (!member_emails || !Array.isArray(member_emails) || member_emails.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one email address' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!group.members.some(m => m.toString() === userId)) {
      return res.status(403).json({ error: 'Not a member' });
    }

    // Normalize emails: lowercase and trim
    const normalizedEmails = member_emails
      .map(e => (e || '').trim().toLowerCase())
      .filter(e => e && e.includes('@'));

    if (normalizedEmails.length === 0) {
      return res.status(400).json({ error: 'Invalid email addresses' });
    }

    // Find users by email — case-insensitive
    const users = await User.find({
      email: { $in: normalizedEmails }
    });

    const foundEmails = users.map(u => u.email.toLowerCase());
    const notFoundEmails = normalizedEmails.filter(e => !foundEmails.includes(e));

    if (users.length === 0) {
      return res.status(404).json({
        error: `No user found with email: ${notFoundEmails.join(', ')}. They must sign up first.`
      });
    }

    // Filter out users already in the group
    const currentMemberIds = group.members.map(m => m.toString());
    const newUserIds = users
      .map(u => u._id.toString())
      .filter(id => !currentMemberIds.includes(id));

    if (newUserIds.length === 0) {
      return res.status(400).json({
        error: 'All these users are already in the group'
      });
    }

    // Add new members
    group.members = [...currentMemberIds, ...newUserIds];
    await group.save();
    await group.populate('members', 'name email');

    // Build response message
    const addedNames = users
      .filter(u => newUserIds.includes(u._id.toString()))
      .map(u => u.name)
      .join(', ');

    let message = `Added: ${addedNames}`;
    if (notFoundEmails.length > 0) {
      message += `. Not found: ${notFoundEmails.join(', ')}`;
    }

    res.json({ message, group, added: newUserIds.length, not_found: notFoundEmails });
  } catch (err) {
    console.error('Add members error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Leave a group
 */
async function leaveGroup(req, res) {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    group.members = group.members.filter(m => m.toString() !== userId);

    if (group.members.length === 0) {
      // Delete group if empty
      await Message.deleteMany({ group_id: groupId });
      await Group.findByIdAndDelete(groupId);
      return res.json({ message: 'Group deleted (empty)' });
    }

    // Transfer ownership if creator left
    if (group.created_by.toString() === userId) {
      group.created_by = group.members[0];
    }

    await group.save();
    res.json({ message: 'Left group' });
  } catch (err) {
    console.error('Leave group error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get messages for a group
 */
async function getMessages(req, res) {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;
    const { limit = 50, before } = req.query;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!group.members.some(m => m.toString() === userId)) {
      return res.status(403).json({ error: 'Not a member' });
    }

    const query = { group_id: groupId };
    if (before) {
      query.created_at = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .populate('sender_id', 'name');

    res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Send a message
 */
async function sendMessage(req, res) {
  try {
    const userId = req.user.userId;
    const { groupId } = req.params;
    const { text, media_url, media_type } = req.body;

    if ((!text || !text.trim()) && !media_url) {
      return res.status(400).json({ error: 'Message text or media is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!group.members.some(m => m.toString() === userId)) {
      return res.status(403).json({ error: 'Not a member' });
    }

    const user = await User.findById(userId);

    const message = new Message({
      group_id: groupId,
      sender_id: userId,
      sender_name: user?.name || 'Unknown',
      text: (text || '').trim(),
      media_url: media_url || null,
      media_type: media_type || null,
    });

    await message.save();

    // Update group timestamp
    group.updated_at = new Date();
    await group.save();

    await message.populate('sender_id', 'name');

    res.status(201).json({ message: message });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createGroup,
  getUserGroups,
  getGroup,
  addMembers,
  leaveGroup,
  getMessages,
  sendMessage
};
