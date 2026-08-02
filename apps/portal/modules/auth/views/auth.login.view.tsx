import { AuthViewLayout } from '@/shared/components/auth/auth.view.layout';
import { LoginForm } from '../components/auth.login.form';

const LoginView = () => {
  return (
    <AuthViewLayout description="Accede a tu panel con tu correo y contraseña." title="Iniciar sesión">
      <LoginForm />
    </AuthViewLayout>
  );
};

export { LoginView };
