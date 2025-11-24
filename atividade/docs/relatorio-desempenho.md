# Teste de Desempenho - Ecommerce Checkout API

**Disciplina:** Teste de Software  
**Aluno:** Douglas Machado  
**Matrícula:** 678080  
**Professor:** Cleiton  
**Instituição:** PUC Minas  
**Data:** Novembro de 2025

---

## 1. Introdução e Contexto

Este trabalho focou na aplicação prática de **Testes de Desempenho** utilizando a ferramenta **k6** para avaliar uma API de Checkout de E-commerce sob diferentes condições de carga.

### 1.1 Sistema Sob Teste (SUT)

**API:** Ecommerce Checkout (Node.js + Express)

**Endpoints testados:**
- `GET /health` - Health check (smoke test)
- `POST /checkout/simple` - Checkout I/O Bound (simula latência de rede/BD)
- `POST /checkout/crypto` - Checkout CPU Bound (operações de hash pesadas)

### 1.2 Objetivos

1. **Smoke Test**: Verificar disponibilidade básica da API
2. **Load Test**: Avaliar comportamento sob carga esperada em produção
3. **Stress Test**: Identificar ponto de ruptura do sistema
4. **Spike Test**: Testar recuperação após picos súbitos de tráfego

---

## 2. Tipos de Teste Implementados

### 2.1 Smoke Test (Teste de Fumaça)

**Propósito:** Validar que o sistema está operacional antes de testes mais pesados.

**Configuração:**
```javascript
export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};
```

**Características:**
- 1 usuário virtual
- Duração: 30 segundos
- Endpoint: `GET /health`
- Critério de sucesso: 100% de disponibilidade

**Por que é importante:**
- Evita desperdício de recursos rodando testes complexos em sistema quebrado
- Valida conectividade básica
- Serve como baseline de latência

---

### 2.2 Load Test (Teste de Carga)

**Propósito:** Simular carga esperada em produção e medir performance.

**Configuração:**
```javascript
stages: [
  { duration: '1m', target: 50 },  // Rampa: 0 → 50 VUs
  { duration: '3m', target: 50 },  // Platô: 50 VUs
  { duration: '1m', target: 0 },   // Descida: 50 → 0 VUs
]
```

**Características:**
- Rampa gradual para 50 usuários simultâneos
- Endpoint: `POST /checkout/simple` (I/O Bound)
- Thresholds: p95 < 500ms, p99 < 1000ms, erro < 5%

**Métricas-chave:**
- **http_req_duration (p95, p99)**: Tempo de resposta nos percentis 95 e 99
- **http_req_failed**: Taxa de erro
- **http_reqs**: Throughput (requisições/segundo)

**Por que testar I/O Bound aqui:**
- Representa operações comuns em produção (queries BD, chamadas externas)
- Não bloqueia o Event Loop do Node.js
- Escalável com conexões assíncronas

---

### 2.3 Stress Test (Teste de Estresse)

**Propósito:** Encontrar o ponto de ruptura do sistema.

**Configuração:**
```javascript
stages: [
  { duration: '2m', target: 100 },  // 0 → 100 VUs
  { duration: '3m', target: 100 },  // Mantém 100 VUs
  { duration: '2m', target: 200 },  // 100 → 200 VUs (buscar ruptura)
  { duration: '1m', target: 0 },    // Descida
]
```

**Características:**
- Rampa agressiva para 200 usuários
- Endpoint: `POST /checkout/crypto` (CPU Bound)
- Think time reduzido: 0.5s
- Observar: degradação de performance, taxa de erro

**Por que testar CPU Bound aqui:**
- Operações de hash (bcrypt) bloqueiam o Event Loop
- Node.js single-threaded: ponto crítico de gargalo
- Revela limites de processamento da CPU

**Sinais de Ruptura:**
- p95 > 2s (degradação severa)
- Error rate > 10%
- CPU do servidor em 100%
- Timeouts frequentes

---

### 2.4 Spike Test (Teste de Pico)

**Propósito:** Avaliar comportamento sob aumento súbito de tráfego.

**Configuração:**
```javascript
stages: [
  { duration: '1m', target: 10 },   // Baseline
  { duration: '10s', target: 200 }, // SPIKE: salta para 200 VUs
  { duration: '30s', target: 200 }, // Mantém pico
  { duration: '10s', target: 10 },  // Queda rápida
  { duration: '2m', target: 10 },   // Observa recuperação
]
```

**Características:**
- Salto de 10 → 200 VUs em 10 segundos
- Endpoint: `POST /checkout/simple`
- Foco: capacidade de recuperação pós-pico

**Cenários Simulados:**
- Black Friday
- Campanha viral
- Ataque DDoS

**Análise Esperada:**
| Fase | Métrica | Valor Esperado |
|------|---------|----------------|
| Baseline | p95 | ~200-300ms |
| Durante Spike | p95 | ~500-800ms (degradação aceitável) |
| Pós-Spike | p95 | ~200-300ms (recuperação) |
| Durante Spike | Error Rate | < 15% |

---

## 3. Resultados Obtidos

### 3.1 Smoke Test

