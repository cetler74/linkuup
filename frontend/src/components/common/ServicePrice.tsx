import React, { useState } from 'react';
import { InformationCircleIcon, TagIcon, GiftIcon } from '@heroicons/react/24/outline';
// Define types inline to avoid module resolution issues
interface ServicePriceCalculation {
  service_id: number;
  place_service_id?: number;
  original_price: number;
  discounted_price: number;
  discount_amount: number;
  discount_percentage?: number;
  applied_campaigns: number[];
  is_free: boolean;
  free_reason?: string;
}

interface ActiveCampaign {
  id: number;
  name: string;
  banner_message: string;
  campaign_type: 'price_reduction' | 'rewards_increase' | 'free_service';
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

interface ServicePriceProps {
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
  discountPercentage?: number;
  isFree: boolean;
  appliedCampaigns: number[];
  campaigns?: ActiveCampaign[];
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ServicePrice: React.FC<ServicePriceProps> = ({
  originalPrice,
  discountedPrice,
  discountAmount,
  discountPercentage,
  isFree,
  appliedCampaigns,
  campaigns = [],
  showDetails = false,
  size = 'md',
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          original: 'text-sm',
          discounted: 'text-lg font-semibold',
          discount: 'text-xs',
          icon: 'h-3 w-3'
        };
      case 'lg':
        return {
          original: 'text-lg',
          discounted: 'text-2xl font-bold',
          discount: 'text-sm',
          icon: 'h-5 w-5'
        };
      default: // md
        return {
          original: 'text-base',
          discounted: 'text-xl font-semibold',
          discount: 'text-sm',
          icon: 'h-4 w-4'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`;
  };

  const getDiscountText = () => {
    if (isFree) return 'FREE';
    if (discountPercentage) return `${discountPercentage.toFixed(0)}% OFF`;
    if (discountAmount > 0) return `€${discountAmount.toFixed(2)} OFF`;
    return '';
  };

  const getCampaignDetails = () => {
    if (!campaigns.length || !appliedCampaigns.length) return [];
    
    return campaigns.filter(campaign => 
      appliedCampaigns.includes(campaign.id)
    );
  };

  const campaignDetails = getCampaignDetails();

  const getDiscountColor = () => {
    if (isFree) return 'text-green-400 bg-green-900';
    if (discountPercentage && discountPercentage >= 50) return 'text-red-400 bg-red-900';
    if (discountPercentage && discountPercentage >= 25) return 'text-orange-400 bg-orange-900';
    return 'text-blue-400 bg-blue-900';
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2">
        {/* Price Display */}
        <div className="flex items-center space-x-2">
          {isFree ? (
            <div className="flex items-center space-x-1">
              <GiftIcon className={`${sizeClasses.icon} text-green-400`} />
              <span className={`${sizeClasses.discounted} text-green-400 font-bold`}>
                FREE
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {originalPrice !== discountedPrice && (
                <span className={`${sizeClasses.original} text-gray-400 line-through`}>
                  {formatPrice(originalPrice)}
                </span>
              )}
              <span className={`${sizeClasses.discounted} text-white`}>
                {formatPrice(discountedPrice)}
              </span>
            </div>
          )}
        </div>

        {/* Discount Badge */}
        {!isFree && originalPrice !== discountedPrice && (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDiscountColor()}`}>
            <TagIcon className="h-3 w-3 mr-1" />
            {getDiscountText()}
          </span>
        )}

        {/* Campaign Indicator */}
        {appliedCampaigns.length > 0 && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300"
            >
              <InformationCircleIcon className="h-4 w-4" />
              <span>{appliedCampaigns.length} campaign{appliedCampaigns.length > 1 ? 's' : ''}</span>
            </button>

            {/* Tooltip */}
            {showTooltip && showDetails && (
              <div className="absolute z-10 w-64 p-3 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-white">Applied Campaigns</h4>
                  {campaignDetails.map((campaign) => (
                    <div key={campaign.id} className="text-xs">
                      <div className="font-medium text-white">{campaign.name}</div>
                      <div className="text-gray-300">{campaign.banner_message}</div>
                      {campaign.campaign_type === 'price_reduction' && (
                        <div className="text-blue-400">
                          {campaign.discount_type === 'percentage' 
                            ? `${campaign.discount_value}% discount`
                            : `€${campaign.discount_value} discount`
                          }
                        </div>
                      )}
                      {campaign.campaign_type === 'rewards_increase' && (
                        <div className="text-purple-400">
                          {campaign.rewards_multiplier && campaign.rewards_multiplier > 1 && 
                            `${campaign.rewards_multiplier}x points`
                          }
                          {campaign.rewards_bonus_points && 
                            ` +${campaign.rewards_bonus_points} bonus points`
                          }
                        </div>
                      )}
                      {campaign.campaign_type === 'free_service' && (
                        <div className="text-green-400">
                          {campaign.free_service_type === 'buy_x_get_y' 
                            ? `Buy ${campaign.buy_quantity} Get ${campaign.get_quantity} Free`
                            : 'Free service'
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Discount Breakdown (for multiple campaigns) */}
      {showDetails && appliedCampaigns.length > 1 && (
        <div className="mt-2 text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <span>Stacked discounts:</span>
            <div className="flex space-x-1">
              {campaignDetails.map((campaign, index) => (
                <span key={campaign.id} className="text-blue-400">
                  {campaign.campaign_type === 'price_reduction' && (
                    campaign.discount_type === 'percentage' 
                      ? `${campaign.discount_value}%`
                      : `€${campaign.discount_value}`
                  )}
                  {index < campaignDetails.length - 1 && <span className="text-gray-500">+</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicePrice;
