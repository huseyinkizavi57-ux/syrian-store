// Seed data for LOCAL DEVELOPMENT ONLY.
// All passwords below are dummy development-only credentials, clearly
// labeled — never use these in a real deployment, and never commit real
// credentials in their place.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding development data...");

  // ---- Admin users (development only) ----
  const ownerPassword = await bcrypt.hash("DevOwner123!", 12);
  const owner = await prisma.adminUser.upsert({
    where: { email: "owner@dev.local" },
    update: {},
    create: { fullName: "المالك (تطوير)", email: "owner@dev.local", passwordHash: ownerPassword, role: "OWNER" },
  });

  const adminPassword = await bcrypt.hash("DevAdmin123!", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@dev.local" },
    update: {},
    create: { fullName: "مدير (تطوير)", email: "admin@dev.local", passwordHash: adminPassword, role: "ADMIN" },
  });

  // ---- Test customer ----
  const customerPassword = await bcrypt.hash("DevUser123!", 12);
  await prisma.user.upsert({
    where: { phone: "0900000001" },
    update: {},
    create: {
      firstName: "زبون",
      lastName: "تجريبي",
      phone: "0900000001",
      email: "customer@dev.local",
      passwordHash: customerPassword,
      phoneVerified: true,
      cart: { create: {} },
    },
  });

  // ---- Categories ----
  const categoriesData = [
    { name: "Clothing", nameAr: "ألبسة", slug: "clothing" },
    { name: "Shoes", nameAr: "أحذية", slug: "shoes" },
    { name: "Electronics", nameAr: "إلكترونيات", slug: "electronics" },
    { name: "Home Goods", nameAr: "أدوات منزلية", slug: "home-goods" },
    { name: "Kitchenware", nameAr: "أدوات مطبخ", slug: "kitchenware" },
    { name: "Beauty & Care", nameAr: "تجميل وعناية", slug: "beauty-care" },
    { name: "Kids", nameAr: "أطفال", slug: "kids" },
    { name: "Accessories", nameAr: "إكسسوارات", slug: "accessories" },
  ];
  const categories: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    categories[c.slug] = cat.id;
  }

  // ---- Brands ----
  const brandsData = [
    { name: "Nike", slug: "nike" },
    { name: "Adidas", slug: "adidas" },
    { name: "Samsung", slug: "samsung" },
  ];
  const brands: Record<string, string> = {};
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({ where: { slug: b.slug }, update: {}, create: b });
    brands[b.slug] = brand.id;
  }

  // ---- Demo products with variants (stock lives on variants) ----
  const airMax = await prisma.product.upsert({
    where: { slug: "nike-air-max" },
    update: {},
    create: {
      name: "Nike Air Max",
      slug: "nike-air-max",
      description: "حذاء رياضي مريح وعصري",
      price: 1200000,
      oldPrice: 1500000,
      categoryId: categories["shoes"],
      brandId: brands["nike"],
      status: "ACTIVE",
      images: { create: [{ url: "https://placehold.co/600x600?text=Nike+Air+Max", sortOrder: 0 }] },
      variants: {
        create: [
          { sku: "NIKE-AIRMAX-BLK-40", color: "Black", size: "40", price: 1200000, stock: 5 },
          { sku: "NIKE-AIRMAX-BLK-41", color: "Black", size: "41", price: 1200000, stock: 4 },
          { sku: "NIKE-AIRMAX-WHT-42", color: "White", size: "42", price: 1200000, stock: 3 },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: { slug: "samsung-galaxy-a15" },
    update: {},
    create: {
      name: "Samsung Galaxy A15",
      slug: "samsung-galaxy-a15",
      description: "هاتف ذكي بمواصفات ممتازة وسعر مناسب",
      price: 3500000,
      categoryId: categories["electronics"],
      brandId: brands["samsung"],
      status: "ACTIVE",
      images: { create: [{ url: "https://placehold.co/600x600?text=Galaxy+A15", sortOrder: 0 }] },
      variants: {
        create: [
          { sku: "SAMSUNG-A15-BLK-128", color: "Black", size: "128GB", price: 3500000, stock: 10 },
          { sku: "SAMSUNG-A15-BLU-256", color: "Blue", size: "256GB", price: 3900000, stock: 6 },
        ],
      },
    },
  });

  // ---- Shipping rates ----
  const governorates = ["دمشق", "ريف دمشق", "حلب", "حمص", "اللاذقية", "طرطوس", "درعا"];
  for (const gov of governorates) {
    await prisma.shippingRate.upsert({
      where: { governorate: gov },
      update: {},
      create: { governorate: gov, fee: gov === "دمشق" ? 15000 : 30000 },
    });
  }

  // ---- Sample coupon ----
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "PERCENTAGE",
      percentageValue: 10,
      minOrderAmount: 100000,
      usageLimitPerUser: 1,
      isActive: true,
    },
  });

  console.log("Seed complete.");
  console.log("---");
  console.log("Dev admin logins (DEVELOPMENT ONLY, not real credentials):");
  console.log("  Owner: owner@dev.local / DevOwner123!");
  console.log("  Admin: admin@dev.local / DevAdmin123!");
  console.log("Dev customer login: phone 0900000001 / DevUser123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
