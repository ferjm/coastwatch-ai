import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Jobs() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Cola de Trabajos</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Jobs de Inferencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cola de trabajos próximamente...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}