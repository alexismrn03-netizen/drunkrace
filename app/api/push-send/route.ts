import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    'mailto:contact@drunkrace.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  try {
    const { groupId, title, body, url } = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all members of the group
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)

    if (!members?.length) return NextResponse.json({ ok: true, sent: 0 })

    const userIds = members.map(m => m.user_id)

    // Get their push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription, user_id')
      .in('user_id', userIds)

    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

    const payload = JSON.stringify({ title, body, url, tag: 'bedrunk' })

    // Send to all subscribers
    const results = await Promise.allSettled(
      subs.map(s => webpush.sendNotification(s.subscription as any, payload))
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    return NextResponse.json({ ok: true, sent })
  } catch (e) {
    console.error('Push send error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
