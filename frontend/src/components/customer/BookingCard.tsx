import React from 'react';
import { Calendar, Clock, User, Phone, Euro, Gift, Star, Tag } from 'lucide-react';

interface BookingCardProps {
  booking: {
    id: number;
    salon_id?: number;
    salon_name?: string;
    service_id?: number;
    service_name?: string;
    service_price?: number;
    service_duration?: number;
    employee_id?: number;
    employee_name?: string;
    employee_phone?: string;
    employee_photo_url?: string;
    employee_color_code?: string;
    booking_date: string;
    booking_time: string;
    duration?: number;
    status: string;
    customer_phone?: string;
    any_employee_selected?: boolean;
    
    // Multi-service support
    services?: Array<{
      service_id: number;
      service_name: string;
      service_price: number;
      service_duration: number;
    }>;
    total_price?: number;
    total_duration?: number;
    
    // Campaign information
    campaign_id?: number;
    campaign_name?: string;
    campaign_type?: string;
    campaign_discount_type?: string;
    campaign_discount_value?: number;
    campaign_banner_message?: string;
    
    // Rewards information
    rewards_points_earned?: number;
    rewards_points_redeemed?: number;
  };
  onCancel?: (bookingId: number) => void;
  showCancelButton?: boolean;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onCancel, showCancelButton = false }) => {
  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      pending: 'bg-soft-yellow/20 text-soft-yellow border-soft-yellow/30',
      confirmed: 'bg-lime-green/20 text-lime-green border-lime-green/30',
      cancelled: 'bg-coral-red/20 text-coral-red border-coral-red/30',
      completed: 'bg-bright-blue/20 text-bright-blue border-bright-blue/30',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[status] || 'bg-medium-gray/20 text-charcoal border-medium-gray/30'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    // Handle both datetime and time-only formats
    const time = timeString.includes('T') ? new Date(timeString) : new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateFinalPrice = () => {
    const basePrice = booking.total_price || booking.service_price;
    if (!basePrice) return null;
    
    let finalPrice = basePrice;
    
    if (booking.campaign_discount_value && booking.campaign_discount_type) {
      if (booking.campaign_discount_type === 'percentage') {
        finalPrice = finalPrice * (1 - booking.campaign_discount_value / 100);
      } else if (booking.campaign_discount_type === 'fixed') {
        finalPrice = finalPrice - booking.campaign_discount_value;
      }
    }
    
    return Math.max(0, finalPrice); // Ensure price doesn't go below 0
  };

  const finalPrice = calculateFinalPrice();
  const hasDiscount = booking.campaign_discount_value && booking.campaign_discount_type;
  const discountAmount = hasDiscount ? (booking.service_price || 0) - (finalPrice || 0) : 0;

  return (
    <div className="bg-white border border-medium-gray rounded-lg p-6 shadow-form transition-all duration-200 hover:shadow-elevated">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'Poppins, sans-serif' }}>{booking.salon_name || 'Salon'}</h3>
          {booking.services && booking.services.length > 0 ? (
            <div className="text-sm text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              <p className="font-medium mb-1">Services ({booking.services.length}):</p>
              <ul className="space-y-1">
                {booking.services.map((service, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{service.service_name}</span>
                    <span className="text-charcoal/60">€{service.service_price} ({service.service_duration}min)</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-charcoal/70" style={{ fontFamily: 'Open Sans, sans-serif' }}>{booking.service_name || 'Service'}</p>
          )}
          {booking.campaign_name && (
            <div className="mt-1 flex items-center">
              <Tag className="h-3 w-3 mr-1 text-soft-yellow" />
              <span className="text-xs text-soft-yellow font-medium">{booking.campaign_name}</span>
            </div>
          )}
        </div>
        {getStatusBadge(booking.status)}
      </div>

      <div className="space-y-3 text-sm text-charcoal/80" style={{ fontFamily: 'Open Sans, sans-serif' }}>
        {/* Date and Time */}
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2 text-charcoal/60" />
          <span>{formatDate(booking.booking_date)}</span>
        </div>

        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2 text-charcoal/60" />
          <span>{formatTime(booking.booking_time)}</span>
          <span className="ml-2">({(booking.total_duration || booking.service_duration || booking.duration || 0)} min)</span>
        </div>

        {/* Employee Information */}
        <div className="flex items-center">
          {booking.any_employee_selected ? (
            <>
              <User className="h-4 w-4 mr-2 text-charcoal/60" />
              <span>Any Available Employee</span>
            </>
          ) : booking.employee_name ? (
            <div className="flex items-center space-x-2">
              {booking.employee_photo_url ? (
                <div 
                  className="h-6 w-6 rounded-full overflow-hidden border"
                  style={{ borderColor: booking.employee_color_code || '#3B82F6' }}
                >
                  <img
                    src={booking.employee_photo_url}
                    alt={booking.employee_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div 
                  className="h-6 w-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: booking.employee_color_code || '#3B82F6' }}
                >
                  <span className="text-white text-xs font-semibold">
                    {booking.employee_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span>{booking.employee_name}</span>
              {booking.employee_phone && (
                <span className="text-charcoal/60">({booking.employee_phone})</span>
              )}
            </div>
          ) : (
            <>
              <User className="h-4 w-4 mr-2 text-charcoal/60" />
              <span>Employee TBD</span>
            </>
          )}
        </div>

        {/* Total Price */}
        {(booking.total_price || booking.service_price) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Euro className="h-4 w-4 mr-2 text-charcoal/60" />
              <span>{booking.services && booking.services.length > 1 ? 'Total Price' : 'Service Price'}</span>
            </div>
            <div className="text-right">
              {hasDiscount ? (
                <div>
                  <span className="line-through text-charcoal/50 mr-2">€{(booking.total_price || booking.service_price || 0).toFixed(2)}</span>
                  <span className="text-lime-green font-semibold">€{(finalPrice || 0).toFixed(2)}</span>
                </div>
              ) : (
                <span className="font-semibold">€{(booking.total_price || booking.service_price || 0).toFixed(2)}</span>
              )}
            </div>
          </div>
        )}

        {/* Campaign Discount */}
        {hasDiscount && (
          <div className="bg-soft-yellow/10 border border-soft-yellow/20 rounded-lg p-3">
            <div className="flex items-center mb-1">
              <Gift className="h-4 w-4 mr-2 text-soft-yellow" />
              <span className="text-soft-yellow font-medium text-xs">Campaign Discount</span>
            </div>
            <div className="text-xs text-charcoal/80">
              <div>{booking.campaign_banner_message}</div>
              <div className="mt-1">
                {booking.campaign_discount_type === 'percentage' 
                  ? `${booking.campaign_discount_value}% off`
                  : `€${booking.campaign_discount_value} off`
                }
                <span className="ml-2 text-lime-green">(Save €{discountAmount.toFixed(2)})</span>
              </div>
            </div>
          </div>
        )}

        {/* Rewards Information */}
        {(booking.rewards_points_earned || booking.rewards_points_redeemed) && (
          <div className="bg-bright-blue/5 border border-bright-blue/20 rounded-lg p-3">
            <div className="flex items-center mb-1">
              <Star className="h-4 w-4 mr-2 text-bright-blue" />
              <span className="text-bright-blue font-medium text-xs">Rewards</span>
            </div>
            <div className="text-xs text-charcoal/80 space-y-1">
              {booking.rewards_points_earned && (
                <div>Earned: <span className="text-lime-green font-semibold">{booking.rewards_points_earned} points</span></div>
              )}
              {booking.rewards_points_redeemed && (
                <div>Redeemed: <span className="text-bright-blue font-semibold">{booking.rewards_points_redeemed} points</span></div>
              )}
            </div>
          </div>
        )}

        {/* Customer Phone */}
        {booking.customer_phone && (
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-2 text-charcoal/60" />
            <span>{booking.customer_phone}</span>
          </div>
        )}
      </div>

      {showCancelButton && onCancel && (booking.status === 'pending' || booking.status === 'confirmed') && (
        <div className="mt-4 pt-4 border-t border-medium-gray">
          <button
            onClick={() => onCancel(booking.id)}
            className="w-full px-4 py-2 bg-coral-red text-white rounded-lg hover:bg-red-500 transition-colors duration-200"
          >
            Cancel Booking
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingCard;

