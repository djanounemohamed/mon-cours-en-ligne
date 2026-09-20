/* ============================================================
   منصة الدروس - الأستاذ دجانون محمد
   ============================================================ */

var CLASSROOM_URL = 'https://classroom.google.com/';
var MEET_URL = 'https://meet.google.com/new';
var TEACHER_EMAIL = 'djanounemokhtar4560@gmail.com';
var DATA_URL = 'data/lessons.json';

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function getParam(k){ return new URLSearchParams(location.search).get(k); }

/* ============================================================
   تحميل الدروس
   ============================================================ */
async function fetchLessons(){
  var local = localStorage.getItem('lessons_data');
  if(local){
    try{ return JSON.parse(local); }catch(e){ console.warn('localStorage error:', e); }
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
  if(!grid) return;

  if(!lessons.length){
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px">' +
      '<p style="font-size:48px">📭</p>' +
      '<p style="color:#607085;margin-top:10px">لا توجد دروس بعد.</p>' +
      '<p style="color:#607085;font-size:14px">أضف دروساً من <a href="admin.html">لوحة الإدارة</a>.</p>' +
    '</div>';
    return;
  }

  var levels = [];
  lessons.forEach(function(l){
    if(l.level && levels.indexOf(l.level) === -1) levels.push(l.level);
  });
  var levelFilter = $('levelFilter');
  if(levelFilter){
    levels.forEach(function(lv){
      var o = document.createElement('option');
      o.value = lv;
      o.textContent = lv;
      levelFilter.appendChild(o);
    });
  }

  function render(list){
    if(!list.length){
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#607085;padding:40px">لا نتائج مطابقة.</p>';
      return;
    }
    grid.innerHTML = list.map(function(l){
      return '<article class="lesson-card" onclick="openLesson(\'' + l.id + '\')">' +
        (l.level ? '<span class="badge">' + esc(l.level) + '</span>' : '') +
        '<h3>' + esc(l.title) + '</h3>' +
        '<p>' + esc(l.description || '') + '</p>' +
        '<div class="card-footer">' +
          '<span>📘 ' + ((l.knowledge||'').length ? 'جاهز' : 'قيد الإعداد') + '</span>' +
          '<span class="arrow">ابدأ ←</span>' +
        '</div>' +
      '</article>';
    }).join('');
  }
  render(lessons);

  var searchInput = $('searchInput');
  if(searchInput){
    searchInput.addEventListener('input', function(){
      var q = searchInput.value.toLowerCase().trim();
      var lv = levelFilter ? levelFilter.value : '';
      var filtered = lessons.filter(function(l){
        var matchQ = !q || ((l.title||'') + ' ' + (l.description||'')).toLowerCase().indexOf(q) !== -1;
        var matchL = !lv || l.level === lv;
        return matchQ && matchL;
      });
      render(filtered);
    });
  }

  if(levelFilter){
    levelFilter.addEventListener('change', function(){
      if(searchInput) searchInput.dispatchEvent(new Event('input'));
    });
  }
}

function openLesson(id){
  location.href = 'lesson.html?id=' + encodeURIComponent(id);
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

  if(!currentLesson){
    var main = document.querySelector('.lesson-main');
    if(main){
      main.innerHTML = '<div style="text-align:center;padding:80px 20px">' +
        '<p style="font-size:56px">😕</p>' +
        '<h2>الدرس غير موجود</h2>' +
        '<p><a href="index.html">← العودة إلى الصفحة الرئيسية</a></p>' +
      '</div>';
    }
    return;
  }

  document.title = currentLesson.title + ' – منصة الدروس';
  var titleEl = $('lessonTitle');
  var subEl = $('lessonSubtitle');
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
    g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px">' +
      '<p style="font-size:48px">🎬</p>' +
      '<p style="color:#607085">لا توجد وثائق لهذا الدرس.</p>' +
    '</div>';
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
    return '<div class="media-item" onclick="openLightbox(' + i + ')">' +
      '<span class="type-badge">' + mediaIcon(m.type) + '</span>' +
      inner +
      (m.caption ? '<span class="caption">' + esc(m.caption) + '</span>' : '') +
    '</div>';
  }).join('');
  window._mediaCache = items;
}

function mediaIcon(t){
  var icons = { image:'🖼️', video:'🎬', youtube:'▶️', pdf:'📄' };
  return icons[t] || '📎';
}

function extractYouTubeId(url){
  var m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  return m ? m[1] : '';
}

