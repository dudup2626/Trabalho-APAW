# StickerSwap 2026

A modern web platform for exchanging FIFA World Cup 2026 stickers. Connect with collectors worldwide, manage your collection, and find the perfect trade matches.

![StickerSwap 2026](https://img.shields.io/badge/StickerSwap-2026-ff4d00)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)
![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express)

## Features

- **Smart Matching Algorithm** - Find the best trade partners based on your duplicates and missing stickers
- **Digital Album Management** - Track your collection progress and see what's missing
- **Global Community** - Connect with collectors from over 150 countries
- **Secure Trading** - Verified users and trade protection
- **Complete Catalog** - Browse all FIFA World Cup 2026 stickers
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

## Tech Stack

### Frontend
- HTML5
- CSS3 with custom design system
- Vanilla JavaScript (ES6+)
- Lucide Icons

### Backend
- Node.js
- Express.js
- MySQL2
- JWT Authentication
- bcryptjs for password hashing

## Getting Started

### Prerequisites

- Node.js 18 or higher
- MySQL 8.0 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/stickerswap-2026.git
cd stickerswap-2026
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

4. Initialize the database:
```bash
npm run db:init
```

5. Start the development server:
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:3000`

### Production Deployment

1. Set environment variables:
```bash
export NODE_ENV=production
export PORT=3000
export DB_HOST=your-production-db-host
export DB_USER=your-db-user
export DB_PASSWORD=your-db-password
export DB_NAME=stickerswap2026
export JWT_SECRET=your-production-jwt-secret
```

2. Start the server:
```bash
npm start
```

## Project Structure

```
stickerswap-2026/
├── database/
│   └── schema.sql          # Database schema and seed data
├── public/
│   ├── css/
│   │   └── styles.css      # Main stylesheet with design system
│   └── js/
│       └── app.js          # Main JavaScript file
├── views/
│   └── pages/              # HTML pages
│       ├── index.html      # Homepage
│       ├── login.html      # Login page
│       ├── register.html   # Registration page
│       ├── dashboard.html  # User dashboard
│       ├── album.html      # My Album page
│       ├── sticker-add.html # Add Sticker form
│       ├── trades.html     # Find Trades page
│       ├── catalog.html    # Sticker Catalog
│       ├── profile.html    # User Profile
│       ├── 404.html        # 404 Error page
│       └── error.html      # Generic Error page
├── server.js               # Express server
├── package.json
└── .env.example
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Users
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password
- `DELETE /api/users/account` - Delete account

### Stickers (Collection)
- `GET /api/stickers` - Get user's stickers
- `POST /api/stickers` - Add sticker to collection
- `PUT /api/stickers/:id` - Update sticker
- `DELETE /api/stickers/:id` - Remove sticker

### Catalog
- `GET /api/catalog` - Get full sticker catalog
- `GET /api/catalog/:id` - Get single sticker details

### Trades
- `GET /api/trades` - Get trade matches

### Stats
- `GET /api/stats` - Get user statistics

### Health
- `GET /api/health` - Health check endpoint

## Design System

### Colors
- Primary Orange: `#ff4d00`
- Yellow: `#ffd000`
- Sky Blue: `#00c2ff`
- Green: `#00d26a`
- White: `#ffffff`
- Light Gray: `#f5f5f5`
- Dark Gray: `#444444`
- Black: `#111111`

### Typography
- Font Family: System UI stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, etc.)
- Base Size: 16px
- Scale: 12px, 14px, 16px, 18px, 20px, 24px, 32px, 40px, 56px, 72px

### Components
- Buttons: Rounded corners, gradient backgrounds, smooth hover transitions
- Cards: Large border radius, soft shadows, hover lift animation
- Forms: Clean inputs with focus states and validation
- Navigation: Fixed navbar with blur backdrop

## Database Schema

### Tables
- `users` - User accounts
- `stickers` - Sticker catalog
- `user_stickers` - User collections (duplicates/missing)
- `trades` - Trade proposals
- `messages` - Trade messages
- `notifications` - User notifications
- `sessions` - Active sessions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- FIFA World Cup 2026 for the inspiration
- The global community of sticker collectors
- All contributors to this project

---

Built with ❤️ for the FIFA World Cup 2026
