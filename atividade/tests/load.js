import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * LOAD TEST (Teste de Carga)
 * 
 * Objetivo: Simular tráfego esperado em produção
 * Endpoint: POST /checkout/simple (I/O Bound)
 * 
 * Configuração:
 * - Rampa: 0 → 50 usuários em 1 minuto
 * - Platô: 50 usuários por 3 minutos
 * - Descida: 50 → 0 usuários em 1 minuto
 * 
 * Métricas-chave:
 * - Tempo de resposta (p95, p99)
 * - Taxa de erro
 * - Throughput (requisições/segundo)
 */

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Rampa de subida: 0 → 50 VUs em 1min
    { duration: '3m', target: 50 },  // Mantém 50 VUs por 3min
    { duration: '1m', target: 0 },   // Rampa de descida: 50 → 0 VUs em 1min
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.05'],                 // Taxa de erro < 5%
    http_reqs: ['rate>10'],                         // Pelo menos 10 req/s
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    userId: `user_${__VU}`,
    cartId: `cart_${Math.floor(Math.random() * 1000)}`,
    items: [
      { id: 1, name: 'Produto A', price: 100 },
      { id: 2, name: 'Produto B', price: 50 },
    ],
    total: 150,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/checkout/simple`, payload, params);

  check(res, {
    'status é 201': (r) => r.status === 201,
    'resposta contém ID': (r) => JSON.parse(r.body).id !== undefined,
    'status APPROVED': (r) => JSON.parse(r.body).status === 'APPROVED',
  });

  sleep(1); // Think time: 1 segundo entre requisições
}
