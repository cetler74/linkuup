import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import Header from '../common/Header';
import Footer from '../common/Footer';
import HeroCarousel from '../common/HeroCarousel';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Hero Carousel Background */}
      <div className="absolute inset-0">
        <HeroCarousel className="w-full h-full" />
      </div>
      
      {/* Header integrated into hero section */}
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
