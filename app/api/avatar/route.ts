export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { createAvatar } from '@dicebear/core'
import { openPeeps } from '@dicebear/collection'
import { NextRequest, NextResponse } from 'next/server'

const SKINS   = ['variant01','variant02','variant03','variant04','variant05','variant06']
const HEADS_M = ['short1','flatTop','afro','mohawk','long','bun','noHair1']
const HEADS_F = ['longCurly','medium1','afro','bangs','long','bun','noHair1']
const FACES   = ['smile','calm','cheeky','lovingGrin1','awe','smileLOL','blank']
const CLOTHING= ['blue01','pastelBlue','pastelPink','pastelGreen','pastelOrange','pastelYellow']

function norm(v: string, valid: string[]): string {
  return valid.includes(v) ? v : valid[0]
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const sex       = p.get('sex') === 'F' ? 'F' : 'M'
  const skinTone  = Math.min(5, Math.max(0, parseInt(p.get('skin') || '1')))
  const hairStyle = Math.min(6, Math.max(0, parseInt(p.get('hair') || '0')))
  const outfitColor = Math.min(5, Math.max(0, parseInt(p.get('color') || '0')))
  const accessory = parseInt(p.get('acc') || '0')

  // @ts-ignore
  const schema = (openPeeps as any).schema?.properties || {}
  const validHeads   = schema.head?.items?.enum || ['short1']
  const validFaces   = schema.face?.items?.enum || ['smile']
  const validSkins   = ['variant01','variant02','variant03','variant04','variant05','variant06']
  const validCloth   = schema.clothingColor?.items?.enum || ['blue01']
  const validAcc     = schema.accessories?.items?.enum || []

  const heads = sex === 'F' ? HEADS_F : HEADS_M

  const accList = accessory === 1 ? [norm('sunglasses', validAcc)]
    : accessory === 2 ? [norm('glasses', validAcc)]
    : accessory === 5 ? [norm('eyepatch', validAcc)]
    : []

  const svg = createAvatar(openPeeps, {
    seed: `${sex}${skinTone}${hairStyle}${outfitColor}`,
    size: 200,
    skinColor: [norm(SKINS[skinTone], validSkins)] as any,
    head: [norm(heads[hairStyle], validHeads)] as any,
    face: [norm(FACES[hairStyle % FACES.length], validFaces)] as any,
    clothingColor: [norm(CLOTHING[outfitColor], validCloth)] as any,
    accessories: accList as any,
    facialHair: [] as any,
  }).toString()

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    }
  })
}
