
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true }));

// Connect to MongoDB if configured
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
	mongoose.connect(MONGODB_URI).then(()=> console.log('MongoDB connected')).catch(err=> console.warn('MongoDB connect failed', err.message));
}

// Load models
const Ride = require('./models/Ride');
const PushToken = require('./models/PushToken');

// Broadcast notifications to all saved tokens in Supabase
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

app.post('/broadcast', async (req, res) => {
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

// Ingest ride into MongoDB (from client or server)
app.post('/ingest-ride', async (req, res) => {
	try {
		const { metrics, geo, fuel_cost, score, user_id } = req.body;
		const ride = new Ride({ user_id, metrics, geo, fuel_cost, score });
		await ride.save();
		return res.json({ ok: true, id: ride._id });
	} catch (err) {
		console.error('ingest-ride error', err);
		return res.status(500).json({ error: err.message });
	}
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
