/*
=========================================================
ORBITAL COURIER - SCRIPT PRINCIPAL DO JOGO
=========================================================

Este arquivo controla todo o jogo feito em HTML5 Canvas.

- Carregamento do canvas
- Carregamento das imagens
- Controle do jogador
- Controle dos cristais
- Controle dos drones
- Sistema de partículas
- Sistema de fases
- Sistema de vidas
- Sistema de pontuação
- Sistema de tempo
- Sistema de áudio
- Eventos de teclado, mouse e toque

- Velocidade da nave: classe Player, variável maxSpeed
- Vidas iniciais: método start(), this.lives = 3
- Quantidade de fases: collectCrystals(), if (this.level >= 5)
- Quantidade de cristais: loadLevel(), 4 + this.level
- Quantidade de drones: loadLevel(), 2 + this.level
- Tempo da fase: loadLevel(), Math.max(22, 42 - this.level * 3)
- Pontuação: collectCrystals(), this.score += ...
=========================================================
*/


// Pega o elemento <canvas> do HTML.
// É nele que todo o jogo será desenhado.
const canvas = document.getElementById("gameCanvas");

// Cria o contexto 2D do canvas.
// O ctx é usado para desenhar imagens, textos, formas, fundo etc.
const ctx = canvas.getContext("2d");

// Pega o painel da tela inicial, pausa, vitória e game over.
const panel = document.getElementById("screenPanel");

// Texto que aparece dentro do painel.
const panelText = document.getElementById("panelText");

// Botão principal: jogar, continuar ou jogar de novo.
const playButton = document.getElementById("playButton");

// Botão secundário: sobre ou menu.
const aboutButton = document.getElementById("aboutButton");

// Largura do canvas.
const W = canvas.width;

// Altura do canvas.
const H = canvas.height;

// Set usado para guardar quais teclas estão pressionadas.
// Set evita teclas repetidas.
const keys = new Set();

// Objeto usado para controlar mouse/toque.
// active diz se o jogador está clicando/tocando.
// x e y guardam a posição do ponteiro.
const pointer = {
  active: false,
  x: W / 2,
  y: H / 2
};

// Imagens usadas no jogo.
// Cada uma é carregada pela função loadImage.
const assets = {
  ship: loadImage("assets/ship.svg"),
  crystal: loadImage("assets/crystal.svg"),
  drone: loadImage("assets/drone.svg")
};


// Função para carregar uma imagem.
// Recebe o caminho da imagem e devolve um objeto Image.
function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}


