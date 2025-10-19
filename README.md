# WatchWise - AI Media Tracker

## Overview
**WatchWise** is an AI-powered media tracker that helps users monitor their watched and future movies, web series, anime, manga, and webcomics. With intelligent recommendations based on viewing history, genre preference, and user-selected filters, WatchWise ensures users never miss quality content. The app allows users to search media with dynamic filters such as mood, duration, rating, and availability.

## Features
- **User Profile & Authentication**: Secure signup/login with JWT-based authentication.
- **Media Tracking**: Users can maintain watched lists and bookmark future media.
- **AI Recommendations**: Intelligent media suggestions based on user preferences.
- **Advanced Search & Filters**: Filter content based on genre, mood, rating, duration, and streaming platform.
- **Minimalist UI**: A clean and intuitive interface with easy navigation.
- **Cross-Platform Compatibility**: Accessible on desktop and mobile devices.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB / PostgreSQL
- **Authentication**: JWT-based authentication
- **AI Recommendation Model**: Collaborative filtering, NLP-based models, or external APIs (e.g., PromptRepo, Google Gemini, Cosine Similarity)
- **API Testing**: Bruno / Postman

## Project Timeline

### **Week 1: Project Setup & Core Features Planning**
- Set up project repository (GitHub/GitLab).
- Install and configure backend with Express.js and Node.js.
- Install frontend with React.js and Tailwind CSS.
- Plan and design the database schema for:
  - User profiles
  - Media lists (watched and future)
  - Preferences & AI-based recommendations
- Research and choose an AI model for content recommendations.

### **Week 2: Backend Development & User Authentication**
- Implement user authentication:
  - Signup & login using JWT-based authentication.
  - Secure password handling with bcrypt.
- Develop API endpoints for user profile and media tracking:
  - CRUD operations for watched lists and preferences.
- Implement a basic AI-powered recommendation system:
  - Use PromptRepo, Google Gemini, or cosine similarity.
- Test API endpoints using Bruno/Postman.

### **Week 3: Frontend UI Development & Basic Feature Integration**
- Develop the core UI components:
  - Home page
  - Dashboard
  - Media lists (watched & future)
  - AI recommendations panel
- Implement frontend integration with backend APIs.
- Add dynamic filtering options:
  - Genre
  - Mood
  - Rating
  - Watch time
- Optimize UI design for accessibility and responsiveness.
- Debug and refine user interactions.

### **Week 4: UI Enhancement, API Development, AI Model Refinement**
- Enhance UI/UX with animations and better visual representation.
- Optimize API responses and database queries for efficiency.
- Improve AI recommendation accuracy with user feedback loops.
- Add search functionality with autocomplete and ranking algorithms.
- Conduct internal testing and gather feedback.

### **Week 5: Final Testing, Feedback Incorporation & Deployment**
- Perform rigorous testing for:
  - User experience
  - Performance optimization
  - Security vulnerabilities
- Address feedback and refine application based on user testing.
- Prepare and deploy the app using cloud services (e.g., Vercel, AWS, DigitalOcean).
- Monitor application performance and fix any post-deployment issues.

## Future Enhancements
- **Social Features**: Allow users to share recommendations and reviews.
- **Streaming Integration**: Fetch availability from streaming services.
- **Personalized Notifications**: Alerts for new releases matching preferences.
- **Multi-User Support**: Profiles for different users within an account.

## Contributing
Contributions are welcome! If you'd like to contribute:
1. Fork the repository.
2. Create a new branch.
3. Make your changes and commit them.
4. Push to your fork and submit a pull request.

## Docker Setup

WatchWise now supports Docker for easy local development and deployment. Follow these steps to get started:

### Prerequisites
- Docker Desktop installed on your system
- Git (to clone the repository)

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd watchwise
   ```

2. **Start all services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:80
   - Backend API: http://localhost:3000
   - MongoDB: localhost:27017

### Docker Commands

**Build and start all services:**
```bash
docker-compose up -d --build
```

**View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

**Stop services:**
```bash
docker-compose down
```

**Stop and remove volumes (clears database):**
```bash
docker-compose down -v
```

**Restart a specific service:**
```bash
docker-compose restart backend
```

### Environment Configuration

1. **Backend Environment Variables**
   Copy `backend/env.example` to `backend/.env` and update the values:
   ```bash
   cp backend/env.example backend/.env
   ```

2. **Frontend Environment Variables**
   Copy `frontend/env.example` to `frontend/.env` and update the values:
   ```bash
   cp frontend/env.example frontend/.env
   ```

### Development with Docker

For development, you can mount your local code into the containers:

```bash
# Development mode with volume mounting
docker-compose -f docker-compose.dev.yml up
```

### Database Access

To access the MongoDB database directly:
```bash
# Connect to MongoDB container
docker exec -it watchwise-mongodb mongosh

# Or use MongoDB Compass with:
# Connection string: mongodb://admin:password123@localhost:27017
```

### Troubleshooting

**Port conflicts:**
If ports 80, 3000, or 27017 are already in use, modify the `docker-compose.yml` file to use different ports.

**Permission issues:**
On Linux/macOS, you might need to adjust file permissions:
```bash
sudo chown -R $USER:$USER backend/uploads
```

**Clean rebuild:**
If you encounter issues, try a clean rebuild:
```bash
docker-compose down -v
docker system prune -f
docker-compose up -d --build
```

## Deployment
WatchWise is now Live!!
Check it out here - 
Backend Deployment: https://s72-raphael-watchwise.onrender.com
Frontend Deployment: https://watchwisely.netlify.app/