// API Pengurusan Video Cloudflare R2 untuk Residensi Serunai Live
const R2_VIDEO_KEY = 'serunai/video-live.mp4';
const R2_PUBLIC_BASE = 'https://pub-b41a57c40e74430eb994919066288290.r2.dev';

export async function onRequestGet(context) {
  try {
    const bucket = context.env.MEDIA_R2;
    if (!bucket) {
      return new Response(JSON.stringify({ exists: false, error: 'R2 binding not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const obj = await bucket.head(R2_VIDEO_KEY);
    if (!obj) {
      return new Response(JSON.stringify({ exists: false, url: null }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      exists: true,
      url: `${R2_PUBLIC_BASE}/${R2_VIDEO_KEY}`,
      size: obj.size,
      uploaded: obj.uploaded
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ exists: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPut(context) {
  try {
    const bucket = context.env.MEDIA_R2;
    const kv = context.env.CONFIG_KV;

    if (!bucket) {
      return new Response(JSON.stringify({ success: false, error: 'R2 binding missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentType = context.request.headers.get('content-type') || 'video/mp4';
    const body = context.request.body;

    // Simpan terus ke Cloudflare R2
    await bucket.put(R2_VIDEO_KEY, body, {
      httpMetadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000'
      }
    });

    const publicUrl = `${R2_PUBLIC_BASE}/${R2_VIDEO_KEY}?t=${Date.now()}`;

    // Kemaskini pautan video dalam Cloudflare KV jika ada
    if (kv) {
      try {
        const config = (await kv.get('serunai_live_config', 'json')) || {};
        config.videoUrl = publicUrl;
        config.videoUpdatedAt = new Date().toISOString();
        await kv.put('serunai_live_config', JSON.stringify(config));
      } catch (e) {
        console.error('KV update error:', e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      url: publicUrl,
      message: 'Video berjaya dimuat naik ke Cloudflare R2'
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
    const kv = context.env.CONFIG_KV;

    if (!bucket) {
      return new Response(JSON.stringify({ success: false, error: 'R2 binding missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Padam fail dari Cloudflare R2 secara kekal
    await bucket.delete(R2_VIDEO_KEY);

    // Kemaskini rekod dalam Cloudflare KV untuk kosongkan videoUrl kustom
    if (kv) {
      try {
        const config = (await kv.get('serunai_live_config', 'json')) || {};
        delete config.videoUrl;
        config.videoUpdatedAt = new Date().toISOString();
        await kv.put('serunai_live_config', JSON.stringify(config));
      } catch (e) {
        console.error('KV delete update error:', e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Video berjaya dipadam sepenuhnya daripada Cloudflare R2'
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