// Classe Vector2 representa um vetor 2D.
// Ela é usada para posição, velocidade e direção.
class Vector2 {
  // Construtor cria um vetor com x e y.
  // Se não passar valores, começa em 0.
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  // Soma outro vetor ao vetor atual.
  // Usado para mover objetos.
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  // Multiplica o vetor por um número.
  // Usado para aumentar/reduzir velocidade.
  scale(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  // Calcula o tamanho do vetor.
  // Math.hypot faz a raiz de x² + y².
  length() {
    return Math.hypot(this.x, this.y);
  }

  // Normaliza o vetor.
  // Isso mantém a direção, mas deixa o tamanho igual a 1.
  // É importante para movimento diagonal não ficar mais rápido.
  normalize() {
    const size = this.length();

    if (size > 0) {
      this.x /= size;
      this.y /= size;
    }

    return this;
  }

  // Cria uma cópia do vetor.
  // Evita alterar o vetor original sem querer.
  clone() {
    return new Vector2(this.x, this.y);
  }

  // Cria um vetor a partir de um ângulo e uma velocidade.
  // Usado nos drones e partículas para sair em direções aleatórias.
  static fromAngle(angle, speed) {
    return new Vector2(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
  }
}


// Classe Player controla a nave do jogador.
class Player {
  constructor() {
    // Começa no centro da tela.
    this.position = new Vector2(W / 2, H / 2);

    // Velocidade inicial zerada.
    this.velocity = new Vector2();

    // Raio de colisão da nave.
    // Alterar isso muda a área de colisão, não o tamanho visual.
    this.radius = 22;

    // Ângulo usado para rotacionar a nave.
    this.angle = 0;

    // Tempo de invencibilidade após tomar dano.
    // Enquanto for maior que 0, o jogador não toma outro dano.
    this.invincible = 0;
  }

  // Atualiza a nave a cada frame.
  // dt é o delta time: tempo entre um frame e outro.
  update(dt) {
    // Vetor que guarda a direção desejada pelo jogador.
    const input = new Vector2();

    // Movimento para cima.
    if (keys.has("arrowup") || keys.has("w")) input.y -= 1;

    // Movimento para baixo.
    if (keys.has("arrowdown") || keys.has("s")) input.y += 1;

    // Movimento para esquerda.
    if (keys.has("arrowleft") || keys.has("a")) input.x -= 1;

    // Movimento para direita.
    if (keys.has("arrowright") || keys.has("d")) input.x += 1;

    // Se o jogador estiver clicando/tocando no canvas,
    // a nave tenta ir em direção ao ponto clicado.
    if (pointer.active) {
      const target = new Vector2(
        pointer.x - this.position.x,
        pointer.y - this.position.y
      );

      // Só move se o ponteiro estiver um pouco distante,
      // para evitar tremedeira quando chega perto do ponto.
      if (target.length() > 8) {
        input.add(target.normalize());
      }
    }

    // Se existe algum input de movimento,
    // aplica aceleração na velocidade.
    if (input.length() > 0) {
      // 1700 controla a aceleração da nave.
      // Aumentar deixa a nave responder mais rápido.
      input.normalize().scale(1700 * dt);

      // Soma essa aceleração à velocidade atual.
      this.velocity.add(input);
    }

    // Calcula velocidade atual da nave.
    const speed = this.velocity.length();

    // Velocidade máxima da nave.
    // ALTERE AQUI se quiser deixar a nave mais rápida ou lenta.
    const maxSpeed = 620;

    // Se passou da velocidade máxima, limita.
    if (speed > maxSpeed) {
      this.velocity.normalize().scale(maxSpeed);
    }

    // Atualiza a posição usando a velocidade.
    this.position.add(this.velocity.clone().scale(dt));

    // Atrito/desaceleração.
    // Quanto menor que 1, mais rápido a nave perde velocidade.
    this.velocity.scale(0.9);

    // Impede a nave de sair da tela no eixo X.
    this.position.x = clamp(
      this.position.x,
      this.radius,
      W - this.radius
    );

    // Impede a nave de sair da tela no eixo Y.
    // O +28 evita entrar na área do HUD superior.
    this.position.y = clamp(
      this.position.y,
      this.radius + 28,
      H - this.radius
    );

    // Se a nave está se movendo, atualiza o ângulo dela.
    // atan2 calcula o ângulo baseado na direção da velocidade.
    if (this.velocity.length() > 1) {
      this.angle = Math.atan2(this.velocity.y, this.velocity.x);
    }

    // Reduz o tempo de invencibilidade.
    // Math.max impede que fique negativo.
    this.invincible = Math.max(0, this.invincible - dt);
  }

  // Desenha a nave.
  draw() {
    // Salva o estado atual do canvas.
    ctx.save();

    // Move o ponto de desenho para a posição da nave.
    ctx.translate(this.position.x, this.position.y);

    // Rotaciona o canvas para a nave apontar na direção do movimento.
    ctx.rotate(this.angle);

    // Faz a nave piscar quando está invencível.
    ctx.globalAlpha =
      this.invincible > 0 && Math.floor(this.invincible * 12) % 2 === 0
        ? 0.45
        : 1;

    // Desenha a imagem da nave.
    // -28 e -28 centralizam a imagem.
    // 56 e 56 são largura e altura da nave.
    ctx.drawImage(assets.ship, -28, -28, 56, 56);

    // Restaura o canvas para não afetar outros desenhos.
    ctx.restore();
  }
}


// Classe Crystal representa os cristais coletáveis.
class Crystal {
  constructor(x, y) {
    // Posição do cristal.
    this.position = new Vector2(x, y);

    // Raio de colisão do cristal.
    this.radius = 16;

    // Fase usada para animar o cristal.
    // Começa aleatória para os cristais não animarem todos iguais.
    this.phase = Math.random() * Math.PI * 2;
  }

  // Atualiza a animação do cristal.
  update(dt) {
    // 4 controla a velocidade da animação.
    this.phase += dt * 4;
  }

  // Desenha o cristal.
  draw() {
    // Tamanho varia com seno para criar efeito de pulsação.
    const size = 34 + Math.sin(this.phase) * 3;

    ctx.save();

    // Move o canvas até a posição do cristal.
    ctx.translate(this.position.x, this.position.y);

    // Rotaciona levemente o cristal.
    ctx.rotate(this.phase * 0.15);

    // Desenha o cristal centralizado.
    ctx.drawImage(
      assets.crystal,
      -size / 2,
      -size / 2,
      size,
      size
    );

    ctx.restore();
  }
}


// Classe Drone representa os inimigos.
class Drone {
  constructor(level) {
    // Posição aleatória dentro da tela.
    this.position = new Vector2(
      rand(60, W - 60),
      rand(90, H - 60)
    );

    // Velocidade do drone.
    // Conforme a fase aumenta, os drones ficam mais rápidos.
    // ALTERE AQUI para mudar a dificuldade.
    const speed = rand(85, 125) + level * 16;

    // Cria velocidade em uma direção aleatória.
    this.velocity = Vector2.fromAngle(
      rand(0, Math.PI * 2),
      speed
    );

    // Raio de colisão do drone.
    this.radius = 21;

    // Velocidade de rotação visual.
    this.spin = rand(-3, 3);

    // Ângulo visual inicial.
    this.angle = 0;
  }

  // Atualiza o drone.
  update(dt) {
    // Move o drone de acordo com a velocidade.
    this.position.add(this.velocity.clone().scale(dt));

    // Atualiza rotação visual.
    this.angle += this.spin * dt;

    // Se bater nas bordas laterais, inverte velocidade X.
    if (this.position.x < this.radius || this.position.x > W - this.radius) {
      this.velocity.x *= -1;

      // Garante que não fique fora da tela.
      this.position.x = clamp(
        this.position.x,
        this.radius,
        W - this.radius
      );
    }

    // Se bater no topo ou embaixo, inverte velocidade Y.
    // O 62 evita que o drone entre muito no HUD.
    if (this.position.y < 62 || this.position.y > H - this.radius) {
      this.velocity.y *= -1;

      this.position.y = clamp(
        this.position.y,
        62,
        H - this.radius
      );
    }
  }

  // Desenha o drone.
  draw() {
    ctx.save();

    // Move até a posição do drone.
    ctx.translate(this.position.x, this.position.y);

    // Rotaciona o drone.
    ctx.rotate(this.angle);

    // Desenha centralizado.
    ctx.drawImage(assets.drone, -25, -25, 50, 50);

    ctx.restore();
  }
}


// Classe Particle cria partículas de efeito visual.
class Particle {
  constructor(x, y, color) {
    // Posição inicial da partícula.
    this.position = new Vector2(x, y);

    // Direção e velocidade aleatórias.
    this.velocity = Vector2.fromAngle(
      rand(0, Math.PI * 2),
      rand(60, 190)
    );

    // Tempo de vida da partícula.
    this.life = rand(0.35, 0.8);

    // Guarda a vida máxima para calcular transparência.
    this.maxLife = this.life;

    // Cor da partícula.
    this.color = color;
  }

  // Atualiza a partícula.
  update(dt) {
    // Move a partícula.
    this.position.add(this.velocity.clone().scale(dt));

    // Diminui a velocidade aos poucos.
    this.velocity.scale(0.96);

    // Reduz o tempo de vida.
    this.life -= dt;
  }

  // Desenha a partícula.
  draw() {
    // Transparência diminui conforme a vida acaba.
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);

    ctx.fillStyle = this.color;
    ctx.beginPath();

    // Desenha uma bolinha.
    ctx.arc(
      this.position.x,
      this.position.y,
      3,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // Volta a transparência ao normal.
    ctx.globalAlpha = 1;
  }
}


// Classe Game controla o jogo inteiro.
class Game {
  constructor() {
    // Estado inicial do jogo.
    // Pode ser: menu, playing, paused, about, victory ou gameover.
    this.state = "menu";

    // Cria o jogador.
    this.player = new Player();

    // Listas de objetos do jogo.
    this.crystals = [];
    this.drones = [];
    this.particles = [];

    // Cria estrelas do fundo.
    // São objetos simples com posição, raio e velocidade.
    this.stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 24 + 8
    }));

