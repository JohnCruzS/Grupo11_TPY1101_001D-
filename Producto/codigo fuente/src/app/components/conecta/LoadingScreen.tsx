export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem',
            color: '#6b7280',
            marginTop: '16px',
          }}
        >
          Cargando...
        </p>
      </div>
    </div>
  );
}
