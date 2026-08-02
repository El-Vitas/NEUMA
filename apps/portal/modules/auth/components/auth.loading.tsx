export const AuthLoading = () => {
  return (
    <section className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </div>
    </section>
  );
};
