import { supabase } from '@/integrations/supabase/client';

export async function getGoogleMapsApiKey(): Promise<string> {
  try {
    console.log('Attempting to fetch Google Maps API key...');
    const { data, error } = await supabase.functions.invoke('get-google-maps-key');
    
    if (error) {
      console.error('Error fetching Google Maps API key:', error);
      return '';
    }
    
    console.log('Google Maps API key response:', data);
    return data?.apiKey || '';
  } catch (error) {
    console.error('Error calling Google Maps key function:', error);
    return '';
  }
}