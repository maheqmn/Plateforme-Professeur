// Maquettes phase 0 — ajustement de la taille du texte (exigence 7.1 : boutons A+ / A-).
(function () {
  var controls = document.createElement('div');
  controls.className = 'font-controls';
  controls.innerHTML =
    '<button type="button" id="btn-smaller" title="Réduire la taille du texte">A-</button>' +
    '<button type="button" id="btn-bigger" title="Agrandir la taille du texte">A+</button>';
  document.body.appendChild(controls);

  var min = 16;
  var max = 24;
  var step = 1;
  var current = 18;

  function apply(size) {
    current = Math.min(max, Math.max(min, size));
    document.documentElement.style.fontSize = current + 'px';
  }

  document.getElementById('btn-bigger').addEventListener('click', function () {
    apply(current + step);
  });

  document.getElementById('btn-smaller').addEventListener('click', function () {
    apply(current - step);
  });
})();
