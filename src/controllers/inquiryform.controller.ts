import { Request, Response } from "express";
import {
  createInquiry as createInquiryService,
  getInquiries as getInquiriesService,
  getInquiryByIdAndMarkReceived as getInquiryByIdService,
  updateInquiryStatus as updateInquiryStatusService,
  getInquiryStatusForUser as getInquiryStatusForUserService,
} from "../services/inquiry.services";

const createInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone || !message) {
      res.status(400).json({
        success: false,
        message: "Name, email, phone, and message are all required",
      });
      return;
    }

    const inquiry = await createInquiryService({ name, email, phone, message });

    res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: inquiry,
    });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit inquiry",
    });
  }
};

const getInquiries = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;
    const status = req.query.status as any;

    const result = await getInquiriesService({ page, limit, search, status });

    res.status(200).json({
      success: true,
      message: "Inquiries fetched successfully",
      data: result.inquiries,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inquiries",
    });
  }
};

// Admin opening a single inquiry — auto-marks Pending -> Received
const getInquiryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.query as { id: string };

    if (!id) {
      res.status(400).json({ success: false, message: "id is required" });
      return;
    }

    const inquiry = await getInquiryByIdService(id);

    if (!inquiry) {
      res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Inquiry fetched successfully",
      data: inquiry,
    });
  } catch (error) {
    console.error("Error fetching inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inquiry",
    });
  }
};

// Admin manually updates status (e.g. mark Contacted / Resolved)
const updateInquiryStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.query as { id: string };
    const { status } = req.body as { status: string };

    if (!status) {
      res.status(400).json({ success: false, message: "status is required" });
      return;
    }

    const inquiry = await updateInquiryStatusService(id, status);

    if (!inquiry) {
      res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      data: inquiry,
    });
  } catch (error: any) {
    if (error.message === "Invalid status value") {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    console.error("Error updating inquiry status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update inquiry status",
    });
  }
};

// Public — user checks their own inquiry status
const checkInquiryStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { inquiryId, email } = req.query as {
      inquiryId: string;
      email: string;
    };

    if (!inquiryId || !email) {
      res.status(400).json({
        success: false,
        message: "inquiryId and email are required",
      });
      return;
    }

    const result = await getInquiryStatusForUserService(inquiryId, email);

    if (!result) {
      res.status(404).json({
        success: false,
        message: "No inquiry found for the given details",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Status fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error checking inquiry status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check inquiry status",
    });
  }
};

const inquiryController = {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
  checkInquiryStatus,
};

export default inquiryController;
