import { isAdmin } from "@/lib/admin-auth";
import { saveUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024; // ۸ مگابایت

export async function POST(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "فایلی ارسال نشده." }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return Response.json({ error: "فقط عکس‌های JPG، PNG یا WebP قبول می‌شن." }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "حجم عکس باید کمتر از ۸ مگابایت باشه." }, { status: 400 });
    const saved = await saveUpload(file);
    return Response.json(saved);
  } catch (error) {
    console.error("Upload failed:", error);
    return Response.json({ error: "پردازش عکس ممکن نشد. لطفاً فایل دیگری امتحان کن." }, { status: 500 });
  }
}
