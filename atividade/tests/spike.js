import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * SPIKE TEST (Teste de Pico)
 * 
 * Objetivo: Verificar comportamento sob aumento súbito de tráfego
 * Endpoint: POST /checkout/simple (I/O Bound)
 * 
 * Cenário: Black Friday, campanha viral, ataque DDoS
 * 
 * Configuração:
 * - Baseline: 10 usuários por 1 minuto
 * - SPIKE: Salta para 200 usuários instantaneamente
 * - Duração do spike: 30 segundos
 * - Recuperação: Volta para 10 usuários
 * - Observação pós-spike: 2 minutos
 * 
 * Métricas-chave:
 * - Sistema se recupera após o pico?
 * - Taxa de erro durante e após o spike
 * - Tempo de resposta durante o pico vs. baseline
 */

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Baseline: tráfego normal
    { duration: '10s', target: 200 }, // SPIKE: salta para 200 VUs em 10s
    { duration: '30s', target: 200 }, // Mantém o pico por 30s
    { duration: '10s', target: 10 },  // Queda rápida
    { duration: '2m', target: 10 },   // Observa recuperação
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // Durante spike, toleramos até 1s
    http_req_failed: ['rate<0.15'],     // Toleramos até 15% de erro no spike
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    userId: `spike_user_${__VU}`,
    cartId: `cart_${Math.floor(Math.random() * 10000)}`,
    items: [
      { id: 1, name: 'Item Promocional', price: 29.99 },
    ],
    total: 29.99,
    campaignId: 'BLACK_FRIDAY_2025',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/checkout/simple`, payload, params);

  check(res, {
    'status é 201': (r) => r.status === 201,
    'tempo de resposta < 3s': (r) => r.timings.duration < 3000,
    'resposta válida': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  sleep(Math.random() * 2); // Think time variável (0-2s)
}

/**
 * Análise dos Resultados:
 * 
 * Cenário Ideal:
 * - Baseline p95: ~200-300ms
 * - Durante spike p95: ~500-800ms (degradação aceitável)
 * - Pós-spike p95: volta para ~200-300ms (recuperação)
 * - Error rate < 5% mesmo no pico
 * 
 * Cenário Problemático:
 * - Durante spike p95: > 2s (degradação severa)
 * - Error rate > 15%
 * - Pós-spike: sistema não volta ao baseline (memory leak, connections abertas)
 * 
 * Melhorias Sugeridas:
 * - Rate limiting/throttling
 * - Queue de requisições
 * - Auto-scaling horizontal
 * - Circuit breaker para dependências
 */
