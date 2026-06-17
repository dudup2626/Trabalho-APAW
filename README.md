# 🏆 Álbum da Copa do Mundo 2026

Sistema web desenvolvido para a disciplina de **Análise e Projeto de Aplicações Web (APAW)** com o objetivo de gerenciar um álbum de figurinhas da Copa do Mundo de 2026.

## 📖 Sobre o Projeto

O sistema permite que colecionadores gerenciem sua coleção de figurinhas, acompanhem o progresso do álbum e registrem trocas realizadas com outros colecionadores.

A aplicação foi desenvolvida utilizando React no frontend e Supabase para autenticação e persistência dos dados.

---

## 🎯 Objetivo

Desenvolver uma aplicação web funcional aplicando conceitos de engenharia de software, incluindo:

* Autenticação de usuários;
* CRUD completo;
* Banco de dados;
* Interface responsiva;
* Versionamento com Git;
* Deploy da aplicação.

---

## ✨ Funcionalidades

### Autenticação

* Cadastro de usuário
* Login
* Logout
* Área protegida

### Dashboard

* Percentual de conclusão do álbum
* Quantidade de figurinhas obtidas
* Figurinhas repetidas
* Figurinhas faltantes
* Total de trocas realizadas
* Ranking de amigos

### Álbum

* Visualização de todas as figurinhas
* Pesquisa por código
* Pesquisa por jogador
* Pesquisa por seleção
* Adicionar figurinhas
* Remover figurinhas
* Controle automático de repetidas

### Trocas

* Cadastro de trocas
* Histórico de trocas
* Edição de trocas
* Exclusão de trocas
* Atualização automática do estoque

---

## 🛠 Tecnologias Utilizadas

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Backend

* Supabase

### Banco de Dados

* PostgreSQL (Supabase)

### Controle de Versão

* Git
* GitHub

---

## 📂 Estrutura do Projeto

```text
src/
├── components/
├── pages/
├── hooks/
├── services/
├── contexts/
├── types/
├── utils/
└── assets/
```

---

## 🗄 Modelo de Dados

O sistema utiliza as seguintes entidades principais:

* Usuário
* Figurinhas
* Inventário do usuário
* Trocas
* Amigos

As informações são armazenadas no PostgreSQL através do Supabase.

---

## 🚀 Como Executar o Projeto

### 1. Clone o repositório

```bash
git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
```

### 2. Entre na pasta

```bash
cd SEU-REPOSITORIO
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Configure o arquivo `.env`

Crie um arquivo `.env` com as variáveis do Supabase:

```env
VITE_SUPABASE_URL=Sua_URL
VITE_SUPABASE_ANON_KEY=Sua_Chave
```

### 5. Execute o projeto

```bash
npm run dev
```

O sistema ficará disponível em:

```
http://localhost:5173
```

---

## 📸 Telas do Sistema

* Login
* Cadastro
* Dashboard
* Álbum
* Registro de Trocas
* Histórico de Trocas

> As imagens podem ser encontradas na pasta `/docs` ou adicionadas posteriormente.

---

## 👥 Integrantes

* Eduardo Pereira Xavier
* Pedro Berger Cabrone
* Pedro Henrique Alves da Silva 
* Matheus Mariano Cunha
* João Pedro Figueiredo Neves

---

## 📂 Repositório

**https://github.com/dudup2626/Trabalho-APAW**

---

## 📄 Licença

Projeto desenvolvido exclusivamente para fins acadêmicos na disciplina de **Análise e Projeto de Aplicações Web (APAW)**.
