
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => res.json({ ok: true, message: 'RideGP Backend API' }));

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
	console.warn('⚠ MongoDB URI not configured - database features will not work');
}

// Load models
const Ride = require('./models/Ride');
const User = require('./models/User');
const PushToken = require('./models/PushToken');
const Achievement = require('./models/Achievement');
const Streak = require('./models/Streak');
const RouteCohort = require('./models/RouteCohort');
const MonthlyWrapped = require('./models/MonthlyWrapped');
const Post = require('./models/Post');
const SavedRoute = require('./models/SavedRoute');
const Group = require('./models/Group');
const Message = require('./models/Message');

// Import routes
const authRoutes = require('./routes/auth');
const ridesRoutes = require('./routes/rides');
const gamificationRoutes = require('./routes/gamification');
const communityRoutes = require('./routes/community');
const chatRoutes = require('./routes/chat');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/chat', chatRoutes);

// Broadcast notifications to all saved tokens in Supabase
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

app.post('/api/broadcast', async (req, res) => {
	try {
		const { title, body } = req.body;
		if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin not configured' });

		const { data: tokensData, error } = await supabaseAdmin.from('push_tokens').select('token');
		if (error) throw error;
		const tokens = (tokensData || []).map(t => t.token).filter(Boolean);
		if (!tokens.length) return res.status(400).json({ error: 'no tokens' });

		const messages = tokens.map(token => ({ to: token, title, body }));
		const response = await fetch('https://exp.host/--/api/v2/push/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(messages)
		});
		const data = await response.json();
		return res.json({ ok: true, data });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: err.message });
	}
});

// Legacy ingest-ride endpoint (for backward compatibility)
app.post('/ingest-ride', async (req, res) => {
	try {
		const { metrics, geo, fuel_cost, score, user_id } = req.body;
		if (!user_id) {
			return res.status(400).json({ error: 'user_id is required' });
		}
		const ride = new Ride({ user_id, metrics, geo, fuel_cost, score });
		await ride.save();
		return res.json({ ok: true, id: ride._id });
	} catch (err) {
		console.error('ingest-ride error', err);
		return res.status(500).json({ error: err.message });
	}
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
	console.error('Error:', err);
	res.status(500).json({ error: err.message || 'Internal server error' });
});

const port = process.env.PORT || 3000;

// Wait for MongoDB before accepting requests (if URI is configured)
async function start() {
	if (MONGODB_URI) {
		try {
			await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
			console.log('✓ MongoDB connected (verified)');
		} catch (err) {
			console.warn('✗ MongoDB connection failed:', err.message);
			console.warn('  Server will start but database features may not work.');
		}
	}

	app.listen(port, () => {
		console.log(`\n🚀 RideGP Server running on port ${port}`);
		console.log(`📍 Base URL: http://localhost:${port}`);
		console.log(`\n📚 API Routes:`);
		console.log(`   POST   /api/auth/register - Register new user`);
		console.log(`   POST   /api/auth/login - Login user`);
		console.log(`   GET    /api/auth/profile - Get user profile`);
		console.log(`   PUT    /api/auth/profile - Update user profile`);
		console.log(`   POST   /api/rides - Create new ride`);
		console.log(`   GET    /api/rides - Get user's rides`);
		console.log(`   GET    /api/rides/:rideId - Get specific ride`);
		console.log(`   POST   /api/rides/compare - Compare rides`);
		console.log(`   POST   /api/gamification/achievements/check - Check achievements`);
		console.log(`   GET    /api/gamification/achievements - Get user's achievements`);
		console.log(`   POST   /api/gamification/streak/update - Update streak`);
		console.log(`   GET    /api/gamification/streak - Get streak info`);
		console.log(`   GET    /api/community/route-stats - Get route community stats`);
		console.log(`   GET    /api/community/routes - Get user's routes`);
		console.log(`   GET    /api/community/insights/commute - Get commute insights`);
		console.log(`   GET    /api/community/insights/smart - Get smart insights`);
		console.log(`   GET    /api/community/wrapped - Get monthly wrapped\n`);
	});
}

start();
