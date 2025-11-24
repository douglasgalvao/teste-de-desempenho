# Relatório de Teste de Desempenho

**Disciplina:** Teste de Software  
**Aluno:** Douglas Machado  
**Matrícula:** 678080  
**Professor:** Cleiton  
**Instituição:** PUC Minas  
**Data:** 24 de Novembro de 2025

---

## 1. Sistema Sob Teste

**API:** Ecommerce Checkout (Node.js + Express)

**Endpoints:**
- `GET /health` - Health check
- `POST /checkout/simple` - Checkout I/O Bound
- `POST /checkout/crypto` - Checkout CPU Bound

**Ferramenta:** k6 (Grafana Labs)

---

## 2. Tipos de Teste Executados

### 2.1 Smoke Test
- **Objetivo:** Verificar disponibilidade básica
- **Configuração:** 1 VU por 30 segundos
- **Threshold:** p95 < 500ms, erro < 1%
- **Resultado:** ✅ **Passou** - Sistema operacional

### 2.2 Load Test
- **Objetivo:** Simular carga de produção
- **Configuração:** Rampa 0→50 VUs (5 minutos)
- **Threshold:** p95 < 500ms, p99 < 1s, erro < 5%
- **Resultado:** ✅ **Passou** - Performance aceitável até 50 VUs

### 2.3 Stress Test
- **Objetivo:** Identificar ponto de ruptura
- **Configuração:** Rampa 0→100→200 VUs (8 minutos)
- **Threshold:** p95 < 2s, erro < 10%
- **Resultado:** ❌ **Ruptura em ~180 VUs** - Degradação severa

### 2.4 Spike Test
- **Objetivo:** Testar recuperação após pico
- **Configuração:** Baseline 10 VUs → Spike 200 VUs → Retorno 10 VUs
- **Threshold:** p95 < 1s durante spike, erro < 15%
- **Resultado:** ⚠️ **Sistema não recuperou completamente**

---

## 3. Resultados Consolidados

| Teste | VUs | p95 | p99 | Erro | Status |
|-------|-----|-----|-----|------|--------|
| Smoke | 1 | 52ms | 56ms | 0% | ✅ Passou |
| Load | 50 | 445ms | 580ms | 1.5% | ✅ Passou |
| Stress | 200 | 3.2s | 5.5s | 11.8% | ❌ Ruptura |
| Spike | 200 | 1.2s | N/A | 12% | ⚠️ Degradado |

---

## 4. Gargalos Identificados

### 4.1 CPU Single-Threaded
**Problema:** Operações de hash (bcrypt) bloqueiam Event Loop do Node.js  
**Impacto:** Sistema colapsa acima de 180 VUs em operações CPU-bound  
**Solução:** Worker Threads ou Cluster Mode (PM2)

### 4.2 Ausência de Rate Limiting
**Problema:** Sistema aceita todas requisições até ruptura  
**Impacto:** Vulnerável a DDoS, experiência ruim para todos usuários  
**Solução:** Limitar requisições/segundo por IP

### 4.3 Vazamento de Recursos
**Problema:** Sistema não recupera baseline após spike (450ms vs 220ms)  
**Impacto:** Degradação permanente pós-pico  
**Solução:** Connection timeout agressivo, queue management

---

## 5. Recomendações

### Prioridade Alta
1. **Rate Limiting:** 100 req/min por IP
2. **Timeouts:** 5 segundos para requisições
3. **Worker Threads:** Offload operações pesadas

### Prioridade Média
4. **Horizontal Scaling:** PM2 cluster mode
5. **Monitoring:** Prometheus + Grafana
6. **Circuit Breaker:** Fail fast sob carga

---

## 6. Conclusão

A API funciona adequadamente até **50 usuários simultâneos**, mas apresenta **limitações críticas**:

- ✅ **Pontos Fortes:** Latência excelente em baixa carga (52ms)
- ❌ **Pontos Fracos:** Ruptura em ~180 VUs, não recupera após spikes
- 🎯 **Ação Imediata:** Implementar rate limiting e worker threads

**Capacidade Atual:** ~150 VUs com degradação aceitável  
**Recomendação:** Não colocar em produção sem as melhorias propostas

---

## 7. Evidências (Comandos Executados)

```bash
# 1. Smoke Test
k6 run tests/smoke.js

# 2. Load Test
k6 run tests/load.js

# 3. Stress Test
k6 run tests/stress.js

# 4. Spike Test
k6 run tests/spike.js
```

**Arquivos de Teste:** `atividade/tests/` (smoke.js, load.js, stress.js, spike.js)

---

## 8. Aprendizados

1. **Testes de desempenho revelam problemas invisíveis** em testes funcionais
2. **Node.js single-threaded exige estratégias especiais** para CPU-bound ops
3. **Métricas (p95, p99) são mais importantes** que simples "passou/falhou"
4. **Proteções (rate limiting, timeouts) são essenciais** para produção

---

**Assinatura Digital:** Douglas Machado - 678080  
**Repositório:** [teste-de-desempenho/atividade](./)