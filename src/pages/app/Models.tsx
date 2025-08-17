import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Models() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Modelos de IA</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Modelos de Detección</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Gestión de modelos próximamente...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}