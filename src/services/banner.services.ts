import { Banner, ISlide } from "../models/banner";

const createBannerDoc = async (slides: ISlide[]) => {
  const existing = await Banner.findOne();
  if (existing) {
    throw new Error("Banner document already exists. Use update instead.");
  }
  return await Banner.create({ slides });
};

const getBannerDoc = async () => {
  let banner = await Banner.findOne();
  if (!banner) {
    banner = await Banner.create({ slides: [] });
  }
  return banner;
};

const updateSlide = async (index: number, slideData: Partial<ISlide>) => {
  const banner = await getBannerDoc();

  if (index < 0 || index >= banner.slides.length) {
    // creating a new slide at the next open slot
    banner.slides.push(slideData as ISlide);
  } else {
    banner.slides[index] = { ...banner.slides[index], ...slideData };
  }

  await banner.save();
  return banner;
};

const deleteSlide = async (index: number) => {
  const banner = await getBannerDoc();
  if (index < 0 || index >= banner.slides.length) return banner;

  banner.slides.splice(index, 1);
  await banner.save();
  return banner;
};

const bannerService = {
  createBannerDoc,
  getBannerDoc,
  updateSlide,
  deleteSlide,
};

export default bannerService;
