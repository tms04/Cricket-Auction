# 🏏 Cricket Auction Platform (**BidKaroo**)

A real-time cricket auction management system built with React, Node.js, and Socket.IO. This platform enables tournament organizers, auctioneers, and team managers to conduct live cricket player auctions with real-time bidding and management capabilities.

## ✨ Features

### �� Core Functionality
- **Real-time Auction Interface**: Live bidding with Socket.IO integration
- **Multi-role User System**: Master, Auctioneer, and Team Manager roles
- **Tournament Management**: Create and manage cricket tournaments
- **Team Management**: Register teams and manage team rosters
- **Player Database**: Comprehensive player profiles with statistics
- **Live Auction Dashboard**: Real-time bidding interface with confetti effects

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Secure password hashing with bcrypt
- Protected routes for different user roles

### 📊 User Roles
- **Master**: Tournament creation, team management, player oversight
- **Auctioneer**: Conduct live auctions, manage bidding process
- **Team Manager**: View teams, manage rosters, participate in auctions

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for modern, responsive UI
- **React Router DOM** for navigation
- **Socket.IO Client** for real-time communication
- **Axios** for HTTP requests
- **Lucide React** for beautiful icons
- **React Confetti** for auction celebrations

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time bidirectional communication
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **CORS** enabled for cross-origin requests

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tms04/Cricket-Auction.git
   cd Cricket-Auction
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Setup**

   Create a `.env` file in the server directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

5. **Start the development servers**

   **Start the backend server:**
   ```bash
   cd server
   npm run dev
   ```

   **Start the frontend development server:**
   ```bash
   cd client
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 📁 Project Structure
```
Cricket-Auction/
├── client/        # React frontend
│ ├── src/
│ │ ├── components/      # React components
│ │ │ ├── Auction/        # Auction interface
│ │ │ ├── Auth/         # Authentication components
│ │ │ ├── Layout/      # Header and navigation
│ │ │ ├── Master/         # Tournament and team management
│ │ │ └── Players/       # Player management
│ │ ├── contexts/     # React contexts
│ │ ├── pages/      # Page components
│ │ └── types/     # TypeScript type definitions
│ └── public/      # Static assets
├── server/        # Node.js backend
│ ├── controllers/      # Route controllers
│ ├── middleware/     # Authentication middleware
│ ├── models/       # MongoDB schemas
│ ├── routes/     # API routes
│ └── scripts/    # Utility scripts
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Tournaments
- `GET /api/tournaments` - Get all tournaments
- `POST /api/tournaments` - Create tournament
- `PUT /api/tournaments/:id` - Update tournament
- `DELETE /api/tournaments/:id` - Delete tournament

### Teams
- `GET /api/teams` - Get all teams
- `POST /api/teams` - Create team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Players
- `GET /api/players` - Get all players
- `POST /api/players` - Create player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player

### Auctions
- `GET /api/auctions` - Get auction data
- `POST /api/auctions/bid` - Place bid
- `POST /api/auctions/start` - Start auction
- `POST /api/auctions/end` - End auction

## 🎮 Usage Guide

### For Tournament Masters
1. **Create Tournaments**: Set up new cricket tournaments
2. **Manage Teams**: Register teams and assign managers
3. **Oversee Players**: Add players to the auction pool
4. **Monitor Auctions**: Watch live auctions and track results

### For Auctioneers
1. **Start Auctions**: Begin player auctions
2. **Manage Bidding**: Control the bidding process
3. **End Auctions**: Finalize player sales
4. **Track Results**: Monitor auction outcomes

### For Team Managers
1. **View Teams**: Access team information
2. **Participate in Auctions**: Bid on players
3. **Manage Rosters**: Update team compositions

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Different permissions for different user types
- **Password Hashing**: Secure password storage with bcrypt
- **CORS Protection**: Configured for secure cross-origin requests
- **Input Validation**: Server-side validation for all inputs

## 🚀 Deployment

### Frontend Deployment (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy automatically on push to main branch

### Backend Deployment (Railway/Heroku)
1. Set environment variables
2. Deploy using the platform's CLI or dashboard
3. Ensure MongoDB connection is configured

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Authors

- **TMS04** - *Initial work* - [GitHub Profile](https://github.com/tms04)

## Acknowledgments

- Socket.IO for real-time communication
- React team for the amazing framework
- Tailwind CSS for the beautiful styling
- MongoDB for the robust database solution

## 📞 Support

If you encounter any issues or have questions, please:
1. Check the existing issues
2. Create a new issue with detailed description
3. Contact the maintainers

---

**Happy Bidding! 🏏⚡**
