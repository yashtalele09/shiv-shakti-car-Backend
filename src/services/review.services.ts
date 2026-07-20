import Review from "../models/reviews";

const addReviewService = async (reviewData: any) => {
  try {
    const newReview = await Review.create(reviewData);
    return newReview;
  } catch (error) {
    throw error;
  }
};

const getReviewsService = async () => {
  const [reviews, stats] = await Promise.all([
    Review.find()
      .populate("userId", "name profileImage")
      .sort({ createdAt: -1 })
      .lean(),

    Review.aggregate([
      {
        $group: {
          _id: null,
          averageRating: {
            $avg: "$rating",
          },
          totalReviews: {
            $sum: 1,
          },
          oneStar: {
            $sum: {
              $cond: [{ $eq: ["$rating", 1] }, 1, 0],
            },
          },
          twoStar: {
            $sum: {
              $cond: [{ $eq: ["$rating", 2] }, 1, 0],
            },
          },
          threeStar: {
            $sum: {
              $cond: [{ $eq: ["$rating", 3] }, 1, 0],
            },
          },
          fourStar: {
            $sum: {
              $cond: [{ $eq: ["$rating", 4] }, 1, 0],
            },
          },
          fiveStar: {
            $sum: {
              $cond: [{ $eq: ["$rating", 5] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const summary = stats[0] || {
    averageRating: 0,
    totalReviews: 0,
    oneStar: 0,
    twoStar: 0,
    threeStar: 0,
    fourStar: 0,
    fiveStar: 0,
  };

  return {
    overallRating: Number(summary.averageRating?.toFixed(1) || 0),
    totalReviews: summary.totalReviews,
    ratingCount: {
      1: summary.oneStar,
      2: summary.twoStar,
      3: summary.threeStar,
      4: summary.fourStar,
      5: summary.fiveStar,
    },
    reviews,
  };
};

const reviewService = {
  addReviewService,
  getReviewsService,
};

export default reviewService;