    // Fase inicial.
    this.level = 1;

    // Pontuação inicial.
    this.score = 0;

    // Vidas iniciais.
    this.lives = 3;

    // Tempo inicial.
    this.timeLeft = 40;

    // Guarda o tempo do último frame.
    this.lastTime = 0;

    // Sistema de som.
    this.sound = new SoundBoard();

    // Mostra o menu inicial.
    this.showMenu();
  }

  // Inicia ou reinicia o jogo.
  start() {
    this.state = "playing";

    // Reseta fase.
    this.level = 1;

    // Reseta pontuação.
    this.score = 0;

    // ALTERE AQUI para mudar a quantidade inicial de vidas.
    this.lives = 3;

    // Cria um novo jogador no centro.
    this.player = new Player();

    // Carrega a primeira fase.
    this.loadLevel();

    // Esconde o painel.
    hidePanel();

    // Ativa o áudio depois de interação do usuário.
    this.sound.resume();
  }

  // Carrega uma fase.
  loadLevel() {
    // Define o tempo da fase.
    // Conforme a fase aumenta, o tempo diminui.
    // Math.max impede que o tempo fique menor que 22 segundos.
    // ALTERE AQUI para mudar o tempo das fases.
    this.timeLeft = Math.max(22, 42 - this.level * 3);

    // Limpa os cristais, drones e partículas.
    this.crystals = [];
    this.drones = [];
    this.particles = [];

    // Cria cristais.
    // 4 + this.level faz ter mais cristais conforme a fase aumenta.
    // ALTERE AQUI para mudar a quantidade de cristais.
    for (let i = 0; i < 4 + this.level; i++) {
      this.crystals.push(
        new Crystal(
          rand(60, W - 60),
          rand(92, H - 60)
        )
      );
    }

    // Cria drones.
    // 2 + this.level faz ter mais inimigos conforme a fase aumenta.
    // ALTERE AQUI para mudar a quantidade de drones.
    for (let i = 0; i < 2 + this.level; i++) {
      this.drones.push(new Drone(this.level));
    }
  }

  // Atualiza o jogo.
  update(dt) {
    // Atualiza estrelas mesmo fora do jogo,
    // para o fundo continuar animado.
    this.updateStars(dt);

    // Se não estiver jogando, não atualiza jogador/inimigos.
    if (this.state !== "playing") return;

    // Diminui o tempo restante.
    this.timeLeft -= dt;

    // Atualiza jogador.
    this.player.update(dt);

    // Atualiza todos os cristais.
    this.crystals.forEach(crystal => crystal.update(dt));

    // Atualiza todos os drones.
    this.drones.forEach(drone => drone.update(dt));

    // Atualiza partículas.
    this.particles.forEach(particle => particle.update(dt));

    // Remove partículas mortas.
    this.particles = this.particles.filter(
      particle => particle.life > 0
    );

    // Verifica coleta de cristais.
    this.collectCrystals();

    // Verifica colisão com drones.
    this.checkDroneHits();

    // Se o tempo acabar, perde uma vida.
    if (this.timeLeft <= 0) {
      this.lives -= 1;

      // Toca som de erro.
      this.sound.error();

      // Dá invencibilidade temporária.
      this.player.invincible = 1.4;

      // Se acabaram as vidas, termina o jogo.
      if (this.lives <= 0) {
        this.finish(
          false,
          "O tempo acabou e a carga ficou perdida na orbita."
        );
      } else {
        // Se ainda tem vidas, recarrega a fase.
        this.loadLevel();
      }
    }
  }

  // Verifica se o jogador coletou cristais.
  collectCrystals() {
    // Percorre de trás para frente porque a lista pode ter itens removidos.
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const crystal = this.crystals[i];

      // Verifica colisão por distância.
      // Se a distância entre jogador e cristal for menor que a soma dos raios,
      // significa que encostaram.
      if (
        distance(this.player.position, crystal.position)
        < this.player.radius + crystal.radius
      ) {
        // Remove o cristal coletado.
        this.crystals.splice(i, 1);

        // Soma pontuação.
        // 100 é a base, e level * 20 dá bônus por fase.
        // ALTERE AQUI para mudar a pontuação por cristal.
        this.score += 100 + this.level * 20;

        // Som de coleta.
        this.sound.collect();

        // Cria partículas azuis no local do cristal.
        this.burst(
          crystal.position.x,
          crystal.position.y,
          "#7dd3fc",
          18
        );
      }
    }

    // Se todos os cristais foram coletados, passa de fase.
    if (this.crystals.length === 0) {
      // Bônus de tempo restante.
      this.score += Math.ceil(this.timeLeft) * 10;

      // Som de passar de fase.
      this.sound.level();

      // Quantidade total de fases.
      // ALTERE AQUI se quiser mais ou menos fases.
      if (this.level >= 5) {
        this.finish(
          true,
          "Entrega concluida. A rota inteira foi estabilizada."
        );
      } else {
        // Vai para a próxima fase.
        this.level += 1;

        // Carrega nova fase.
        this.loadLevel();
      }
    }
  }

  // Verifica se o jogador bateu em algum drone.
  checkDroneHits() {
    // Se estiver invencível, não toma dano.
    if (this.player.invincible > 0) return;

    // Percorre todos os drones.
    for (const drone of this.drones) {
      // Verifica colisão entre jogador e drone.
      if (
        distance(this.player.position, drone.position)
        < this.player.radius + drone.radius
      ) {
        // Perde uma vida.
        this.lives -= 1;

        // Fica invencível por 1.6 segundos.
        this.player.invincible = 1.6;

        // Som de dano.
        this.sound.hit();

        // Partículas vermelhas de impacto.
        this.burst(
          this.player.position.x,
          this.player.position.y,
          "#ef6f6c",
          28
        );

        // Reposiciona jogador no centro.
        this.player.position = new Vector2(W / 2, H / 2);

        // Zera a velocidade para não continuar deslizando.
        this.player.velocity = new Vector2();

        // Se acabou a vida, game over.
        if (this.lives <= 0) {
          this.finish(false, "Os drones interceptaram sua nave.");
        }

        // Para a função para evitar múltiplos danos no mesmo frame.
        return;
      }
    }
  }

  // Cria várias partículas em uma posição.
  burst(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  // Finaliza o jogo.
  // won define se foi vitória ou derrota.
  finish(won, message) {
    // Define o estado final.
    this.state = won ? "victory" : "gameover";

    // Mostra painel com mensagem final.
    showPanel(
      won ? "Vitoria" : "Fim de jogo",
      `${message}<br><br>Pontuacao final: ${this.score}.`,
      "Jogar de novo",
      "Menu"
    );
  }

  // Mostra menu inicial.
  showMenu() {
    this.state = "menu";

    showPanel(
      "Orbital Courier",
      "Colete os cristais de energia antes do tempo acabar. Use WASD ou setas para mover, P para pausar e toque/clique para guiar a nave.",
      "Jogar",
      "Sobre"
    );
  }

  // Mostra tela sobre.
  showAbout() {
    this.state = "about";

    showPanel(
      "Sobre",
      "Projeto do Final Challenge de HTML5 Canvas & Games.<br><br>Participantes: Lucas Andrzejewski de Lima e Gustavo Iichiro Nagata.<br><br>O jogo usa canvas, classes, vetores, transformacoes, sprites SVG autorais, particulas, progressao de fases, score, vidas e sons via Web Audio.",
      "Jogar",
      "Menu"
    );
  }

  // Pausa ou despausa o jogo.
  togglePause() {
    // Se está jogando, pausa.
    if (this.state === "playing") {
      this.state = "paused";
      showPanel(
        "Pausado",
        "A rota esta em espera.",
        "Continuar",
        "Menu"
      );
    }

    // Se já está pausado, volta ao jogo.
    else if (this.state === "paused") {
      this.state = "playing";
      hidePanel();
    }
  }

  // Desenha o jogo.
  draw() {
    // Desenha fundo primeiro.
    drawBackground(this.stars);

    // Desenha objetos apenas nos estados ligados ao jogo.
    if (
      this.state === "playing"
      || this.state === "paused"
      || this.state === "victory"
      || this.state === "gameover"
    ) {
      this.crystals.forEach(crystal => crystal.draw());
      this.drones.forEach(drone => drone.draw());
      this.player.draw();
      this.particles.forEach(particle => particle.draw());
      this.drawHud();
    }
  }

  // Desenha a interface superior do jogo.
  drawHud() {
    // Fundo escuro do HUD.
    ctx.fillStyle = "rgba(8, 12, 19, 0.72)";
    ctx.fillRect(0, 0, W, 52);

    // Texto do HUD.
    ctx.fillStyle = "#f5f7fb";
    ctx.font = "700 18px Arial";

    // Mostra fase.
    ctx.fillText(`Fase ${this.level}/5`, 22, 32);

    // Mostra pontuação.
    ctx.fillText(`Score ${this.score}`, 150, 32);

    // Mostra vidas.
    ctx.fillText(`Vidas ${this.lives}`, 300, 32);

    // Largura da barra de tempo.
    const barW = 220;

    // Calcula proporção do tempo restante.
    const ratio = clamp(
      this.timeLeft / Math.max(22, 42 - this.level * 3),
      0,
      1
    );

    // Fundo da barra.
    ctx.fillStyle = "#394150";
    ctx.fillRect(W - barW - 24, 18, barW, 14);

    // Cor da barra muda quando o tempo está baixo.
    ctx.fillStyle = ratio > 0.35 ? "#58c6a4" : "#ef6f6c";

    // Barra preenchida proporcional ao tempo.
    ctx.fillRect(W - barW - 24, 18, barW * ratio, 14);

    // Borda da barra.
    ctx.strokeStyle = "#dce4ef";
    ctx.strokeRect(W - barW - 24, 18, barW, 14);

    // Texto do tempo em segundos.
    ctx.fillStyle = "#f5f7fb";
    ctx.fillText(
      `${Math.ceil(Math.max(0, this.timeLeft))}s`,
      W - 70,
      44
    );
  }

  // Atualiza movimento das estrelas.
  updateStars(dt) {
    for (const star of this.stars) {
      // Estrelas se movem para a esquerda.
      star.x -= star.speed * dt;

      // Quando uma estrela sai da tela, volta para a direita.
      if (star.x < 0) {
        star.x = W;
        star.y = Math.random() * H;
      }
    }
  }

  // Loop principal do jogo.
  loop(time = 0) {
    // Calcula o delta time em segundos.
    // Isso faz o jogo rodar parecido em computadores diferentes.
    // Math.min limita o dt para evitar pulos grandes.
    const dt = Math.min(
      (time - this.lastTime) / 1000 || 0,
      0.033
    );

    // Atualiza o último tempo.
    this.lastTime = time;

    // Atualiza lógica.
    this.update(dt);

    // Desenha tela.
    this.draw();

    // Chama o próximo frame.
    requestAnimationFrame(nextTime => this.loop(nextTime));
  }
}


