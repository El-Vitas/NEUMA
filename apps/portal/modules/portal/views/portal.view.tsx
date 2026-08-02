import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { PageHeader } from '@/shared/components/ui/page-header';

interface IProps {
  readonly userName: string | null;
}

export const PortalView = ({ userName }: IProps) => {
  return (
    <div className="space-y-6 p-6">
      <PageHeader subtitle="Panel principal del portal" title="Inicio" />
      <Card>
        <CardHeader>
          <CardTitle>{userName ? `Bienvenido, ${userName}` : 'Bienvenido'}</CardTitle>
          <CardDescription>Este es el punto de partida de tu aplicación.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Agrega tus propios módulos en <code>modules/</code> y sus rutas en <code>app/(portal)/</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
