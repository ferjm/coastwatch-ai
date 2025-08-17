import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Uploads() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Subir Imágenes</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Área de Carga</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
            <p className="text-muted-foreground">Funcionalidad de carga de imágenes próximamente...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}