// Classe responsável pelos sons do jogo.
class SoundBoard {
  constructor() {
    // Contexto de áudio começa como null.
    // Ele só é criado quando o jogador interage.
    this.context = null;
  }

  // Ativa ou retoma o áudio.
  resume() {
    // Cria o AudioContext se ainda não existir.
    if (!this.context) {
      this.context = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }

    // Alguns navegadores deixam o áudio suspenso até interação.
    if (this.context.state === "suspended") {
      this.context.resume();
    }
  }

  // Toca um tom simples.
  // freq = frequência
  // duration = duração
  // type = tipo da onda
  // volume = volume
  tone(freq, duration, type = "sine", volume = 0.08) {
    // Se o áudio ainda não foi ativado, não toca nada.
    if (!this.context) return;

    // Oscillator gera o som.
    const osc = this.context.createOscillator();

    // Gain controla o volume.
    const gain = this.context.createGain();

    // Tipo de onda sonora.
    osc.type = type;

    // Frequência do som.
    osc.frequency.value = freq;

    // Volume inicial.
    gain.gain.value = volume;

    // Faz o som diminuir suavemente até quase zero.
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.context.currentTime + duration
    );

    // Liga oscillator no gain.
    osc.connect(gain);

    // Liga gain na saída de som.
    gain.connect(this.context.destination);

