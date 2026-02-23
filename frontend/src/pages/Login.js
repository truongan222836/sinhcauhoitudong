function Login() {
  return (
    <div>
      <h1>Trang Login</h1>
      <button onClick={() => window.location.href="/dashboard"}>
        Vào Dashboard
      </button>
    </div>
  );
}

export default Login;