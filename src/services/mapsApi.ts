import { supabase } from '@/integrations/supabase/client';

export async function getGoogleMapsApiKey(): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('get-google-maps-key');
    
    if (error) {
      console.error('Error fetching Google Maps API key:', error);
      return '';
    }
    
    return data?.apiKey || '';
  } catch (error) {
    console.error('Error calling Google Maps key function:', error);
    return '';
  }
}