    // Começa o som.
    osc.start();

    // Para o som depois da duração.
    osc.stop(this.context.currentTime + duration);
  }

  // Som ao coletar cristal.
  collect() {
    this.tone(720, 0.12, "triangle", 0.07);
  }

  // Som ao passar de fase.
  level() {
    this.tone(520, 0.12, "square", 0.05);

    // Segundo som tocado com pequeno atraso.
    setTimeout(
      () => this.tone(780, 0.16, "square", 0.05),
      90
    );
  }

  // Som ao tomar dano.
  hit() {
    this.tone(130, 0.22, "sawtooth", 0.09);
  }

  // Som quando tempo acaba.
  error() {
    this.tone(90, 0.28, "sawtooth", 0.08);
  }
}


// Desenha o fundo espacial.
function drawBackground(stars) {
  // Cria gradiente de fundo.
  const gradient = ctx.createLinearGradient(0, 0, W, H);

  // Cores do gradiente.
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(0.5, "#142033");
  gradient.addColorStop(1, "#1d1b2a");

  // Preenche a tela com o gradiente.
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Cor das estrelas.
  ctx.fillStyle = "#dce4ef";

  // Desenha cada estrela.
  for (const star of stars) {
    // Transparência depende do tamanho da estrela.
    ctx.globalAlpha = 0.35 + star.r * 0.18;

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Restaura transparência.
  ctx.globalAlpha = 1;

  // Linhas decorativas do fundo.
  ctx.strokeStyle = "rgba(125, 211, 252, 0.12)";
  ctx.lineWidth = 1;

  // Desenha linhas diagonais.
  for (let y = 90; y < H; y += 70) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y - 38);
    ctx.stroke();
  }
}


