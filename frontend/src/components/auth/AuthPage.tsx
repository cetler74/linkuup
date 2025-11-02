import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import Header from '../common/Header';
import Footer from '../common/Footer';
import InteractiveBackground from '../common/InteractiveBackground';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Listen for card hover events from form cards
  useEffect(() => {
    const handleCardHover = (e: CustomEvent) => {
      setIsCardHovered(e.detail?.hovered || false);
    };

    window.addEventListener('cardHover', handleCardHover as EventListener);

    return () => {
      window.removeEventListener('cardHover', handleCardHover as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-white">
      {/* Interactive Background */}
      <InteractiveBackground opacity={0.4} />
      
      {/* Dim overlay when card is hovered */}
      <div 
        className={`fixed inset-0 z-[1] bg-black transition-opacity duration-300 pointer-events-none ${
          isCardHovered ? 'opacity-[0.03]' : 'opacity-0'
        }`}
      />
      
      {/* Header */}
      <div className="relative z-10">
        <Header />
      </div>
      
      {/* Main Content */}
      <main className="relative z-10 flex-grow flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md sm:max-w-lg">
          {isLogin ? (
            <LoginForm onSwitchToRegister={() => {
              setIsLogin(false);
            }} />
          ) : (
            <RegisterForm onSwitchToLogin={() => {
              setIsLogin(true);
            }} />
          )}
        </div>
      </main>
      
      {/* Footer */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default AuthPage;
