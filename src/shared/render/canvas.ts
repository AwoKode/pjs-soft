/**
 * Direct-manipulation layer for the template builder.
 *
 * These styles and this script are injected only when the document is rendered
 * with mode 'canvas'. The print path never sees them, so the PDF is produced
 * from exactly the same markup minus the handles.
 *
 * During a drag the script mutates a live <style> element inside the iframe
 * rather than telling the parent on every pointer move: re-rendering mid-drag
 * would rebuild the DOM and drop the gesture. The parent is told the final
 * value on pointerup and re-renders once.
 */

export const CANVAS_STYLES = `
/* ---- interactive canvas ---- */
[data-drag] { position: relative; }
[data-drag]:hover { outline: 1px dashed rgba(31,78,121,.55); outline-offset: 2px; }
.pjs-selected { outline: 2px solid #1f4e79 !important; outline-offset: 2px; }

.mg { position: absolute; z-index: 20; }
.mg::after { content: ''; position: absolute; background: rgba(31,78,121,.30); }
.mg:hover::after, .mg.dragging::after { background: #1f4e79; }
.mg-top, .mg-bottom { left: 0; right: 0; height: 11px; cursor: ns-resize; }
.mg-top::after, .mg-bottom::after { left: 0; right: 0; top: 5px; height: 1px; }
.mg-left, .mg-right { top: 0; bottom: 0; width: 11px; cursor: ew-resize; }
.mg-left::after, .mg-right::after { top: 0; bottom: 0; left: 5px; width: 1px; }

.pjs-handle { position: absolute; width: 13px; height: 13px; right: -7px; bottom: -7px;
  background: #fff; border: 2px solid #1f4e79; border-radius: 3px; cursor: nwse-resize;
  z-index: 25; }
.header-logo { display: inline-block; }
.header-logo .pjs-handle { right: -9px; bottom: -3px; cursor: ew-resize; }

.col-grip { position: absolute; top: 0; right: -4px; width: 9px; height: 100%;
  cursor: col-resize; z-index: 22; }
.col-grip:hover { background: rgba(255,255,255,.45); }

.pf[data-drag='field'] { cursor: grab; }
.pjs-drop-line { position: absolute; left: 0; right: 0; height: 2px; background: #1f4e79;
  z-index: 30; pointer-events: none; }
.pjs-badge { position: fixed; left: 50%; top: 10px; transform: translateX(-50%);
  background: #1f2937; color: #fff; padding: 4px 12px; border-radius: 999px;
  font: 12px/1.4 'Segoe UI', sans-serif; z-index: 100; pointer-events: none; }
`

