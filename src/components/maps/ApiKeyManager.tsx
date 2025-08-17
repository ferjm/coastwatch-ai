import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ApiKeyManagerProps {
  currentKeyLength?: number;
  source?: 'local' | 'supabase' | 'none';
  onSave: (key: string) => void;
  onClear: () => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ currentKeyLength, source = 'none', onSave, onClear }) => {
  const [value, setValue] = useState('');

  const handleSave = () => {
    if (!value.trim()) return;
    onSave(value.trim());
    setValue('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Configuración de API Key (local)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3 items-end">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="gmaps-key">Google Maps API key</Label>
            <Input
              id="gmaps-key"
              type="password"
              placeholder="AIza..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <div className="text-xs text-muted-foreground">
              Estado actual: {currentKeyLength ? `Presente (${currentKeyLength} caracteres)` : 'No disponible'}
              {source !== 'none' && currentKeyLength ? ` · Origen: ${source === 'local' ? 'Local' : 'Supabase'}` : ''}
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="w-full" onClick={handleSave}>Guardar</Button>
            <Button variant="outline" className="w-full" onClick={onClear}>Borrar</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeyManager;
