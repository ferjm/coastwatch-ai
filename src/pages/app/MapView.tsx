import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MapView() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Mapa de Detecciones</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Visualización Geoespacial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Integración de Google Maps próximamente...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}