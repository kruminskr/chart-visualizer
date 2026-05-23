import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: user.id },
        { collaborators: { some: { userId: user.id } } },
      ],
    },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const chart = await prisma.chart.create({
    data: {
      projectId,
      type: body.type ?? 'bar',
      title: body.title ?? '',
      unit: body.unit ?? '',
      widthMm: body.widthMm ?? 165,
      heightMm: body.heightMm ?? 90,
      dataJson: body.dataJson ?? [],
      configJson: body.configJson ?? {},
    },
  });

  return NextResponse.json(chart, { status: 201 });
}
