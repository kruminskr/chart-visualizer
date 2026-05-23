import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const ext = file.name.split('.').pop();
  const storagePath = `${user.id}/${Date.now()}_${file.name}`;
  const buffer = await file.arrayBuffer();

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
