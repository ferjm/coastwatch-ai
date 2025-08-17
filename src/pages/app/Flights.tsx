import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Flights() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Gestión de Vuelos</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Vuelos de Dron</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Gestión de vuelos próximamente...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}