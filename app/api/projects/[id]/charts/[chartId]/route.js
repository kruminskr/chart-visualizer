import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId, chartId } = await params;

  const chart = await prisma.chart.findFirst({
    where: {
      id: chartId,
      projectId,
      project: {
        OR: [
          { ownerId: user.id },
          { collaborators: { some: { userId: user.id } } },
        ],
      },
    },
  });
  if (!chart) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.chart.update({
    where: { id: chartId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.unit !== undefined && { unit: body.unit }),
      ...(body.widthMm !== undefined && { widthMm: body.widthMm }),
      ...(body.heightMm !== undefined && { heightMm: body.heightMm }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.dataJson !== undefined && { dataJson: body.dataJson }),
      ...(body.configJson !== undefined && { configJson: body.configJson }),
    },
  });

  return NextResponse.json(updated);
}