function openLightbox(i){
  var m = window._mediaCache[i];
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
    c.innerHTML = '<div style="text-align:center;padding:60px">' +
      '<p style="font-size:48px">📝</p>' +
      '<p style="color:#607085">لا يوجد تقويم لهذا الدرس.</p>' +
    '</div>';
    var btn = $('submitQuizBtn');
    if(btn) btn.style.display = 'none';
    return;
  }
  c.innerHTML = quiz.map(function(q,i){
    var body = '';
    if(q.type === 'mcq'){
      body = q.options.map(function(opt,j){
        return '<label class="quiz-option" data-q="' + i + '" data-opt="' + j + '">' +
          '<input type="radio" name="q' + i + '" value="' + j + '">' +
          '<span>' + esc(opt) + '</span>' +
        '</label>';
      }).join('');
    } else {
      body = '<div class="quiz-option"><textarea rows="3" name="q' + i + '" placeholder="اكتب إجابتك..."></textarea></div>';
    }
    return '<div class="quiz-question" data-index="' + i + '">' +
      '<h4><span class="q-num">' + (i+1) + '</span>' + esc(q.question) + '</h4>' +
      body +
    '</div>';
  }).join('');
}

function submitQuiz(){
  var quiz = currentLesson.quiz || [];
  if(!quiz.length) return;
  var score = 0;
  var total = quiz.length;

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
  result.innerHTML = '<h3>🎉 نتيجتك: ' + score + ' / ' + total + '</h3>' +
    '<p>يمكنك إرسال الإجابات إلى الأستاذ عبر Google Classroom.</p>';
  var container = $('quizContainer');
  if(container){
    container.prepend(result);
    result.scrollIntoView({ behavior:'smooth', block:'center' });
  }
}

/* ============================================================
   مشاركة في Google Classroom
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

/* ============================================================
   فتح Google Meet
   ============================================================ */
