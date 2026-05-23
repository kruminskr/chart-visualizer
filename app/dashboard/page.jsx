import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import Header from '@/components/Header';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
