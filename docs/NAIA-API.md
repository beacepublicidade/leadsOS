# NAIA API - Documentação

API para integração do sistema de agentes IA NAIA com o LeadsOS.

## Autenticação

Todas as requisições (exceto `/api/naia/status`) requerem o header:

```
Authorization: Bearer <NAIA_API_KEY>
```

A chave pode ser configurada via variável de ambiente `NAIA_API_KEY` ou registrada no Firestore na collection `naia_api_keys`.

## Rate Limits

- 60 requisições por minuto por API key
- Se excedido, retorna `401` (key tratada como inválida)

## Endpoints

### GET /api/naia/status
Health check do sistema. Sem autenticação.

**Response:**
```json
{
  "status": "online",
  "modules": ["crm", "agencia", "juridico", "financeiro"],
  "version": "2.0.0",
  "timestamp": "2026-10-01T12:00:00.000Z"
}
```

### GET /api/naia/leads
Lista leads com filtros.

**Query params:**
- `status` (opcional): novo, contato, proposta, fechado, perdido
- `limit` (opcional, default 50): quantidade de resultados
- `offset` (opcional, default 0): paginação

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "5511999999999",
      "status": "novo",
      "score": 85,
      "source": "meta_ads",
      "campaign_name": "Campanha Black Friday",
      "created_at": "2026-10-01T10:00:00.000Z"
    }
  ],
  "total": 150
}
```

### POST /api/naia/leads
Cria um novo lead.

**Body:**
```json
{
  "name": "Maria Santos",
  "email": "maria@email.com",
  "phone": "5511988887777",
  "source": "naia",
  "campaign_name": "Reativação Q4",
  "notes": "Lead qualificado pela NAIA"
}
```

### GET /api/naia/leads/:id
Retorna detalhes de um lead específico.

### PUT /api/naia/leads/:id
Atualiza status ou notas de um lead.

**Body:**
```json
{
  "status": "contato",
  "notes": "Primeira conversa realizada",
  "score": 90
}
```

### GET /api/naia/conversas
Lista conversas ativas (últimas 50).

### POST /api/naia/conversas
Inicia nova conversa com um lead.

**Body:**
```json
{
  "lead_id": "abc123",
  "phone": "5511999999999"
}
```

### POST /api/naia/mensagem
Envia mensagem via WhatsApp.

**Body:**
```json
{
  "phone": "5511999999999",
  "message": "Olá, tudo bem?",
  "lead_id": "abc123"
}
```

**Response:**
```json
{
  "success": true,
  "msg_id": "msg_xyz789"
}
```

### GET /api/naia/clientes-agencia
Lista clientes ativos da agência com projetos.

## Códigos de Erro

| Código | Significado |
|--------|------------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Parâmetros inválidos |
| 401 | API key inválida ou ausente / Rate limit excedido |
| 403 | Permissão negada para a operação |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |

## Permissões

Cada API key pode ter as seguintes permissões:
- `leads:read` - Ler leads
- `leads:write` - Criar/atualizar leads
- `conversations:read` - Ler conversas
- `conversations:write` - Criar conversas
- `messages:write` - Enviar mensagens
- `clients:read` - Ler clientes da agência

A key configurada via `NAIA_API_KEY` no .env tem todas as permissões habilitadas.
