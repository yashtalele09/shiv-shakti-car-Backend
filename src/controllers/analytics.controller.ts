import Analytics from "../models/analytics";
import { Request, Response } from "express";

const trackAnalytics = async (req: Request, res: Response) => {
  const { sessionId, userId, eventType, vehicleId, page } = req.body;
  try {
    await Analytics.create({
      sessionId,
      userId,
      eventType,
      vehicleId,
      page,
    });

    res.status(200).json({
      success: true,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAnalyticsDashboard = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const [
      pageViews,
      vehicleViews,

      uniqueVisitors,
      loggedInVisitors,
      anonymousVisitors,
      activeToday,

      topPages,

      pageAndVehicleViewsLast14Days,
    ] = await Promise.all([
      // Total Page Views
      Analytics.countDocuments({
        eventType: "page_view",
      }),

      // Total Vehicle Views
      Analytics.countDocuments({
        eventType: "vehicle_view",
      }),

      // Unique Visitors
      Analytics.distinct("sessionId"),

      // Logged In Visitors
      Analytics.distinct("sessionId", {
        userId: { $exists: true, $ne: null },
      }),

      // Anonymous Visitors
      Analytics.distinct("sessionId", {
        $or: [{ userId: { $exists: false } }, { userId: null }],
      }),

      // Active Today
      Analytics.distinct("sessionId", {
        createdAt: {
          $gte: todayStart,
        },
      }),

      // Top Pages
      Analytics.aggregate([
        {
          $match: {
            eventType: "page_view",
            page: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: "$page",
            views: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            views: -1,
          },
        },
        {
          $limit: 10,
        },
      ]),

      // Page + Vehicle Views Last 14 Days
      Analytics.aggregate([
        {
          $match: {
            eventType: {
              $in: ["page_view", "vehicle_view"],
            },
            createdAt: {
              $gte: fourteenDaysAgo,
            },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
              type: "$eventType",
            },
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            "_id.date": 1,
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,

      overview: {
        pageViews,
        vehicleViews,

        uniqueVisitors: uniqueVisitors.length,

        loggedInVisitors: loggedInVisitors.length,

        anonymousVisitors: anonymousVisitors.length,

        activeToday: activeToday.length,
      },

      charts: {
        topPages,

        pageAndVehicleViewsLast14Days,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics dashboard",
    });
  }
};

const getAnalytics = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const range = (req.query.range as string) || "all";

    let startDate: Date | null = null;

    switch (range) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;

      case "7days":
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
        break;

      case "30days":
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
        break;

      case "90days":
        startDate = new Date();
        startDate.setDate(now.getDate() - 90);
        break;

      case "all":
      default:
        startDate = null;
    }

    const dateFilter = startDate
      ? {
          createdAt: {
            $gte: startDate,
          },
        }
      : {};

    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const [
      pageViews,
      vehicleViews,
      uniqueVisitors,
      loggedInVisitors,
      anonymousVisitors,
      activeToday,
      topPages,
      pageAndVehicleViews,
      vehicleAnalytics,
      recentActivities,
    ] = await Promise.all([
      // Total Page Views
      Analytics.countDocuments({
        eventType: "page_view",
        ...dateFilter,
      }),

      // Total Vehicle Views
      Analytics.countDocuments({
        eventType: "vehicle_view",
        ...dateFilter,
      }),

      // Unique Visitors
      Analytics.distinct("sessionId", dateFilter),

      // Logged In Visitors
      Analytics.distinct("sessionId", {
        userId: {
          $exists: true,
          $ne: null,
        },
        ...dateFilter,
      }),

      // Anonymous Visitors
      Analytics.distinct("sessionId", {
        $or: [
          {
            userId: {
              $exists: false,
            },
          },
          {
            userId: null,
          },
        ],
        ...dateFilter,
      }),

      // Active Today
      Analytics.distinct("sessionId", {
        createdAt: {
          $gte: todayStart,
        },
      }),

      // Most Viewed Pages
      Analytics.aggregate([
        {
          $match: {
            eventType: "page_view",
            page: {
              $exists: true,
              $ne: null,
            },
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: "$page",
            views: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            views: -1,
          },
        },
        {
          $limit: 10,
        },
      ]),

      // Page + Vehicle Views Trend
      Analytics.aggregate([
        {
          $match: {
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
            },

            pageViews: {
              $sum: {
                $cond: [{ $eq: ["$eventType", "page_view"] }, 1, 0],
              },
            },

            vehicleViews: {
              $sum: {
                $cond: [{ $eq: ["$eventType", "vehicle_view"] }, 1, 0],
              },
            },

            sessions: {
              $addToSet: "$sessionId",
            },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id.date",
            pageViews: 1,
            vehicleViews: 1,
            totalViews: {
              $add: ["$pageViews", "$vehicleViews"],
            },
            uniqueVisitors: {
              $size: "$sessions",
            },
          },
        },
        {
          $sort: {
            date: 1,
          },
        },
      ]),

      // Vehicle Analytics
      Analytics.aggregate([
        {
          $match: {
            vehicleId: {
              $exists: true,
              $ne: null,
            },
            eventType: {
              $in: ["vehicle_view", "share"],
            },
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: "$vehicleId",

            views: {
              $sum: {
                $cond: [{ $eq: ["$eventType", "vehicle_view"] }, 1, 0],
              },
            },

            shares: {
              $sum: {
                $cond: [{ $eq: ["$eventType", "share"] }, 1, 0],
              },
            },
          },
        },
        {
          $lookup: {
            from: "vehicles",
            localField: "_id",
            foreignField: "vehicle_id",
            as: "vehicle",
          },
        },
        {
          $unwind: {
            path: "$vehicle",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,

            vehicleId: "$_id",

            vehicleModel: "$vehicle.vehicle_model",

            vehicleBrand: "$vehicle.vehicle_brand",

            views: 1,

            shares: 1,
          },
        },
        {
          $sort: {
            views: -1,
          },
        },
      ]),

      // Recent Activities
      Analytics.aggregate([
        {
          $match: dateFilter,
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $limit: 20,
        },

        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },

        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "vehicles",
            localField: "vehicleId",
            foreignField: "vehicle_id",
            as: "vehicle",
          },
        },

        {
          $unwind: {
            path: "$vehicle",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            _id: 0,

            event: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$eventType", "page_view"] },
                    then: "Page View",
                  },
                  {
                    case: { $eq: ["$eventType", "vehicle_view"] },
                    then: "Vehicle View",
                  },
                  {
                    case: { $eq: ["$eventType", "share"] },
                    then: "Share",
                  },
                ],
                default: "$eventType",
              },
            },

            pageOrVehicle: {
              $cond: [
                { $eq: ["$eventType", "page_view"] },
                "$page",
                {
                  $concat: [
                    { $ifNull: ["$vehicle.vehicle_brand", ""] },
                    " ",
                    { $ifNull: ["$vehicle.vehicle_model", ""] },
                  ],
                },
              ],
            },

            sessionId: 1,

            userName: {
              $ifNull: ["$user.name", "Anonymous"],
            },

            time: "$createdAt",
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,

      overview: {
        pageViews,
        vehicleViews,
        uniqueVisitors: uniqueVisitors.length,
        loggedInVisitors: loggedInVisitors.length,
        anonymousVisitors: anonymousVisitors.length,
        activeToday: activeToday.length,
      },

      charts: {
        topPages,
        pageAndVehicleViews,
      },

      vehicleAnalytics,
      recentActivities,
    });
  } catch (error) {
    console.error("Analytics Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics dashboard",
    });
  }
};

const analyticsController = {
  trackAnalytics,
  getAnalyticsDashboard,
  getAnalytics,
};

export default analyticsController;
