import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")
  if (!query) return NextResponse.json({ id: "" })

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return NextResponse.json({ id: "" })

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${apiKey}&videoCategoryId=10`
    const res = await fetch(url)
    const data = await res.json()
    const id = data.items?.[0]?.id?.videoId || ""
    return NextResponse.json({ id })
  } catch {
    return NextResponse.json({ id: "" })
  }
}
