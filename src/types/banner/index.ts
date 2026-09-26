export interface CreateBannerDTO {
  title: string;
  subtitle: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateBannerDTO {
  title?: string;
  subtitle?: string;
  order?: number;
  isActive?: boolean;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}
