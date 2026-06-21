import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { drainQueue } from '@/services/inference/inferenceWorker';

// El navegador actúa como worker: drena la cola al montar, por realtime y por poll de respaldo.
export function useInferenceWorker() {
  const running = useRef(false);

  useEffect(() => {
    let active = true;

    const tick = async () => {
      if (running.current || !active) return;
      running.current = true;
      try {
        await drainQueue();
      } finally {
        running.current = false;
      }
    };

    tick();

    const channel = supabase
      .channel('inference-worker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'images' }, () => { tick(); })
      .subscribe();

    const interval = setInterval(tick, 15000);

    return () => {
      active = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);
}
