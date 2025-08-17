import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Areas() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Gestión de Áreas</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Áreas de Estudio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Gestión de áreas próximamente...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}