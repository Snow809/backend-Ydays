import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);

  const users = [
    // Super Admin — session volatile (mémoire seulement)
    { email: 'admin@demo.local',      role: UserRole.ADMIN,        hash: adminPassword },
    // Équipe RH
    { email: 'hr@demo.local',         role: UserRole.HR,           hash: userPassword },
    // Manager
    { email: 'manager@demo.local',    role: UserRole.MANAGER,      hash: userPassword },
    // Collaborateur / Employé
    { email: 'employe@demo.local',    role: UserRole.COLLABORATOR, hash: userPassword },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: u.hash,
        role: u.role,
        isActive: true,
      },
      create: {
        email: u.email,
        passwordHash: u.hash,
        role: u.role,
        isActive: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
