(function () {
  var PAGINAS = [
    { pagina: "hub", href: "index.html", texto: "Início" },
    { pagina: "escape-room", href: "escape-room.html", texto: "🔎 Escape Room" },
    { pagina: "hardware", href: "hardware.html", texto: "🗺️ Mapa de Hardware" },
    { pagina: "monta-pc", href: "monta-pc.html", texto: "🛒 Monte o PC Ideal" },
  ];

  var paginaAtual = document.body.dataset.page;

  var linksHtml = PAGINAS.map(function (p) {
    var classe = p.pagina === paginaAtual ? "ativo" : "";
    return (
      '<a href="' + p.href + '" data-nav="' + p.pagina + '" class="' + classe + '">' +
      p.texto +
      "</a>"
    );
  }).join("");

  var alvo = document.getElementById("site-header");
  if (!alvo) return;

  alvo.innerHTML =
    '<nav class="site-nav">' +
    '<a href="index.html" class="site-nav-marca">🎮 Atividades</a>' +
    '<div class="site-nav-links">' + linksHtml + "</div>" +
    "</nav>";
})();
