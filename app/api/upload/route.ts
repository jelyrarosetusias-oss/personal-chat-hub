import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const isVideo = file.type.startsWith('video/')
    const supabase = getSupabaseAdmin()

    // 1. Try uploading to Supabase Storage bucket 'chat-media'
    if (supabase) {
      try {
        const bucketName = 'chat-media'
        // Ensure bucket exists
        const { data: buckets } = await supabase.storage.listBuckets()
        if (!buckets?.some((b) => b.name === bucketName)) {
          await supabase.storage.createBucket(bucketName, { public: true })
        }

        const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')
        const fileName = `${session.userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(bucketName)
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: true
          })

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName)

          if (publicUrlData?.publicUrl) {
            return NextResponse.json({
              success: true,
              url: publicUrlData.publicUrl,
              type: isVideo ? 'video' : 'image'
            })
          }
        } else if (uploadErr) {
          console.warn('Supabase storage upload error:', uploadErr.message)
        }
      } catch (storageErr) {
        console.warn('Supabase storage bucket error:', storageErr)
      }
    }

    // 2. Fallback: Base64 data URL for smaller files (< 4MB)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    if (buffer.length > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File is too large (>4.5MB). Please enable Supabase Storage or choose a shorter clip.' },
        { status: 413 }
      )
    }

    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`
    return NextResponse.json({
      success: true,
      url: base64,
      type: isVideo ? 'video' : 'image'
    })
  } catch (err: any) {
    console.error('Media upload error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
