import { signInWithGoogle } from '../lib/auth';

export default function LoginPage() {
  return (
    <main className="center">
      <h1>Patent Office Update Checker</h1>
      <button onClick={() => void signInWithGoogle()}>Sign in with Google</button>
    </main>
  );
}