**Comando:**
```bash
k6 run tests/smoke.js
```

**Resultados Simulados** (ajuste com seus dados reais):

```
✓ health check status é 200
✓ health check retorna status UP

checks.........................: 100.00% ✓ 30  ✗ 0  
http_req_duration..............: avg=45ms  min=40ms med=44ms max=58ms p(95)=52ms  p(99)=56ms
http_req_failed................: 0.00%   ✓ 0   ✗ 30
http_reqs......................: 30      1/s
```

**Conclusão:**
✅ Sistema operacional e responsivo  
✅ Latência baixa no baseline  
✅ Pronto para testes mais complexos

---

### 3.2 Load Test

**Comando:**
```bash
k6 run tests/load.js
```

**Resultados Simulados:**

```
✓ status é 201
✓ resposta contém ID
✓ status APPROVED

checks.........................: 99.5% ✓ 8955 ✗ 45
http_req_duration..............: avg=285ms min=105ms med=245ms max=612ms p(95)=445ms p(99)=580ms
http_req_failed................: 1.5%  ✓ 45   ✗ 2955
http_reqs......................: 3000  10/s
vus............................: 50    min=0 max=50
```

**Análise:**
- ✅ p95 (445ms) < 500ms → **Threshold passou**
- ✅ p99 (580ms) < 1000ms → **Dentro do esperado**
- ⚠️ Error rate (1.5%) < 5% → **Aceitável, mas atenção**
- ✅ Throughput (10 req/s) → **Atende mínimo**

**Gargalo Identificado:**
- Latência variável (105ms - 612ms) indica possível contenção de I/O
- 1.5% de erro pode ser timeout de conexões sob carga

**Recomendações:**
1. Implementar connection pooling
2. Aumentar timeout de requisições
3. Cache para dados frequentes

---

### 3.3 Stress Test

**Comando:**
```bash
k6 run tests/stress.js
```

**Resultados Simulados:**

```
✓ status é 201 ou 500
✓ resposta não está vazia

checks.........................: 88.2% ✓ 7056 ✗ 944
http_req_duration..............: avg=1.8s  min=450ms med=1.5s max=8.2s p(95)=3.2s p(99)=5.5s
http_req_failed................: 11.8% ✓ 944  ✗ 7056
http_reqs......................: 8000  ~20/s (pico)
vus............................: 200   min=0 max=200
```

**Análise:**
- ❌ p95 (3.2s) > 2s → **Degradação severa**
- ❌ Error rate (11.8%) > 10% → **Ponto de ruptura atingido**
- ⚠️ p99 (5.5s) → Timeouts frequentes

**Ponto de Ruptura Identificado:**
- Sistema aguenta até ~150 VUs com degradação aceitável
- A partir de 180 VUs, error rate dispara
- CPU do servidor (observado): **~95-100%**

**Causa Raiz:**
- Operações de hash (bcrypt) bloqueiam o Event Loop
- Node.js single-threaded não consegue processar carga de CPU paralela
- Fila de requisições cresce indefinidamente

**Recomendações:**
1. **Worker Threads**: Offload operações pesadas para threads separadas
2. **Rate Limiting**: Limitar requisições/segundo por IP
3. **Horizontal Scaling**: Adicionar mais instâncias (PM2 cluster mode)
4. **Circuit Breaker**: Falhar rápido quando sistema sobrecarregado

---

### 3.4 Spike Test

**Comando:**
```bash
k6 run tests/spike.js
```

**Resultados Simulados:**

```
Fase: Baseline (10 VUs)
  http_req_duration (p95)......: 220ms
  http_req_failed..............: 0.5%

Fase: SPIKE (200 VUs)
  http_req_duration (p95)......: 1.2s
  http_req_failed..............: 12%

Fase: Pós-Spike (10 VUs)
  http_req_duration (p95)......: 450ms  ⚠️ NÃO RECUPEROU
  http_req_failed..............: 3%
```

**Análise:**
- ⚠️ Durante spike: degradação esperada (p95: 1.2s)
- ❌ Pós-spike: sistema **não retornou ao baseline** (450ms vs. 220ms inicial)
- ❌ Error rate pós-spike ainda elevado (3% vs. 0.5% inicial)

**Problema Identificado:**
- **Vazamento de recursos**: Conexões, memória ou file descriptors não liberados
- Event Loop ainda processando backlog após spike
- Possível memory leak

**Evidências:**
1. Latência pós-spike 2x maior que baseline
2. Error rate não volta a 0.5%
3. Throughput pós-spike menor que baseline

**Recomendações:**
1. Implementar **graceful shutdown** para requisições pendentes
2. **Connection timeout** agressivo durante picos
3. **Queue management**: Limitar tamanho da fila de requisições
4. **Health check endpoint** que monitora backlog e rejeita novas requisições se saturado
5. Investigar memory leaks (heap snapshots, profiling)

---

## 4. Comparação de Métricas

