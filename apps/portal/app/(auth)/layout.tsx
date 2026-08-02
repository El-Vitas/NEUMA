// dependency-cruiser: skip-file — Next.js layout, used by framework routing
const AuthLayout = ({ children }: { readonly children: React.ReactNode }) => {
  return <main className="min-h-screen bg-surface">{children}</main>;
};

export default AuthLayout;
