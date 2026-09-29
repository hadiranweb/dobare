// این فایل یک‌بار هنگام بالا آمدن سرور نود اجرا می‌شود (next start / next dev)
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { releaseExpiredReservations } = await import("@/lib/reservation");
  const sweep = () => releaseExpiredReservations().catch(error => console.error("Reservation sweep failed:", error));
  sweep(); // یک بار هنگام استارت
  setInterval(sweep, 5 * 60 * 1000); // و بعد هر ۵ دقیقه
}
