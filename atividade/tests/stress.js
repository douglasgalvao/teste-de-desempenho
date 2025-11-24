import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * STRESS TEST (Teste de Estresse)
 * 
 * Objetivo: Encontrar o ponto de ruptura do sistema
 * Endpoint: POST /checkout/crypto (CPU Bound)
 * 
 * Configuração:
 * - Rampa agressiva: 0 → 100 usuários em 2 minutos
 * - Platô: 100 usuários por 3 minutos
 * - Rampa extrema: 100 → 200 usuários em 2 minutos
 * - Descida: 200 → 0 usuários em 1 minuto
 * 
 * Métricas-chave:
 * - Identificar quando p95 > 2s (degradação)
 * - Identificar quando error rate > 10% (ruptura)
 * - Observar uso de CPU do servidor
 */

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Rampa inicial: 0 → 100 VUs
    { duration: '3m', target: 100 },  // Mantém 100 VUs (observar estabilidade)
    { duration: '2m', target: 200 },  // Empurra para 200 VUs (buscar ruptura)
    { duration: '1m', target: 0 },    // Descida rápida
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // Alerta se p95 > 2s
    http_req_failed: ['rate<0.10'],     // Alerta se erro > 10%
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    userId: `secure_user_${__VU}`,
    cardNumber: '****-****-****-1234',
    cvv: '123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/checkout/crypto`, payload, params);

  check(res, {
    'status é 201 ou 500': (r) => r.status === 201 || r.status === 500,
    'resposta não está vazia': (r) => r.body.length > 0,
  });

  sleep(0.5); // Think time reduzido para aumentar pressão
}

/**
 * Interpretação dos Resultados:
 * 
 * - Se p95 < 2s e error rate < 5% em 200 VUs: Sistema aguenta bem
 * - Se p95 > 2s mas error rate < 10%: Sistema degrada mas não quebra
 * - Se error rate > 10%: Ponto de ruptura encontrado
 * 
 * Ações Recomendadas:
 * - Aumentar workers/threads
 * - Implementar rate limiting
 * - Considerar processamento assíncrono para operações pesadas
 */
