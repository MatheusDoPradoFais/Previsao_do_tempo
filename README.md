# WeatherFlow

Aplicação de previsão do tempo construída com **HTML, CSS e JavaScript puro** (sem frameworks, sem backend e sem serviços pagos), integrada às APIs gratuitas da [Open-Meteo](https://open-meteo.com/).

O usuário pesquisa uma cidade e a interface exibe a condição atual, a sensação térmica, máxima/mínima do dia, umidade, vento, índice UV, horário do nascer do sol, previsão para as próximas horas e para os próximos dias.

## Funcionalidades

- 🔎 **Pesquisa de cidade** — campo de busca integrado ao cabeçalho, sem recarregar a página.
- 🌡️ **Condições atuais** — temperatura, sensação térmica, máxima/mínima e condição do céu (com ícone dedicado).
- ⏱️ **Previsão horária** — próximas 8 horas, a partir do horário atual.
- 📅 **Previsão diária** — próximos 7 dias, com barra de mínima/máxima.
- 💧 **Estatísticas** — umidade relativa, velocidade do vento, índice UV (com categoria) e horário do nascer do sol.
- ⏳ **Estado de carregamento** — indicador visual enquanto os dados são buscados, com bloqueio de requisições simultâneas.
- ⚠️ **Estado de erro** — mensagens contextuais exibidas na própria interface (sem `alert()`) para cidade não encontrada, campo vazio, falha de conexão, etc.
- 🕒 **Última atualização** — horário local da última consulta bem-sucedida.
- 🎨 **Interface própria** — céu em gradiente com transição em paralaxe, nuvens animadas e ícones de clima (sol, nuvem, chuva, tempestade) feitos em CSS puro, sem bibliotecas de ícones.

## Visual mobile e cenários de clima

- Layout em **coluna única** (retrato), pensado para o polegar: busca no topo, clima atual ocupando a primeira tela e os painéis empilhados abaixo.
- O fundo muda conforme o clima (`getWeatherInfo` → `sceneFor`) e o horário (`is_day` da API): **céu limpo** (sol com raios), **parcialmente nublado**, **nublado**, **neblina**, **garoa**, **chuva**, **tempestade** (raios e clarões) e **neve**. À noite aparecem lua e estrelas.
- Para visualizar um cenário sem depender da previsão real: `index.html?cenario=tempestade&noite=1` (`sol`, `parcial`, `nublado`, `neblina`, `garoa`, `chuva`, `tempestade`, `neve`).

## Tecnologias

- HTML5
- CSS3 (variáveis CSS, grid, flexbox, animações)
- JavaScript (ES6+, `fetch`, `async/await`)
- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) — converte o nome da cidade em latitude/longitude
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs) — dados meteorológicos atuais, horários e diários

Nenhuma das APIs exige chave de acesso ou cadastro.

## Estrutura do projeto

```
weatherflow/
├── index.html      # Estrutura da página
├── style.css       # Estilo visual (tema, layout, animações)
├── script.js       # Lógica e integração com as APIs
└── README.md
```

## Como executar

Não há etapa de build nem dependências para instalar — o projeto roda como HTML estático.

1. Baixe ou clone os três arquivos (`index.html`, `style.css`, `script.js`) mantendo-os na mesma pasta.
2. Abra o `index.html` diretamente no navegador **ou** sirva a pasta com um servidor local, por exemplo:
   ```bash
   npx serve .
   # ou
   python -m http.server
   ```
3. Digite o nome de uma cidade no campo de busca e clique em **Buscar**.

## Como funciona a integração

1. O nome digitado é enviado à **Geocoding API**, que retorna a cidade, o estado/país e as coordenadas.
2. As coordenadas são usadas para consultar a **Forecast API**, que retorna as condições atuais, a previsão horária e a diária.
3. Uma função central, `getWeatherInfo(code)`, traduz o código meteorológico (padrão WMO) retornado pela API em uma descrição em português, um emoji e a categoria de ícone usada no design (sol, nuvem, sol com nuvem, chuva ou tempestade).
4. Os dados são então mapeados diretamente para os elementos já existentes na interface — nenhum elemento novo é criado dinamicamente além dos itens repetidos das listas de horas e dias.

## Possíveis próximos passos

- Detectar a localização do usuário automaticamente (Geolocation API).
- Guardar a última cidade pesquisada (`localStorage`).
- Alternar unidade de temperatura (°C / °F).
- Autocompletar sugestões de cidade durante a digitação.

---

Projeto pessoal de estudo, desenvolvido por Matheus do Prado Fais.
