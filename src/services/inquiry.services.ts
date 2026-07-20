import Inquiry, { IInquiry, InquiryStatus } from "../models/inquiry";

interface CreateInquiryInput {
  name: string;
  email: string;
  phone: string;
  message: string;
}

interface GetInquiriesOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: InquiryStatus;
}

interface GetInquiriesResult {
  inquiries: IInquiry[];
  total: number;
  page: number;
  totalPages: number;
}

const VALID_STATUSES: InquiryStatus[] = [
  "Pending",
  "Received",
  "Contacted",
  "Resolved",
];

export const createInquiry = async (
  data: CreateInquiryInput
): Promise<IInquiry> => {
  const inquiry = await Inquiry.create(data);
  return inquiry;
};

export const getInquiries = async (
  options: GetInquiriesOptions = {}
): Promise<GetInquiriesResult> => {
  const { page = 1, limit = 10, search, status } = options;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Inquiry.countDocuments(filter),
  ]);

  return {
    inquiries,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// Used by admin detail view — auto-bumps Pending -> Received on first open
export const getInquiryByIdAndMarkReceived = async (
  inquiryId: string
): Promise<IInquiry | null> => {
  const inquiry = await Inquiry.findOne({ inquiryId });

  if (!inquiry) return null;

  if (inquiry.status === "Pending") {
    inquiry.status = "Received";
    await inquiry.save();
  }

  return inquiry;
};

export const updateInquiryStatus = async (
  inquiryId: string,
  status: string
): Promise<IInquiry | null> => {
  if (!VALID_STATUSES.includes(status as InquiryStatus)) {
    throw new Error("Invalid status value");
  }

  const inquiry = await Inquiry.findOneAndUpdate(
    { inquiryId },
    { status },
    { new: true }
  );

  return inquiry;
};

// Used by the user-facing "check my inquiry status" lookup
export const getInquiryStatusForUser = async (
  inquiryId: string,
  email: string
): Promise<{ status: InquiryStatus } | null> => {
  const inquiry = await Inquiry.findOne({
    inquiryId,
    email: email.toLowerCase().trim(),
  }).select("status");

  if (!inquiry) return null;

  return { status: inquiry.status };
};
