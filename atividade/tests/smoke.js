import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * SMOKE TEST
 * 
 * Objetivo: Verificar se a API está funcionando com carga mínima
 * Critério de Sucesso: 100% das requisições com status 200
 * 
 * Configuração:
 * - 1 usuário virtual
 * - Duração: 30 segundos
 * - Sem rampa (load constante)
 */

export const options = {
  vus: 1, // 1 usuário virtual
  duration: '30s', // Duração de 30 segundos
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requisições devem responder em menos de 500ms
    http_req_failed: ['rate<0.01'],   // Taxa de erro menor que 1%
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // Testa o endpoint de health check
  const healthRes = http.get(`${BASE_URL}/health`);
  
  check(healthRes, {
    'health check status é 200': (r) => r.status === 200,
    'health check retorna status UP': (r) => JSON.parse(r.body).status === 'UP',
  });

  sleep(1); // Pausa de 1 segundo entre requisições
}
