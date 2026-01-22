# 🏏 BidKaroo: High-Concurrency Cricket Auction Platform

**BidKaroo** is a production-grade, real-time auction management engine designed to handle the high-pressure environment of live player bidding. Moving beyond static spreadsheets, it implements a robust event-driven architecture to ensure data consistency and sub-millisecond latency.

🔗 **Live Application:** [www.bidkaroo.vercel.app](http://www.bidkaroo.vercel.app)

---

## 🚀 Key Engineering Highlights

* **Real-Time State Synchronization**: Leverages **Socket.IO** to maintain a "Single Source of Truth" across all clients, broadcasting bid updates and results instantly.
* **Complex Lifecycle Management**: Implements a custom **4-state transition model** for players: `available` ➔ `sold` / `unsold` ➔ `unsold1`.
* **Atomic Budget Enforcement**: Real-time validation ensures teams cannot overspend, automatically reserving funds for mandatory roster slots based on minimum base prices.
* **Multi-Tenant Tournament Logic**: Each auction and player pool is strictly scoped to its specific Tournament ID to prevent data leakage.

---

## 📊 System Architecture

### The "Life of a Bid"
The platform uses a bidirectional flow to handle concurrent bidding:
1.  **Request**: A Team Manager places a bid via a REST API call secured with a JWT.
2.  **Validation**: The backend validates the role, verifies sufficient `remainingBudget`, and ensures the bid exceeds the current price.
3.  **Persistence**: The `Auctions` collection is updated in MongoDB.
4.  **Broadcast**: The `Socket.io` server broadcasts the `auction_update_<tournamentId>` event to all connected clients.

### Player Status State Machine
The system manages complex re-auction scenarios through a tiered status system:
* **`available`**: Initial state in the auction pool.
* **`sold`**: Finalized purchase; updates team roster and deducts remaining budget.
* **`unsold`**: First-round failure; eligible for category-wide reverts back to `available`.
* **`unsold1`**: Second-round failure; acts as a final "bucket" for players who did not find a team after multiple attempts.

---

## 🛠️ Tech Stack

### Frontend
- **React 18 (TypeScript)** + **Vite**: For a type-safe, high-performance UI.
- **Tailwind CSS**: Utility-first styling for a responsive auction dashboard.
- **Socket.IO Client**: Real-time bidirectional communication.

### Backend
- **Node.js & Express.js**: Scalable server-side logic.
- **MongoDB & Mongoose**: Flexible document-based storage with compound indexing for fast status filtering.
- **JWT & bcryptjs**: Secure authentication and Role-Based Access Control (RBAC).
- **Cloudinary**: Scalable cloud hosting for player and tournament assets.

---

## 📁 Project Structure
```
Cricket-Auction/ 
├── client/ # React 18 + Vite Frontend 
│ ├── src/ 
│ │ ├── components/ 
│ │ │ ├── Auction/ # Core AuctionInterface logic & Bid processing 
│ │ │ ├── Master/ # Tournament & Budget configuration 
│ │ │ └── Players/ # Duplicate check & Status management hooks 
│ │ ├── contexts/ # AppContext (Socket) & AuthContext (JWT) 
│ │ └── types/ # Shared TypeScript interfaces 
├── server/ # Express + Mongoose Backend 
│ ├── controllers/ # State transition logic (Auction, Player) 
│ ├── middleware/ # Role-based Access Control (RBAC) 
│ ├── models/ # Complex PlayerTournament schemas 
│ └── scripts/ # Data migration & Cloudinary sync utilities
```

## 🔒 Security & Performance

* **RBAC Middleware**: Strict role separation between `Master`, `Auctioneer`, and `Team Manager`.
* **Optimized Queries**: Uses `.lean()` for read-heavy operations and compound indexing on `{ tournamentId, status, category }`.
* **Response Compression**: Enabled Gzip to minimize payload size during high-frequency bidding events.

---

## 🤝 Contact & Contribution

I am currently seeking **Software Development Engineer (SDE)** roles where I can apply this builder mindset to scalable systems.

- **GitHub**: [tms04](https://github.com/tms04)
- **LinkedIn**: [Tanay Shah](https://www.linkedin.com/in/tanay-shah-9667ab27a/)

Feel free to fork the repository, open an issue, or reach out to discuss system design!

---
**Happy Bidding! 🏏⚡**