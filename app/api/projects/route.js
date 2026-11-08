import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { charts: true } } },
  });

  return NextResponse.json(projects);
}

export async function POST(request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title = 'Untitled Project' } = await request.json().catch(() => ({}));

  // Ensure User row exists (handles accounts created before sync was wired up)
  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email },
    create: { id: user.id, email: user.email },
  });

  const project = await prisma.project.create({
    data: { title, ownerId: user.id },
  });

  return NextResponse.json(project, { status: 201 });
}
