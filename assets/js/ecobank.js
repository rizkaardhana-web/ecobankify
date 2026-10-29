/* EcoBank - interaksi bersama: modal, pencarian katalog, menu aktif, validasi formulir */
(function () {
	var $ = function (s, c) { return (c || document).querySelector(s); };
	var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
	var lastFocus;

	window.openModal = function (id) {
		var m = document.getElementById(id); if (!m) return;
		lastFocus = document.activeElement;
		m.style.display = 'flex'; m.setAttribute('aria-hidden', 'false');
		document.body.style.overflow = 'hidden';
		var c = $('.modal-close', m); if (c) c.focus();
	};
	window.closeModal = function (id) {
		var m = document.getElementById(id); if (!m) return;
		m.style.display = 'none'; m.setAttribute('aria-hidden', 'true');
		document.body.style.overflow = '';
		if (lastFocus) lastFocus.focus();
	};
	document.addEventListener('click', function (e) {
		if (e.target.classList && e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
	});
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') $$('.modal-overlay').forEach(function (m) { if (m.style.display === 'flex') closeModal(m.id); });
	});

	$$('.sample-box img').forEach(function (img) { img.addEventListener('error', function () { img.hidden = true; }); });

	// Pencarian katalog
	var q = $('#katalogCari');
	if (q) {
		var cards = $$('#katalog .equal-height-col'), empty = $('#katalogKosong'), count = $('#katalogJumlah');
		q.addEventListener('input', function () {
			var v = q.value.trim().toLowerCase(), n = 0;
			cards.forEach(function (c) { var ok = c.textContent.toLowerCase().indexOf(v) > -1; c.hidden = !ok; if (ok) n++; });
			empty.hidden = n > 0; count.textContent = n + ' dari ' + cards.length + ' lokasi';
		});
	}

	// Indikator menu aktif
	var links = $$('#nav > ul > li');
	function mark(href) { links.forEach(function (li) { li.classList.toggle('current', li.firstElementChild.getAttribute('href') === href); }); }
	var page = location.pathname.split('/').pop() || 'index.html';
	if (page === 'index.html') {
		mark('index.html');
		if ('IntersectionObserver' in window) {
			var io = new IntersectionObserver(function (es) {
				es.forEach(function (e) { if (e.isIntersecting) mark('index.html#' + e.target.id); });
			}, { rootMargin: '-40% 0px -55% 0px' });
			['katalog', 'edukasi'].forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
			var hero = $('.hero-modern'); if (hero) io.observe(Object.assign(hero, { id: hero.id || 'beranda' }));
			window.addEventListener('scroll', function () { if (window.scrollY < 80) mark('index.html'); }, { passive: true });
		}
	} else if (page === 'contact.html') { mark('contact.html'); }

	// Formulir kontak
	var f = $('#kontakForm');
	if (f) f.addEventListener('submit', function (e) {
		e.preventDefault();
		var ok = true, first, st = $('#kontakStatus');
		$$('[data-req]', f).forEach(function (i) {
			var v = i.value.trim(), msg = '';
			if (!v) msg = 'Isi kolom ini.';
			else if (i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Masukkan email yang valid, contoh: nama@email.com.';
			else if (i.name === 'message' && v.length < 10) msg = 'Pesan minimal 10 karakter.';
			i.parentNode.querySelector('.field-error').textContent = msg;
			i.setAttribute('aria-invalid', msg ? 'true' : 'false');
			if (msg) { ok = false; first = first || i; }
		});
		if (!ok) { st.className = 'form-status is-error'; st.textContent = 'Periksa kolom yang ditandai.'; first.focus(); return; }
		var ep = f.getAttribute('data-endpoint');
		if (!ep) { st.className = 'form-status is-error'; st.textContent = 'Pesan belum terkirim: formulir ini belum terhubung ke email atau server penerima.'; return; }
		var b = $('button[type=submit]', f); b.disabled = true; b.textContent = 'Mengirim…';
		fetch(ep, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(f) })
			.then(function (r) { if (!r.ok) throw 0; st.className = 'form-status is-ok'; st.textContent = 'Pesan terkirim. Terima kasih sudah menghubungi EcoBank.'; f.reset(); })
			.catch(function () { st.className = 'form-status is-error'; st.textContent = 'Pesan gagal terkirim. Coba lagi beberapa saat lagi.'; })
			.then(function () { b.disabled = false; b.textContent = 'Kirim pesan'; });
	});
})();