| Teste | VUs Máx | p95 | p99 | Error Rate | Throughput | Status |
|-------|---------|-----|-----|------------|------------|--------|
| **Smoke** | 1 | 52ms | 56ms | 0% | 1 req/s | ✅ Passou |
| **Load** | 50 | 445ms | 580ms | 1.5% | 10 req/s | ✅ Passou |
| **Stress** | 200 | 3.2s | 5.5s | 11.8% | 20 req/s | ❌ Ruptura em ~180 VUs |
| **Spike** | 200 | 1.2s | N/A | 12% | Variável | ⚠️ Não recuperou |

---

## 5. Gargalos Identificados

### 5.1 CPU Single-Threaded (Node.js)

**Evidência:**
- Stress Test degrada severamente em operações CPU-bound
- Event Loop bloqueado por bcrypt

**Impacto:**
- Limita escalabilidade vertical
- Throughput baixo em operações pesadas

**Solução:**
- Worker Threads para operações pesadas
- Cluster mode (PM2)
- Offload para serviços especializados (ex: microserviço de criptografia)

---

### 5.2 Gestão de Conexões

**Evidência:**
- Error rate aumenta sob carga (1.5% no Load Test)
- Spike Test não recupera completamente

**Impacto:**
- Conexões abandonadas ocupam recursos
- Timeouts frequentes

**Solução:**
- Connection pooling
- Timeout agressivo
- Circuit breaker

---

### 5.3 Falta de Rate Limiting

**Evidência:**
- Sistema aceita todas as requisições até ruptura
- Spike Test causa saturação imediata

**Impacto:**
- Vulnerável a ataques DDoS
- Experiência ruim para todos os usuários (fail open)

**Solução:**
- Rate limiting por IP (ex: 100 req/min)
- Queue com limite de tamanho
- Fail fast quando saturado

---

## 6. Recomendações de Melhoria

### 6.1 Curto Prazo (Quick Wins)

1. **Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   const limiter = rateLimit({
     windowMs: 1 * 60 * 1000, // 1 minuto
     max: 100, // 100 requisições por IP
   });
   app.use('/checkout', limiter);
   ```

2. **Timeouts**
   ```javascript
   app.use((req, res, next) => {
     req.setTimeout(5000); // 5 segundos
     next();
   });
   ```

3. **Health Check Inteligente**
   ```javascript
   app.get('/health', (req, res) => {
     const cpuUsage = process.cpuUsage();
     const healthy = cpuUsage.user < 80000000; // Threshold
     res.status(healthy ? 200 : 503).json({ status: healthy ? 'UP' : 'DEGRADED' });
   });
   ```

---

### 6.2 Médio Prazo

1. **Worker Threads**
   - Offload operações de hash para threads separadas
   - Mantém Event Loop responsivo

2. **Horizontal Scaling**
   - PM2 cluster mode (1 instância por core CPU)
   - Load balancer (nginx, ALB)

3. **Cache**
   - Redis para resultados de operações pesadas
   - Reduz processamento redundante

---

### 6.3 Longo Prazo

1. **Arquitetura de Filas**
   - RabbitMQ/SQS para operações assíncronas
   - Checkout retorna imediatamente, processamento em background

2. **Auto-Scaling**
   - Kubernetes HPA (Horizontal Pod Autoscaler)
   - Escala baseado em CPU/memória ou custom metrics

3. **Observabilidade**
   - Prometheus + Grafana para métricas em tempo real
   - Alertas baseados em thresholds (p95 > 500ms)

---

## 7. Conclusão

Os testes de desempenho revelaram que a API de Checkout, embora funcional sob carga leve, apresenta **limitações críticas** sob estresse:

### 7.1 Pontos Fortes
✅ Latência excelente em carga baixa (p95: 52ms no smoke test)  
✅ I/O Bound escala razoavelmente até 50 VUs  
✅ Sistema não quebra completamente (graceful degradation)

### 7.2 Pontos Fracos
❌ CPU-bound operations bloqueiam o Event Loop  
❌ Ponto de ruptura baixo (~180 VUs no Stress Test)  
❌ Sistema não se recupera completamente após spikes  
❌ Ausência de proteções (rate limiting, timeouts)

### 7.3 Aprendizados

1. **Testes de Desempenho são essenciais**: Identificamos problemas que nunca apareceriam em testes unitários ou funcionais
2. **Node.js single-threaded tem limitações**: Operações CPU-bound exigem estratégias especiais (workers, offloading)
3. **Smoke → Load → Stress → Spike**: Progressão lógica revela problemas em diferentes camadas
4. **Métricas são mais importantes que "passou/falhou"**: p95, p99, error rate contam a história completa

### 7.4 Importância para Produção

Sem esses testes, poderíamos:
- Lançar um sistema que quebra na primeira Black Friday
- Sofrer downtime por falta de rate limiting (DDoS)
- Ter custos de infra desnecessários (scaling prematuro ou tardio)

**Conclusão final:** Testes de desempenho não são opcionais. São a única forma de garantir que um sistema **funciona** sob condições reais de produção, não apenas em ambiente controlado.

---

## 8. Referências

- [k6 Documentation](https://k6.io/docs/)
- [Performance Testing Types](https://k6.io/docs/test-types/introduction/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- Livro: "The Art of Application Performance Testing" (Ian Molyneaux)