export const CANVAS_SCRIPT = `
(function () {
  var sheet = document.querySelector('.sheet');
  if (!sheet) return;
  var live = document.createElement('style');
  document.head.appendChild(live);
  var badge = null;

  function pxPerMm() { return sheet.offsetWidth / parseFloat(sheet.dataset.pageWidth); }
  function send(edit) { parent.postMessage({ source: 'pjs-canvas', edit: edit }, '*'); }
  function sendHeight() {
    parent.postMessage({ source: 'pjs-canvas', height: document.body.scrollHeight }, '*');
  }
  function showBadge(t) {
    if (!badge) { badge = document.createElement('div'); badge.className = 'pjs-badge';
      document.body.appendChild(badge); }
    badge.textContent = t;
  }
  function hideBadge() { if (badge) { badge.remove(); badge = null; } }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // --- margin guides ------------------------------------------------------
  var margins = {
    top: parseFloat(sheet.dataset.marginTop),
    right: parseFloat(sheet.dataset.marginRight),
    bottom: parseFloat(sheet.dataset.marginBottom),
    left: parseFloat(sheet.dataset.marginLeft)
  };
  function placeGuides() {
    var g;
    if ((g = sheet.querySelector('.mg-top'))) g.style.top = 'calc(' + margins.top + 'mm - 5px)';
    if ((g = sheet.querySelector('.mg-bottom'))) g.style.bottom = 'calc(' + margins.bottom + 'mm - 5px)';
    if ((g = sheet.querySelector('.mg-left'))) g.style.left = 'calc(' + margins.left + 'mm - 5px)';
    if ((g = sheet.querySelector('.mg-right'))) g.style.right = 'calc(' + margins.right + 'mm - 5px)';
  }
  placeGuides();

  // --- generic pointer drag ----------------------------------------------
  function onDrag(el, opts) {
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      el.classList.add('dragging');
      var start = { x: e.clientX, y: e.clientY };
      var state = opts.begin();

      function move(ev) {
        opts.update(state, ev.clientX - start.x, ev.clientY - start.y);
      }
      function up() {
        el.classList.remove('dragging');
        // Listeners live on window so the gesture survives the pointer
        // leaving the handle, with capture as a belt-and-braces extra.
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        hideBadge();
        opts.commit(state);
        sendHeight();
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  Array.prototype.forEach.call(sheet.querySelectorAll('.mg'), function (guide) {
    var side = guide.dataset.side;
    onDrag(guide, {
      begin: function () { return { value: margins[side] }; },
      update: function (state, dx, dy) {
        var delta = side === 'top' ? dy : side === 'bottom' ? -dy : side === 'left' ? dx : -dx;
        state.next = clamp(Math.round((state.value + delta / pxPerMm()) * 2) / 2, 0, 60);
        margins[side] = state.next;
        live.textContent = '.sheet{padding:' + margins.top + 'mm ' + margins.right + 'mm ' +
          margins.bottom + 'mm ' + margins.left + 'mm}';
        placeGuides();
        showBadge('Margines ' + side + ': ' + state.next + ' mm');
      },
      commit: function (state) {
        if (state.next != null) send({ op: 'margin', side: side, value: state.next });
      }
    });
  });

  // --- image resize -------------------------------------------------------
  var image = sheet.querySelector('[data-drag="image"]');
  if (image) {
    var ih = document.createElement('div');
    ih.className = 'pjs-handle';
    image.appendChild(ih);
    onDrag(ih, {
      begin: function () {
        return { w: image.offsetWidth, h: image.offsetHeight };
      },
      update: function (state, dx, dy) {
        state.nw = clamp(Math.round(state.w + dx), 30, 600);
        state.nh = clamp(Math.round(state.h + dy), 30, 600);
        live.textContent = '.product-image{flex-basis:' + state.nw + 'px;width:' + state.nw +
          'px;height:' + state.nh + 'px}';
        showBadge('Zdjęcie: ' + state.nw + ' × ' + state.nh + ' px');
      },
      commit: function (state) {
        if (state.nw != null) send({ op: 'imageSize', width: state.nw, height: state.nh });
      }
    });
  }

  // --- logo resize --------------------------------------------------------
  var logo = sheet.querySelector('[data-drag="logo"]');
  if (logo) {
    var lh = document.createElement('div');
    lh.className = 'pjs-handle';
    logo.appendChild(lh);
    onDrag(lh, {
      begin: function () { return { w: logo.querySelector('img').offsetWidth }; },
      update: function (state, dx) {
        state.nw = clamp(Math.round(state.w + dx), 40, 700);
        live.textContent = '.header-logo img{width:' + state.nw + 'px}';
        showBadge('Logo: ' + state.nw + ' px');
      },
      commit: function (state) {
        if (state.nw != null) send({ op: 'logoWidth', value: state.nw });
      }
    });
  }

  // --- table column widths ------------------------------------------------
  Array.prototype.forEach.call(sheet.querySelectorAll('.layout-table th'), function (th, index) {
    var grip = th.querySelector('.col-grip');
    var next = th.nextElementSibling;
    if (!grip || !next) return;
    onDrag(grip, {
      begin: function () {
        var total = th.parentElement.offsetWidth;
        return { total: total, a: (th.offsetWidth / total) * 100, b: (next.offsetWidth / total) * 100 };
      },
      update: function (state, dx) {
        var deltaPct = (dx / state.total) * 100;
        var limit = state.a + state.b - 4;
        state.na = clamp(Math.round((state.a + deltaPct) * 10) / 10, 4, limit);
        state.nb = Math.round((state.a + state.b - state.na) * 10) / 10;
        live.textContent = '.layout-table th:nth-child(' + (index + 1) + '),' +
          '.layout-table td:nth-child(' + (index + 1) + '){width:' + state.na + '%}' +
          '.layout-table th:nth-child(' + (index + 2) + '),' +
          '.layout-table td:nth-child(' + (index + 2) + '){width:' + state.nb + '%}';
        showBadge('Kolumna: ' + state.na + '%');
      },
      commit: function (state) {
        if (state.na != null) {
          send({ op: 'columnWidth', index: index, width: state.na, nextWidth: state.nb });
        }
      }
    });
  });

  // --- reordering the lines inside a product block ------------------------
  var firstBody = sheet.querySelector('.product-body');
  if (firstBody) {
    var fields = Array.prototype.slice.call(firstBody.querySelectorAll('[data-drag="field"]'));
    fields.forEach(function (field) {
      field.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        try { field.setPointerCapture(e.pointerId); } catch (err) {}
        var line = document.createElement('div');
        line.className = 'pjs-drop-line';
        firstBody.style.position = 'relative';
        firstBody.appendChild(line);
        var target = fields.indexOf(field);

        function move(ev) {
          var best = fields.length - 1;
          for (var i = 0; i < fields.length; i++) {
            var box = fields[i].getBoundingClientRect();
            if (ev.clientY < box.top + box.height / 2) { best = i; break; }
          }
          target = best;
          var ref = fields[Math.min(best, fields.length - 1)].getBoundingClientRect();
          var host = firstBody.getBoundingClientRect();
          line.style.top = (best >= fields.length ? ref.bottom - host.top : ref.top - host.top) + 'px';
          showBadge('Przenieś: ' + (field.textContent || '').slice(0, 28));
        }
        function up() {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          line.remove();
          hideBadge();
          var from = fields.indexOf(field);
          if (target !== from) {
            send({ op: 'reorderField', from: from, to: target });
          }
        }
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
    });
  }

  // --- click to select ----------------------------------------------------
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-drag], .pf, .doc-header, .terms, .doc-footer, .layout-table') : null;
    Array.prototype.forEach.call(document.querySelectorAll('.pjs-selected'), function (n) {
      n.classList.remove('pjs-selected');
    });
    if (!el) return;
    el.classList.add('pjs-selected');
    var target = el.dataset && el.dataset.drag ? el.dataset.drag :
      el.classList.contains('doc-header') ? 'header' :
      el.classList.contains('terms') ? 'terms' :
      el.classList.contains('doc-footer') ? 'footer' :
      el.classList.contains('layout-table') ? 'table' : 'product';
    if (target === 'field' && el.dataset.index) target = 'field:' + el.dataset.index;
    send({ op: 'select', target: target });
  });

  window.addEventListener('load', sendHeight);
  sendHeight();
})();
`
