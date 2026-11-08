import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getUser, isDevAuthBypass } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const storagePath = `${user.id}/${Date.now()}_${file.name}`;
  const buffer = await file.arrayBuffer();

  // Dev bypass: no Supabase Storage available — keep the file on local disk.
  if (isDevAuthBypass()) {
    const localPath = path.join(process.cwd(), '.dev-uploads', storagePath);
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(localPath, Buffer.from(buffer));
    return NextResponse.json({ path: storagePath });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from('chart-uploads')
    .upload(storagePath, buffer, {
      contentType: file.type || `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
      upsert: false,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path: data.path });
}
