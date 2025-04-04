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

## Deployment
WatchWise is now Live!!
Check it out here - https://s72-raphael-watchwise.onrender.com