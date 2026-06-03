# Orbital Courier

Projeto desenvolvido para o Final Challenge da disciplina Web Development HTML5 Canvas & Games.

## Participantes

- Lucas Andrzejewski de Lima e Gustavo Iichiro Nagata

## Como executar

Abra o arquivo `index.html` em um navegador moderno.

Tambem e possivel executar com um servidor local:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

## Como jogar

Controle uma nave de entrega orbital e colete todos os cristais de energia antes que o tempo acabe.

Controles:

- `WASD` ou setas: mover a nave
- Mouse/toque: manter pressionado para guiar a nave
- `P`: pausar
- `Enter`: iniciar rapidamente quando estiver no menu

Objetivo:

- Colete todos os cristais para avancar de fase.
- Evite os drones de patrulha.
- Complete as 5 fases com a maior pontuacao possivel.

## Recursos usados

- HTML5 Canvas para renderizar o jogo.
- JavaScript com classes para jogador, cristais, drones, particulas, sons e controle do jogo.
- Vetores para movimentacao e colisao.
- Transformacoes do canvas para rotacionar nave, drones e cristais.
- Sprites SVG autorais na pasta `assets`.
- Sons gerados com Web Audio API.
- Progressao por fases, score, vidas, tempo e tela de pausa.

## Video

Link do video no YouTube: adicionar aqui depois da gravacao.
