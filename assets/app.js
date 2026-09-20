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
