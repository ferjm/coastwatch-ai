import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Edge function called: get-google-maps-key');
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    
    console.log('API key exists:', !!googleMapsApiKey);
    
    if (!googleMapsApiKey) {
      console.error('Google Maps API key not found in environment variables');
      throw new Error('Google Maps API key not configured')
    }

    console.log('Returning API key successfully');
    return new Response(
      JSON.stringify({ apiKey: googleMapsApiKey }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})