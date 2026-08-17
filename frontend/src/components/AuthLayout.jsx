import AuthHero from "./AuthHero.jsx";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <AuthHero />
      <div className="auth-card-wrap">
        <div className="auth-card">
          <h2 className="auth-card__title">{title}</h2>
          <p className="auth-card__subtitle">{subtitle}</p>
          {children}
          {footer && <p className="auth-switch">{footer}</p>}
        </div>
      </div>
    </div>
  );
}
