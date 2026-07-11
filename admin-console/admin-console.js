(function initializeAdminHome() {
  var todayLabel = document.getElementById('todayLabel');
  if (todayLabel) {
    var formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });
    todayLabel.textContent = formatter.format(new Date()) + ' KST';
  }

  var links = Array.prototype.slice.call(document.querySelectorAll('.side-link'));
  links.forEach(function bindSideLink(link) {
    link.addEventListener('click', function markActive(event) {
      var href = link.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      links.forEach(function clearActive(item) {
        item.classList.remove('active');
      });
      link.classList.add('active');
      var target = document.querySelector(href);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
