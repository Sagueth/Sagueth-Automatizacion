# Usa la imagen oficial de Playwright con dependencias del sistema incluidas
FROM mcr.microsoft.com/playwright:v1.53.2-focal

# Crea el directorio de la app
WORKDIR /app

# Copia los archivos del proyecto
COPY . .

# Instala las dependencias
RUN npm install

# (Opcional) Si usas TypeScript y necesitas compilar
# RUN npx tsc

# Comando para correr la prueba automáticamente (puedes cambiarlo si quieres otra .spec.ts)
CMD ["npx", "playwright", "test", "tests/validar.spec.ts"]