// Lokasi pengguna + bank sampah terdekat (OpenStreetMap Overpass)
(function () {
	var btn = document.getElementById('lokasiBtn'); if (!btn) return;
	var st = document.getElementById('lokasiStatus'), wrap = document.getElementById('lokasiWrap'), out = document.getElementById('lokasiHasil');
	function say(t, c) { st.className = 'form-status ' + (c || ''); st.textContent = t; }
	function km(a, b, c, d) {
		var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2);
		var h = x * x + Math.cos(a * r) * Math.cos(c * r) * y * y; return 12742 * Math.asin(Math.sqrt(h));
	}
	function render(list, lat, lon) {
		out.textContent = '';
		list.forEach(function (e) {
			var col = document.createElement('div'); col.className = 'col-4 col-12-narrower equal-height-col';
			var card = document.createElement('div'); card.className = 'glass-card';
			var top = document.createElement('div'), h = document.createElement('h3'), d = document.createElement('span'), a = document.createElement('a');
			h.textContent = e.name; d.className = 'jarak'; d.textContent = (e.d < 1 ? Math.round(e.d * 1000) + ' m' : e.d.toFixed(1) + ' km') + ' dari kamu';
			a.className = 'btn-outline'; a.target = '_blank'; a.rel = 'noopener'; a.style.textAlign = 'center';
			a.href = 'https://www.google.com/maps/dir/?api=1&origin=' + lat + ',' + lon + '&destination=' + e.lat + ',' + e.lon; a.textContent = 'Rute ke lokasi';
			top.appendChild(h); top.appendChild(d); card.appendChild(top); card.appendChild(a); col.appendChild(card); out.appendChild(col);
		});
		wrap.hidden = false;
	}
	function cari(lat, lon) {
		say('Mencari bank sampah di sekitarmu…');
		var q = '[out:json][timeout:20];(nwr(around:10000,' + lat + ',' + lon + ')["amenity"="recycling"];nwr(around:10000,' + lat + ',' + lon + ')["name"~"bank sampah",i];);out center 60;';
		return fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) })
			.then(function (r) { if (!r.ok) throw 0; return r.json(); })
			.then(function (j) {
				var seen = {}, list = [];
				j.elements.forEach(function (e) {
					var la = e.lat || (e.center && e.center.lat), lo = e.lon || (e.center && e.center.lon);
					if (la == null || seen[e.type + e.id]) return; seen[e.type + e.id] = 1;
					list.push({ name: (e.tags && e.tags.name) || 'Titik daur ulang (tanpa nama)', lat: la, lon: lo, d: km(lat, lon, la, lo) });
				});
				list.sort(function (a, b) { return a.d - b.d; });
				if (!list.length) { wrap.hidden = true; say('Belum ada titik bank sampah tercatat dalam 10 km dari lokasimu. Coba cari lewat katalog di atas.', 'is-error'); return; }
				render(list.slice(0, 6), lat, lon); say('Menampilkan ' + Math.min(6, list.length) + ' lokasi terdekat. Klik tombol lagi untuk memperbarui.', 'is-ok');
			});
	}
	btn.addEventListener('click', function () {
		if (!navigator.geolocation) { say('Peramban ini tidak mendukung layanan lokasi.', 'is-error'); return; }
		btn.disabled = true; say('Meminta izin lokasi…');
		navigator.geolocation.getCurrentPosition(function (p) {
			cari(p.coords.latitude, p.coords.longitude)
				.catch(function () { say('Data lokasi gagal dimuat. Periksa koneksi internet lalu coba lagi.', 'is-error'); })
				.then(function () { btn.disabled = false; });
		}, function (err) {
			btn.disabled = false;
			say(err.code === 1 ? 'Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan peramban, lalu coba lagi.' : 'Lokasimu belum bisa dibaca. Pastikan GPS atau lokasi perangkat aktif.', 'is-error');
		}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
	});
})();
