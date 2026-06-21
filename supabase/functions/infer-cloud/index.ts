import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { normalizeRoboflowResponse, type RoboflowResponse } from './normalize.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROBOFLOW_HOST = 'https://serverless.roboflow.com'
const MODEL = 'coastal-plastic-5m/6'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
      })
    }

    const apiKey = Deno.env.get('ROBOFLOW_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ROBOFLOW_API_KEY not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      })
    }

    const body = await req.json()
    const image: string | undefined = body?.image
    if (!image || typeof image !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing "image" (base64 string) in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }
    const confidence = typeof body?.confidence === 'number' ? body.confidence : 0.4
    const overlap = typeof body?.overlap === 'number' ? body.overlap : 0.5

    const url = `${ROBOFLOW_HOST}/${MODEL}?api_key=${apiKey}&confidence=${confidence}&overlap=${overlap}`
    const rfResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: image,
    })

    if (!rfResp.ok) {
      const text = await rfResp.text()
      return new Response(JSON.stringify({ error: `Roboflow error ${rfResp.status}: ${text}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502,
      })
    }

    const rfJson = await rfResp.json() as RoboflowResponse
    const detections = normalizeRoboflowResponse(rfJson)

    return new Response(JSON.stringify({
      detections,
      image: rfJson.image,
      count: detections.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
