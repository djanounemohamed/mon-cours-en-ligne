/* ============ إعدادات ============ */
const CLASSROOM_URL = const CLASSROOM_URL = 'https://classroom.google.com/';
const MEET_URL = 'https://meet.google.com/';
const TEACHER_EMAIL = 'djanounemokhtar4560@gmail.com';';

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function getParam(k){ return new URLSearchParams(location.search).get(k); }

/* ============ تحميل الدروس ============ */
async function fetchLessons(){
  const local = localStorage.getItem('lessons_data');
  if(local){ try{ return JSON.parse(local); }catch(e){} }
  try{
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }catch(e){ console.warn('تعذر تحميل الدروس:', e); return []; }
}

/* ============ الصفحة الرئيسية ============ */
async function initHome(){
  const lessons = await fetchLessons();
  const grid = $('lessonsGrid');

  if(!lessons.length){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px">
      <p style="font-size:48px">📭</p>
      <p style="color:#607085;margin-top:10px">لا توجد دروس بعد.</p>
      <p style="color:#607085;font-size:14px">أضف دروساً من <a href="admin.html">لوحة الإدارة</a>.</p>
    </div>`;
    return;
  }

  const levels = [...new Set(lessons.map(l => l.level).filter(Boolean))];
  const levelFilter = $('levelFilter');
  levels.forEach(lv => {
    const o = document.createElement('option');
    o.value = lv; o.textContent = lv;
    levelFilter.appendChild(o);
  });

  const render = (list) => {
    if(!list.length){
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#607085;padding:40px">لا نتائج مطابقة.</p>`;
      return;
    }
    grid.innerHTML = list.map(l => `
      <article class="lesson-card" onclick="openLesson('${l.id}')">
        ${l.level ? `<span class="badge">${esc(l.level)}</span>` : ''}
        <h3>${esc(l.title)}</h3>
        <p>${esc(l.description || '')}</p>
        <div class="card-footer">
          <span>📘 ${(l.knowledge||'').length ? 'جاهز' : 'قيد الإعداد'}</span>
          <span class="arrow">ابدأ ←</span>
        </div>
      </article>
    `).join('');
  };
  render(lessons);

  $('searchInput').addEventListener('input', () => {
    const q = $('searchInput').value.toLowerCase().trim();
    const lv = levelFilter.value;
    const filtered = lessons.filter(l => {
      const matchQ = !q || (l.title + ' ' + (l.description||'')).toLowerCase().includes(q);
      const matchL = !lv || l.level === lv;
      return matchQ && matchL;
    });
    render(filtered);
  });
  levelFilter.addEventListener('change', () => $('searchInput').dispatchEvent(new Event('input')));

  document.querySelectorAll('#classroomBtn,#classroomFab').forEach(el => {
    el.href = CLASSROOM_URL; el.target = '_blank';
  });
}
function openLesson(id){ location.href = 'lesson.html?id=' + encodeURIComponent(id); }

/* ============ صفحة الدرس ============ */
let currentLesson = null;

async function initLesson(){
  const id = getParam('id');
  const lessons = await fetchLessons();
  currentLesson = lessons.find(l => l.id === id);

  if(!currentLesson){
    document.querySelector('.lesson-main').innerHTML =
      `<div style="text-align:center;padding:80px 20px">
        <p style="font-size:56px">😕</p>
        <h2>الدرس غير موجود</h2>
        <p><a href="index.html">← العودة إلى الصفحة الرئيسية</a></p>
      </div>`;
    return;
  }

  document.title = currentLesson.title + ' – منصة الدروس';
  $('lessonTitle').textContent = currentLesson.title;
  $('lessonSubtitle').textContent = currentLesson.level || '';
  $('knowledgeContent').innerHTML = currentLesson.knowledge || '<p>لا يوجد محتوى.</p>';
  renderMedia(currentLesson.documents || []);
  renderQuiz(currentLesson.quiz || []);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => goToPage(btn.dataset.page));
  });
}

