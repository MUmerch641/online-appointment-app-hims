import Constants from "expo-constants";

const CLOUDINARY_URL = Constants.expoConfig?.extra?.CLOUDINARY_URL;
const CLOUDINARY_PRESET = Constants.expoConfig?.extra?.CLOUDINARY_PRESET;
const CLOUDINARY_API_KEY = Constants.expoConfig?.extra?.CLOUDINARY_API_KEY;

export const uploadImageToCloudinary = async (imageUri: string) => {
  const data = new FormData();
  data.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "profile.jpg",
  } as any);
  data.append("upload_preset", CLOUDINARY_PRESET);
  data.append("api_key", CLOUDINARY_API_KEY);

  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: data,
    });
    const result = await response.json();
    return result.secure_url; 
  } catch (error) {
    console.error("❌ Cloudinary Upload Failed:", error);
    return null;
  }
};
