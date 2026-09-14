// API Penyelarasan Konfigurasi Live Cloudflare KV untuk Residensi Serunai
const DEFAULT_CONFIG = {
  agentName: 'Zaim Rosli',
  agentAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80',
  videoUrl: 'https://pub-b41a57c40e74430eb994919066288290.r2.dev/serunai/video-live.mp4',
  password: 'admin123',
  aiProvider: 'gemini',
  comments: []
};

export async function onRequestGet(context) {
  try {
    const kv = context.env.CONFIG_KV;
    if (!kv) {
      return new Response(JSON.stringify(DEFAULT_CONFIG), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const saved = await kv.get('serunai_live_config', 'json');
    const merged = Object.assign({}, DEFAULT_CONFIG, saved || {});
    
    // Jangan hantar kata laluan sebenar ke pelawat awam
    const safeData = Object.assign({}, merged);
    delete safeData.password;
    safeData.hasCustomPassword = Boolean(merged.password && merged.password !== 'admin123');

    return new Response(JSON.stringify(safeData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify(DEFAULT_CONFIG), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost(context) {
  try {
    const kv = context.env.CONFIG_KV;
    if (!kv) {
      return new Response(JSON.stringify({ success: false, error: 'CONFIG_KV binding missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await context.request.json();
    const action = body.action || 'sync';
    const saved = (await kv.get('serunai_live_config', 'json')) || Object.assign({}, DEFAULT_CONFIG);

    // Pengesahan kata laluan untuk tindakan pentadbir
    const currentPassword = saved.password || DEFAULT_CONFIG.password;
    if (action === 'verify_password') {
      const isValid = (body.password === currentPassword);
      return new Response(JSON.stringify({ success: isValid }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Semak authorization jika diberikan
    if (body.authPassword && body.authPassword !== currentPassword) {
      return new Response(JSON.stringify({ success: false, error: 'Kata laluan tidak sah' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Kemaskini konfigurasi
    if (body.agentName !== undefined) saved.agentName = body.agentName;
    if (body.agentAvatar !== undefined) saved.agentAvatar = body.agentAvatar;
    if (body.videoUrl !== undefined) saved.videoUrl = body.videoUrl;
    if (body.newPassword !== undefined) saved.password = body.newPassword;
    if (body.aiProvider !== undefined) saved.aiProvider = body.aiProvider;
    if (body.comments !== undefined) saved.comments = body.comments;
    if (body.resetPassword) saved.password = DEFAULT_CONFIG.password;

    saved.updatedAt = new Date().toISOString();

    await kv.put('serunai_live_config', JSON.stringify(saved));

    return new Response(JSON.stringify({
      success: true,
      message: 'Konfigurasi berjaya diselaraskan ke Cloudflare KV',
      updatedAt: saved.updatedAt
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
