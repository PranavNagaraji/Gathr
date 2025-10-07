# gathr 🛍️

A modern local marketplace platform connecting customers with local merchants and shopkeepers.

## 🚀 Project Overview

Gathr is a full-stack web application built with Next.js and Express.js that enables local businesses to showcase their products and services to nearby customers. The platform features role-based authentication, merchant dashboards, and a beautiful animated user interface.

## 🏗️ Architecture

### Frontend (Next.js 15.4.5)
- **Framework**: Next.js with App Router
- **Authentication**: Clerk for user management and role-based access
- **UI Library**: Material-UI (MUI) v7.2.0
- **Styling**: Tailwind CSS v4
- **Animations**: 
  - GSAP v3.13.0 for complex animations
  - Framer Motion v12.23.12 for React animations
  - Three.js v0.179.1 for 3D graphics
- **HTTP Client**: Axios v1.11.0
- **Icons**: Lucide React v0.534.0

### Backend (Express.js)
- **Framework**: Express.js v5.1.0
- **Authentication**: Clerk SDK for Node.js
- **Database**: Supabase (PostgreSQL)
- **File Upload**: Multer v2.0.2
- **Image Storage**: Cloudinary v2.7.0
- **Environment**: Node.js with ES modules

## 📁 Project Structure

```
Gathr/
├── frontend/                 # Next.js frontend application
│   ├── public/              # Static assets
│   │   ├── HeroPic.jpeg
│   │   ├── avatar.svg
│   │   └── logo.png
│   └── src/
│       ├── app/             # Next.js App Router pages
│       │   ├── auth-callback/
│       │   ├── dummy/       # Customer test route
│       │   ├── dummy2/      # Keeper test route
│       │   ├── merchant/
│       │   │   └── dashboard/
│       │   ├── sign-in/
│       │   ├── sign-up/
│       │   ├── layout.jsx
│       │   └── page.jsx
│       ├── components/      # Reusable React components
│       │   ├── gsap/        # GSAP animation components
│       │   │   ├── CardSwap.js
│       │   │   ├── DarkVeil.js
│       │   │   ├── Galaxy.js
│       │   │   ├── LightRays.js
│       │   │   ├── Masonry.js
│       │   │   ├── RotatingText.js
│       │   │   ├── Silk.js
│       │   │   └── TextType.js
│       │   ├── Hero.jsx
│       │   ├── LoginButton.jsx
│       │   └── Navbar.jsx
│       └── middleware.jsx   # Route protection middleware
├── backend/                 # Express.js backend API
│   ├── controllers/         # Request handlers
│   │   ├── merchant.controller.js
│   │   └── merchantup.controller.js
│   ├── routes/             # API route definitions
│   │   └── merchant.js
│   ├── schemas/            # Database schemas
│   │   └── user.schema.js
│   ├── utils/              # Utility functions
│   │   └── check.js        # Authentication middleware
│   ├── cloudinary.js       # Cloudinary configuration
│   ├── db.js              # Supabase database connection
│   └── index.js           # Main server file
├── GathrDFD.png            # Data Flow Diagram
├── srs.docx               # Software Requirements Specification
└── README.md              # This file
```

## 🎯 Current Features

### Authentication & Authorization
- **Multi-role authentication** using Clerk
- **Role-based access control** (Customer, Keeper/Merchant)
- **Protected routes** with middleware
- **User metadata sync** between Clerk and Supabase

### User Roles
- **Customer**: Browse and discover local products
- **Keeper/Merchant**: Manage shop and inventory

### Merchant Features
- **Shop Management**: Create and update shop profiles
- **Inventory Management**: Add and update product items
- **Dashboard**: Merchant-specific dashboard interface

### UI/UX
- **Animated Landing Page** with GSAP effects
- **Responsive Design** with Tailwind CSS
- **Modern Component Library** using Material-UI
- **3D Graphics** with Three.js integration
- **Gradient Animations** and visual effects

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager
- Clerk account for authentication
- Supabase account for database
- Cloudinary account for image storage

### Environment Variables

Create `.env.local` files in both frontend and backend directories:

**Frontend (.env.local)**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

**Backend (.env)**
```env
CLERK_SECRET_KEY=your_clerk_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Installation & Running

1. **Clone the repository**
```bash
git clone <repository-url>
cd Gathr
```

2. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

3. **Install Backend Dependencies**
```bash
cd ../backend
npm install
```

4. **Start Backend Server**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

5. **Start Frontend Development Server**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

## 🔗 API Endpoints

### Authentication
- `POST /set-role` - Set user role and sync with database

### Merchant Routes (Protected)
- `POST /api/merchant/add_shop` - Create merchant shop
- `POST /api/merchant/add_items` - Add products to inventory
- `GET /api/merchant/get_items` - Retrieve merchant items
- `GET /api/merchant/check_shop_exists` - Check if shop exists
- `GET /api/merchant/get_shop` - Get shop details
- `PUT /api/merchant/update_shop` - Update shop information
- `PUT /api/merchant/update_items` - Update product items

## 🎨 Design Features

### Visual Components
- **DarkVeil**: Animated gradient background with customizable color stops
- **Hero Section**: Landing page with animated elements
- **Responsive Navbar**: Navigation with authentication state
- **GSAP Animations**: Multiple animation components for enhanced UX

### Typography
- **Primary Fonts**: Inter, Outfit, Quicksand
- **Decorative Fonts**: Bungee Spice, Caveat, Lilita One
- **Script Fonts**: Bonheur Royale, Yesteryear

## 🚧 Development Status

### ✅ Completed
- Project structure setup
- Authentication system with Clerk
- Role-based access control
- Basic merchant API endpoints
- Animated landing page
- Database integration with Supabase
- File upload configuration with Cloudinary

### 🔄 In Progress
- Merchant dashboard implementation
- Product catalog features
- Customer browsing interface

### 📋 Planned Features
- Customer product search and filtering
- Shopping cart functionality
- Order management system
- Real-time notifications
- Geolocation-based merchant discovery
- Payment integration
- Review and rating system

## 🧪 Testing Routes

- `/dummy` - Customer role test page
- `/dummy2` - Keeper role test page
- `/merchant/dashboard` - Merchant dashboard (requires merchant role)

## 📱 Responsive Design

The application is built with mobile-first responsive design principles using Tailwind CSS, ensuring optimal experience across all device sizes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of a software engineering lab and is intended for educational purposes.

---

**Last Updated**: August 26, 2025
**Version**: 0.1.0 (Development)
**Maintainers**: Software Engineering Lab Team
