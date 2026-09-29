import { db } from "@/db";
import { appSettings, products } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

const sampleProducts = [
  { title: "صندلی چوبی راحتی", description: "یه گوشه‌ی دنج برای کتاب خوندن و چای خوردن. سالم و دوست‌داشتنی، با کلی خاطره‌ی خوب.", price: 2450000, category: "خانه و دکور", condition: "خیلی تمیز", imageUrl: "https://images.pexels.com/photos/34992391/pexels-photo-34992391.jpeg?auto=compress&cs=tinysrgb&w=900" },
  { title: "دوربین فیلمی کداک", description: "برای ثبت لحظه‌هایی که دوست داری یه جور دیگه موندگار بشن. بدنه سالم و مرتب.", price: 1800000, category: "وسایل شخصی", condition: "سالم و تمیز", imageUrl: "https://images.pexels.com/photos/1203819/pexels-photo-1203819.jpeg?auto=compress&cs=tinysrgb&w=900" },
  { title: "چراغ رومیزی چوبی", description: "نور گرم و ملایم برای میز کار یا کنار تخت. یه همراه خوب برای شب‌های آروم.", price: 890000, category: "خانه و دکور", condition: "در حد نو", imageUrl: "https://images.pexels.com/photos/38986380/pexels-photo-38986380.jpeg?auto=compress&cs=tinysrgb&w=900" },
  { title: "دوچرخه شهری", description: "برای رکاب زدن‌های عصرونه و کشف کوچه‌های شهر. آماده‌ی یه صاحب تازه‌ست.", price: 4200000, category: "سرگرمی", condition: "سالم و قابل استفاده", imageUrl: "https://images.pexels.com/photos/19664325/pexels-photo-19664325.jpeg?auto=compress&cs=tinysrgb&w=900" },
  { title: "چند جلد کتاب دوست‌داشتنی", description: "کتاب‌هایی که خونده شدن و حالا منتظرن داستانشون رو با یکی دیگه شریک بشن.", price: 350000, category: "کتاب و فرهنگ", condition: "تمیز و مرتب", imageUrl: "https://images.pexels.com/photos/39340297/pexels-photo-39340297.jpeg?auto=compress&cs=tinysrgb&w=900" },
  { title: "ست قهوه‌ساز دستی", description: "برای صبح‌هایی که عطر قهوه خونه رو پر می‌کنه. ساده، کاربردی و خوش‌حال‌کننده.", price: 750000, category: "خانه و دکور", condition: "خیلی تمیز", imageUrl: "https://images.pexels.com/photos/21404851/pexels-photo-21404851.jpeg?auto=compress&cs=tinysrgb&w=900" },
];

export async function getProducts() {
  await db.insert(appSettings).values({ key: "seeded", value: "yes" }).onConflictDoNothing();
  const marker = await db.select().from(appSettings).where(eq(appSettings.key, "seeded"));
  if (marker.length && marker[0].value === "yes") {
    // Only one request wins the initialization update; subsequent visits never reseed.
    const initialized = await db.update(appSettings).set({ value: "done" }).where(and(eq(appSettings.key, "seeded"), eq(appSettings.value, "yes"))).returning();
    if (initialized.length) await db.insert(products).values(sampleProducts);
  }
  return db.select().from(products).orderBy(asc(products.id));
}
