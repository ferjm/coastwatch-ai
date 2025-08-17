import { supabase } from '@/integrations/supabase/client';

export async function getGoogleMapsApiKey(): Promise<string> {
  try {
    console.log('🔄 Calling Supabase edge function: get-google-maps-key');
    const { data, error } = await supabase.functions.invoke('get-google-maps-key');
    
    console.log('📤 Supabase function response:', { data, error });
    
    if (error) {
      console.error('❌ Supabase function error:', error);
      throw new Error(`Supabase function error: ${error.message}`);
    }
    
    if (!data) {
      console.error('❌ No data returned from Supabase function');
      throw new Error('No data returned from Supabase function');
    }
    
    console.log('📋 Function response data:', data);
    const apiKey = data?.apiKey;
    
    if (!apiKey) {
      console.error('❌ No apiKey field in response data');
      throw new Error('No apiKey field in response data');
    }
    
    console.log('✅ API key extracted successfully, length:', apiKey.length);
    return apiKey;
  } catch (error: any) {
    console.error('💥 Complete error in getGoogleMapsApiKey:', error);
    throw error;
  }
}