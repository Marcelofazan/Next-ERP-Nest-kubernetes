## 🌐 Next-Nest-ERP-kubernetes
Exemplo de projeto ERP em Next 16 e API Nest com autenticação Jwt e banco de dados SQLite e Postgres. 

#### 💬 Requisitos do Projeto
- Necessário **Docker** instalado.
- Necessário configurar arquivo **.env**

Modifique alterando **DB_TYPE** para trocar de banco de dados em **.env** .
```bash
DB_TYPE=postgres  
```
- **SQLite** é o motor padrão quando **DB_TYPE** não está definido.  
- **PostgreSQL** é ativado com **DB_TYPE=postgres** e as variáveis de conexão correspondentes.


#### 🔄 Executar a aplicação Docker
VSCode Terminal [1]
- Criar Container
```bash
docker-compose up --build
```
VSCode Terminal [2]
- Criar Seed
```bash
docker compose exec backend node dist/src/database/seed-admin.js
```
- Ira aparecer a seguinte mensagem de criação 
```text
✓ Roles criados: admin, employee
✓ Admin criado: admin@erp.local / Admin12345!
  ⚠  Altere a senha no primeiro login.
```

VSCode Terminal [2]
- Fechar Container
```bash
docker compose down 
```

#### 🔄 Executar a aplicação Kubernetes
- Passo 1 - Necessário Gerar as imagens **Backend/Frontend** do contanier Docker primeiro e deixa-lás **STOP**
```bash
docker compose down 
```

- Passo 2 - Fazer download do **kind** e renomear o executável para **kind** e colocar na pasta "C:\Windows\System32"

```text
curl.exe -Lo kind-windows-amd64.exe https://kind.sigs.k8s.io/dl/v0.32.0/kind-windows-amd64
```
- Passo 3 - Criar Cluster na interface Docker Kubernets e esperar processa-la a criação.  
- Passo 4 - Executar Secrets no Kubernetes, por padrão são gravados não-encriptados no sistema de armazenamento, para serem utilizados pelo servidor da API

```bash
kubectl create secret generic erp-db-secret --from-literal=host=localhost --from-literal=username=erp_user --from-literal=password=erp_pass --from-literal=database=erp_db
kubectl create secret generic erp-jwt-secret --from-literal=secret=uma_chave_super_secreta_e_longa_com_mais_de_32_caracteres_123!
```

- Passo 5 - Executar bloco da criação de Seed **Postgres** no editor PowerShell ISE 
```bash
# 1. Reinicia o backend para restabelecer a conexão limpa com o novo banco
kubectl rollout restart deployment erp-backend

# 2. Aguarde os pods do backend estabilizarem
kubectl wait --for=condition=ready pod -l app=erp-backend --timeout=60s

# 3. Captura o nome de um dos pods do backend ativos
$POD_NAME = (kubectl get pods -l app=erp-backend -o jsonpath='{.items[0].metadata.name}')

# 4. Dispara o seed de criação do administrador
kubectl exec -it $POD_NAME -- node dist/src/database/seed-admin.js
```
- Ira aparecer a seguinte mensagem de criação 
```text
✓ Roles criados: admin, employee
✓ Admin criado: admin@erp.local / Admin12345!
  ⚠  Altere a senha no primeiro login.
```

- Passo 6 - Rodar script Kubernetes, aguarde atualizar o painel Kubernetes no Docker
```bash
cd k8s
kubectl apply -f deployment.yaml
```

- Passo 7 - Verifique se todos os Pods estão no status 'Running'
```bash
kubectl get pods
```

- Passo 8 - Encaminhamento de portas **Port Forwarding** para Backend e Frontend 
```bash
kubectl port-forward svc/erp-backend-service 3002:3002
kubectl port-forward svc/erp-frontend-service 3000:80
```

#### 🔄 Executar a aplicação Desenvolvimento Local
#### 📁 Backend

VSCode Terminal [1]
```bash
cd backend
npm install 
npm run start
```

#### 📁 Frontend 
VSCode Terminal [2]
```bash
cd frontend
npm install 
npm run dev
```

- Verificar Health API **http://localhost:3002/api/health**
- Iniciar a aplicação em **http://localhost:3000/**

#### 🧪 Testes Unitários
```bash
cd backend
npm test           # testes unitários
npm run test:e2e   # e2e com SQLite em memória
```

#### 🔍 Docker no Postgres
```bash
docker exec -it erp-sistema-db-1 psql -U erp_user -d erp_db
\dt
SELECT * FROM users;
```

#### Perfis de Acesso (Roles)
Os perfis de acesso são armazenados na tabela `roles`. Os nomes de perfis que o sistema reconhece são:

| Nome | Acesso |
|------|--------|
| **admin** | Leitura e escrita em todos os módulos |
| **employee** | Leitura em todos os módulos; criar e atualizar pedidos |
| (sem perfil) | Apenas leitura |

Para criar o perfil `admin` inicial, insira diretamente no banco de dados:
```bash
INSERT INTO roles (name) VALUES ('admin'), ('employee');
```
