#!/bin/bash
# BlockTeX — Script de inicialização local
# Inicia o backend (Node.js) e o frontend (Vite) em paralelo

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║        BlockTeX IDE — Iniciando        ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node > /dev/null 2>&1; then
  echo "❌ Node.js não encontrado. Instale em: https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node --version)"

# Check LaTeX
if command -v pdflatex > /dev/null 2>&1; then
  echo "✅ pdflatex disponível"
elif command -v lualatex > /dev/null 2>&1; then
  echo "✅ lualatex disponível"
else
  echo "⚠️  LaTeX não encontrado. Instale com: sudo apt install texlive-full"
  echo "   A compilação de PDF não estará disponível."
fi
echo ""

# Install deps if needed
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo "📦 Instalando dependências do backend..."
  cd "$BACKEND_DIR" && npm install
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "📦 Instalando dependências do frontend..."
  cd "$FRONTEND_DIR" && npm install
fi

echo ""
echo "🚀 Iniciando servidores..."
echo ""

# Start backend
cd "$BACKEND_DIR"
node server.js &
BACKEND_PID=$!
echo "🔧 Backend: http://localhost:3001 (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 1

# Start frontend
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo "🎨 Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  BlockTeX IDE pronto!"
echo "  Acesse: http://localhost:5173"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Pressione Ctrl+C para encerrar ambos os servidores"
echo ""

# Wait for both processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'BlockTeX encerrado.'; exit 0" INT TERM

wait $BACKEND_PID $FRONTEND_PID