function openGoogleMeet(){
  if(confirm('🎥 سيتم فتح Google Meet لإنشاء اجتماع جديد.\n\nالحساب: ' + TEACHER_EMAIL + '\n\nهل تريد المتابعة؟')){
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
  var imgUp = $('imageUpload');
  if(imgUp){
    imgUp.addEventListener('change', async function(e){
      var files = Array.from(e.target.files);
      for(var i = 0; i < files.length; i++){
        var f = files[i];
        if(f.size > 1500000){ alert('⚠️ الصورة "' + f.name + '" كبيرة جداً (الحد 1.5MB)'); continue; }
        var url = await fileToDataURL(f);
        addMediaItem({ type:'image', url:url, caption:f.name });
      }
      e.target.value = '';
    });
  }
}

function fileToDataURL(file){
  return new Promise(function(resolve, reject){
    var reader = new FileReader();
    reader.onload = function(){ resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderLessonList(){
  var ul = $('lessonList');
  if(!ul) return;
  if(!lessonsData.length){
    ul.innerHTML = '<li style="color:#607085;font-size:13px;text-align:center;padding:20px">لا توجد دروس بعد</li>';
    return;
  }
  ul.innerHTML = lessonsData.map(function(l,i){
    return '<li class="' + (i === editingIndex ? 'active' : '') + '" onclick="editLesson(' + i + ')">' +
      '<div><strong>' + esc(l.title || 'بدون عنوان') + '</strong></div>' +
      '<small style="opacity:.7;font-size:11px">' + esc(l.level || '') + '</small>' +
    '</li>';
  }).join('');
}

function newLesson(){
  editingIndex = -1;
  var empty = $('editorEmpty');
  var form = $('lessonForm');
  if(empty) empty.style.display = 'none';
  if(form){ form.style.display = 'block'; form.reset(); }
  var ml = $('mediaList');
  var ql = $('quizList');
  if(ml) ml.innerHTML = '';
  if(ql) ql.innerHTML = '';
  var t = $('f-title');
  if(t) t.focus();
  renderLessonList();
}
function editLesson(i){
  var l = lessonsData[i];
  if(!l) return;
  editingIndex = i;
  var empty = $('editorEmpty');
  var form = $('lessonForm');
  if(empty) empty.style.display = 'none';
  if(form) form.style.display = 'block';
  if($('f-title')) $('f-title').value = l.title || '';
  if($('f-level')) $('f-level').value = l.level || '1AS';
  if($('f-domain')) $('f-domain').value = l.domain || '';
  if($('f-order')) $('f-order').value = l.order || 1;
  if($('f-desc')) $('f-desc').value = l.description || '';
  if($('f-knowledge')) $('f-knowledge').value = l.knowledge || '';
function addMediaItem(data){
  data = data || {};
  var div = document.createElement('div');
  div.className = 'media-item';
  div.innerHTML =
    '<button type="button" class="btn-remove" style="float:left;margin-bottom:8px" onclick="this.parentElement.remove()">✕ حذف</button>' +
    '<select class="m-type">' +
      '<option value="image"' + (data.type === 'image' ? ' selected' : '') + '>🖼️ صورة</option>' +
      '<option value="youtube"' + (data.type === 'youtube' ? ' selected' : '') + '>▶️ YouTube</option>' +
      '<option value="video"' + (data.type === 'video' ? ' selected' : '') + '>🎬 فيديو</option>' +
      '<option value="pdf"' + (data.type === 'pdf' ? ' selected' : '') + '>📄 PDF</option>' +
    '</select>' +
    '<input type="text" class="m-url" placeholder="الرابط" value="' + esc(data.url || '') + '">' +
    '<input type="text" class="m-caption" placeholder="وصف قصير" value="' + esc(data.caption || '') + '">';
  var ml = $('mediaList');
  if(ml) ml.appendChild(div);
}

function addQuizQuestion(data){
  data = data || {};
  var div = document.createElement('div');
  div.className = 'quiz-item';
  div.innerHTML =
    '<button type="button" class="btn-remove" style="float:left;margin-bottom:8px" onclick="this.parentElement.remove()">✕ حذف</button>' +
    '<select class="q-type">' +
      '<option value="mcq"' + (data.type === 'mcq' ? ' selected' : '') + '>اختيار من متعدد</option>' +
      '<option value="text"' + (data.type === 'text' ? ' selected' : '') + '>إجابة نصية</option>' +
    '</select>' +
    '<input type="text" class="q-text" placeholder="نص السؤال" value="' + esc(data.question || '') + '">' +
    '<textarea class="q-options" rows="2" placeholder="الخيارات مفصولة بفاصلة">' + esc((data.options || []).join(', ')) + '</textarea>' +
    '<input type="text" class="q-correct" placeholder="رقم الإجابة (0,1,2..) أو النموذجية" value="' +
      esc(data.type === 'mcq' ? (data.correct != null ? data.correct : '') : (data.answer || '')) + '">';
  var ql = $('quizList');
  if(ql) ql.appendChild(div);
}

function saveLesson(e){
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
  alert('✅ تم حفظ الدرس محلياً.\n\nالخطوات التالية:\n1) اضغط "تصدير JSON"\n2) انقل الملف إلى data/lessons.json\n3) ارفع إلى GitHub');
}

function deleteCurrentLesson(){
  if(editingIndex < 0) return;
  if(!confirm('حذف هذا الدرس؟')) return;
  lessonsData.splice(editingIndex, 1);
  localStorage.setItem('lessons_data', JSON.stringify(lessonsData));
  editingIndex = -1;
  var form = $('lessonForm');
  var empty = $('editorEmpty');
  if(form) form.style.display = 'none';
  if(empty) empty.style.display = 'block';
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
   الفهرس الديناميكي
   ============================================================ */
async function renderDynamicIndex(){
  var container = document.getElementById('dynamicIndex');
  if(!container) return;

  var lessons = await fetchLessons();

  if(!lessons.length){
    container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#607085">' +
      '<p style="font-size:48px">📭</p>' +
      '<p>لا توجد دروس بعد. أضف دروساً من <a href="admin.html">لوحة الإدارة</a>.</p>' +
    '</div>';
    return;
  }

  // ترتيب المستويات
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

    // ترتيب الدروس حسب رقم الفصل
    levelLessons.sort(function(a, b){
      var ao = a.order || 999;
      var bo = b.order || 999;
      return ao - bo;
    });

    html += '<div id="level-' + levelKey + '" class="level-block">' +
      '<div class="level-header level-header-' + info.color + '">' +
        '<span class="level-icon">' + info.icon + '</span>' +
        '<div>' +
          '<h3>' + info.title + '</h3>' +
          '<p>' + info.desc + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="lessons-list">';

    levelLessons.forEach(function(l){
      var num = String(l.order || 1).padStart(2, '0');
      html += '<a href="lesson.html?id=' + l.id + '" class="lesson-item">' +
        '<span class="lesson-num">' + num + '</span>' +
        '<div class="lesson-info">' +
          '<h4>' + esc(l.title) + '</h4>' +
          '<p>' + esc(l.description || l.domain || '') + '</p>' +
        '</div>' +
        '<span class="lesson-arrow">→</span>' +
      '</a>';
    });

    html += '</div></div>';
  });

  if(!html){
    html = '<div style="text-align:center;padding:60px 20px;color:#607085">لا توجد دروس مصنّفة بعد.</div>';
  }
  container.innerHTML = html;
}

// تشغيل تلقائي عند فتح الصفحة الرئيسية
document.addEventListener('DOMContentLoaded', function(){
  renderDynamicIndex();
});