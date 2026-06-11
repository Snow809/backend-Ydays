import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'admin@demo.local', fullName: 'Admin Demo', role: UserRole.ADMIN, hash: adminPassword },
    { email: 'hr@demo.local', fullName: 'HR Demo', role: UserRole.HR, hash: userPassword },
    { email: 'manager@demo.local', fullName: 'Nora Manager', role: UserRole.MANAGER, hash: userPassword },
    { email: 'employee@demo.local', fullName: 'Marie Albert', role: UserRole.COLLABORATOR, hash: userPassword },
  ];

  const seededUsers: Record<string, { id: string }> = {};

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        passwordHash: u.hash,
        role: u.role,
        isActive: true,
      },
      create: {
        email: u.email,
        fullName: u.fullName,
        passwordHash: u.hash,
        role: u.role,
        isActive: true,
      },
    });
    seededUsers[u.email] = user;
  }

  const managerEmployee = await prisma.employee.upsert({
    where: { matricule: 'MGR-001' },
    update: {
      userId: seededUsers['manager@demo.local'].id,
      email: 'manager@demo.local',
      fullName: 'Nora Manager',
      position: 'Manager RH',
      department: 'Ressources Humaines',
      site: 'Paris',
    },
    create: {
      userId: seededUsers['manager@demo.local'].id,
      matricule: 'MGR-001',
      email: 'manager@demo.local',
      fullName: 'Nora Manager',
      position: 'Manager RH',
      department: 'Ressources Humaines',
      site: 'Paris',
      hiredAt: new Date('2024-01-15'),
    },
  });

  await prisma.employee.upsert({
    where: { matricule: 'EMP-001' },
    update: {
      userId: seededUsers['employee@demo.local'].id,
      managerId: managerEmployee.id,
      email: 'employee@demo.local',
      fullName: 'Marie Albert',
      position: 'Chargee RH',
      department: 'Ressources Humaines',
      site: 'Paris',
    },
    create: {
      userId: seededUsers['employee@demo.local'].id,
      managerId: managerEmployee.id,
      matricule: 'EMP-001',
      email: 'employee@demo.local',
      fullName: 'Marie Albert',
      position: 'Chargee RH',
      department: 'Ressources Humaines',
      site: 'Paris',
      hiredAt: new Date('2025-02-01'),
    },
  });
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
