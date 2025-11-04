import React, { useState, useEffect } from 'react';
import { XMarkIcon, TagIcon, GiftIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
// Define types inline to avoid module resolution issues
interface ActiveCampaign {
  id: number;
  name: string;
  banner_message: string;
  campaign_type: 'price_reduction' | 'rewards_increase' | 'free_service';
  start_datetime?: string;
  end_datetime: string;
  discount_type?: 'percentage' | 'fixed_amount';
  discount_value?: number;
  rewards_multiplier?: number;
  rewards_bonus_points?: number;
  free_service_type?: 'specific_free' | 'buy_x_get_y';
  buy_quantity?: number;
  get_quantity?: number;
  days_remaining?: number;
}

interface CampaignBannerProps {
  campaigns: ActiveCampaign[];
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

const CampaignBanner: React.FC<CampaignBannerProps> = ({
  campaigns,
  onClose,
  showCloseButton = false,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const [currentCampaignIndex, setCurrentCampaignIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Auto-rotate through multiple campaigns
  useEffect(() => {
    if (campaigns.length > 1) {
      const interval = setInterval(() => {
        setCurrentCampaignIndex((prev) => (prev + 1) % campaigns.length);
      }, 5000); // Change every 5 seconds

      return () => clearInterval(interval);
    }
  }, [campaigns.length]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible || campaigns.length === 0) {
    return null;
  }

  const currentCampaign = campaigns[currentCampaignIndex];

  const getCampaignIcon = (type: string) => {
    switch (type) {
      case 'price_reduction':
        return <TagIcon className="h-5 w-5" />;
      case 'rewards_increase':
        return <GiftIcon className="h-5 w-5" />;
      case 'free_service':
        return <GiftIcon className="h-5 w-5" />;
      default:
        return <TagIcon className="h-5 w-5" />;
    }
  };

  const getCampaignColor = (type: string) => {
    switch (type) {
      case 'price_reduction':
        return 'bg-gradient-to-r from-orange-500 to-red-500';
      case 'rewards_increase':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'free_service':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      default:
        return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    }
  };

  const formatTimeRemaining = (endDateTime: string) => {
    const now = new Date();
    const end = new Date(endDateTime);
    const diffTime = end.getTime() - now.getTime();
    
    if (diffTime <= 0) return 'Expired';
    
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const formatDateRange = (startDateTime?: string, endDateTime: string) => {
    // Map i18n language codes to locale strings for date formatting
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'pt': 'pt-PT',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT'
    };
    
    const locale = localeMap[i18n.language] || 'en-US';
    
    if (!startDateTime) {
      const end = new Date(endDateTime);
      return end.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    
    const startFormatted = start.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    const endFormatted = end.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const getDiscountText = (campaign: ActiveCampaign) => {
    if (campaign.campaign_type === 'price_reduction') {
      if (campaign.discount_type === 'percentage') {
        return `Up to ${campaign.discount_value}% OFF`;
      } else {
        return `Up to €${campaign.discount_value} OFF`;
      }
    } else if (campaign.campaign_type === 'rewards_increase') {
      if (campaign.rewards_multiplier && campaign.rewards_multiplier > 1) {
        return `${campaign.rewards_multiplier}x Points`;
      }
      if (campaign.rewards_bonus_points) {
        return `+${campaign.rewards_bonus_points} Bonus Points`;
      }
      return 'Extra Points';
    } else if (campaign.campaign_type === 'free_service') {
      if (campaign.free_service_type === 'buy_x_get_y') {
        return `Buy ${campaign.buy_quantity} Get ${campaign.get_quantity} FREE`;
      }
      return 'FREE Services';
    }
    return 'Special Offer';
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Main Banner */}
      <div className={`${getCampaignColor(currentCampaign.campaign_type)} text-white`}>
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {getCampaignIcon(currentCampaign.campaign_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold truncate">
                    {currentCampaign.name}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white bg-opacity-20">
                    {getDiscountText(currentCampaign)}
                  </span>
                </div>
                <p className="text-sm opacity-90 mt-1">
                  {currentCampaign.banner_message}
                </p>
                <p className="text-xs opacity-75 mt-2">
                  {t('owner.campaigns.period', { defaultValue: 'Period' })}: {formatDateRange(currentCampaign.start_datetime, currentCampaign.end_datetime)} | {t('owner.campaigns.duration', { defaultValue: 'Duration' })}: {formatTimeRemaining(currentCampaign.end_datetime)}
                </p>
                {campaigns.length > 1 && (
                  <div className="flex items-center space-x-1 mt-2 text-xs opacity-75">
                    <CheckCircleIcon className="h-3 w-3" />
                    <span>{currentCampaignIndex + 1} of {campaigns.length} offers</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Campaign indicators for multiple campaigns */}
              {campaigns.length > 1 && (
                <div className="flex space-x-1">
                  {campaigns.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentCampaignIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentCampaignIndex 
                          ? 'bg-white' 
                          : 'bg-white bg-opacity-50'
                      }`}
                    />
                  ))}
                </div>
              )}
              
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  className="flex-shrink-0 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white via-transparent opacity-10 animate-pulse" />
    </div>
  );
};

export default CampaignBanner;
