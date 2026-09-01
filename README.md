# 🏍️ RideGP - Intelligent Motorcycle Ride Tracking & Gamification Platform

> **RideGP** is a comprehensive mobile application that transforms your daily motorcycle commutes into engaging, data-driven experiences through advanced ride analytics, gamification, and community insights.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=flat-square&logo=github)](https://github.com)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green?style=flat-square&logo=node.js)](https://nodejs.org)
[![React Native](https://img.shields.io/badge/React%20Native-0.73%2B-blue?style=flat-square&logo=react)](https://reactnative.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-13AA52?style=flat-square&logo=mongodb)](https://www.mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

---

## 🌟 Overview

RideGP leverages real-time GPS tracking to analyze your motorcycle rides with precision. The app calculates meaningful metrics, scores your driving performance, rewards consistency through gamification, and connects you with an anonymous community of riders sharing similar commute routes.

**Key Insight**: Every ride matters. Every metric counts. Every achievement unlocked brings you closer to mastery.

---

## ✨ Core Features

### 🎯 Intelligent Ride Tracking

- **Real-time GPS Monitoring**: Accurate distance, speed, and route tracking with 4-second intervals
- **Automatic Metrics Calculation**: Distance (Haversine), duration, average/top speed, traffic stops, idle time
- **Live Dashboard**: View metrics in real-time during your ride with visual map
- **Crash Recovery**: Resume incomplete rides from unexpected interruptions

### 📊 Advanced Analytics & Scoring

- **0-100 Ride Score**: Multi-factor algorithm evaluating:
  - ⚡ Smooth Acceleration (20 pts)
  - 📈 Consistency (20 pts)
  - ✅ Completion (20 pts, -2 per traffic stop)
  - ⏱️ Time Efficiency (20 pts)
  - ⛽ Fuel Efficiency (20 pts)

- **Ride Comparison**: Compare 2+ rides side-by-side with detailed breakdowns
- **Historical Analysis**: Track improvement over time with date range filtering

### 💡 Commute Insights

- **Typical Departure Time**: Peak hour for your commutes
- **Today vs Average**: Compare today's performance with historical average
  - Speed differential
  - Traffic stops comparison
  - Fuel cost variance
- **Cost Savings**: Track savings vs previous rides
- **Peak Traffic Hour**: Identify congestion patterns
- **Ride Aggregates**: Total commutes tracked and analyzed

### 🧠 Smart Recommendations

- **Optimal Departure Time**: Hour with best average score
- **Idle Time Analysis**: Percentage of time spent waiting/stationary
- **Month-over-Month Improvement**: Track progress trends
- **Personalized Suggestions**: Based on your riding patterns

### 📅 Monthly Wrapped

Spotify-inspired monthly summaries featuring:

- Total distance, time, and fuel cost
- Ride count and average score
- Best rides and most-used routes
- Personal percentiles (smoothness, efficiency, consistency)
- Month-to-month navigation
- Share-ready summaries

### 👥 Anonymous Community Features

**Privacy-First Approach**:

- No live location sharing
- No user identity exposure
- Anonymous route cohort grouping
- Aggregate statistics only

**Route Cohorts**:

- Users grouped by matching origin-destination pairs
- Shared commute insights with anonymity
- Collective traffic patterns
- Community best practices

### 👤 User Management

- Complete profile system with bike preferences
- Bike model and specification storage
- Fuel efficiency and price configuration
- Location management (home, office, custom routes)
- User statistics dashboard
- Secure authentication with JWT

---

## 🛠️ Tech Stack

### Backend

```
Framework:       Node.js + Express.js
Database:        MongoDB + Mongoose
Authentication:  JWT + bcryptjs
Environment:     Dotenv configuration
API:             RESTful JSON
Validation:      Mongoose schemas
```

### Frontend

```
Framework:       React Native + Expo
State:           Local AsyncStorage
Navigation:      React Navigation v5+
Maps:            React Native Maps
Location:        Expo Location API
Styling:         React Native StyleSheet
Theming:         Custom Colors system
```

### Infrastructure

- MongoDB Atlas (Cloud database)
- Node.js server (Heroku/Railway/AWS compatible)
- Expo managed workflow (iOS/Android)
- Render (Backend Hosting)

---

## 📱 Application Architecture

### Frontend Flow

```
┌─────────────┐
│  AuthScreen │ ────────→ JWT Token + AsyncStorage
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         HomeScreen (Dashboard)          │
│  ├─ Streaks & Achievements             │
│  ├─ Weekly Statistics                  │
│  └─ Quick Navigation Hub               │
└────┬────────────────────────────────────┘
     │
     ├─→ RideScreen (GPS Tracking)
     ├─→ RideHistoryScreen (Browse & Compare)
     ├─→ AchievementsScreen (Gallery)
     ├─→ CommunityScreen (Route Stats)
     ├─→ InsightsScreen (Analytics)
     ├─→ MonthlyWrappedScreen (Summary)
     └─→ ProfileScreen (Settings)
```

### Backend Architecture

```
┌──────────────────────────────────────────┐
│        Express Server (Node.js)          │
├──────────────────────────────────────────┤
│  Authentication Layer (JWT Middleware)   │
├──────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────┐  │
│  │   Routes     │  │   Controllers   │  │
│  ├──────────────┤  ├─────────────────┤  │
│  │ /auth        │→ │ authController  │  │
│  │ /rides       │→ │ ridesController │  │
│  │ /gamification│→ │ gamification... │  │
│  │ /community   │→ │ community...    │  │
│  └──────────────┘  └─────────────────┘  │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │   Mongoose Models & Schema       │   │
│  │  ├─ User (auth, profile, stats)  │   │
│  │  ├─ Ride (GPS, metrics, score)   │   │
│  │  ├─ Achievement (unlocks)        │   │
│  │  ├─ Streak (commute tracking)    │   │
│  │  ├─ RouteCohort (community)      │   │
│  │  └─ MonthlyWrapped (summaries)   │   │
│  └──────────────────────────────────┘   │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │   MongoDB Atlas (Cloud)          │   │
│  └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org))
- **npm** or yarn
- **MongoDB Atlas** account ([Sign up free](https://www.mongodb.com/cloud/atlas))
- **Expo CLI** (`npm install -g expo-cli`)
- **Git**

### 1️⃣ Clone & Setup Backend

```bash
# Clone repository
git clone <your-repo>
cd RideGP/server

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ridegp

# Authentication
JWT_SECRET=your_super_secret_key_min_32_chars_long

# Server
PORT=3000
NODE_ENV=development
EOF

# Start backend
npm start
# Server runs on http://localhost:3000
```

### 2️⃣ Setup Frontend

```bash
# Navigate to mobile directory
cd ../mobile

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
API_URL=http://localhost:3000
FUEL_EFFICIENCY_KM_PER_L=40
FUEL_PRICE_PER_L=90
EOF

# Start Expo
npx expo start

# Scan QR code with Expo Go app or press 'i'/'a' for simulators
```

### 3️⃣ Test the Application

1. **Register** a new account with email, name, password, and bike model
2. **Allow location permission** when prompted
3. **Start a test ride** and walk/move around for 30 seconds
4. **Stop ride** and view calculated metrics
5. **Check dashboard** for updated statistics
6. **Explore features** through the navigation menu

---

## 📚 API Documentation

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securePassword123",
  "bike_model": "Honda CB350"
}

Response: 201
{
  "success": true,
  "user": { /* user object */ },
  "token": "eyJhbGc..."
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response: 200
{
  "success": true,
  "user": { /* user object */ },
  "token": "eyJhbGc..."
}
```

#### Get Profile

```http
GET /api/auth/profile
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "user": {
    "id": "63f7...",
    "email": "user@example.com",
    "name": "John Doe",
    "bike_model": "Honda CB350",
    "total_rides": 42,
    "current_streak": 12
  }
}
```

### Ride Endpoints

#### Create Ride

```http
POST /api/rides
Authorization: Bearer {token}
Content-Type: application/json

{
  "metrics": {
    "distance_km": 10.5,
    "duration_minutes": 25,
    "average_speed_kmh": 25,
    "top_speed_kmh": 55,
    "traffic_stops": 2,
    "idle_time_seconds": 120
  },
  "geo": [
    { "latitude": 28.7041, "longitude": 77.1025, "speed_kmh": 20, "timestamp": 1626000000 },
    { "latitude": 28.7050, "longitude": 77.1035, "speed_kmh": 25, "timestamp": 1626000004 }
  ],
  "fuel_cost": 15.5,
  "route_name": "Home to Office",
  "ride_type": "commute"
}

Response: 201
{
  "success": true,
  "ride": { /* ride object */ },
  "score": 78
}
```

#### Get Rides

```http
GET /api/rides?limit=20&skip=0
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "rides": [ /* array of rides */ ],
  "total": 42
}
```

#### Compare Rides

```http
POST /api/rides/compare
Authorization: Bearer {token}
Content-Type: application/json

{
  "rideIds": ["63f7...", "63f8..."]
}

Response: 200
{
  "success": true,
  "comparison": {
    "rides": [ /* ride data */ ],
    "averages": { /* average metrics */ }
  }
}
```

### Gamification Endpoints

#### Check Achievements

```http
POST /api/gamification/achievements/check
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "newAchievements": ["early_bird"],
  "totalUnlocked": 5
}
```

#### Get All Achievements

```http
GET /api/gamification/achievements
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "achievements": [
    {
      "type": "early_bird",
      "title": "Early Bird",
      "unlocked_at": "2026-09-01T08:30:00Z"
    }
  ]
}
```

#### Get Streak Info

```http
GET /api/gamification/streak
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "streak": {
    "current_streak_count": 12,
    "best_streak_count": 25,
    "last_ride_date": "2026-09-01"
  }
}
```

### Community Endpoints

#### Get Route Statistics

```http
GET /api/community/route-stats?origin_hash=2870&destination_hash=7710
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "stats": {
    "total_riders": 156,
    "avg_commute_time_minutes": 22,
    "peak_traffic_hour": 8,
    "avg_fuel_cost": 18.5
  }
}
```

#### Get Commute Insights

```http
GET /api/community/insights/commute
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "insights": {
    "typical_departure_time": "07:45",
    "peak_traffic_hour": 8,
    "cost_savings_vs_last_ride": 2.5
  }
}
```

#### Get Monthly Wrapped

```http
GET /api/community/wrapped?month=9&year=2026
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "wrapped": {
    "total_rides": 22,
    "total_distance_km": 385,
    "average_ride_score": 74,
    "smoothness_percentile": 68
  }
}
```

---

## 📁 Project Structure

```
RideGP/
├── server/                          # Backend (Node.js + Express)
│   ├── models/
│   │   ├── User.js                 # User authentication & profile
│   │   ├── Ride.js                 # Ride data with GPS & metrics
│   │   ├── Achievement.js          # Achievement tracking
│   │   ├── Streak.js               # Streak management
│   │   ├── RouteCohort.js          # Anonymous community groups
│   │   └── MonthlyWrapped.js       # Monthly summaries
│   ├── controllers/
│   │   ├── authController.js       # Auth logic
│   │   ├── ridesController.js      # Ride CRUD & analytics
│   │   ├── gamificationController.js # Achievements & streaks
│   │   └── communityController.js  # Community insights
│   ├── routes/
│   │   ├── auth.js                 # /api/auth endpoints
│   │   ├── rides.js                # /api/rides endpoints
│   │   ├── gamification.js         # /api/gamification endpoints
│   │   └── community.js            # /api/community endpoints
│   ├── middleware/
│   │   └── auth.js                 # JWT validation
│   ├── config/
│   │   └── rideUtils.js            # Metrics calculation utilities
│   ├── server.js                   # Main application file
│   ├── package.json
│   └── .env                        # Environment variables
│
├── mobile/                          # Frontend (React Native + Expo)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── AuthScreen.js       # Login & registration
│   │   │   ├── HomeScreen.js       # Dashboard
│   │   │   ├── RideScreen.js       # GPS tracking
│   │   │   ├── RideHistoryScreen.js    # Browse & compare
│   │   │   ├── AchievementsScreen.js   # Achievement gallery
│   │   │   ├── CommunityScreen.js      # Route statistics
│   │   │   ├── InsightsScreen.js       # Analytics
│   │   │   ├── MonthlyWrappedScreen.js # Summaries
│   │   │   ├── ProfileScreen.js        # Settings
│   │   │   └── BroadcastScreen.js      # Notifications
│   │   ├── lib/
│   │   │   ├── rideUtils.js        # Metric calculation
│   │   │   ├── theme.js            # Color system
│   │   │   ├── notifications.js    # Push notifications
│   │   │   ├── background.js       # Background tracking
│   │   │   └── supabase.js         # Supabase config
│   ├── App.js                      # Main app component
│   ├── app.json                    # Expo configuration
│   ├── package.json
│   └── .env                        # Environment variables
│
├── README.md                        # This file
├── IMPLEMENTATION_SUMMARY.md        # Detailed feature list
└── QUICK_START.md                   # Setup guide

```

---

## 🔐 Security Features

- **Password Hashing**: bcryptjs with salt rounds of 10
- **JWT Authentication**: 7-day token expiry with refresh capability
- **Authorization**: Protected routes with user ownership validation
- **Environment Variables**: Sensitive data in `.env` files (not in repo)
- **CORS Protection**: Configured for specific origins
- **Input Validation**: Mongoose schema validation
- **Anonymous Community**: No personal data in public statistics

---

## 📊 Database Models Overview

### User Model

Stores user profile, authentication, and aggregated statistics.

```javascript
{
  (email,
    name,
    password_hash,
    bike_model,
    fuel_efficiency_kmpl,
    fuel_price_per_liter,
    home_location,
    office_location,
    commute_route,
    total_rides,
    total_distance_km,
    average_ride_score,
    current_streak,
    best_streak,
    created_at,
    updated_at);
}
```

### Ride Model

Complete ride data with GPS points and calculated metrics.

```javascript
{
  (user_id,
    metrics,
    geo,
    fuel_cost,
    score,
    score_breakdown,
    route_name,
    ride_type,
    is_commute,
    start_time,
    end_time);
}
```

### Achievement Model

Tracks unlocked achievements with timestamps.

```javascript
{
  (user_id, type, title, description, unlocked_at, icon_url);
}
```

### Streak Model

Manages commute streaks and history.

```javascript
{
  (user_id,
    current_streak_count,
    best_streak_count,
    last_ride_date,
    streak_start_date,
    best_streak_start_date);
}
```

### RouteCohort Model

Anonymous route grouping with aggregate statistics.

```javascript
{
  origin_hash, destination_hash, rider_count,
  stats: { avg_commute_time, speed, departure_hours, traffic_stops }
}
```

### MonthlyWrapped Model

Pre-calculated monthly summaries.

```javascript
{
  (user_id,
    year,
    month,
    total_rides,
    total_distance_km,
    total_fuel_cost,
    best_ride_id,
    longest_ride_id,
    smoothness_percentile);
}
```

---

## 🎓 Key Algorithms

### Ride Scoring Algorithm

```
Total Score (0-100) = Σ(5 factors × 20 points)

1. Smooth Acceleration (20 pts)
   - Analyzes jerk (acceleration changes)
   - Penalizes abrupt throttle/brake

2. Consistency (20 pts)
   - Measures speed variance
   - Rewards steady riding

3. Completion (20 pts)
   - Base 20 pts for finishing ride
   - -2 pts per traffic stop
   - Min: 0 pts, Max: 20 pts

4. Time Efficiency (20 pts)
   - Compares actual time vs typical
   - Rewards getting to destination quickly

5. Fuel Efficiency (20 pts)
   - Calculates cost per km
   - Compares to typical routes
   - Rewards economical riding
```

### Distance Calculation

Uses **Haversine formula** for precise GPS distance:

```
a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1−a))
distance = R × c  (R = Earth's radius ≈ 6,371 km)
```

### Traffic Stop Detection

Automatic detection when:

- Speed < 5 km/h
- Duration > 30 seconds
- Not at start/end of ride

### Route Cohort Hashing

Coordinates rounded to 2-decimal precision for flexible grouping:

```
origin_hash = floor(latitude × 100) × 10000 + floor(longitude × 100)
Same hashing for origin & destination creates anonymous groups
```

---

## 🚀 Deployment

### Backend Deployment (Heroku Example)

```bash
# Build backend Docker image
docker build -t ridegp-backend:latest .

# Deploy to Heroku
heroku login
heroku create ridegp-backend
heroku config:set MONGODB_URI="..."
heroku config:set JWT_SECRET="..."
git push heroku main
```

### Frontend Deployment (EAS Builds)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android/iOS
eas build --platform android
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## 📈 Performance Metrics

- **API Response Time**: <200ms (average)
- **GPS Sampling**: 4-second intervals
- **Ride Sync**: Real-time with AsyncStorage fallback
- **Database Queries**: Indexed on user_id, timestamps
- **App Size**: ~150MB (with dependencies)
- **Memory Usage**: ~80-150MB during active ride

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Test on both Android and iOS

---

## 🐛 Known Issues & Limitations

- **GPS Accuracy**: Varies based on location (urban vs rural)
- **Background Tracking**: Limited on iOS due to OS restrictions
- **Real-time Notifications**: Requires Supabase setup
- **Image Generation**: Monthly wrapped images need Cloudinary/similar
- **Offline Support**: Currently requires internet connection

---

## 🗺️ Roadmap

- [ ] Real-time ride notifications
- [ ] Social ride challenges
- [ ] Weather data integration
- [ ] Advanced route optimization
- [ ] Bike maintenance tracking
- [ ] Export to Strava/Apple Health
- [ ] Web dashboard
- [ ] API rate limiting
- [ ] Advanced analytics dashboard
- [ ] Dark mode support

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support & Contact

### Getting Help

- 📖 Read [QUICK_START.md](QUICK_START.md) for setup help
- 📚 Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for detailed features
- 🐛 Open an [Issue](https://github.com/your-repo/issues) for bugs
- 💬 Start a [Discussion](https://github.com/your-repo/discussions) for questions

### Contact

- **Email**: your-email@example.com
- **GitHub**: [@yourhandle](https://github.com)
- **Website**: [your-website.com](https://your-website.com)

---

## 🙏 Acknowledgments

- React Native and Expo communities
- MongoDB documentation and tutorials
- OpenStreetMap for coordinate data
- Inspired by fitness tracking apps like Strava

---

<div align="center">

**Made with ❤️ by Rahul**

⭐ If you find this project useful, please consider giving it a star!

[Top ⬆️](#-ridegp---intelligent-motorcycle-ride-tracking--gamification-platform)

</div>
