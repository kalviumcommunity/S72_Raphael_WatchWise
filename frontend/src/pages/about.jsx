import React from 'react';
import Navbar from '../components/navbar';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">About WatchWise</h1>
          
          <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed">
                WatchWise is your ultimate companion for discovering and tracking movies, TV shows, and anime. 
                We aim to provide a seamless experience for entertainment enthusiasts to explore, track, and share their watching journey.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Features</h2>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Search across multiple entertainment mediums</li>
                <li>Track your watching progress</li>
                <li>Rate and review content</li>
                <li>Discover popular movies, TV shows, and anime</li>
                <li>Personalized recommendations</li>
                <li>Create and manage watchlists</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Sources</h2>
              <p className="text-gray-600 leading-relaxed">
                We utilize data from trusted sources including:
              </p>
              <ul className="list-disc list-inside text-gray-600 mt-2 space-y-2">
                <li>The Movie Database (TMDB) for movies and TV shows</li>
                <li>MyAnimeList (MAL) for anime content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact</h2>
              <p className="text-gray-600 leading-relaxed">
                Have questions or suggestions? We'd love to hear from you! 
                Contact us at support@watchwise.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
