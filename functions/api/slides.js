// API Pengurusan Slaid Gambar Cloudflare R2 untuk Residensi Serunai Live
const R2_PUBLIC_BASE = 'https://pub-b41a57c40e74430eb994919066288290.r2.dev';

export async function onRequestPost(context) {
  try {
    const bucket = context.env.MEDIA_R2;
    if (!bucket) {
      return new Response(JSON.stringify({ success: false, error: 'R2 binding missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentType = context.request.headers.get('content-type') || 'image/jpeg';
    const filename = `serunai/slides/slide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

    await bucket.put(filename, context.request.body, {
      httpMetadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000'
      }
    });

    const publicUrl = `${R2_PUBLIC_BASE}/${filename}`;

    return new Response(JSON.stringify({
      success: true,
      url: publicUrl,
      key: filename
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestDelete(context) {
  try {
    const bucket = context.env.MEDIA_R2;
    if (!bucket) {
      return new Response(JSON.stringify({ success: false, error: 'R2 binding missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(context.request.url);
    const key = url.searchParams.get('key');

    if (key && key.startsWith('serunai/slides/')) {
      await bucket.delete(key);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
