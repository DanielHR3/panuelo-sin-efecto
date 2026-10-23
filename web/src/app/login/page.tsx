import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-fondo">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
