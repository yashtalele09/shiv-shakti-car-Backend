import crypto from "crypto";
import { getRedisClient } from "../config/redis";
import { sendOtpEmail } from "../utils/sendEmail";

const OTP_TTL_SECONDS = 5 * 60; // OTP valid for 5 minutes
const OTP_COOLDOWN_SECONDS = 60; // must wait 60s before resending
const VERIFIED_TTL_SECONDS = 15 * 60; // window to submit inquiry after verifying

const otpKey = (email: string) => `inquiry:otp:${email.toLowerCase()}`;
const cooldownKey = (email: string) =>
  `inquiry:otp:cooldown:${email.toLowerCase()}`;
const verifiedKey = (email: string) =>
  `inquiry:otp:verified:${email.toLowerCase()}`;

const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const requestInquiryOtp = async (email: string): Promise<void> => {
  const redis = getRedisClient();

  const onCooldown = await redis.get(cooldownKey(email));
  if (onCooldown) {
    throw new Error("Please wait before requesting another OTP");
  }

  const otp = generateOtp();

  await redis.set(otpKey(email), otp, { EX: OTP_TTL_SECONDS });
  await redis.set(cooldownKey(email), "1", { EX: OTP_COOLDOWN_SECONDS });

  await sendOtpEmail(email, otp);
};

export const verifyInquiryOtp = async (
  email: string,
  otp: string
): Promise<boolean> => {
  const redis = getRedisClient();

  const storedOtp = await redis.get(otpKey(email));

  if (!storedOtp || storedOtp !== otp) {
    return false;
  }

  await redis.del(otpKey(email));
  await redis.set(verifiedKey(email), "1", { EX: VERIFIED_TTL_SECONDS });

  return true;
};

export const isEmailVerifiedForInquiry = async (
  email: string
): Promise<boolean> => {
  const redis = getRedisClient();
  const verified = await redis.get(verifiedKey(email));
  return !!verified;
};

export const clearInquiryVerification = async (
  email: string
): Promise<void> => {
  const redis = getRedisClient();
  await redis.del(verifiedKey(email));
};