function goToPage(name){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  $('page-' + name).classList.add('active');
  document.querySelector(`.tab-btn[data-page="${name}"]`).classList.add('active');
  const map = { knowledge: 33, documents: 66, assessment: 100 };
  $('progressFill').style.width = map[name] + '%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderMedia(items){
  const g = $('mediaGallery');
  if(!items.length){
    g.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px">
      <p style="font-size:48px">🎬</p>
      <p style="color:#607085">لا توجد وثائق لهذا الدرس.</p>
    </div>`;
    return;
  }
  g.innerHTML = items.map((m,i) => {
    let inner = '';
    if(m.type === 'image') inner = `<img src="${m.url}" alt="">`;
    else if(m.type === 'video') inner = `<video src="${m.url}" preload="metadata"></video>`;
    else if(m.type === 'youtube'){
      const vid = extractYouTubeId(m.url);
      inner = `<iframe src="https://www.youtube.com/embed/${vid}" allowfullscreen></iframe>`;
    }
    else if(m.type === 'pdf') inner = `<iframe src="${m.url}" loading="lazy"></iframe>`;
    return `<div class="media-item" onclick="openLightbox(${i})">
      <span class="type-badge">${mediaIcon(m.type)}</span>
      ${inner}
      ${m.caption ? `<span class="caption">${esc(m.caption)}</span>` : ''}
    </div>`;
  }).join('');
  window._mediaCache = items;
}
function mediaIcon(t){ return { image:'🖼️', video:'🎬', youtube:'▶️', pdf:'📄' }[t] || '📎'; }
function extractYouTubeId(url){
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  return m ? m[1] : '';
}
function openLightbox(i){
  const m = window._mediaCache[i]; if(!m) return;
  const box = $('lightboxContent');
  if(m.type === 'image') box.innerHTML = `<img src="${m.url}">`;
  else if(m.type === 'video') box.innerHTML = `<video src="${m.url}" controls autoplay></video>`;
  else if(m.type === 'youtube') box.innerHTML = `<iframe src="https://www.youtube.com/embed/${extractYouTubeId(m.url)}?autoplay=1" allowfullscreen></iframe>`;
  else if(m.type === 'pdf') box.innerHTML = `<iframe src="${m.url}"></iframe>`;
  $('lightbox').classList.add('show');
}
function closeLightbox(e){
  if(e) e.stopPropagation();
  $('lightbox').classList.remove('show');
  $('lightboxContent').innerHTML = '';
}

function renderQuiz(quiz){
  const c = $('quizContainer');
  if(!quiz.length){
    c.innerHTML = `<div style="text-align:center;padding:60px">
      <p style="font-size:48px">📝</p>
      <p style="color:#607085">لا يوجد تقويم لهذا الدرس.</p>
    </div>`;
    $('submitQuizBtn').style.display = 'none';
    return;
  }
  c.innerHTML = quiz.map((q,i) => {
    let body = '';
    if(q.type === 'mcq'){
      body = q.options.map((opt,j) => `
        <label class="quiz-option" data-q="${i}" data-opt="${j}">
          <input type="radio" name="q${i}" value="${j}">
          <span>${esc(opt)}</span>
        </label>`).join('');
    } else {
      body = `<div class="quiz-option"><textarea rows="3" name="q${i}" placeholder="اكتب إجابتك..."></textarea></div>`;
    }
    return `<div class="quiz-question" data-index="${i}">
      <h4><span class="q-num">${i+1}</span>${esc(q.question)}</h4>
      ${body}
    </div>`;
  }).join('');
}

function submitQuiz(){
  const quiz = currentLesson.quiz || [];
  if(!quiz.length) return;
  let score = 0, total = quiz.length;
  quiz.forEach((q,i) => {
    const el = document.querySelector(`.quiz-question[data-index="${i}"]`);
    if(q.type === 'mcq'){
      const sel = document.querySelector(`input[name="q${i}"]:checked`);
      const correct = Number(q.correct);
      el.querySelectorAll('.quiz-option').forEach((opt,j) => {
        opt.classList.remove('correct','wrong');
        if(j === correct) opt.classList.add('correct');
        if(sel && Number(sel.value) === j && j !== correct) opt.classList.add('wrong');
      });
      if(sel && Number(sel.value) === correct) score++;
    } else {
      const model = document.createElement('div');
      model.style.cssText = 'background:#E8F5E9;padding:10px;border-radius:8px;margin-top:8px';
      model.innerHTML = `<strong>✅ الإجابة النموذجية:</strong> ${esc(q.answer || '—')}`;
      if(!el.querySelector('.model-answer')){
        model.className = 'model-answer';
        el.appendChild(model);
      }
      score++;
    }
  });
  const old = document.querySelector('.quiz-result');
  if(old) old.remove();
  const result = document.createElement('div');
  result.className = 'quiz-result';
  result.innerHTML = `<h3>🎉 نتيجتك: ${score} / ${total}</h3>
    <p>يمكنك إرسال الإجابات إلى الأستاذ عبر Google Classroom.</p>`;
  $('quizContainer').prepend(result);
  result.scrollIntoView({ behavior:'smooth', block:'center' });
}

/* ============ لوحة الإدارة ============ */
let lessonsData = [];
let editingIndex = -1;

async function initAdmin(){
  lessonsData = await fetchLessons();
  if(!Array.isArray(lessonsData)) lessonsData = [];
  renderLessonList();
  $('lessonForm').addEventListener('submit', saveLesson);
  $('importFile').addEventListener('change', importJSON);
}

function renderLessonList(){
  const ul = $('lessonList');
  if(!lessonsData.length){
    ul.innerHTML = '<li style="color:#607085;font-size:13px">لا توجد دروس</li>';
    return;
  }
  ul.innerHTML = lessonsData.map((l,i) => `
    <li class="${i===editingIndex?'active':''}" onclick="editLesson(${i})">
      <span>${esc(l.title||'بدون عنوان')}</span>
      <small>${esc(l.level||'')}</small>
    </li>`).join('');
}

function newLesson(){
  editingIndex = -1;
  $('editorEmpty').style.display = 'none';
  $('lessonForm').style.display = 'block';
  $('lessonForm').reset();
  $('mediaList').innerHTML = '';
  $('quizList').innerHTML = '';
  $('f-title').focus();
}

function editLesson(i){
  const l = lessonsData[i];
  editingIndex = i;
  $('editorEmpty').style.display = 'none';
  $('lessonForm').style.display = 'block';
  $('f-title').value = l.title || '';
  $('f-level').value = l.level || '';
  $('f-desc').value = l.description || '';
  $('f-knowledge').value = l.knowledge || '';
  $('mediaList').innerHTML = '';
  (l.documents || []).forEach(m => addMediaItem(m));
  $('quizList').innerHTML = '';
  (l.quiz || []).forEach(q => addQuizQuestion(q));
  renderLessonList();
}

function addMediaItem(data = {}){
  const div = document.createElement('div');
  div.className = 'media-item';
  div.innerHTML = `
    <button type="button" class="btn-remove" style="float:left;margin-bottom:8px" onclick="this.parentElement.remove()">✕ حذف</button>
    <select class="m-type">
      <option value="image" ${data.type==='image'?'selected':''}>🖼️ صورة</option>
      <option value="youtube" ${data.type==='youtube'?'selected':''}>▶️ YouTube</option>
      <option value="video" ${data.type==='video'?'selected':''}>🎬 فيديو (ملف)</option>
      <option value="pdf" ${data.type==='pdf'?'selected':''}>📄 PDF</option>
    </select>
    <input type="text" class="m-url" placeholder="الرابط أو تم رفع الملف تلقائياً" value="${esc(data.url||'')}">
    <input type="text" class="m-caption" placeholder="وصف قصير للوثيقة" value="${esc(data.caption||'')}">
  `;
  document.getElementById('mediaList').appendChild(div);
}

function addQuizQuestion(data = {}){
  const div = document.createElement('div');
  div.className = 'quiz-edit-item';
  div.innerHTML = `
    <button type="button" class="remove-item-btn" onclick="this.parentElement.remove()">✕ حذف</button>
    <select class="q-type">
      <option value="mcq" ${data.type==='mcq'?'selected':''}>اختيار من متعدد</option>
      <option value="text" ${data.type==='text'?'selected':''}>إجابة نصية</option>
    </select>
    <input type="text" class="q-text" placeholder="نص السؤال" value="${esc(data.question||'')}">
    <textarea class="q-options" rows="2" placeholder="الخيارات مفصولة بفاصلة">${esc((data.options||[]).join(', '))}</textarea>
    <input type="text" class="q-correct" placeholder="رقم الإجابة (0,1,2...) أو الإجابة النموذجية" value="${esc(data.type==='mcq' ? data.correct : (data.answer||''))}">
  `;
  $('quizList').appendChild(div);
}

function saveLesson(e){
  e.preventDefault();
  const documents = [...$('mediaList').querySelectorAll('.media-edit-item')].map(it => ({
    type: it.querySelector('.m-type').value,
    url: it.querySelector('.m-url').value.trim(),
    caption: it.querySelector('.m-caption').value.trim()
  })).filter(m => m.url);

  const quiz = [...$('quizList').querySelectorAll('.quiz-edit-item')].map(it => {
    const type = it.querySelector('.q-type').value;
    const q = { type, question: it.querySelector('.q-text').value.trim() };
    if(type === 'mcq'){
      q.options = it.querySelector('.q-options').value.split(',').map(s=>s.trim()).filter(Boolean);
      q.correct = Number(it.querySelector('.q-correct').value) || 0;
    } else {
      q.answer = it.querySelector('.q-correct').value.trim();
    }
    return q;
  }).filter(q => q.question);

  const lesson = {
    id: editingIndex >= 0 ? lessonsData[editingIndex].id : 'lesson-' + Date.now(),
    title: $('f-title').value.trim(),
    level: $('f-level').value.trim(),
    description: $('f-desc').value.trim(),
    knowledge: $('f-knowledge').value,
    documents, quiz
  };

  if(editingIndex >= 0) lessonsData[editingIndex] = lesson;
  else lessonsData.push(lesson);

  localStorage.setItem('lessons_data', JSON.stringify(lessonsData));
  editingIndex = lessonsData.length - 1;
  renderLessonList();
  alert('✅ تم حفظ الدرس محلياً.\nاستخدم "تصدير lessons.json" لرفعه إلى GitHub.');
}

function deleteCurrentLesson(){
  if(editingIndex < 0) return;
  if(!confirm('حذف هذا الدرس؟')) return;
  lessonsData.splice(editingIndex, 1);
  localStorage.setItem('lessons_data', JSON.stringify(lessonsData));
  editingIndex = -1;
  $('lessonForm').style.display = 'none';
  $('editorEmpty').style.display = 'block';
  renderLessonList();
}

function clearAllLessons(){
  if(!confirm('حذف جميع الدروس؟')) return;
  lessonsData = [];
  localStorage.removeItem('lessons_data');
  editingIndex = -1;
  $('lessonForm').style.display = 'none';
  $('editorEmpty').style.display = 'block';
  renderLessonList();
}

function exportLessons(){
  const blob = new Blob([JSON.stringify(lessonsData, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lessons.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try{
      lessonsData = JSON.parse(ev.target.result);
      localStorage.setItem('lessons_data', JSON.stringify(lessonsData));
      editingIndex = -1;
      renderLessonList();
      alert('✅ تم استيراد ' + lessonsData.length + ' درساً.');
    }catch(err){ alert('❌ ملف غير صالح: ' + err.message); }
  };
  reader.readAsText(file);
}

function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
/* ============ مشاركة الدرس في Google Classroom ============ */
function shareToClassroom(){
  if(!currentLesson){ alert('لا يوجد درس مفتوح'); return; }
  const url = window.location.href;
  const title = '📘 ' + currentLesson.title + ' – ' + (currentLesson.level || '');
  const body = 'درس في مادة علوم الطبيعة والحياة\n' + (currentLesson.description || '') + '\n\nالرابط: ' + url;

  // فتح واجهة مشاركة Classroom مع ملء الحقول
  const shareUrl = 'https://classroom.google.com/share?url=' +
    encodeURIComponent(url) +
    '&title=' + encodeURIComponent(title) +
    '&body=' + encodeURIComponent(body);

  window.open(shareUrl, '_blank');
}

/* ============ فتح Google Meet ============ */
function openGoogleMeet(){
  const confirmMeet = confirm(
    '🎥 سيتم فتح Google Meet لإنشاء اجتماع جديد.\n\n' +
    'سيُطلب منك تسجيل الدخول بحسابك: ' + TEACHER_EMAIL + '\n\n' +
    'هل تريد المتابعة؟'
  );
  if(confirmMeet){
    // إنشاء اجتماع جديد
    window.open('https://meet.google.com/new', '_blank');
  }
}