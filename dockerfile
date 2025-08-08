# Usa la versión más reciente disponible compatible
FROM mcr.microsoft.com/playwright:v1.53.1-jammy

# Crea el directorio de trabajo
WORKDIR /app

# Copia los archivos necesarios
COPY . .

# Instala dependencias
RUN npm install

# Comando por defecto (puedes modificar según el spec a ejecutar)
CMD ["npx", "playwright", "test", "tests/validar.spec.ts", "--project=chromium"]
