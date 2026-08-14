## 🌐 Next-Nest-ERP-kubernetes
Exemplo de projeto ERP com Arquitetura em Camadas em Next 16 e API Nest com autenticação Jwt e banco de dados SQLite e Postgres. 

#### 📋 O que voçê vai ver nesse Projeto
| Tecnologia | Descrição |
|-----------|-----------|
| **BCrypt**  |	Algoritmo de hashing criptográfico utilizado para armazenar senhas de forma segura. |
| **Core** | Atribuições, responsabilidades e capacidades técnicas que este módulo central possui dentro da arquitetura da aplicação. |
| **DI** |  Injeção de Depedência, técnica de programação onde um objeto recebe seus recursos necessários (dependências) de fora, em vez de criá-los por conta própria. |
| **JWT**  | É um crachá digital usado para identificar usuários e trocar informações de forma segura entre computadores. |
| **LocalStorage**  | Armazenamento em cache de dados no navegador de forma persistente em pares de chave e valor.  |
| **Promise**  | Gerencia de resultado de uma operação assíncrona |
| **TypeORM**  | Ferramenta de mapeamento objeto-relacional (ORM) para Node.js escrita em TypeScript. |

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

#### 🔍 Postgres no Docker
```bash
docker exec -it erp-sistema-db-1 psql -U erp_user -d erp_db
\dt
SELECT * FROM users;
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
- Passo 3 - Criar Cluster na interface Docker Kubernets e esperar processar a criação.  
- Passo 4 - Executar Secrets no Kubernetes, por padrão são gravados não-encriptados no sistema de armazenamento, para serem utilizados pelo servidor da API

```bash
kubectl create secret generic erp-db-secret --from-literal=host=localhost --from-literal=username=erp_user --from-literal=password=erp_pass --from-literal=database=erp_db
kubectl create secret generic erp-jwt-secret --from-literal=secret=uma_chave_super_secreta_e_longa_com_mais_de_32_caracteres_123!
```

- Passo 5 - Rodar script Kubernetes e aguardar atualizar o painel Kubernetes no Docker
```bash
cd k8s
kubectl apply -f deployment.yaml
```

- Passo 6 - Executar bloco da criação de Seed **Postgres** no editor PowerShell ISE, espere o status do backend ficar **Available**
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

- Passo 7 - Verifique se todos os Pods estão no status 'Running'
```bash
kubectl get pods
```

- Passo 8 - Encaminhar porta **Port Forwarding** do Frontend e Backend (Comando de Inicialização)

VSCode Terminal [1]
```bash
kubectl port-forward svc/backend 3002:3002            
```
VSCode Terminal [2]
```bash
kubectl port-forward svc/erp-frontend-service 3000:80
```

- Verificar Health API **http://localhost:3002/api/health**
- Iniciar a aplicação em **http://localhost:3000/**

#### 🔍 Postgres no Kubernetes
Pesquisar nome do Pod corretamente gerado no Kubernates, alterar o [XXXXXXXXXXXXXXX] pelo valor gerado.
```bash
kubectl get pods
docker exec -it erp-db-[XXXXXXXXXXXXXXX] psql -U erp_user -d erp_db
\dt
SELECT * FROM users;
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

#### 🧪 Testes Unitários
```bash
cd backend
npm test           # testes unitários
npm run test:e2e   # e2e com SQLite em memória
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


#### ⚙️ Configurações Servidor Kubernetes 

- Caso precise consultar os namespaces criados automáticos
```bash
kubectl get svc --all-namespaces
```

- Status serviços do sistema
```bash
kubectl get pods -w
```

- Caso queira saber qual **Pod** está respondendo as requisições backend 
```bash
kubectl logs -f -l app=erp-backend --max-log-requests=10 --prefix
```

- Para saber os Serviços disponíveis
```bash
kubectl get svc
```

- Reiniciar os Pods do Backend
```bash
kubectl rollout restart deployment erp-backend
```

- Descobrir a porta correta do Serviço
```bash
kubectl get svc erp-frontend-service
```

- Atualizar projeto Backend no Kubernetes
```bash 
cd backend
docker build -t erp-backend .
kind load docker-image erp-backend --name desktop
kubectl rollout restart deployment erp-backend
```
