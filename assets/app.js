/* ============================================================
   منصة الدروس - الوظائف الرئيسية
   ============================================================ */

var DATA_URL = 'data/lessons.json';
var CLASSROOM_URL = 'https://classroom.google.com/';
var MEET_URL = 'https://meet.google.com/new';
var TEACHER_EMAIL = 'djanounemokhtar4560@gmail.com';

function $(id){ return document.getElementById(id); }
function esc(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function getParam(k){ return new URLSearchParams(location.search).get(k); }

/* ============================================================
   تحميل الدروس
   ============================================================ */
async function fetchLessons(){
  var local = localStorage.getItem('lessons_data');
  if(local){
    try{
      var parsed = JSON.parse(local);
      if(Array.isArray(parsed) && parsed.length) return parsed;
    }catch(e){}
  }
  try{
    var res = await fetch(DATA_URL, { cache: 'no-cache' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }catch(e){
    console.warn('تعذر تحميل الدروس:', e);
    return [];
  }
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
async function initHome(){
  var lessons = await fetchLessons();
  var grid = $('lessonsGrid');
  if(grid) renderHomeGrid(lessons, grid);
  var levelFilter = $('levelFilter');
  if(levelFilter){
    var levels = [];
    lessons.forEach(function(l){
      if(l.level && levels.indexOf(l.level) === -1) levels.push(l.level);
    });
    levels.forEach(function(lv){
      var o = document.createElement('option');
      o.value = lv; o.textContent = lv;
      levelFilter.appendChild(o);
    });
    var search = $('searchInput');
    if(search){
      search.addEventListener('input', function(){
        var q = search.value.toLowerCase().trim();
        var lv2 = levelFilter.value;
        var filtered = lessons.filter(function(l){
          var matchQ = !q || ((l.title||'') + ' ' + (l.description||'')).toLowerCase().indexOf(q) !== -1;
          var matchL = !lv2 || l.level === lv2;
          return matchQ && matchL;
        });
        if(grid) renderHomeGrid(filtered, grid);
      });
    }
    levelFilter.addEventListener('change', function(){
      if(search) search.dispatchEvent(new Event('input'));
    });
  }
}

function renderHomeGrid(list, container){
  if(!list.length){
    container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#607085;padding:40px">لا نتائج.</p>';
    return;
  }
  container.innerHTML = list.map(function(l){
    return '<article class="lesson-card" onclick="openLesson(\'' + l.id + '\')">' +
      (l.level ? '<span class="badge">' + esc(l.level) + '</span>' : '') +
      '<h3>' + esc(l.title) + '</h3>' +
      '<p>' + esc(l.description || '') + '</p>' +
    '</article>';
  }).join('');
}

function openLesson(id){ location.href = 'lesson.html?id=' + encodeURIComponent(id); }

/* ============================================================
   الفهرس الديناميكي (index.html)
   ============================================================ */
async function renderDynamicIndex(){
  var container = $('dynamicIndex');
  if(!container) return;

  var lessons = await fetchLessons();
  if(!lessons.length){
    container.innerHTML = '<div style="text-align:center;padding:60px;color:#607085">' +
      '<p style="font-size:48px">📭</p><p>لا توجد دروس بعد.</p></div>';
    return;
  }

  var levelInfo = {
    '1AS':   { icon:'🧪', title:'السنة الأولى ثانوي – جذع مشترك علوم وتكنولوجيا', desc:'تحويل الطاقة واستعمال المادة', color:'blue' },
    '2AS':   { icon:'🧬', title:'السنة الثانية ثانوي – علوم تجريبية + رياضيات', desc:'وحدة الكائنات الحية، أسس التنوع البيولوجي، والتنظيم العصبي الهرموني', color:'green' },
    '2AS-L': { icon:'📚', title:'السنة الثانية ثانوي – آداب وفلسفة', desc:'التنظيم الهرموني والعصبي', color:'orange' },
    '3AS':   { icon:'🔬', title:'السنة الثالثة ثانوي – علوم تجريبية', desc:'التخصص الوظيفي للبروتينات، تحويل الطاقة، والتكتونية', color:'purple' }
  };

  var order = ['1AS', '2AS', '2AS-L', '3AS'];
  var html = '';

  order.forEach(function(levelKey){
    var info = levelInfo[levelKey];
    if(!info) return;
    var levelLessons = lessons.filter(function(l){ return l.level === levelKey; });
    if(!levelLessons.length) return;
    levelLessons.sort(function(a, b){ return (a.order||999) - (b.order||999); });

    html += '<div id="level-' + levelKey + '" class="level-block">' +
      '<div class="level-header level-header-' + info.color + '">' +
        '<span class="level-icon">' + info.icon + '</span>' +
        '<div><h3>' + info.title + '</h3><p>' + info.desc + '</p></div>' +
      '</div><div class="lessons-list">';

    levelLessons.forEach(function(l){
      var num = String(l.order || 1).padStart(2, '0');
      html += '<a href="lesson.html?id=' + l.id + '" class="lesson-item">' +
        '<span class="lesson-num">' + num + '</span>' +
        '<div class="lesson-info">' +
          '<h4>' + esc(l.title) + '</h4>' +
          '<p>' + esc(l.description || l.domain || '') + '</p>' +
        '</div>' +
        '<span class="lesson-arrow">←</span>' +
      '</a>';
    });
    html += '</div></div>';
  });

  container.innerHTML = html || '<div style="text-align:center;padding:60px;color:#607085">لا توجد دروس مصنّفة.</div>';
}

/* ============================================================
   صفحة الدرس
   ============================================================ */
var currentLesson = null;

async function initLesson(){
  var id = getParam('id');
  var lessons = await fetchLessons();
  currentLesson = null;
  for(var i = 0; i < lessons.length; i++){
    if(lessons[i].id === id){ currentLesson = lessons[i]; break; }
  }

  var titleEl = $('lessonTitle');
  var subEl = $('lessonSubtitle');

  if(!currentLesson){
    if(titleEl) titleEl.textContent = 'الدرس غير موجود';
    if(subEl) subEl.textContent = '';
    var kEl = $('knowledgeContent');
    if(kEl) kEl.innerHTML = '<p><a href="index.html">← العودة للرئيسية</a></p>';
    return;
  }

  document.title = currentLesson.title + ' – منصة الدروس';
  if(titleEl) titleEl.textContent = currentLesson.title;
  if(subEl) subEl.textContent = currentLesson.level || '';

  var kEl = $('knowledgeContent');
  if(kEl) kEl.innerHTML = currentLesson.knowledge || '<p>لا يوجد محتوى.</p>';

  renderMedia(currentLesson.documents || []);
  renderQuiz(currentLesson.quiz || []);

  document.querySelectorAll('.tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ goToPage(btn.dataset.page); });
  });
}

function goToPage(name){
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  var page = $('page-' + name);
  if(page) page.classList.add('active');
  var btn = document.querySelector('.tab-btn[data-page="' + name + '"]');
  if(btn) btn.classList.add('active');
  var map = { knowledge: 33, documents: 66, assessment: 100 };
  var fill = $('progressFill');
  if(fill) fill.style.width = (map[name] || 33) + '%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderMedia(items){
  var g = $('mediaGallery');
  if(!g) return;
  if(!items.length){
    g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#607085">' +
      '<p style="font-size:48px">🎬</p><p>لا توجد وثائق.</p></div>';
    return;
  }
  g.innerHTML = items.map(function(m,i){
    var inner = '';
    if(m.type === 'image') inner = '<img src="' + m.url + '" alt="">';
    else if(m.type === 'video') inner = '<video src="' + m.url + '" preload="metadata"></video>';
    else if(m.type === 'youtube'){
      var vid = extractYouTubeId(m.url);
      inner = '<iframe src="https://www.youtube.com/embed/' + vid + '" allowfullscreen></iframe>';
    }
    else if(m.type === 'pdf') inner = '<iframe src="' + m.url + '" loading="lazy"></iframe>';
    var icon = { image:'🖼️', video:'🎬', youtube:'▶️', pdf:'📄' }[m.type] || '📎';
    return '<div class="media-item" onclick="openLightbox(' + i + ')">' +
      '<span class="type-badge">' + icon + '</span>' +
      inner +
      (m.caption ? '<span class="caption">' + esc(m.caption) + '</span>' : '') +
    '</div>';
  }).join('');
  window._mediaCache = items;
}

function extractYouTubeId(url){
  var m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  return m ? m[1] : '';
}

function openLightbox(i){
  var m = window._mediaCache && window._mediaCache[i];
  if(!m) return;
  var box = $('lightboxContent');
  if(!box) return;
  if(m.type === 'image') box.innerHTML = '<img src="' + m.url + '">';
  else if(m.type === 'video') box.innerHTML = '<video src="' + m.url + '" controls autoplay></video>';
  else if(m.type === 'youtube') box.innerHTML = '<iframe src="https://www.youtube.com/embed/' + extractYouTubeId(m.url) + '?autoplay=1" allowfullscreen></iframe>';
  else if(m.type === 'pdf') box.innerHTML = '<iframe src="' + m.url + '"></iframe>';
  var lb = $('lightbox');
  if(lb) lb.classList.add('show');
}

function closeLightbox(e){
  if(e) e.stopPropagation();
  var lb = $('lightbox');
  if(lb) lb.classList.remove('show');
  var box = $('lightboxContent');
  if(box) box.innerHTML = '';
}

function renderQuiz(quiz){
  var c = $('quizContainer');
  if(!c) return;
  if(!quiz.length){
    c.innerHTML = '<div style="text-align:center;padding:60px;color:#607085">' +
      '<p style="font-size:48px">📝</p><p>لا يوجد تقويم.</p></div>';
    var btn = $('submitQuizBtn');
    if(btn) btn.style.display = 'none';
    return;
  }
  c.innerHTML = quiz.map(function(q,i){
    var body = '';
    if(q.type === 'mcq'){
      body = q.options.map(function(opt,j){
        return '<label class="quiz-option">' +
          '<input type="radio" name="q' + i + '" value="' + j + '">' +
          '<span>' + esc(opt) + '</span></label>';
      }).join('');
    } else {
      body = '<div class="quiz-option"><textarea rows="3" name="q' + i + '" placeholder="اكتب إجابتك..."></textarea></div>';
    }
    return '<div class="quiz-question" data-index="' + i + '">' +
      '<h4><span class="q-num">' + (i+1) + '</span>' + esc(q.question) + '</h4>' + body + '</div>';
  }).join('');
}

function submitQuiz(){
  if(!currentLesson) return;
  var quiz = currentLesson.quiz || [];
  if(!quiz.length) return;
  var score = 0;
  quiz.forEach(function(q,i){
    var el = document.querySelector('.quiz-question[data-index="' + i + '"]');
    if(!el) return;
    if(q.type === 'mcq'){
      var sel = document.querySelector('input[name="q' + i + '"]:checked');
      var correct = Number(q.correct);
      el.querySelectorAll('.quiz-option').forEach(function(opt,j){
        opt.classList.remove('correct','wrong');
        if(j === correct) opt.classList.add('correct');
        if(sel && Number(sel.value) === j && j !== correct) opt.classList.add('wrong');
      });
      if(sel && Number(sel.value) === correct) score++;
    } else {
      var model = document.createElement('div');
      model.className = 'model-answer';
      model.style.cssText = 'background:#E8F5E9;padding:10px;border-radius:8px;margin-top:8px';
      model.innerHTML = '<strong>✅ الإجابة النموذجية:</strong> ' + esc(q.answer || '—');
      if(!el.querySelector('.model-answer')) el.appendChild(model);
      score++;
    }
  });
  var old = document.querySelector('.quiz-result');
  if(old) old.remove();
  var result = document.createElement('div');
  result.className = 'quiz-result';
  result.innerHTML = '<h3>🎉 نتيجتك: ' + score + ' / ' + quiz.length + '</h3>' +
    '<p>أرسل إجاباتك للأستاذ عبر Google Classroom.</p>';
  var c = $('quizContainer');
  if(c){ c.prepend(result); result.scrollIntoView({ behavior:'smooth', block:'center' }); }
}

/* ============================================================
   Classroom + Meet
   ============================================================ */
function shareToClassroom(){
  if(!currentLesson){ alert('لا يوجد درس مفتوح'); return; }
  var url = window.location.href;
  var title = '📘 ' + currentLesson.title + ' – ' + (currentLesson.level || '');
  var body = 'درس في مادة علوم الطبيعة والحياة\n' + (currentLesson.description || '') + '\n\nالرابط: ' + url;
  var shareUrl = 'https://classroom.google.com/share?url=' +
    encodeURIComponent(url) + '&title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
  window.open(shareUrl, '_blank');
}

function openGoogleMeet(){
  if(confirm('🎥 فتح Google Meet لإنشاء اجتماع جديد؟\n\nالحساب: ' + TEACHER_EMAIL)){
    window.open(MEET_URL, '_blank');
  }
}

/* ============================================================
   لوحة الإدارة
   ============================================================ */
var lessonsData = [];
var editingIndex = -1;

async function initAdmin(){
  lessonsData = await fetchLessons();
  if(!Array.isArray(lessonsData)) lessonsData = [];
  renderLessonList();
  var form = $('lessonForm');
  if(form) form.addEventListener('submit', saveLesson);
  var imp = $('importFile');
  if(imp) imp.addEventListener('change', importJSON);
}

function renderLessonList(){
  var ul = $('lessonList');
  if(!ul) return;
  if(!lessonsData.length){
    ul.innerHTML = '<li style="color:#607085;font-size:13px;text-align:center;padding:20px">لا توجد دروس</li>';
    return;
  }
  ul.innerHTML = lessonsData.map(function(l,i){
    return '<li class="' + (i === editingIndex ? 'active' : '') + '" onclick="editLesson(' + i + ')">' +
      '<div><strong>' + esc(l.title || 'بدون عنوان') + '</strong></div>' +
      '<small style="opacity:.7;font-size:11px">' + esc(l.level || '') + '</small></li>';
  }).join('');
}

function newLesson(){
  editingIndex = -1;
  var empty = $('editorEmpty'); if(empty) empty.style.display = 'none';
  var form = $('lessonForm'); if(form){ form.style.display = 'block'; form.reset(); }
  var ml = $('mediaList'); if(ml) ml.innerHTML = '';
  var ql = $('quizList'); if(ql) ql.innerHTML = '';
  var t = $('f-title'); if(t) t.focus();
  renderLessonList();
}

function editLesson(i){
  var l = lessonsData[i];
  if(!l) return;
  editingIndex = i;
  var empty = $('editorEmpty'); if(empty) empty.style.display = 'none';
  var form = $('lessonForm'); if(form) form.style.display = 'block';
  if($('f-title')) $('f-title').value = l.title || '';
  if($('f-level')) $('f-level').value = l.level || '1AS';
  if($('f-domain')) $('f-domain').value = l.domain || '';
  if($('f-order')) $('f-order').value = l.order || 1;
  if($('f-desc')) $('f-desc').value = l.description || '';
  if($('f-knowledge')) $('f-knowledge').value = l.knowledge || '';
  if($('mediaList')){
    $('mediaList').innerHTML = '';
    (l.documents || []).forEach(function(m){ addMediaItem(m); });
  }
  if($('quizList')){
    $('quizList').innerHTML = '';
    (l.quiz || []).forEach(function(q){ addQuizQuestion(q); });
  }
  renderLessonList();
}

function addMediaItem(data){
  data = data || {};
  var div = document.createElement('div');
  div.className = 'media-item';
  div.innerHTML =
    '<button type="button" class="btn-remove" style="float:left;margin-bottom:8px" onclick="this.parentElement.remove()">✕ حذف</button>' +
    '<select class="m-type">' +
      '<option value="image"' + (data.type==='image'?' selected':'') + '>🖼️ صورة</option>' +
      '<option value="youtube"' + (data.type==='youtube'?' selected':'') + '>▶️ YouTube</option>' +
      '<option value="video"' + (data.type==='video'?' selected':'') + '>🎬 فيديو</option>' +
      '<option value="pdf"' + (data.type==='pdf'?' selected':'') + '>📄 PDF</option>' +
    '</select>' +
    '<input type="text" class="m-url" placeholder="الرابط" value="' + esc(data.url||'') + '">' +
    '<input type="text" class="m-caption" placeholder="وصف قصير" value="' + esc(data.caption||'') + '">';
  var ml = $('mediaList'); if(ml) ml.appendChild(div);
}

function addQuizQuestion(data){
  data = data || {};
  var div = document.createElement('div');
  div.className = 'quiz-item';
  div.innerHTML =
    '<button type="button" class="btn-remove" style="float:left;margin-bottom:8px" onclick="this.parentElement.remove()">✕ حذف</button>' +
    '<select class="q-type">' +
      '<option value="mcq"' + (data.type==='mcq'?' selected':'') + '>اختيار من متعدد</option>' +
      '<option value="text"' + (data.type==='text'?' selected':'') + '>إجابة نصية</option>' +
    '</select>' +
    '<input type="text" class="q-text" placeholder="نص السؤال" value="' + esc(data.question||'') + '">' +
    '<textarea class="q-options" rows="2" placeholder="الخيارات مفصولة بفاصلة">' + esc((data.options||[]).join(', ')) + '</textarea>' +
    '<input type="text" class="q-correct" placeholder="رقم الإجابة (0,1,2) أو الإجابة النموذجية" value="' +
      esc(data.type==='mcq' ? (data.correct!=null?data.correct:'') : (data.answer||'')) + '">';
  var ql = $('quizList'); if(ql) ql.appendChild(div);
}

function saveLesson(e){
  if(e) e.preventDefault();
  var documents = Array.prototype.slice.call($('mediaList').querySelectorAll('.media-item')).map(function(it){
    return {
      type: it.querySelector('.m-type').value,
      url: it.querySelector('.m-url').value.trim(),
      caption: it.querySelector('.m-caption').value.trim()
    };
  }).filter(function(m){ return m.url; });

  var quiz = Array.prototype.slice.call($('quizList').querySelectorAll('.quiz-item')).map(function(it){
    var type = it.querySelector('.q-type').value;
    var q = { type: type, question: it.querySelector('.q-text').value.trim() };
    if(type === 'mcq'){
      q.options = it.querySelector('.q-options').value.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      q.correct = Number(it.querySelector('.q-correct').value) || 0;
    } else {
      q.answer = it.querySelector('.q-correct').value.trim();
    }
    return q;
  }).filter(function(q){ return q.question; });

  var lesson = {
    id: editingIndex >= 0 ? lessonsData[editingIndex].id : 'lesson-' + Date.now(),
    title: $('f-title').value.trim(),
    level: $('f-level').value,
    domain: $('f-domain') ? $('f-domain').value.trim() : '',
    order: $('f-order') ? (Number($('f-order').value) || 1) : 1,
    description: $('f-desc').value.trim(),
    knowledge: $('f-knowledge').value,
    documents: documents,
    quiz: quiz
  };

  if(editingIndex >= 0) lessonsData[editingIndex] = lesson;
  else lessonsData.push(lesson);

  localStorage.setItem('lessons_data', JSON.stringify(lessonsData));
  editingIndex = lessonsData.length - 1;
  renderLessonList();
  alert('✅ تم حفظ الدرس محلياً.\n\nلنشره:\n1) اضغط "تصدير JSON"\n2) انقل الملف إلى data/lessons.json\n3) git push');
}

function deleteCurrentLesson(){
  if(editingIndex < 0) return;
  if(!confirm('حذف هذا الدرس؟')) return;
  lessonsData.splice(editingIndex, 1);
  localStorage.setItem('lessons_data', JSON.stringify(lessonsData));
  editingIndex = -1;
  var form = $('lessonForm'); if(form) form.style.display = 'none';
  var empty = $('editorEmpty'); if(empty) empty.style.display = 'block';
  renderLessonList();
}

function exportLessons(){
  var blob = new Blob([JSON.stringify(lessonsData, null, 2)], { type:'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lessons.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(e){
  var file = e.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(ev){
    try{
      lessonsData = JSON.parse(ev.target.result);
      localStorage.setItem('lessons_data', JSON.stringify(lessonsData));
      editingIndex = -1;
      renderLessonList();
      alert('✅ تم استيراد ' + lessonsData.length + ' درساً');
    }catch(err){ alert('❌ ملف غير صالح: ' + err.message); }
  };
  reader.readAsText(file);
}

/* ============================================================
   التشغيل التلقائي
   ============================================================ */
document.addEventListener('DOMContentLoaded', function(){
  if(document.body.classList.contains('lesson-page')) return;
  if($('dynamicIndex')) renderDynamicIndex();
  if($('lessonsGrid')) initHome();
});/* ============ فتح ورقة الاختبار ============ */
function openWorksheet(){
  if(!currentLesson){ return; }
  var id = currentLesson.id;
  // استخدم رقم الدرس من order
  var num = currentLesson.order || 1;
  var url = 'assets/worksheets/lesson' + num + '-worksheet.html';
  window.open(url, '_blank');
}