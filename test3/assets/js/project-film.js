/* A hero that holds a film: a still until you ask for it, then the film.
   Project pages use .project-hero; anything else opts in with data-film-hero. */
(function () {
  var hero = document.querySelector('.project-hero, [data-film-hero]');
  if (!hero) return;
  var badge = hero.querySelector('[data-play-film]');
  var film = hero.querySelector('.hero-film');
  if (!badge || !film) return;

  badge.addEventListener('click', function () {
    hero.classList.add('is-playing');
    film.preload = 'auto';
    var p = film.play();
    if (p && p.catch) p.catch(function () {});
    film.focus();
  });

  // Returning to the still when the film ends keeps the page feeling composed
  // rather than leaving a paused last frame sitting there.
  film.addEventListener('ended', function () {
    hero.classList.remove('is-playing');
  });
})();
