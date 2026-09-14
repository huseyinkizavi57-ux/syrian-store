const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const hash = await bcrypt.hash('Admin@123', 10);
  await prisma.adminUser.upsert({
    where: { email: 'huseyinki234@gmail.com' },
    update: { role: 'OWNER', passwordHash: hash, fullName: 'Huseyin Admin' },
    create: {
      email: 'huseyinki234@gmail.com',
      fullName: 'Huseyin Admin',
      passwordHash: hash,
      role: 'OWNER',
      isActive: true
    }
  });
  console.log('Admin account created successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
