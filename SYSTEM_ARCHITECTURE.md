# System Architecture Documentation
## Cricket Auction Platform (BidKaroo)

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Layers](#architecture-layers)
4. [Data Models & Status System](#data-models--status-system)
5. [Player Status Flow (Available, Sold, Unsold, Unsold1)](#player-status-flow)
6. [API Architecture](#api-architecture)
7. [Real-time Communication](#real-time-communication)
8. [Authentication & Authorization](#authentication--authorization)
9. [Frontend Architecture](#frontend-architecture)
10. [Backend Architecture](#backend-architecture)
11. [Database Schema](#database-schema)
12. [Key Features & Workflows](#key-features--workflows)

---

## System Overview

**BidKaroo** is a real-time cricket auction management system that enables tournament organizers, auctioneers, and team managers to conduct live cricket player auctions with real-time bidding capabilities.

### Core Purpose
- Manage cricket tournaments with multiple teams
- Conduct live player auctions with real-time bidding
- Track player statuses through auction lifecycle
- Manage team budgets and rosters
- Support multi-round auction scenarios

---

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Socket.IO Client** - Real-time bidirectional communication
- **Axios** - HTTP client
- **Lucide React** - Icon library
- **React Confetti** - Celebration animations

### Backend
- **Node.js** with **Express.js** - Server framework
- **MongoDB** with **Mongoose ODM** - Database and ORM
- **Socket.IO** - Real-time WebSocket communication
- **JWT (jsonwebtoken)** - Authentication tokens
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Cloudinary** - Image hosting service
- **CORS** - Cross-origin resource sharing
- **Compression** - Response compression middleware

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Pages      │  │ Components  │  │  Contexts    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │     API      │  │   Hooks      │  │    Types     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP/REST + WebSocket
┌─────────────────────────────────────────────────────────┐
│                 Backend (Node.js/Express)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Controllers │  │  Middleware  │  │    Routes    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Models    │  │   Socket.IO  │  │   Scripts    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↕ Mongoose ODM
┌─────────────────────────────────────────────────────────┐
│                    MongoDB Database                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Players    │  │ PlayerTourn.  │  │  Tournaments │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Teams     │  │   Auctions    │  │    Users     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Data Models & Status System

### Player Status System

The system uses a **4-state status model** for players in tournaments:

#### Status Definitions

1. **`available`** (Initial State)
   - Player is in the auction pool
   - Not yet auctioned or available for auction
   - Can be selected for auction
   - Default status when player is added to tournament

2. **`sold`** (Sold State)
   - Player has been successfully sold to a team
   - Has an assigned team and selling price
   - Team budget has been deducted
   - Player is part of team roster

3. **`unsold`** (First Unsold Round)
   - Player went unsold in first auction attempt
   - No team assigned, no price
   - Can be re-auctioned in second round
   - Can be reverted back to `available` status

4. **`unsold1`** (Second Unsold Round)
   - Player went unsold in second auction attempt
   - Previously was `unsold`, now in `unsold1` bucket
   - Can be moved back to `unsold` for third attempt
   - Final state for players not sold after multiple attempts

### Status Transition Logic

```
┌───────────┐
│ available │ ← Initial state, can be auctioned
└─────┬─────┘
      │
      ├─[Auction Complete: SOLD]──→ ┌──────┐
      │                             │ sold │
      │                             └──────┘
      │
      └─[Auction Complete: UNSOLD]──→ ┌────────┐
                                      │ unsold │ (First unsold)
                                      └────┬───┘
                                           │
                                           ├─[Revert]──→ ┌───────────┐
                                           │             │ available │
                                           │             └───────────┘
                                           │
                                           └─[Re-auction: UNSOLD]──→ ┌─────────┐
                                                                     │ unsold1 │
                                                                     └────┬────┘
                                                                          │
                                                                          └─[Revert]──→ ┌────────┐
                                                                                        │ unsold │
                                                                                        └────────┘
```

### Status Transition Code (Backend)

**Location:** `server/controllers/auctionController.js` (lines 267-282)

```javascript
// When auction completes without winner (unsold)
const currentStatus = participation.status;
if (currentStatus === 'unsold') {
    // Second time unsold: move to unsold1
    participation.status = 'unsold1';
} else if (currentStatus === 'unsold1') {
    // Already unsold1, keep it
    participation.status = 'unsold1';
} else {
    // First time unsold: move to unsold
    participation.status = 'unsold';
}
```

**When auction completes with winner (sold):**
```javascript
participation.status = 'sold';
participation.team = winnerId;
participation.price = saleAmount;
participation.isSold = true;
```

---

## Player Status Flow

### 1. Available → Sold Flow

**Process:**
1. Player starts with `status: 'available'`
2. Auctioneer selects player and starts auction
3. Teams place bids
4. Auctioneer marks as SOLD with winning team and price
5. System updates:
   - `status: 'sold'`
   - `team: <winningTeamId>`
   - `price: <finalAmount>`
   - `isSold: true`
   - Team budget deducted
   - Player added to team roster

**Code Location:**
- Frontend: `client/src/components/Auction/AuctionInterface.tsx` (line 213-253)
- Backend: `server/controllers/auctionController.js` (line 204-322)

### 2. Available → Unsold Flow

**Process:**
1. Player starts with `status: 'available'`
2. Auctioneer selects player and starts auction
3. No bids or auctioneer marks as UNSOLD
4. System updates:
   - `status: 'unsold'` (first time)
   - `team: undefined`
   - `price: undefined`
   - `isSold: false`

**Code Location:**
- Backend: `server/controllers/auctionController.js` (line 267-282)

### 3. Unsold → Unsold1 Flow

**Process:**
1. Player has `status: 'unsold'`
2. Player is re-auctioned (from unsold pool)
3. Auctioneer marks as UNSOLD again
4. System updates:
   - `status: 'unsold1'` (second time unsold)
   - Remains without team and price

**Code Location:**
- Backend: `server/controllers/auctionController.js` (line 271-272)

### 4. Revert Operations

#### Unsold → Available (Bulk Revert)
**Endpoint:** `POST /api/players/revertUnsoldCategory`
- Reverts all `unsold` players of a category back to `available`
- Used to restart auction for unsold players

**Code Location:**
- Backend: `server/controllers/playerController.js` (line 446-485)
- Frontend: `client/src/components/Auction/AuctionInterface.tsx` (line 293-309)

#### Unsold1 → Unsold (Bulk Revert)
**Endpoint:** `POST /api/players/revertUnsold1Category`
- Moves all `unsold1` players of a category back to `unsold`
- Allows third auction attempt

**Code Location:**
- Backend: `server/controllers/playerController.js` (line 488-527)
- Frontend: `client/src/components/Auction/AuctionInterface.tsx` (line 277-291)

#### Sold → Available (Individual Revert)
**Endpoint:** `POST /api/players/markUnsold`
- Marks a sold player as unsold
- Refunds team budget
- Removes player from team roster
- Sets status back to `available`

**Code Location:**
- Backend: `server/controllers/playerController.js` (line 386-443)
- Frontend: `client/src/components/Auction/AuctionInterface.tsx` (line 319-335)

---

## API Architecture

### REST API Endpoints

#### Authentication Routes (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current authenticated user
- `PATCH /api/auth/profile` - Update user profile

#### Tournament Routes (`/api/tournaments`)
- `GET /api/tournaments` - Get all tournaments
- `POST /api/tournaments` - Create tournament (Master only)
- `PUT /api/tournaments/:id` - Update tournament
- `DELETE /api/tournaments/:id` - Delete tournament

#### Team Routes (`/api/teams`)
- `GET /api/teams?page=1&limit=20&tournamentId=xxx` - Get teams (paginated)
- `POST /api/teams` - Create team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

#### Player Routes (`/api/players`)
- `GET /api/players?page=1&limit=200&tournamentId=xxx&status=sold` - Get players (paginated, filterable)
- `GET /api/players/:id?tournamentId=xxx` - Get single player
- `GET /api/players/summaries?tournamentId=xxx` - Get lightweight player summaries
- `POST /api/players` - Create player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id?tournamentId=xxx` - Delete player
- `POST /api/players/markUnsold` - Mark sold player as unsold
- `POST /api/players/revertUnsoldCategory` - Bulk revert unsold → available
- `POST /api/players/revertUnsold1Category` - Bulk revert unsold1 → unsold
- `GET /api/players/duplicates/check?name=xxx` - Check for duplicate player names

#### Auction Routes (`/api/auctions`)
- `GET /api/auctions` - Get all auctions
- `GET /api/auctions/current?tournamentId=xxx` - Get current active auction
- `GET /api/auctions/:id` - Get single auction
- `POST /api/auctions` - Create/start auction (Auctioneer only)
- `POST /api/auctions/bid` - Place bid on auction
- `POST /api/auctions/complete` - Complete auction (SOLD/UNSOLD) (Auctioneer only)
- `PUT /api/auctions/:id` - Update auction
- `DELETE /api/auctions/:id` - Delete auction
- `DELETE /api/auctions/all` - Delete all auctions
- `POST /api/auctions/reset/:tournamentId` - Reset all auctions for tournament

### API Request/Response Patterns

**Authentication:**
- JWT token in `Authorization: Bearer <token>` header
- Token stored in localStorage on frontend
- Token validated by `authMiddleware`

**Pagination:**
- Query params: `page` (default: 1), `limit` (default: varies)
- Response: `{ data: [...], total: <number> }`

**Error Handling:**
- Standard HTTP status codes
- Error response: `{ error: "<message>" }`

---

## Real-time Communication

### Socket.IO Integration

**Server Setup:**
- Location: `server/index.js` (line 84-93)
- CORS enabled for all origins
- Socket.IO instance attached to Express app

**Event Channels:**

1. **Auction Updates**
   - Channel: `auction_update_<tournamentId>`
   - Emitted when:
     - New auction created
     - Bid placed
     - Auction completed (sold/unsold)
   - Payload: Full auction object with populated player/team data

2. **Auction Results**
   - Channel: `auction_result_<tournamentId>`
   - Emitted when auction completes
   - Lightweight payload: `{ playerId, status, winnerName, finalAmount }`

**Frontend Integration:**
- Location: `client/src/contexts/AppContext.tsx`
- Connects to Socket.IO server on mount
- Listens to tournament-specific channels
- Updates React state on events

---

## Authentication & Authorization

### User Roles

1. **Master**
   - Full system access
   - Create/manage tournaments
   - Create/manage teams
   - Create/manage players
   - View all auctions
   - Can reset auctions

2. **Auctioneer**
   - Tournament-scoped access
   - Assigned to specific tournament via `auctioneerEmail`
   - Can start/end auctions
   - Can place bids
   - Can manage players in assigned tournament
   - Cannot create tournaments

3. **Team Manager**
   - View-only access (via ViewerPage)
   - Can view live auctions
   - Cannot bid or manage

### Authentication Flow

1. User logs in via `POST /api/auth/login`
2. Server validates credentials
3. Server returns JWT token + user object
4. Frontend stores token in localStorage
5. Token included in all subsequent requests
6. `authMiddleware` validates token on protected routes

### Authorization Middleware

**Location:** `server/middleware/roleMiddleware.js`

- Validates user role against route requirements
- Auctioneer routes check tournament assignment
- Returns 403 Forbidden if unauthorized

---

## Frontend Architecture

### Project Structure

```
client/
├── src/
│   ├── api/
│   │   └── index.ts              # API client functions
│   ├── components/
│   │   ├── Auction/
│   │   │   └── AuctionInterface.tsx    # Main auction UI
│   │   ├── Auth/
│   │   │   └── LoginForm.tsx
│   │   ├── Layout/
│   │   │   ├── Header.tsx
│   │   │   └── Navigation.tsx
│   │   ├── Master/
│   │   │   ├── TournamentManager.tsx
│   │   │   └── TeamManager.tsx
│   │   └── Players/
│   │       ├── PlayerManager.tsx
│   │       ├── AuctioneerPlayerManager.tsx
│   │       └── DuplicatePlayerPrompt.tsx
│   ├── contexts/
│   │   ├── AppContext.tsx         # Global app state + Socket.IO
│   │   └── AuthContext.tsx        # Authentication state
│   ├── hooks/
│   │   └── useDuplicatePlayerPrompt.tsx
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── TournamentPage.tsx    # Live auction viewer
│   │   └── ViewerPage.tsx        # Public viewer
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   ├── utils/
│   │   └── cloudinary.ts         # Image upload utility
│   ├── App.tsx                   # Main app component + routing
│   └── main.tsx                  # Entry point
└── public/
    └── image/                    # Static assets
```

### Key Components

#### AuctionInterface Component
**Location:** `client/src/components/Auction/AuctionInterface.tsx`

**Features:**
- Start auction (random or manual selection)
- Display current player and bids
- Complete auction (SOLD/UNSOLD)
- View team budgets and sold players
- Revert status operations (unsold → available, unsold1 → unsold)
- Random player selector by category and status

**State Management:**
- Uses `AppContext` for global state
- Local state for UI (notifications, modals, etc.)
- Real-time updates via Socket.IO

#### TournamentPage Component
**Location:** `client/src/pages/TournamentPage.tsx`

**Features:**
- Live auction viewer
- Tabs: Live, Sold, Available, Unsold, Teams
- Real-time bid updates
- SOLD/UNSOLD animation overlays
- Player filtering and search

---

## Backend Architecture

### Project Structure

```
server/
├── controllers/
│   ├── auctionController.js      # Auction business logic
│   ├── authController.js          # Authentication logic
│   ├── playerController.js        # Player CRUD + status management
│   ├── teamController.js           # Team management
│   └── tournamentController.js    # Tournament management
├── middleware/
│   ├── authMiddleware.js          # JWT validation
│   ├── optionalAuth.js            # Optional JWT (for public routes)
│   └── roleMiddleware.js           # Role-based access control
├── models/
│   ├── auction.js                  # Auction schema
│   ├── player.js                   # Player base schema
│   ├── playerTournament.js         # Player-tournament participation
│   ├── team.js                     # Team schema
│   ├── tournament.js               # Tournament schema
│   └── user.js                     # User schema
├── routes/
│   ├── auctionRoutes.js            # Auction endpoints
│   ├── authRoutes.js                # Auth endpoints
│   ├── playerRoutes.js              # Player endpoints
│   ├── teamRoutes.js                # Team endpoints
│   └── tournamentRoutes.js         # Tournament endpoints
├── scripts/
│   ├── migratePlayerParticipations.js
│   └── migrateToCloudinary.js
└── index.js                        # Server entry point
```

### Key Controllers

#### auctionController.js
**Main Functions:**
- `createAuction` - Start new auction
- `placeBid` - Handle bid placement with validation
- `completeAuction` - Finalize auction (sold/unsold) with status transitions
- `getCurrentAuction` - Get active auction for tournament
- `resetAuctions` - Reset all auctions and player statuses

**Status Logic:**
- Handles sold/unsold transitions
- Updates PlayerTournament status
- Manages team budget and roster

#### playerController.js
**Main Functions:**
- `getAllPlayers` - Paginated player list with status filtering
- `markUnsold` - Individual player revert (sold → available)
- `revertUnsoldCategoryToAvailable` - Bulk revert unsold → available
- `revertUnsold1CategoryToUnsold` - Bulk revert unsold1 → unsold
- `createPlayer` - Create player with tournament participation
- `updatePlayer` - Update player and participation data

**Status Management:**
- Handles all status transitions
- Manages PlayerTournament records
- Refunds team budgets on revert

---

## Database Schema

### Collections

#### 1. Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: ['master', 'auctioneer', 'teamManager']),
  profilePicture: String (URL)
}
```

#### 2. Tournaments Collection
```javascript
{
  _id: ObjectId,
  name: String,
  teams: [ObjectId],              // References to Team
  startDate: Date,
  endDate: Date,
  status: String (enum: ['upcoming', 'ongoing', 'completed']),
  logo: String,
  maxTeams: Number,
  budget: Number,                 // Per-team budget
  auctioneerEmail: String,        // Assigned auctioneer
  maxTeamSize: Number,
  minTeamSize: Number,
  auctionType: String (enum: ['open', 'categories']),
  categories: [{
    category: String,
    numPlayers: Number,
    minBalance: Number
  }]
}
```

#### 3. Teams Collection
```javascript
{
  _id: ObjectId,
  name: String,
  owner: String,
  players: [ObjectId],            // References to Player
  tournamentId: ObjectId,         // Reference to Tournament
  totalBudget: Number,
  budget: Number,
  remainingBudget: Number,
  color: String (hex),
  logo: String (URL)
}
```

#### 4. Players Collection (Base Player Data)
```javascript
{
  _id: ObjectId,
  name: String,
  photo: String (URL),
  role: String,
  station: String,
  age: Number,
  primaryRole: String (enum: ['Batsman', 'Bowler', 'All-rounder']),
  battingStyle: String (enum: ['Right hand batsman', 'Left hand batsman']),
  bowlingStyle: String (enum: ['Right hand bowler', 'Left hand bowler', 'Dont bowl'])
}
```

#### 5. PlayerTournament Collection (Tournament-Specific Player Data)
```javascript
{
  _id: ObjectId,
  player: ObjectId,              // Reference to Player
  tournamentId: ObjectId,         // Reference to Tournament
  team: ObjectId,                 // Reference to Team (if sold)
  price: Number,                  // Selling price (if sold)
  basePrice: Number,              // Base/minimum price
  isSold: Boolean,
  previousYearTeam: String,
  status: String (enum: ['available', 'sold', 'unsold', 'unsold1']),
  category: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ player: 1, tournamentId: 1 }` (unique) - One participation per player per tournament
- `{ tournamentId: 1, status: 1 }` - Fast status filtering
- `{ tournamentId: 1, team: 1 }` - Team roster queries
- `{ tournamentId: 1, status: 1, category: 1 }` - Category-specific status queries

#### 6. Auctions Collection
```javascript
{
  _id: ObjectId,
  player: ObjectId,              // Reference to Player
  team: ObjectId,                 // Reference to Team (optional)
  bidAmount: Number,
  currentBidder: ObjectId,        // Reference to Team
  currentBidderName: String,
  status: String (enum: ['open', 'active', 'closed', 'sold', 'unsold']),
  tournamentId: ObjectId,         // Reference to Tournament
  timestamp: Date,
  bids: [{
    team: ObjectId,
    teamName: String,
    amount: Number,
    timestamp: Date
  }],
  winner: ObjectId,               // Reference to Team
  winnerName: String,
  finalAmount: Number
}
```

**Indexes:**
- `{ tournamentId: 1, status: 1 }` - Find active auctions
- `{ tournamentId: 1, timestamp: -1 }` - List auctions by tournament
- `{ player: 1, tournamentId: 1 }` - Player-specific queries

---

## Key Features & Workflows

### 1. Tournament Creation Workflow

1. Master creates tournament
2. Sets budget, team limits, categories
3. Assigns auctioneer via email
4. Creates teams for tournament
5. Adds players to tournament

### 2. Auction Workflow

1. **Auctioneer starts auction:**
   - Selects player (manual or random)
   - System creates auction record with `status: 'active'`
   - Player status remains `available` until auction completes

2. **Bidding phase:**
   - Teams place bids via `POST /api/auctions/bid`
   - System validates:
     - Bid > current bid (or >= base price for first bid)
     - Team has sufficient budget
   - Updates auction with new bid
   - Emits Socket.IO event to all clients

3. **Auction completion:**
   - Auctioneer marks as SOLD or UNSOLD
   - **If SOLD:**
     - Updates PlayerTournament: `status: 'sold'`, assigns team, sets price
     - Deducts budget from team
     - Adds player to team roster
   - **If UNSOLD:**
     - Updates PlayerTournament: `status: 'unsold'` (or `unsold1` if already unsold)
     - No team assignment, no price

### 3. Status Revert Workflows

#### Individual Revert (Sold → Available)
1. Auctioneer clicks "Mark Unsold" on sold player
2. System:
   - Sets status to `available`
   - Removes player from team roster
   - Refunds price to team budget
   - Clears team and price fields

#### Bulk Revert (Unsold → Available)
1. Auctioneer selects category in random selector
2. Clicks "Revert Unsold → Available"
3. System updates all `unsold` players in category to `available`

#### Bulk Revert (Unsold1 → Unsold)
1. Auctioneer selects category in random selector
2. Clicks "Move Unsold1 → Unsold"
3. System updates all `unsold1` players in category to `unsold`

### 4. Random Player Selection

**Location:** `client/src/components/Auction/AuctionInterface.tsx` (line 171-195)

**Features:**
- Filter by category
- Filter by status (`available`, `unsold`, `unsold1`)
- Random selection from filtered pool
- Shows pool count for each status/category combination

### 5. Team Budget Management

**Budget Calculation:**
- Initial: `budget` set when team created
- Remaining: `remainingBudget` updated on each purchase
- Deduction: On player purchase, `remainingBudget -= price`
- Refund: On revert, `remainingBudget += price`

**Max Bid Calculation:**
- Considers minimum team size requirement
- Reserves budget for mandatory slots: `maxBid = remainingBudget - (remainingSlots * minBasePrice)`

**Location:** `client/src/components/Auction/AuctionInterface.tsx` (line 796-804)

---

## Status Query Patterns

### Frontend Status Filtering

**Available Players:**
```typescript
players.filter(p => 
  (p.status === 'available' || p.status === 'unsold' || p.status === 'unsold1') 
  && p.tournamentId === tournamentId
)
```

**Sold Players:**
```typescript
players.filter(p => p.status === 'sold' && p.tournamentId === tournamentId)
```

**Unsold Players (includes both unsold and unsold1):**
```typescript
players.filter(p => 
  (p.status === 'unsold' || p.status === 'unsold1') 
  && p.tournamentId === tournamentId
)
```

### Backend Status Filtering

**Location:** `server/controllers/playerController.js` (line 109-116)

When querying with `status=unsold`, backend automatically includes both `unsold` and `unsold1`:
```javascript
if (req.query.status === 'unsold') {
    filter.status = { $in: ['unsold', 'unsold1'] };
} else {
    filter.status = req.query.status;
}
```

---

## Security Features

1. **JWT Authentication**
   - Tokens expire (configurable)
   - Stored securely in localStorage
   - Validated on every protected route

2. **Role-Based Access Control**
   - Middleware validates user role
   - Auctioneer restricted to assigned tournament
   - Master has full access

3. **Password Security**
   - bcrypt hashing with salt rounds
   - Passwords never stored in plain text

4. **Input Validation**
   - Server-side validation for all inputs
   - MongoDB injection prevention via Mongoose
   - File upload restrictions (Cloudinary only)

5. **CORS Configuration**
   - Configured for specific origins (production)
   - Development allows all origins

---

## Performance Optimizations

1. **Database Indexes**
   - Compound indexes on frequently queried fields
   - Unique indexes for data integrity

2. **Query Optimization**
   - Use of `.lean()` for read-only queries
   - Selective field population
   - Pagination for large datasets

3. **Response Compression**
   - Gzip compression enabled
   - Reduces payload size

4. **Socket.IO Optimization**
   - Tournament-scoped channels
   - Minimal payload for frequent events
   - Lightweight result events

---

## Deployment

### Frontend (Vercel)
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_API_URL`

### Backend
- Node.js server (Express)
- MongoDB connection via `MONGO_URI`
- Socket.IO on same port as HTTP server
- Environment variables:
  - `PORT` (default: 5000)
  - `MONGO_URI`
  - `JWT_SECRET`
  - `NODE_ENV`

---

## Summary

The **BidKaroo** system is a comprehensive cricket auction platform with:

- **4-state player status system**: `available` → `sold` / `unsold` → `unsold1`
- **Real-time bidding** via Socket.IO
- **Role-based access** (Master, Auctioneer, Team Manager)
- **Tournament-scoped operations** for multi-tournament support
- **Flexible status management** with bulk and individual revert operations
- **Budget tracking** with automatic calculations and validations
- **Modern tech stack** (React, Node.js, MongoDB, Socket.IO)

The system supports complex auction scenarios including multi-round auctions, category-based player pools, and comprehensive status tracking throughout the auction lifecycle.


