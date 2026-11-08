import { AuthForm } from "@/components/auth/auth-form";
import { AuthShowcase } from "@/components/auth/auth-showcase";
import { ParticlesBackground } from "@/components/effects/particles-background";

export default function SignupPage() {
  return (
    <main className="page-shell grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:py-16" style={{ "--stage": "var(--ocean)" } as React.CSSProperties}>
      <ParticlesBackground variant="auth" />
      <AuthShowcase />
      <div className="mx-auto w-full max-w-xl">
        <AuthForm mode="signup" />
      </div>
    </main>
  );
}
