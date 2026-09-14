const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Home Appliances', nameAr: 'أدوات منزلية', slug: 'home-appliances' },
    { name: 'Electronics', nameAr: 'إلكترونيات', slug: 'electronics' },
    { name: 'Fashion', nameAr: 'أزياء وملابس', slug: 'fashion' }
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, nameAr: cat.nameAr },
      create: {
        name: cat.name,
        nameAr: cat.nameAr,
        slug: cat.slug
      }
    });
  }
  console.log('Categories created successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
