import { getUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Header from '@/components/Header';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const user = await getUser();

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header user={user} />
      <DashboardClient initialProjects={projects} />
    </div>
  );
}
