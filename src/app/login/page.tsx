import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="login">
      <h1><span className="logo" aria-hidden>▲</span>StockPilot</h1>
      <p className="muted">Log in to record stock, production and money.</p>
      <LoginForm />
    </div>
  );
}
