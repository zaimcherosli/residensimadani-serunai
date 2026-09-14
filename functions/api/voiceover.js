// API Pengurusan Voiceover Audio Cloudflare R2 untuk Residensi Serunai Live
const R2_VOICEOVER_KEY = 'serunai/voiceover.mp3';
const R2_PUBLIC_BASE = 'https://pub-b41a57c40e74430eb994919066288290.r2.dev';

export async function onRequestGet(context) {
  try {
    const bucket = context.env.MEDIA_R2;
    if (!bucket) {
      return new Response(JSON.stringify({ exists: false, error: 'R2 binding missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const obj = await bucket.head(R2_VOICEOVER_KEY);
    if (!obj) {
      return new Response(JSON.stringify({ exists: false, url: null }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      exists: true,
      url: `${R2_PUBLIC_BASE}/${R2_VOICEOVER_KEY}`,
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

    const contentType = context.request.headers.get('content-type') || 'audio/mpeg';
    const body = context.request.body;

    // Simpan audio ke Cloudflare R2
    await bucket.put(R2_VOICEOVER_KEY, body, {
      httpMetadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000'
      }
    });

    const publicUrl = `${R2_PUBLIC_BASE}/${R2_VOICEOVER_KEY}?t=${Date.now()}`;

    // Kemaskini dalam Cloudflare KV jika ada
    if (kv) {
      try {
        const config = (await kv.get('serunai_live_config', 'json')) || {};
        config.voiceoverUrl = publicUrl;
        config.voiceoverUpdatedAt = new Date().toISOString();
        await kv.put('serunai_live_config', JSON.stringify(config));
      } catch (e) {
        console.error('KV voiceover update error:', e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      url: publicUrl,
      message: 'Voiceover audio berjaya dimuat naik ke Cloudflare R2'
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

    // Padam fail audio daripada Cloudflare R2 secara kekal
    await bucket.delete(R2_VOICEOVER_KEY);

    // Kosongkan rekod dalam Cloudflare KV
    if (kv) {
      try {
        const config = (await kv.get('serunai_live_config', 'json')) || {};
        delete config.voiceoverUrl;
        config.voiceoverUpdatedAt = new Date().toISOString();
        await kv.put('serunai_live_config', JSON.stringify(config));
      } catch (e) {
        console.error('KV voiceover delete error:', e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Voiceover berjaya dipadam sepenuhnya daripada Cloudflare R2'
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
