import { NextRequest, NextResponse } from "next/server";

const APP_ID     = process.env.NEXT_PUBLIC_FB_APP_ID  ?? "1010904391689357";
const APP_SECRET = process.env.FB_APP_SECRET           ?? "";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    if (!APP_SECRET) return NextResponse.json({ error: "FB_APP_SECRET no configurado" }, { status: 500 });

    const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${token}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });

    return NextResponse.json({
      access_token: data.access_token,
      expires_in:   data.expires_in, // segundos (~5184000 = 60 días)
    });
  } catch {
    return NextResponse.json({ error: "Error al renovar token" }, { status: 500 });
  }
}
