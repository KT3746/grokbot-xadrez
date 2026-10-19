# XADREZÃO

Xadrez para jogar no celular (feito pensando no navegador do Samsung Galaxy), em português.

Jogue: https://kt3746.github.io/grokbot-xadrez/

- Regras completas: xeque, xeque-mate, afogamento, roque, en passant, promoção com escolha, regra dos 50 lances, repetição tripla e material insuficiente.
- Contra o computador (Fácil, Médio, Difícil), escolhendo a cor, ou 2 jogadores no mesmo aparelho.
- Visual 3D (Three.js, peças modeladas em código) e visual 2D (peças SVG próprias).
- Sons e música gerados no navegador, com botões para desligar.
- A partida fica salva no aparelho.

Testes do motor: `node test/test.js` (perft da posição inicial, Kiwipete e outras).

Three.js (licença MIT) está em `js/vendor`, veja `js/vendor/THREE-LICENSE.txt`.
