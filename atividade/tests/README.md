# Guia de Execução dos Testes de Desempenho

## ✅ Pré-requisitos

1. **Node.js** instalado
2. **k6** instalado - [Instruções de instalação](https://k6.io/docs/getting-started/installation/)
3. Servidor rodando: `npm start` (na pasta `atividade/`)

## 🚀 Como Executar os Testes

### 1. Smoke Test (Teste de Fumaça)
**Objetivo:** Verificar se a API está funcionando
```bash
k6 run tests/smoke.js
```

**Esperado:**
- ✅ 100% das requisições com status 200
- ✅ p95 < 500ms
- ✅ 0% de erro

---

### 2. Load Test (Teste de Carga)
**Objetivo:** Simular tráfego esperado em produção
```bash
k6 run tests/load.js
```

**Esperado:**
- ✅ p95 < 500ms
- ✅ p99 < 1000ms
- ✅ Taxa de erro < 5%
- ✅ Throughput > 10 req/s

---

### 3. Stress Test (Teste de Estresse)
**Objetivo:** Encontrar o ponto de ruptura
```bash
k6 run tests/stress.js
```

**Observar:**
- 🔍 Em qual carga (VUs) o p95 > 2s?
- 🔍 Em qual carga a taxa de erro > 10%?
- 🔍 Comportamento da CPU do servidor

---

### 4. Spike Test (Teste de Pico)
**Objetivo:** Verificar recuperação após pico de tráfego
```bash
k6 run tests/spike.js
```

**Observar:**
- 🔍 Sistema degrada durante o spike?
- 🔍 Sistema se recupera após o spike?
- 🔍 Taxa de erro durante vs. após o pico

---

## 📊 Interpretando os Resultados

### Métricas Importantes

| Métrica | Descrição | Valor Ideal |
|---------|-----------|-------------|
| **http_req_duration (p95)** | 95% das requisições | < 500ms |
| **http_req_duration (p99)** | 99% das requisições | < 1000ms |
| **http_req_failed** | Taxa de erro | < 5% |
| **http_reqs** | Throughput | > 10 req/s |
| **vus** | Usuários virtuais simultâneos | Varia por teste |

### Código de Cores k6

- 🟢 **Verde**: Threshold passou
- 🔴 **Vermelho**: Threshold falhou
- ⚪ **Branco**: Métrica informativa (sem threshold)

---

## 🔧 Troubleshooting

### Erro: "Connection refused"
➡️ Certifique-se de que o servidor está rodando: `npm start`

### Erro: "k6: command not found"
➡️ Instale o k6: https://k6.io/docs/getting-started/installation/

### Servidor trava durante Stress Test
➡️ Isso é esperado! O objetivo é encontrar o limite. Reinicie o servidor e documente o ponto de ruptura.

---

## 📝 Documentando os Resultados

Para cada teste, anote:

1. **Configuração**: Número de VUs, duração, rampas
2. **Métricas observadas**: p95, p99, error rate, throughput
3. **Comportamento do servidor**: CPU, memória (use `htop` ou Task Manager)
4. **Conclusão**: Sistema passou? Qual foi o gargalo?

---

## 🎯 Próximos Passos

Após rodar todos os testes, compile os resultados em um relatório contendo:

- Tabela comparativa de métricas
- Gráficos (se possível, tire prints da saída do k6)
- Análise de gargalos identificados
- Recomendações de melhoria (ex: cache, rate limiting, scaling)
