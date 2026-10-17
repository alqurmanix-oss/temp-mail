(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const header=$('#header'),bar=$('#progress'),top=$('#totop');
addEventListener('scroll',()=>{
  const y=scrollY,h=document.documentElement.scrollHeight-innerHeight;
  header.classList.toggle('stuck',y>10);
  bar.style.width=(h>0?y/h*100:0)+'%';
  top.classList.toggle('show',y>500);
},{passive:true});
top.onclick=()=>scrollTo({top:0});
$('#burger').onclick=()=>$('#nav').classList.toggle('open');
$$('#nav a').forEach(a=>a.onclick=()=>$('#nav').classList.remove('open'));
// language toggle (AR/EN placeholder)
$('#lang').onclick=()=>{const d=document.documentElement,en=d.lang==='ar';d.lang=en?'en':'ar';d.dir=en?'ltr':'rtl'};
// reveal + counters (once, on view)
const io=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting)return;io.unobserve(e.target);e.target.classList.add('in');
  e.target.querySelectorAll('[data-count]').forEach(n=>{
    const to=+n.dataset.count,dec=+(n.dataset.dec||0),t0=performance.now();
    (function f(t){const p=Math.min((t-t0)/1600,1),v=to*(1-Math.pow(1-p,3));
      n.textContent=v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});
      if(p<1)requestAnimationFrame(f)})(t0);
  });
}),{threshold:.3});
$$('.stats,.types .cards,.types h2').forEach(el=>{el.classList.add('rv');io.observe(el)});
})();
