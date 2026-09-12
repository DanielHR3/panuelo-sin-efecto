// Carga las variables de .env antes de instanciar AppModule en los tests e2e
// (JWT_SECRET, DATABASE_URL, ...). Equivale al `import 'dotenv/config'` de main.ts.
import 'dotenv/config';

// Valor de respaldo por si el entorno de CI no monta un .env.
process.env.JWT_SECRET ??= 'test-secret-e2e';
