export const FILE_TYPES = ".jpg,.jpeg,.png,.webp,.pdf";
export const UPLOAD_LIMITS = "up to 3 files, 5 MB each";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export function validateUploads(files: File[], required = false): string {
  if (required && files.length === 0) return "Choose at least one proof file.";
  if (files.length > 3) return "Upload up to 3 files at a time.";
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) return `${file.name}: choose a JPG, PNG, WEBP or PDF file.`;
    if (file.size === 0) return `${file.name}: this file is empty. Choose another file.`;
    if (file.size > 5 * 1024 * 1024) return `${file.name}: each file must be 5 MB or less.`;
  }
  return "";
}
