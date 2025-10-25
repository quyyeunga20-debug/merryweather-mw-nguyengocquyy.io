// simple tab switch + sound on click
function showTab(id){
  document.querySelectorAll('.content').forEach(el => el.classList.add('hide'));
  const target = document.getElementById(id);
  if(target) target.classList.remove('hide');
  window.scrollTo({top:0, behavior:'smooth'});
}

window.addEventListener('DOMContentLoaded', () => {
  // default show chấm công
  document.getElementById('tab-chamcong')?.classList.remove('hide');
  // sound
  const sOn = document.getElementById('sfx-on');
  const sOff = document.getElementById('sfx-off');
  document.getElementById('btn-onduty')?.addEventListener('click', () => sOn?.play());
  document.getElementById('btn-offduty')?.addEventListener('click', () => sOff?.play());
});
