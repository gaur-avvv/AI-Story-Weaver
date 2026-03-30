import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface RatingSystemProps {
  onRate: (rating: number) => void;
  initialRating?: number;
}

export const RatingSystem: React.FC<RatingSystemProps> = ({ onRate, initialRating = 0 }) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  const handleRate = (value: number) => {
    setRating(value);
    setHasRated(true);
    onRate(value);
  };

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <h3 className="text-lg font-bold text-blue-900/80">Rate this story</h3>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
            disabled={hasRated}
          >
            <svg
              className={`w-8 h-8 ${
                star <= (hover || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-100'
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      {hasRated && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-green-600 font-semibold"
        >
          Thanks for your feedback!
        </motion.p>
      )}
    </div>
  );
};
