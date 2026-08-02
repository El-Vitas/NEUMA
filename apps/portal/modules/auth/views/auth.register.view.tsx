import { AuthViewLayout } from '@/shared/components/auth/auth.view.layout';
import { RegisterForm } from '../components/auth.register.form';

const RegisterView = () => {
  return (
    <AuthViewLayout
      description="Registrate para comenzar a seguir tus reparaciones en tiempo real."
      title="Crear account"
    >
      <RegisterForm />
    </AuthViewLayout>
  );
};

export { RegisterView };
