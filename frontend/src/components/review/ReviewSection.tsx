import React, { useState, useEffect } from 'react';
import StarRating from '../common/StarRating';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';
import { Plus, Star } from 'lucide-react';
import api from '../../utils/api';

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
  is_verified: boolean;
}

interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
}

interface ReviewSectionProps {
  salonId: number;
  reviewSummary: ReviewSummary;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ salonId, reviewSummary }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchReviews = async (page: number = 1) => {
    try {
      const response = await api.get(
        `/places/${salonId}/reviews?page=${page}&per_page=5`
      );
      
      const data = response.data;
      
      if (page === 1) {
        setReviews(data.reviews);
      } else {
        setReviews(prev => [...prev, ...data.reviews]);
      }
      
      setHasMore(data.pagination.page < data.pagination.pages);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1);
  }, [salonId]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchReviews(nextPage);
  };

  const handleReviewSubmitted = () => {
    // Refresh reviews and summary
    setCurrentPage(1);
    fetchReviews(1);
    // The parent component should refresh the salon data to get updated summary
    window.location.reload(); // Simple refresh for now
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const ratingDistribution = getRatingDistribution();

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Avaliações</h3>
          <button
            onClick={() => setShowReviewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Escrever Avaliação
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {reviewSummary?.average_rating?.toFixed(1) || '0.0'}
            </div>
            <StarRating rating={reviewSummary?.average_rating || 0} size="lg" />
            <div className="text-sm text-gray-600 mt-1">
              {reviewSummary?.total_reviews || 0} avaliações
            </div>
          </div>

          <div className="flex-1">
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                const percentage = reviewSummary.total_reviews > 0 
                  ? (count / reviewSummary.total_reviews) * 100 
                  : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-8">
                      <span className="text-sm text-gray-600">{rating}</span>
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">A carregar avaliações...</div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Ainda não há avaliações para este salão.</div>
            <button
              onClick={() => setShowReviewForm(true)}
              className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Seja o primeiro a avaliar
            </button>
          </div>
        ) : (
          <>
            {reviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
            
            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Carregar Mais Avaliações
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <ReviewForm
          salonId={salonId}
          onClose={() => setShowReviewForm(false)}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
};

export default ReviewSection;