// Mostra o painel na tela.
function showPanel(title, text, primary, secondary) {
  // Remove classe hidden para aparecer.
  panel.classList.remove("hidden");

  // Altera título do painel.
  panel.querySelector("h1").textContent = title;

  // Altera texto do painel.
  // innerHTML permite usar <br>.
  panelText.innerHTML = text;

  // Texto do botão principal.
  playButton.textContent = primary;

  // Texto do botão secundário.
  aboutButton.textContent = secondary;
}


// Esconde o painel.
function hidePanel() {
  panel.classList.add("hidden");
}


// Calcula distância entre dois pontos.
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}


// Limita um valor entre mínimo e máximo.
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


// Retorna número aleatório entre min e max.
function rand(min, max) {
  return Math.random() * (max - min) + min;
}


// Converte posição do mouse/toque para coordenadas internas do canvas.
// Isso é necessário porque o canvas pode estar redimensionado no CSS.
function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H
  };
}


// Cria o objeto principal do jogo.
const game = new Game();

// Inicia o loop do jogo.
game.loop();


// Clique no botão principal.
playButton.addEventListener("click", () => {
  // Se estiver pausado, continua.
  if (game.state === "paused") {
    game.togglePause();
  }

  // Caso contrário, começa/recomeça o jogo.
  else {
    game.start();
  }
});


