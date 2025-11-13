import React from 'react';
import StarRating from '../common/StarRating';
import { CheckCircle } from 'lucide-react';

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
  is_verified: boolean;
}

interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm">
              {review.customer_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">{review.customer_name}</h4>
              {review.is_verified && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
          </div>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>
      
      {review.title && (
        <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
      )}
      
      {review.comment && (
        <p className="text-gray-600 leading-relaxed">{review.comment}</p>
      )}
    </div>
  );
};

export default ReviewCard;