// Clique no botão secundário.
aboutButton.addEventListener("click", () => {
  // Se estiver em sobre, pausa, game over ou vitória,
  // o botão volta para o menu.
  if (
    game.state === "about"
    || game.state === "paused"
    || game.state === "gameover"
    || game.state === "victory"
  ) {
    game.showMenu();
  }

  // Caso contrário, mostra a tela sobre.
  else {
    game.showAbout();
  }
});


// Evento quando uma tecla é pressionada.
window.addEventListener("keydown", event => {
  // Converte a tecla para minúscula.
  const key = event.key.toLowerCase();

  // Adiciona tecla ao Set de teclas pressionadas.
  keys.add(key);

  // Tecla P pausa/despausa.
  if (key === "p") {
    game.togglePause();
  }

  // Enter inicia o jogo se não estiver jogando.
  if (key === "enter" && game.state !== "playing") {
    game.start();
  }
});


// Evento quando uma tecla é solta.
window.addEventListener("keyup", event => {
  // Remove a tecla do Set.
  keys.delete(event.key.toLowerCase());
});


// Quando clica/toca no canvas.
canvas.addEventListener("pointerdown", event => {
  // Ativa controle por ponteiro.
  pointer.active = true;

  // Atualiza posição do ponteiro.
  Object.assign(pointer, pointerPosition(event));
});


// Quando move o mouse/dedo no canvas.
canvas.addEventListener("pointermove", event => {
  // Só atualiza se estiver clicando/tocando.
  if (pointer.active) {
    Object.assign(pointer, pointerPosition(event));
  }
});


// Quando solta o clique/toque.
canvas.addEventListener("pointerup", () => {
  pointer.active = false;
});


// Quando o ponteiro sai do canvas.
canvas.addEventListener("pointerleave", () => {
  pointer.active = false;
});